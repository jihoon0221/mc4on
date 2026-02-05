from __future__ import annotations

from app.clients.external.base import SimpleTTLCache
from app.clients.groq_client import GroqClient
from app.core.config import settings
from app.domain.taxonomy import TAG_TAXONOMY
from app.domain.rules.events import extract_events_from_messages
from app.services.ai_summary import generate_summary
from app.services.risk import tags_from_events


_groq_client = GroqClient(
    api_key=settings.groq_api_key,
    timeout_seconds=settings.groq_timeout_seconds,
)
_cache = SimpleTTLCache(settings.summary_cache_ttl_seconds)


def generate_daily_digest(
    message_texts: list[str],
    context_summaries: list[str] | None = None,
    learning_language: str | None = None,
) -> dict[str, object] | None:
    if settings.groq_api_key and settings.groq_model_digest:
        return _generate_groq_digest(message_texts, context_summaries, learning_language)
    return _fallback_digest(message_texts, learning_language)


def clear_cache() -> None:
    _cache.clear()


def _generate_groq_digest(
    message_texts: list[str],
    context_summaries: list[str] | None = None,
    learning_language: str | None = None,
) -> dict[str, object] | None:
    normalized = _normalize_messages(message_texts)
    if not normalized:
        return _fallback_digest(message_texts, learning_language)
    prompt = _build_prompt(normalized, context_summaries or [], learning_language)
    response = _groq_client.generate_json(settings.groq_model_digest, prompt)
    if not response:
        return _fallback_digest(message_texts, learning_language)
    summary = response.get("summary")
    tags = _normalize_tags(response.get("tags"))
    warning_tags = _normalize_warning_tags(response.get("warning_tags"))
    learning_items = _normalize_learning_items(
        response.get("learning_items"),
        message_texts,
        learning_language,
    )
    if not summary:
        return _fallback_digest(message_texts, learning_language)
    return {
        "summary": summary,
        "tags": tags,
        "warning_tags": warning_tags,
        "learning_items": learning_items,
    }


def _fallback_digest(
    message_texts: list[str],
    learning_language: str | None = None,
) -> dict[str, object] | None:
    if not message_texts:
        return None
    summary = generate_summary(message_texts)
    if not summary:
        excerpt = message_texts[0][:120].strip()
        summary = f"오늘 대화 요약(샘플): {excerpt}" if excerpt else "오늘 대화 요약(샘플)."
    rule_events = extract_events_from_messages(message_texts)
    warning_tags = tags_from_events(rule_events)
    tags = _fallback_keyword_tags(message_texts)
    learning_items = _fallback_learning_items_from_messages(
        message_texts,
        learning_language,
    )
    return {
        "summary": summary,
        "tags": tags,
        "warning_tags": warning_tags,
        "learning_items": learning_items,
    }


def _normalize_messages(message_texts: list[str]) -> list[str]:
    seen = set()
    output = []
    for text in message_texts:
        cleaned = " ".join(text.strip().split())
        if not cleaned or cleaned in seen:
            continue
        seen.add(cleaned)
        output.append(cleaned[:500])
        if len(output) >= 50:
            break
    return output


