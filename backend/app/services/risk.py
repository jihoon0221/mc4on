from __future__ import annotations

from dataclasses import dataclass
from datetime import date, timedelta
import re
from typing import Iterable

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.domain.rules.events import extract_events_from_messages
from app.domain.rules.scoring import score_from_events, score_from_tags
from app.models.models import AnalysisResult, EntityTypeEnum, RiskEvent
from app.services.ai_risk import generate_risk_explanation_tags
from app.services.external_checks import check_account, check_link


_FLOW_RISK_WEIGHT = 0.7
_STREAK_BONUS_THRESHOLD = 4
_STREAK_BONUS_MEDIUM = 0.4
_STREAK_BONUS_HIGH = 0.7


_DOMAIN_RE = re.compile(r"^https?://([^/]+)")


@dataclass(frozen=True)
class RiskAssessment:
    risk_score: float
    risk_level: int
    flow_risk_score: float
    warning_text: str | None
    risk_explanation_text: str | None
    tags: list[str]
    events: list[RiskEvent]


def assess_risk(
    db: Session,
    conversation_id: str,
    analysis_date: date,
    message_texts: list[str],
    entities: Iterable[tuple[EntityTypeEnum, str]],
    partner_country: str | None,
    partner_job: str | None,
    photo_flags: list[str] | None = None,
    ai_tags: list[str] | None = None,
) -> RiskAssessment:
    events: list[RiskEvent] = []
    score = 0.0

    rule_events = extract_events_from_messages(message_texts)
    score += score_from_events(rule_events)
    for event in rule_events:
        events.append(RiskEvent(event_type=event.type, severity=event.severity))

    score += _combo_bonus(rule_events)
    score += score_from_tags(ai_tags)

    profile_risk = _profile_risk(partner_country, partner_job)
    if profile_risk:
        score += 0.3
        events.append(RiskEvent(event_type="profile_risk_match", severity=1))

    text_risk = _text_risk(message_texts)
    if text_risk:
        score += 0.5
        events.append(RiskEvent(event_type="suspicious_text", severity=2))

    entity_risk = _entity_risk(entities, events)
    if entity_risk:
        score += entity_risk

    photo_risk = _photo_risk(photo_flags or [])
    if photo_risk:
        score += 0.7
        events.append(RiskEvent(event_type="suspicious_photo", severity=3))

    flow_score = _flow_risk_score(db, conversation_id, analysis_date)
    score = _apply_flow_risk(score, flow_score)
    score += _streak_bonus(db, conversation_id, analysis_date)

    risk_level = _risk_level(
        score,
        profile_risk=profile_risk,
        text_risk=text_risk,
        entity_risk=entity_risk > 0.0,
        photo_risk=photo_risk,
    )
    warning_text = _warning_text(risk_level)
    risk_explanation_text, tags = _risk_explanation(message_texts, events)

    return RiskAssessment(
        risk_score=score,
        risk_level=risk_level,
        flow_risk_score=flow_score,
        warning_text=warning_text,
        risk_explanation_text=risk_explanation_text,
        tags=tags,
        events=events,
    )


def _profile_risk(country: str | None, job: str | None) -> bool:
    countries = settings.risk_countries
    jobs = settings.risk_jobs
    return (country and country in countries) or (job and job in jobs)


def _text_risk(message_texts: list[str]) -> bool:
    if not message_texts:
        return False
    keywords = settings.risk_keywords
    if not keywords:
        return False
    lowered = "\n".join(message_texts).lower()
    return any(keyword in lowered for keyword in keywords)


def _entity_risk(
    entities: Iterable[tuple[EntityTypeEnum, str]],
    events: list[RiskEvent],
) -> float:
    score = 0.0
    for entity_type, value in entities:
        if entity_type == EntityTypeEnum.link:
            domain = _extract_domain(value)
            if domain and domain in settings.risk_link_domains:
                score += 0.7
                events.append(RiskEvent(event_type="risky_link_domain", severity=3))
            risky, _ = check_link(value)
            if risky:
                score += 0.7
                events.append(RiskEvent(event_type="risky_link_signal", severity=3))
        if entity_type == EntityTypeEnum.account:
            if any(value.startswith(prefix) for prefix in settings.risk_account_prefixes):
                score += 0.7
                events.append(RiskEvent(event_type="risky_account_prefix", severity=3))
            risky, _ = check_account(value)
            if risky:
                score += 0.7
                events.append(RiskEvent(event_type="risky_account_signal", severity=3))
    return score


