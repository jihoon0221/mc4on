from __future__ import annotations

from app.clients.external.base import SimpleTTLCache
from app.clients.gemini_client import GeminiClient
from app.clients.groq_client import GroqClient
from app.clients.hf_client import HuggingFaceClient
from app.clients.openai_client import OpenAIClient
from app.core.config import settings
from app.domain.taxonomy import TAG_TAXONOMY
from app.domain.rules.events import extract_events_from_messages
from app.services.ai_summary import generate_summary
from app.services.risk import tags_from_events


_client = OpenAIClient(
    api_key=settings.openai_api_key,
    base_url=settings.openai_base_url,
    timeout_seconds=settings.openai_timeout_seconds,
)
_groq_client = GroqClient(
    api_key=settings.groq_api_key,
    timeout_seconds=settings.openai_timeout_seconds,
)
_gemini_client = GeminiClient(
    api_key=settings.gemini_api_key,
    timeout_seconds=settings.openai_timeout_seconds,
)
_hf_client = HuggingFaceClient(
    api_key=settings.hf_api_key,
    timeout_seconds=settings.openai_timeout_seconds,
)
_cache = SimpleTTLCache(settings.summary_cache_ttl_seconds)


def generate_daily_digest(
    message_texts: list[str],
    context_summaries: list[str] | None = None,
    learning_language: str | None = None,
) -> dict[str, object] | None:
    if settings.groq_api_key and settings.groq_model_digest:
        return _generate_groq_digest(message_texts, context_summaries, learning_language)
    if settings.gemini_api_key and settings.gemini_model_digest:
        return _generate_gemini_digest(message_texts, context_summaries, learning_language)
    if settings.hf_api_key and settings.hf_model_digest:
        return _generate_hf_digest(message_texts, context_summaries, learning_language)
    model = settings.openai_model_digest or settings.openai_model_summary
    if not model:
        return _fallback_digest(message_texts, learning_language)
    normalized = _normalize_messages(message_texts)
    if not normalized:
        return _fallback_digest(message_texts, learning_language)
    cache_key = "digest|" + "|".join(normalized)
    cached = _cache.get(cache_key)
    if cached:
        return cached
    prompt = _build_prompt(normalized, context_summaries or [], learning_language)
    schema = {
        "name": "digest_schema",
        "schema": {
            "type": "object",
            "properties": {
                "summary": {"type": "string"},
                "tags": {
                    "type": "array",
                    "items": {"type": "string"},
                    "minItems": 1,
                    "maxItems": 5,
                },
                "warning_tags": {
                    "type": "array",
                    "items": {"type": "string"},
                    "minItems": 0,
                    "maxItems": 3,
                },
                "learning_items": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "content": {"type": "string"},
                            "content_type": {"type": "string"},
                        },
                        "required": ["content", "content_type"],
                        "additionalProperties": False,
                    },
                    "minItems": 3,
                    "maxItems": 3,
                },
            },
            "required": ["summary", "tags", "warning_tags", "learning_items"],
            "additionalProperties": False,
        },
        "strict": True,
    }
    response = _client.structured_response(model, prompt, schema)
    if not response:
        return _fallback_digest(message_texts, learning_language)
    summary = response.get("summary")
    tags = _normalize_tags(response.get("tags"))
    warning_tags = _normalize_warning_tags(response.get("warning_tags"), tags)
    learning_items = _normalize_learning_items(
        response.get("learning_items"),
        learning_language,
    )
    if not summary:
        return _fallback_digest(message_texts, learning_language)
    payload = {
        "summary": summary,
        "tags": tags,
        "warning_tags": warning_tags,
        "learning_items": learning_items,
    }
    _cache.set(cache_key, payload)
    return payload


