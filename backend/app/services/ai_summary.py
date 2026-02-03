from __future__ import annotations

from app.clients.external.base import SimpleTTLCache
from app.clients.gemini_client import GeminiClient
from app.clients.groq_client import GroqClient
from app.clients.hf_client import HuggingFaceClient
from app.clients.openai_client import OpenAIClient
from app.core.config import settings


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


def generate_summary(message_texts: list[str]) -> str | None:
    if settings.groq_api_key and settings.groq_model_summary:
        normalized = _normalize_messages(message_texts)
        if not normalized:
            return None
        prompt = _build_prompt(normalized)
        response = _groq_client.generate_json(settings.groq_model_summary, prompt)
        if response and response.get("summary"):
            return response.get("summary")
    if settings.gemini_api_key and settings.gemini_model_summary:
        normalized = _normalize_messages(message_texts)
        if not normalized:
            return None
        prompt = _build_prompt(normalized)
        response = _gemini_client.generate_json(settings.gemini_model_summary, prompt)
        if response and response.get("summary"):
            return response.get("summary")
    if settings.hf_api_key and settings.hf_model_summary:
        normalized = _normalize_messages(message_texts)
        if not normalized:
            return None
        prompt = _build_prompt(normalized)
        response = _hf_client.generate_json(settings.hf_model_summary, prompt)
        if response and response.get("summary"):
            return response.get("summary")
    if not settings.openai_model_summary:
        return None
    normalized = _normalize_messages(message_texts)
    if not normalized:
        return None
    cache_key = "|".join(normalized)
    cached = _cache.get(cache_key)
    if cached:
        return cached
    prompt = _build_prompt(normalized)
    schema = {
        "name": "summary_schema",
        "schema": {
            "type": "object",
            "properties": {"summary": {"type": ["string", "null"]}},
            "required": ["summary"],
            "additionalProperties": False,
        },
        "strict": True,
    }
    response = _client.structured_response(settings.openai_model_summary, prompt, schema)
    if not response:
        response = _client.structured_response(settings.openai_model_summary, prompt, schema)
    if not response:
        return None
    summary = response.get("summary")
    if summary:
        _cache.set(cache_key, summary)
    return summary


def generate_short_summary(
    message_texts: list[str],
    full_summary: str | None = None,
) -> str | None:
    if settings.groq_api_key and settings.groq_model_summary:
        normalized = _normalize_messages(message_texts)
        if not normalized:
            return None
        prompt = _build_short_prompt(normalized, full_summary)
        response = _groq_client.generate_json(settings.groq_model_summary, prompt)
        if response and response.get("short_summary"):
            return _normalize_short_summary(response.get("short_summary"))
    if settings.gemini_api_key and settings.gemini_model_summary:
        normalized = _normalize_messages(message_texts)
        if not normalized:
            return None
        prompt = _build_short_prompt(normalized, full_summary)
        response = _gemini_client.generate_json(settings.gemini_model_summary, prompt)
        if response and response.get("short_summary"):
            return _normalize_short_summary(response.get("short_summary"))
    if settings.hf_api_key and settings.hf_model_summary:
        normalized = _normalize_messages(message_texts)
        if not normalized:
            return None
        prompt = _build_short_prompt(normalized, full_summary)
        response = _hf_client.generate_json(settings.hf_model_summary, prompt)
        if response and response.get("short_summary"):
            return _normalize_short_summary(response.get("short_summary"))
    if not settings.openai_model_summary:
        return None
    normalized = _normalize_messages(message_texts)
    if not normalized:
        return None
    cache_key = "short|" + "|".join(normalized) + "|" + (full_summary or "")
    cached = _cache.get(cache_key)
    if cached:
        return cached
    prompt = _build_short_prompt(normalized, full_summary)
    schema = {
        "name": "short_summary_schema",
        "schema": {
            "type": "object",
            "properties": {"short_summary": {"type": ["string", "null"]}},
            "required": ["short_summary"],
            "additionalProperties": False,
        },
        "strict": True,
    }
    response = _client.structured_response(settings.openai_model_summary, prompt, schema)
    if not response:
        response = _client.structured_response(settings.openai_model_summary, prompt, schema)
    if not response:
        return None
    short_summary = _normalize_short_summary(response.get("short_summary"))
    if short_summary:
        _cache.set(cache_key, short_summary)
    return short_summary


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


def _build_prompt(messages: list[str]) -> str:
    joined = "\n".join(f"- {m}" for m in messages)
    return (
        "다음 대화 요약을 중립적으로 생성하세요. 단정하거나 판단하지 마세요.\n"
        "요약은 2~3줄로 작성하고, 4줄을 넘기지 마세요.\n"
        "경고/주의 문구는 포함하지 마세요.\n"
        "문장 끝은 부드럽게 마무리하세요. 예: \"~했어요\", \"~하셨네요\", \"~처럼 보였어요\".\n"
        "의심을 단정하는 표현은 피하세요.\n"
        "결과는 JSON으로 summary 필드만 반환하세요.\n\n"
        f"{joined}"
    )


def _build_short_prompt(messages: list[str], full_summary: str | None) -> str:
    joined = "\n".join(f"- {m}" for m in messages)
    summary_hint = f"\n\n[기존 요약]\n{full_summary}" if full_summary else ""
    return (
        "다음 대화를 한 문장으로 부드럽게 요약하세요.\n"
        "사실 기반으로 요약하되, 위험/경고 단어는 사용하지 마세요.\n"
        "확정적 단정은 피하고, 문장 끝은 반드시 부드러운 종결형으로 마무리하세요. 예: \"~했어요\", \"~했네요\", \"~처럼 보였어요\".\n"
        "결과는 JSON으로 short_summary 필드만 반환하세요.\n\n"
        f"{joined}"
        f"{summary_hint}"
    )


def _normalize_short_summary(value: object) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    if not text:
        return None
    text = " ".join(text.split())
    text = _first_sentence(text)
    return _ensure_soft_ending(text)


def _first_sentence(text: str) -> str:
    for idx, ch in enumerate(text):
        if ch in ".!?":
            return text[: idx + 1].strip()
    return text.strip()


def _ensure_soft_ending(text: str) -> str:
    if not text:
        return text
    if text.endswith(("요.", "네요.", "입니다.", "해요.", "했어요.", "보였어요.", "했네요.")):
        return text
    if text.endswith((".", "!", "?")):
        return text[:-1] + "어요."
    return text + "어요."
