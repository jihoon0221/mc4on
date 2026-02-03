from __future__ import annotations

from typing import Tuple

from app.clients.external.account_client import AccountRiskClient
from app.clients.external.base import CheckDetail
from app.clients.external.link_client import LinkReputationClient
from app.clients.external.photo_client import PhotoRiskClient
from app.core.config import settings


_link_client = LinkReputationClient(
    api_key=settings.link_check_api_key,
    base_url=settings.link_check_base_url,
    timeout_seconds=settings.external_check_timeout_seconds,
    cache_ttl_seconds=settings.link_cache_ttl_seconds,
)
_account_client = AccountRiskClient(
    api_key=settings.account_check_api_key,
    base_url=settings.account_check_base_url,
    timeout_seconds=settings.external_check_timeout_seconds,
    cache_ttl_seconds=settings.account_cache_ttl_seconds,
)
_photo_client = PhotoRiskClient(
    api_key=settings.photo_check_api_key,
    base_url=settings.photo_check_base_url,
    timeout_seconds=settings.external_check_timeout_seconds,
    cache_ttl_seconds=settings.photo_cache_ttl_seconds,
)


def check_link(url: str) -> tuple[bool, CheckDetail | None]:
    return _link_client.check(url)


def check_account(account: str) -> tuple[bool, CheckDetail | None]:
    return _account_client.check(account)


def check_photo(filename: str, data: bytes) -> tuple[bool, CheckDetail | None]:
    return _photo_client.check(filename, data)