def _photo_risk(photo_flags: list[str]) -> bool:
    return bool(photo_flags)


def _extract_domain(url: str) -> str | None:
    match = _DOMAIN_RE.match(url.strip())
    if not match:
        return None
    domain = match.group(1).lower()
    return domain.split(":")[0]


def _flow_risk_score(db: Session, conversation_id: str, analysis_date: date) -> float:
    window_start = analysis_date - timedelta(days=settings.flow_risk_window_days)
    recent = db.execute(
        select(AnalysisResult)
        .where(
            AnalysisResult.conversation_id == conversation_id,
            AnalysisResult.analysis_date >= window_start,
            AnalysisResult.analysis_date <= analysis_date,
        )
        .order_by(AnalysisResult.analysis_date.desc())
    ).scalars().all()
    if not recent:
        return 0.0
    return sum(result.risk_level or 0 for result in recent) / len(recent)


def _apply_flow_risk(score: float, flow_score: float) -> float:
    if flow_score <= 0:
        return score
    return score + (flow_score * _FLOW_RISK_WEIGHT)


def _combo_bonus(rule_events: list) -> float:
    types = {event.type for event in rule_events}
    if "money_request" not in types:
        return 0.0
    high_signals = {
        "payment_method_risky",
        "romance_scam_customs",
        "romance_scam_soldier",
        "romance_scam_wealthy",
    }
    pressure_signals = {"urgency_pressure", "platform_switch", "impersonation_role"}
    if types.intersection(high_signals) and types.intersection(pressure_signals):
        return 0.6
    if types.intersection(high_signals):
        return 0.3
    return 0.0


def _streak_bonus(db: Session, conversation_id: str, analysis_date: date) -> float:
    recent = db.execute(
        select(AnalysisResult)
        .where(
            AnalysisResult.conversation_id == conversation_id,
            AnalysisResult.analysis_date < analysis_date,
        )
        .order_by(AnalysisResult.analysis_date.desc())
        .limit(10)
    ).scalars().all()
    if not recent:
        return 0.0
    streak = 0
    for result in recent:
        if (result.risk_level or 0) >= 2:
            streak += 1
        else:
            break
    if streak >= 5:
        return _STREAK_BONUS_HIGH
    if streak >= _STREAK_BONUS_THRESHOLD:
        return _STREAK_BONUS_MEDIUM
    return 0.0


def _risk_level(
    score: float,
    *,
    profile_risk: bool,
    text_risk: bool,
    entity_risk: bool,
    photo_risk: bool,
) -> int:
    if score >= 4.0:
        return 4
    if score >= 2.0:
        return 3
    if score >= 1.0:
        return 2
    base = 1
    if text_risk or entity_risk or photo_risk or profile_risk:
        base = 2
    return base


def _warning_text(risk_level: int) -> str | None:
    if risk_level < 4:
        return None
    return "위험 신호가 강하게 감지되었습니다. 증거 자료를 보관하고 신고를 고려해 주세요."


