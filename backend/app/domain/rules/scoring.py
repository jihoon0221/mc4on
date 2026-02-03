from __future__ import annotations

from app.domain.rules.events import Event


def score_from_events(events: list[Event]) -> float:
    weights = {
        "romance_scam_wealthy": 1.0,
        "romance_scam_soldier": 1.0,
        "romance_scam_customs": 1.0,
        "money_request": 0.8,
        "payment_method_risky": 0.7,
        "platform_switch": 0.4,
        "impersonation_role": 0.5,
        "personal_info_request": 0.4,
        "urgency_pressure": 0.5,
        "overseas_distance": 0.3,
    }
    types = {event.type for event in events}
    score = 0.0
    for event in events:
        base = weights.get(event.type, 0.0)
        severity_bonus = 0.05 * max(event.severity - 1, 0)
        score += base + severity_bonus

    romance_types = {
        "romance_scam_wealthy",
        "romance_scam_soldier",
        "romance_scam_customs",
    }
    if types.intersection(romance_types) and "money_request" in types:
        score += 0.6
    if "payment_method_risky" in types and "money_request" in types:
        score += 0.4
    if "impersonation_role" in types and "overseas_distance" in types:
        score += 0.2
    if "platform_switch" in types and "impersonation_role" in types:
        score += 0.2
    if len(types.intersection(romance_types)) >= 2:
        score += 0.4

    return min(score, 4.0)


def score_from_tags(tags: list[str] | None) -> float:
    if not tags:
        return 0.0
    weights = {
        "money_request": 0.8,
        "amount_escalation": 0.6,
        "repeat_requests": 0.6,
        "urgency": 0.5,
        "sympathy_appeal": 0.4,
        "marriage_future_bait": 0.4,
        "overseas": 0.3,
        "avoid_meeting": 0.4,
        "impersonation": 0.6,
        "wealthy_claim": 0.6,
        "frozen_assets_tax": 0.6,
        "lawyer_bank_thirdparty": 0.6,
        "customs_fee": 0.7,
        "gift_package": 0.5,
        "reward_gold_claim": 0.7,
        "travel_ticket_fee": 0.6,
        "medical_fee": 0.6,
        "platform_switch": 0.4,
        "profile_photo_trust": 0.4,
        "catfishing": 0.6,
        "personal_info": 0.4,
        "payment_method": 0.7,
        "crypto_moneygram": 0.7,
        "domestic_account": 0.6,
        "deposit_confirmation": 0.5,
        "fake_document": 0.6,
        "translation_pattern": 0.3,
        "script_stage": 0.4,
    }
    score = 0.0
    for tag in tags:
        score += weights.get(tag, 0.0)
    if "payment_method" in tags and "money_request" not in tags:
        score += 0.3
    if "crypto_moneygram" in tags and "money_request" not in tags:
        score += 0.4
    if "money_request" in tags and "urgency" in tags:
        score += 0.4
    return min(score, 4.0)
