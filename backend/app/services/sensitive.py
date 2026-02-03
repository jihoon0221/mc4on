from __future__ import annotations

import re

from app.models.models import EntityTypeEnum


EMAIL_RE = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")
PHONE_RE = re.compile(r"\b(?:\+?\d{1,3}[\s-]?)?(?:\(?\d{2,3}\)?[\s-]?)?\d{3,4}[\s-]?\d{4}\b")
LINK_RE = re.compile(r"https?://[^\s]+")
ACCOUNT_RE = re.compile(r"\b\d{8,20}\b")
ADDRESS_RE = re.compile(r"\b\d{1,5}\s+\w+\s+(?:Street|St|Avenue|Ave|Road|Rd|Lane|Ln|Blvd|Boulevard)\b", re.IGNORECASE)


def detect_entities(text: str) -> list[tuple[EntityTypeEnum, str]]:
    entities: list[tuple[EntityTypeEnum, str]] = []

    for match in EMAIL_RE.findall(text):
        entities.append((EntityTypeEnum.email, match))
    for match in PHONE_RE.findall(text):
        entities.append((EntityTypeEnum.phone, match))
    for match in LINK_RE.findall(text):
        entities.append((EntityTypeEnum.link, match))
    for match in ACCOUNT_RE.findall(text):
        entities.append((EntityTypeEnum.account, match))
    for match in ADDRESS_RE.findall(text):
        entities.append((EntityTypeEnum.address, match))

    return entities


def mask_text(text: str) -> str:
    masked = EMAIL_RE.sub("[email]", text)
    masked = PHONE_RE.sub("[phone]", masked)
    masked = LINK_RE.sub("[link]", masked)
    masked = ACCOUNT_RE.sub("[account]", masked)
    masked = ADDRESS_RE.sub("[address]", masked)
    return masked