def _risk_explanation(
    message_texts: list[str], events: list[RiskEvent]
) -> tuple[str | None, list[str]]:
    if not events:
        return None, []
    ai_text, ai_tags = generate_risk_explanation_tags(message_texts, events)
    if ai_text or ai_tags:
        return ai_text, ai_tags
    explanations: list[str] = []
    tags: list[str] = []

    def add_tag(tag: str) -> None:
        if tag not in tags:
            tags.append(tag)
    for event in events:
        if event.event_type == "profile_risk_match":
            explanations.append("상대 프로필 정보와 유사한 패턴이 발견되어 기록해 두었어요.")
            add_tag("profile")
        elif event.event_type == "suspicious_text":
            explanations.append("대화 흐름에서 주의가 필요한 표현이 감지되었습니다.")
            add_tag("text")
        elif event.event_type == "romance_scam_wealthy":
            explanations.append("상속·재산 동결 등 재력 과시형 시나리오와 유사한 흐름이 보였어요.")
            add_tag("impersonation")
            add_tag("money_request")
        elif event.event_type == "romance_scam_soldier":
            explanations.append("군인 사칭형 시나리오와 유사한 표현이 감지되었습니다.")
            add_tag("impersonation")
        elif event.event_type == "romance_scam_customs":
            explanations.append("통관·배송 비용 대납형 시나리오와 유사한 표현이 보였어요.")
            add_tag("money_request")
        elif event.event_type == "money_request":
            explanations.append("금전 요청 또는 비용 대납 관련 표현이 감지되었습니다.")
            add_tag("money_request")
        elif event.event_type == "payment_method_risky":
            explanations.append("특정 송금수단을 요구하는 표현이 감지되었습니다.")
            add_tag("payment_method")
        elif event.event_type == "platform_switch":
            explanations.append("대화 매개체 변경을 요구하는 흐름이 나타났어요.")
            add_tag("platform_switch")
        elif event.event_type == "impersonation_role":
            explanations.append("특정 직업/신분 사칭 가능성이 있는 표현이 감지되었습니다.")
            add_tag("impersonation")
        elif event.event_type == "personal_info_request":
            explanations.append("주소 등 개인정보 요구로 보이는 표현이 있습니다.")
            add_tag("personal_info")
        elif event.event_type == "urgency_pressure":
            explanations.append("긴급성을 강조하는 표현이 감지되었습니다.")
            add_tag("urgency")
        elif event.event_type == "overseas_distance":
            explanations.append("해외 체류를 강조하는 표현이 감지되었습니다.")
            add_tag("overseas")
        elif event.event_type == "risky_link_domain":
            explanations.append("대화 안의 링크에서 주의가 필요한 도메인이 보였어요.")
            add_tag("link")
        elif event.event_type == "risky_link_signal":
            explanations.append("대화 안의 링크에서 주의가 필요한 패턴이 감지되었습니다.")
            add_tag("link")
        elif event.event_type == "risky_account_prefix":
            explanations.append("계좌 관련 정보가 감지되어 기록해 두었어요.")
            add_tag("account")
        elif event.event_type == "risky_account_signal":
            explanations.append("계좌 정보에 대한 주의 신호가 감지되었습니다.")
            add_tag("account")
        elif event.event_type == "suspicious_photo":
            explanations.append("사진 관련 확인이 필요한 패턴이 보여 기록했습니다.")
            add_tag("photo")
    if not explanations:
        return None, []
    return " ".join(explanations), list(dict.fromkeys(tags))


def tags_from_events(rule_events: list) -> list[str]:
    tags: list[str] = []

    def add_tag(tag: str) -> None:
        if tag not in tags:
            tags.append(tag)

    for event in rule_events:
        if event.type == "profile_risk_match":
            add_tag("profile_photo_trust")
        elif event.type == "suspicious_text":
            add_tag("translation_pattern")
        elif event.type == "romance_scam_wealthy":
            add_tag("wealthy_claim")
            add_tag("frozen_assets_tax")
            add_tag("money_request")
        elif event.type == "romance_scam_soldier":
            add_tag("impersonation")
            add_tag("overseas")
        elif event.type == "romance_scam_customs":
            add_tag("customs_fee")
            add_tag("money_request")
        elif event.type == "money_request":
            add_tag("money_request")
        elif event.type == "payment_method_risky":
            add_tag("payment_method")
            add_tag("crypto_moneygram")
        elif event.type == "platform_switch":
            add_tag("platform_switch")
        elif event.type == "impersonation_role":
            add_tag("impersonation")
        elif event.type == "personal_info_request":
            add_tag("personal_info")
        elif event.type == "urgency_pressure":
            add_tag("urgency")
        elif event.type == "overseas_distance":
            add_tag("overseas")
        elif event.type == "risky_link_domain":
            add_tag("fake_document")
        elif event.type == "risky_link_signal":
            add_tag("fake_document")
        elif event.type == "risky_account_prefix":
            add_tag("domestic_account")
        elif event.type == "risky_account_signal":
            add_tag("domestic_account")
        elif event.type == "suspicious_photo":
            add_tag("profile_photo_trust")
    return tags


def bird_state_from_risk_level(risk_level: int) -> str:
    if risk_level >= 4:
        return "anxious"
    if risk_level == 3:
        return "anxious"
    if risk_level == 2:
        return "cautious"
    return "calm"
