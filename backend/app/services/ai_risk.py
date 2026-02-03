from __future__ import annotations

from typing import Iterable

from app.clients.openai_client import OpenAIClient
from app.core.config import settings
from app.domain.taxonomy import TAG_TAXONOMY
from app.models.models import RiskEvent


_client = OpenAIClient(
    api_key=settings.openai_api_key,
    base_url=settings.openai_base_url,
    timeout_seconds=settings.openai_timeout_seconds,
)


def generate_risk_explanation_tags(
    message_texts: list[str],
    events: Iterable[RiskEvent],
) -> tuple[str | None, list[str]]:
    if not settings.openai_model_risk:
        return None, []
    event_payload = [
        {"type": e.event_type, "severity": e.severity}
        for e in list(events)[:10]
    ]
    prompt = _build_prompt(event_payload, list(TAG_TAXONOMY))
    schema = {
        "name": "risk_schema",
        "schema": {
            "type": "object",
            "properties": {
                "explanation": {"type": ["string", "null"]},
                "tags": {
                    "type": "array",
                    "items": {"type": "string"},
                },
            },
            "required": ["explanation", "tags"],
            "additionalProperties": False,
        },
    }
    response = _client.structured_response(settings.openai_model_risk, prompt, schema)
    if not response:
        return None, []
    tags = [t for t in response.get("tags", []) if t in TAG_TAXONOMY]
    explanation = response.get("explanation")
    return explanation, tags


def _build_prompt(events: list[dict], taxonomy: list[str]) -> str:
    return (
        "아래 이벤트를 바탕으로 중립적인 설명과 태그를 생성하세요.\n"
        "설명은 단정하지 말고 관찰/기록 톤을 유지하세요.\n"
        "태그는 반드시 제공된 목록에서만 선택하세요.\n"
        f"태그 목록: {', '.join(taxonomy)}\n"
        f"이벤트: {events}\n"
        "JSON으로 explanation과 tags만 반환하세요."
    )
