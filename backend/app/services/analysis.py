from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime
import json

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.models import (
    AnalysisResult,
    Conversation,
    LearningContent,
    LearningContentTypeEnum,
)
from app.services.ai_digest import generate_daily_digest
from app.services.ai_summary import generate_summary
from app.services.risk import RiskAssessment, assess_risk


DEFAULT_SUMMARY = "아직 분석 모델이 연결되지 않았습니다."


@dataclass(frozen=True)
class AnalysisOutput:
    result: AnalysisResult
    learning_contents: list[LearningContent]
    warning_text: str | None


def run_daily_analysis(
    db: Session,
    conversation: Conversation,
    target_date: date,
    message_texts: list[str],
    entities: list[tuple],
    photo_flags: list[str],
    partner_country: str | None,
    partner_job: str | None,
    learning_language: str | None = None,
) -> AnalysisOutput:
    context_summaries = _load_recent_summaries(
        db, str(conversation.id), target_date, limit=3
    )
    digest = generate_daily_digest(
        message_texts,
        context_summaries,
        learning_language=learning_language,
    )
    ai_summary = digest.get("summary") if digest else None
    ai_tags = digest.get("tags") if digest else []
    ai_warning_tags = digest.get("warning_tags") if digest else []
    ai_learning_items = digest.get("learning_items") if digest else []

    assessment = assess_risk(
        db=db,
        conversation_id=str(conversation.id),
        analysis_date=target_date,
        message_texts=message_texts,
        entities=entities,
        partner_country=partner_country,
        partner_job=partner_job,
        photo_flags=photo_flags,
        ai_tags=ai_tags,
    )

    summary_text = _build_summary(message_texts, ai_summary)
    warning_text = _build_warning_message(
        _map_tag_labels(ai_warning_tags),
        assessment.risk_level,
    )
    summary_short_text = _build_summary_short(summary_text, message_texts)
    risk_explanation_text = None
    result = AnalysisResult(
        conversation_id=conversation.id,
        analysis_date=target_date,
        risk_score=assessment.risk_score,
        risk_level=assessment.risk_level,
        flow_risk_score=assessment.flow_risk_score,
        summary_text=summary_text,
        summary_short_text=summary_short_text,
        warning_text=warning_text,
        risk_explanation_text=risk_explanation_text,
        tags_text=",".join(ai_tags) if ai_tags else None,
        warning_tags_text=",".join(_map_tag_labels(ai_warning_tags)) if ai_warning_tags else None,
    )
    db.add(result)
    db.commit()
    db.refresh(result)

    for event in assessment.events:
        event.analysis_id = result.id
        db.add(event)
    db.commit()

    learning_contents = _build_learning_contents(
        conversation.id, target_date, message_texts, ai_learning_items
    )
    for content in learning_contents:
        db.add(content)
    db.commit()

    return AnalysisOutput(
        result=result,
        learning_contents=learning_contents,
        warning_text=warning_text,
    )


def _build_summary(
    message_texts: list[str],
    ai_summary: str | None,
) -> str:
    if not message_texts:
        return DEFAULT_SUMMARY
    normalized_summary = _normalize_summary(ai_summary)
    if normalized_summary:
        return normalized_summary
    fallback_summary = generate_summary(message_texts)
    if fallback_summary:
        return fallback_summary
    excerpt = message_texts[0][:120].strip()
    return f"오늘 대화 요약(샘플): {excerpt}"


def _build_summary_short(
    summary_text: str,
    message_texts: list[str],
) -> str | None:
    if summary_text:
        sentence = _one_sentence_summary(summary_text)
        if sentence:
            return sentence
    if message_texts:
        excerpt = message_texts[0][:80].strip()
        return excerpt or None
    return None


def _build_warning_message(tags: list[str], risk_level: int) -> str | None:
    if not tags:
        return None
    tag_text = _format_tag_phrases(tags)
    if risk_level >= 4:
        return (
            f"실제 피해사례에서 자주 보인 전개와 유사할 수 있어요. "
            f"{tag_text} 흐름이 함께 나타났어요. "
            "금전 요청은 즉시 보류하고 기록을 보관한 뒤 상담이나 신고를 고려해 주세요."
        )
    if risk_level == 3:
        return (
            f"주의가 필요한 흐름과 유사할 수 있어요. "
            f"{tag_text} 흐름이 함께 나타났어요. "
            "송금이나 선불 결제는 잠시 보류해 주세요."
        )
    if risk_level == 2:
        return (
            f"확인해두면 좋은 흐름이 보여요. "
            f"{tag_text} 흐름이 함께 나타났어요. "
            "상대 정보를 천천히 확인해도 괜찮아요."
        )
    return (
        f"아직은 가벼운 대화 흐름이에요. {tag_text} 흐름이 함께 나타났어요. "
        "개인정보는 조금 더 신뢰가 쌓인 뒤로 미루는 편이 안전해요."
    )


def _build_tag_explanation(tags: list[str]) -> str | None:
    return None


def _format_tag_phrases(tags: list[str]) -> str:
    labels = [str(tag).strip() for tag in tags if str(tag).strip()]
    return ", ".join(labels)


