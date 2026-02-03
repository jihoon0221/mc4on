from __future__ import annotations

from app.clients.external.base import SimpleTTLCache
from app.clients.openai_client import OpenAIClient
from app.core.config import settings


_client = OpenAIClient(
    api_key=settings.openai_api_key,
    base_url=settings.openai_base_url,
    timeout_seconds=settings.openai_timeout_seconds,
)
_cache = SimpleTTLCache(settings.summary_cache_ttl_seconds)


def generate_quiz_items(message_texts: list[str]) -> list[str]:
    if not settings.openai_model_quiz:
        return []
    normalized = _normalize_messages(message_texts)
    if not normalized:
        return []
    cache_key = "quiz|" + "|".join(normalized)
    cached = _cache.get(cache_key)
    if cached:
        return cached
    prompt = _build_prompt(normalized)
    schema = {
        "name": "quiz_schema",
        "schema": {
            "type": "object",
            "properties": {
                "quizzes": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "text": {"type": "string"}
                        },
                        "required": ["text"],
                        "additionalProperties": False,
                    },
                    "minItems": 1,
                    "maxItems": 3,
                }
            },
            "required": ["quizzes"],
            "additionalProperties": False,
        },
        "strict": True,
    }
    response = _client.structured_response(settings.openai_model_quiz, prompt, schema)
    if not response:
        return []
    quizzes = []
    for item in response.get("quizzes", []):
        text = item.get("text") if isinstance(item, dict) else None
        if text:
            quizzes.append(text)
    if quizzes:
        _cache.set(cache_key, quizzes)
    return quizzes


def _normalize_messages(message_texts: list[str]) -> list[str]:
    seen = set()
    output = []
    for text in message_texts:
        cleaned = " ".join(text.strip().split())
        if not cleaned or cleaned in seen:
            continue
        seen.add(cleaned)
        output.append(cleaned[:500])
        if len(output) >= 40:
            break
    return output


def _build_prompt(messages: list[str]) -> str:
    joined = "\n".join(f"- {m}" for m in messages)
    return (
        "다음 대화 내용을 바탕으로 관찰/기록 톤의 퀴즈 문장을 생성하세요.\n"
        "정답을 요구하지 말고, 사용자가 스스로 맥락을 떠올리게 하는 질문 형태로 만드세요.\n"
        "불필요한 조언/판단은 하지 마세요.\n"
        "1~3개 생성하세요.\n"
        "결과는 JSON으로 quizzes 배열만 반환하세요.\n\n"
        f"{joined}"
    )