def _generate_gemini_digest(
    message_texts: list[str],
    context_summaries: list[str] | None = None,
    learning_language: str | None = None,
) -> dict[str, object] | None:
    normalized = _normalize_messages(message_texts)
    if not normalized:
        return _fallback_digest(message_texts, learning_language)
    prompt = _build_prompt(normalized, context_summaries or [], learning_language)
    response = _gemini_client.generate_json(settings.gemini_model_digest, prompt)
    if not response:
        return _fallback_digest(message_texts, learning_language)
    summary = response.get("summary")
    tags = _normalize_tags(response.get("tags"))
    warning_tags = _normalize_warning_tags(response.get("warning_tags"), tags)
    learning_items = _normalize_learning_items(
        response.get("learning_items"),
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
    warning_tags = _normalize_warning_tags(response.get("warning_tags"), tags)
    learning_items = _normalize_learning_items(
        response.get("learning_items"),
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


def _generate_hf_digest(
    message_texts: list[str],
    context_summaries: list[str] | None = None,
    learning_language: str | None = None,
) -> dict[str, object] | None:
    normalized = _normalize_messages(message_texts)
    if not normalized:
        return _fallback_digest(message_texts, learning_language)
    prompt = _build_prompt(normalized, context_summaries or [], learning_language)
    response = _hf_client.generate_json(settings.hf_model_digest, prompt)
    if not response:
        return _fallback_digest(message_texts, learning_language)
    summary = response.get("summary")
    tags = _normalize_tags(response.get("tags"))
    warning_tags = _normalize_warning_tags(response.get("warning_tags"), tags)
    learning_items = _normalize_learning_items(
        response.get("learning_items"),
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
    tags = tags_from_events(rule_events)
    learning_items = _fallback_learning_items(message_texts, learning_language)
    return {
        "summary": summary,
        "tags": tags,
        "warning_tags": _default_warning_tags(tags),
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
        "태그는 제공된 목록에서만 선택하세요. 암시적 금전 요구도 태그에 포함하세요.\n"
        "tags는 최대 5개, warning_tags는 경고 근거로 사용할 항목만 0~3개로 선택하세요.\n"
        f"학습 아이템은 {language}로 3개를 작성하세요. "
        "content_type은 sentence만 사용하고, 모두 완전한 문장으로 작성하세요.\n"
        f"태그 목록: {tag_list}\n"
        "이전 대화 요약(최근 흐름):\n"
        f"{context if context else '- (없음)'}\n\n"
        "오늘 대화:\n"
        f"{joined}\n\n"
        "JSON으로 summary, tags, warning_tags, learning_items만 반환하세요."
    )


def _fallback_learning_items(
    message_texts: list[str],
    learning_language: str | None = None,
) -> list[dict[str, str]]:
    sample = " ".join(message_texts[:2]).strip()
    language = (learning_language or "en").lower()
    if language.startswith("ko"):
        items = [
            {"content": "오늘도 안부를 전할 수 있어 기뻐요.", "content_type": "sentence"},
            {"content": "천천히 확인해도 괜찮아요.", "content_type": "sentence"},
            {"content": "부담 없이 대화를 이어가요.", "content_type": "sentence"},
        ]
        return items
    items = [
        {"content": "I hope you're doing well.", "content_type": "sentence"},
        {"content": "I appreciate your message.", "content_type": "sentence"},
        {"content": "It's okay to take things slowly.", "content_type": "sentence"},
    ]
    if "thank" in sample.lower():
        items[2] = {"content": "Thank you for sharing that with me.", "content_type": "sentence"}
    return items


def _normalize_learning_items(
    value: object,
    learning_language: str | None,
) -> list[dict[str, str]]:
    items: list[dict[str, str]] = []
    if isinstance(value, list):
        for item in value:
            if not isinstance(item, dict):
                continue
            content = item.get("content")
            content_type = item.get("content_type")
            if not content or content_type != "sentence":
                continue
            items.append({"content": content, "content_type": "sentence"})
    if len(items) >= 3:
        return items[:3]
    return _fallback_learning_items([], learning_language)


def _normalize_tags(value: object) -> list[str]:
    if not value:
        return []
    if isinstance(value, list):
        return [item for item in value if isinstance(item, str) and item in TAG_TAXONOMY][:5]
    if isinstance(value, str) and value in TAG_TAXONOMY:
        return [value]
    return []


def _normalize_warning_tags(value: object, tags: list[str]) -> list[str]:
    if not value:
        return []
    if isinstance(value, list):
        filtered = [item for item in value if isinstance(item, str) and item in TAG_TAXONOMY]
        return [item for item in filtered if item in tags][:3]
    if isinstance(value, str) and value in tags:
        return [value]
    return []


def _default_warning_tags(tags: list[str]) -> list[str]:
    if not tags:
        return []
    return tags[:3]