def _normalize_summary(summary: object) -> str | None:
    if summary is None:
        return None
    if isinstance(summary, str):
        return summary.strip() or None
    if isinstance(summary, list):
        parts = [str(item).strip() for item in summary if str(item).strip()]
        return " ".join(parts) if parts else None
    return str(summary).strip() or None


def _one_sentence_summary(text: str) -> str | None:
    cleaned = " ".join(text.split())
    if not cleaned:
        return None
    parts = _split_sentences(cleaned)
    if not parts:
        return cleaned
    if len(parts) == 1:
        return _ensure_soft_ending(parts[0])
    combined = ", ".join(parts[:2])
    return _ensure_soft_ending(combined)


def _split_sentences(text: str) -> list[str]:
    chunks: list[str] = []
    start = 0
    for idx, ch in enumerate(text):
        if ch in ".!?":
            segment = text[start:idx + 1].strip()
            if segment:
                chunks.append(segment)
            start = idx + 1
    tail = text[start:].strip()
    if tail:
        chunks.append(tail)
    return chunks


def _ensure_soft_ending(text: str) -> str:
    if not text:
        return text
    if text.endswith(("요.", "니다.", "세요.", "해요.", "했어요.", "네요.", "어요.", "였어요.")):
        return text
    if text.endswith((".", "!", "?")):
        return text[:-1] + "어요."
    return text + "어요."


def _map_tag_labels(tags: list[str]) -> list[str]:
    mapping = {
        "money_request": "금전 요청",
        "amount_escalation": "추가/증액 요구",
        "repeat_requests": "반복 송금 유도",
        "urgency": "시간 압박",
        "sympathy_appeal": "동정심/감정 호소",
        "marriage_future_bait": "결혼·동거·미래 약속 미끼",
        "overseas": "해외 체류/파병 강조",
        "avoid_meeting": "대면 회피",
        "impersonation": "신분 사칭",
        "wealthy_claim": "재력·상속 과시",
        "frozen_assets_tax": "자산 동결/세금 문제 핑계",
        "lawyer_bank_thirdparty": "제3자(변호사·은행직원) 사칭",
        "customs_fee": "통관비/보관비/수수료 대납 요구",
        "gift_package": "선물·소포 발송 주장",
        "reward_gold_claim": "포상금·금(골드) 보관/이전 주장",
        "travel_ticket_fee": "항공료/방문비용 요구",
        "medical_fee": "부상·치료비 명목",
        "platform_switch": "채널 이동 유도",
        "profile_photo_trust": "사진/프로필 신뢰 구축",
        "catfishing": "허위 프로필·사진 도용",
        "personal_info": "개인정보 요구",
        "payment_method": "송금수단 지정/제안",
        "crypto_moneygram": "추적 회피 수단",
        "domestic_account": "국내 계좌/대포통장 사용",
        "deposit_confirmation": "입금 확인 집착",
        "fake_document": "가짜 문서/증빙 제시",
        "translation_pattern": "번역기투 말투",
        "script_stage": "스크립트 단계 패턴",
    }
    return [mapping.get(tag, tag) for tag in tags if tag]


def _build_learning_contents(
    conversation_id,
    target_date: date,
    message_texts: list[str],
    ai_learning_items: list[dict[str, str]] | None = None,
) -> list[LearningContent]:
    created_at = datetime.combine(target_date, datetime.min.time())
    if ai_learning_items:
        items: list[LearningContent] = []
        for item in ai_learning_items:
            content_type = item.get("content_type")
            if content_type != "sentence":
                continue
            content_kr = item.get("content_kr")
            content_fl = item.get("content_fl")
            if content_kr and content_fl:
                payload = json.dumps(
                    {"content_kr": content_kr, "content_fl": content_fl},
                    ensure_ascii=False,
                )
                items.append(
                    LearningContent(
                        conversation_id=conversation_id,
                        content=payload,
                        created_at=created_at,
                        content_type=LearningContentTypeEnum.sentence,
                    )
                )
                continue
            content = item.get("content")
            if not content:
                continue
            items.append(
                LearningContent(
                    conversation_id=conversation_id,
                    content=content,
                    created_at=created_at,
                    content_type=LearningContentTypeEnum.sentence,
                )
            )
        if items:
            return items
    if not message_texts:
        return []
    sample = message_texts[0].strip()
    if not sample:
        return []
    word = sample.split()[0]
    return [
        LearningContent(
            conversation_id=conversation_id,
            created_at=created_at,
            content=f"오늘의 표현: {word}",
            content_type=LearningContentTypeEnum.word,
        )
    ]


def _load_recent_summaries(
    db: Session,
    conversation_id: str,
    target_date: date,
    limit: int = 3,
) -> list[str]:
    rows = db.execute(
        select(AnalysisResult.summary_text)
        .where(
            AnalysisResult.conversation_id == conversation_id,
            AnalysisResult.analysis_date < target_date,
        )
        .order_by(AnalysisResult.analysis_date.desc())
        .limit(limit)
    ).all()
    return [row[0] for row in rows if row and row[0]]
