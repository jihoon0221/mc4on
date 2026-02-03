from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime
from pathlib import Path
import re


_KAKAO_MESSAGE_RE = re.compile(
    r"^(?P<date>\d{4}\.\s*\d{1,2}\.\s*\d{1,2}\.)\s*"
    r"(?P<ampm>오전|오후)\s*(?P<time>\d{1,2}:\d{2}),\s*"
    r"(?P<sender>[^:]+)\s*:\s*(?P<content>.+)$"
)
_KAKAO_SYSTEM_RE = re.compile(
    r"^(?P<date>\d{4}\.\s*\d{1,2}\.\s*\d{1,2}\.)\s*"
    r"(?P<ampm>오전|오후)\s*(?P<time>\d{1,2}:\d{2}):\s*(?P<content>.+)$"
)
_KAKAO_DATE_HEADER_RE = re.compile(r"^\d{4}년\s*\d{1,2}월\s*\d{1,2}일")
_PHOTO_DATE_RE = re.compile(r"^(?P<ymd>\d{8})_\d{6}(?:_\d+)?$")


@dataclass(frozen=True)
class ParsedMessage:
    sent_at: datetime
    sender_name: str | None
    content: str


def parse_kakao_text(text: str) -> list[ParsedMessage]:
    messages: list[ParsedMessage] = []
    for raw_line in text.splitlines():
        line = raw_line.strip()
        if not line:
            continue
        if _KAKAO_DATE_HEADER_RE.match(line):
            continue

        match = _KAKAO_MESSAGE_RE.match(line)
        if match:
            sent_at = _parse_kakao_datetime(
                match.group("date"), match.group("ampm"), match.group("time")
            )
            messages.append(
                ParsedMessage(
                    sent_at=sent_at,
                    sender_name=match.group("sender").strip(),
                    content=match.group("content").strip(),
                )
            )
            continue

        system_match = _KAKAO_SYSTEM_RE.match(line)
        if system_match:
            sent_at = _parse_kakao_datetime(
                system_match.group("date"), system_match.group("ampm"), system_match.group("time")
            )
            messages.append(
                ParsedMessage(
                    sent_at=sent_at,
                    sender_name=None,
                    content=system_match.group("content").strip(),
                )
            )
            continue

        if messages:
            last = messages[-1]
            messages[-1] = ParsedMessage(
                sent_at=last.sent_at,
                sender_name=last.sender_name,
                content=f"{last.content}\n{line}",
            )

    return messages


def extract_photo_date(filename: str) -> date | None:
    stem = Path(filename).stem
    match = _PHOTO_DATE_RE.match(stem)
    if not match:
        return None
    ymd = match.group("ymd")
    return date(int(ymd[0:4]), int(ymd[4:6]), int(ymd[6:8]))


def filter_new_messages(
    messages: list[ParsedMessage], last_date: date | None
) -> list[ParsedMessage]:
    if last_date is None:
        return messages
    return [message for message in messages if message.sent_at.date() > last_date]


def dedupe_messages(messages: list[ParsedMessage]) -> list[ParsedMessage]:
    seen: set[tuple[str, str | None, str]] = set()
    unique: list[ParsedMessage] = []
    for message in messages:
        key = (message.sent_at.date().isoformat(), message.sender_name, message.content)
        if key in seen:
            continue
        seen.add(key)
        unique.append(message)
    return unique


def max_message_date(messages: list[ParsedMessage]) -> date | None:
    if not messages:
        return None
    return max(message.sent_at.date() for message in messages)


def _parse_kakao_datetime(date_str: str, ampm: str, time_str: str) -> datetime:
    parts = [p for p in re.split(r"[.\s]+", date_str) if p]
    year = int(parts[0])
    month = int(parts[1])
    day = int(parts[2])
    hour, minute = (int(p) for p in time_str.split(":"))
    if ampm == "오후" and hour < 12:
        hour += 12
    if ampm == "오전" and hour == 12:
        hour = 0
    return datetime(year, month, day, hour, minute)