def _build_prompt(
    messages: list[str],
    context_summaries: list[str],
    learning_language: str | None = None,
) -> str:
    joined = "\n".join(f"- {m}" for m in messages)
    context = "\n".join(f"- {s}" for s in context_summaries if s)
    tag_list = ", ".join(sorted(TAG_TAXONOMY))
    language = learning_language or "English"
    return (
        "다음 대화를 요약하고 위험 태그를 분류하세요. 단정/판정은 하지 마세요.\n"
        "요약은 2~3줄로 작성하고, 4줄을 넘기지 마세요.\n"
        "문장 끝은 부드럽게 마무리하세요. 예: \"~했어요\", \"~하셨네요\", \"~처럼 보였어요\".\n"
        "tags는 대화 내용에서 뽑은 핵심 키워드를 자유롭게 작성하세요.\n"
        "warning_tags는 제공된 목록에서만 선택하세요. 암시적 금전 요구도 태그에 포함하세요.\n"
        "tags는 최대 5개, warning_tags는 경고 근거로 사용할 항목만 0~3개로 선택하세요.\n"
        "학습 아이템은 오늘 대화에서 실제로 나온 문장을 2~3개 고르고, "
        "각 문장을 한국어(content_kr)로 정리한 뒤 상대방 언어(content_fl)로 번역하세요. "
        f"content_fl은 {language}로 작성하세요. "
        "content_type은 sentence만 사용하고, 모두 완전한 문장으로 작성하세요.\n"
        f"warning_tags 목록: {tag_list}\n"
        "이전 대화 요약(최근 흐름):\n"
        f"{context if context else '- (없음)'}\n\n"
        "오늘 대화:\n"
        f"{joined}\n\n"
        "JSON으로 summary, tags, warning_tags, learning_items만 반환하세요.\n"
        "learning_items는 content_kr, content_fl, content_type 필드를 포함하세요."
    )


def _fallback_learning_items_from_messages(
    message_texts: list[str],
    learning_language: str | None = None,
) -> list[dict[str, str]]:
    if not message_texts:
        return []
    items: list[dict[str, str]] = []
    seen = set()
    for text in message_texts:
        for line in text.splitlines():
            cleaned = " ".join(line.strip().split())
            if not cleaned or cleaned in seen:
                continue
            seen.add(cleaned)
            content_kr = cleaned
            if learning_language and learning_language.lower() == "korean":
                content_fl = content_kr
            else:
                # No translator in fallback; keep Korean as-is.
                content_fl = content_kr
            items.append(
                {
                    "content_kr": content_kr,
                    "content_fl": content_fl,
                    "content_type": "sentence",
                }
            )
            if len(items) >= 3:
                return items
    return items


def _normalize_learning_items(
    value: object,
    message_texts: list[str],
    learning_language: str | None,
) -> list[dict[str, str]]:
    items: list[dict[str, str]] = []
    if isinstance(value, list):
        for item in value:
            if not isinstance(item, dict):
                continue
            content_kr = item.get("content_kr")
            content_fl = item.get("content_fl")
            content_type = item.get("content_type")
            if not content_kr or not content_fl or content_type != "sentence":
                continue
            items.append(
                {
                    "content_kr": str(content_kr),
                    "content_fl": str(content_fl),
                    "content_type": "sentence",
                }
            )
    if len(items) >= 3:
        return items[:3]
    return _fallback_learning_items_from_messages(message_texts, learning_language)


def _normalize_tags(value: object) -> list[str]:
    if not value:
        return []
    items: list[str] = []
    if isinstance(value, list):
        candidates = value
    else:
        candidates = [value]
    for item in candidates:
        if not isinstance(item, str):
            continue
        cleaned = " ".join(item.strip().split())
        if not cleaned:
            continue
        items.append(cleaned[:30])
        if len(items) >= 5:
            break
    return items


def _normalize_warning_tags(value: object) -> list[str]:
    if not value:
        return []
    if isinstance(value, list):
        filtered = [item for item in value if isinstance(item, str) and item in TAG_TAXONOMY]
        return filtered[:3]
    if isinstance(value, str) and value in TAG_TAXONOMY:
        return [value]
    return []


def _fallback_keyword_tags(message_texts: list[str]) -> list[str]:
    import re

    if not message_texts:
        return []
    text = " ".join(message_texts[:5])
    tokens = re.findall(r"[A-Za-z0-9가-힣]{2,}", text)
    seen = set()
    keywords: list[str] = []
    for token in tokens:
        key = token.strip()
        if not key or key in seen:
            continue
        seen.add(key)
        keywords.append(key[:30])
        if len(keywords) >= 5:
            break
    return keywords
