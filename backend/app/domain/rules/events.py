from __future__ import annotations

from dataclasses import dataclass
import re


_MONEY_REQUEST_PATTERNS = [
    r"\b송금\b",
    r"\b이체\b",
    r"\b입금\b",
    r"돈\s*보내",
    r"돈\s*부쳐",
    r"수수료",
    r"비용\s*(?:대납|부탁|필요)",
    r"\b대납\b",
    r"\b선불\b",
    r"기프트\s*카드",
    r"통관비|관세|보관비|보관료",
    r"비자\s*비용|비자\s*발급비",
    r"항공료|비행기\s*표|티켓\s*값",
    r"의료비|치료비|병원비",
    r"벌금|보석금|세금\s*대납",
    r"수수료\s*납부",
]
_PAYMENT_METHOD_PATTERNS = [
    r"기프트\s*카드|상품권|문화상품권",
    r"구글\s*플레이|구글플레이|아이튠즈|스팀\s*카드",
    r"머니그램|웨스턴\s*유니온",
    r"비트코인|bitcoin|usdt|테더|암호화폐|코인|crypto",
    r"지갑\s*주소|wallet\s*address",
]
_WEALTHY_PATTERNS = [
    r"\b상속\b",
    r"\b유산\b",
    r"자산\s*동결",
    r"\b재산\b",
    r"세금\s*문제",
    r"은행\s*계좌",
    r"변호사\s*비용|변호사\s*선임",
    r"상속\s*절차|상속\s*서류",
    r"inheritance",
    r"frozen\s*account",
]
_SOLDIER_PATTERNS = [
    r"\b군인\b",
    r"\b파병\b",
    r"\b미군\b",
    r"\b이라크\b",
    r"\b시리아\b",
    r"\b군의관\b",
    r"\b평화유지\b",
    r"\b유엔\b",
    r"soldier",
    r"deployment",
]
_CUSTOMS_PATTERNS = [
    r"\b통관\b",
    r"\b세관\b",
    r"\b관세\b",
    r"배송\s*문제",
    r"\b화물\b",
    r"\b소포\b",
    r"\b선물\b",
    r"\b물류\b",
    r"\b수입\b",
    r"\b보관\b",
    r"customs",
    r"clearance",
]
_PLATFORM_SWITCH_PATTERNS = [
    r"카카오톡|카톡",
    r"whatsapp|왓츠앱",
    r"telegram|텔레그램",
    r"line|라인",
    r"wechat|위챗",
    r"skype|스카이프",
    r"google\s*chat|구글\s*챗",
]
_IMPERSONATION_PATTERNS = [
    r"\b의사\b",
    r"\b사업가\b",
    r"\b외교관\b",
    r"\b군인\b",
    r"\b선교사\b",
    r"\b기자\b",
    r"\b언론인\b",
    r"\b엔지니어\b",
    r"\b의료기기\b",
    r"doctor|businessman|diplomat|missionary|journalist|engineer",
]
_PERSONAL_INFO_PATTERNS = [
    r"\b주소\b",
    r"\b성명\b",
    r"\b주민번호\b",
    r"연락처",
    r"\b여권\b",
    r"신분증",
    r"계좌번호",
]
_URGENCY_PATTERNS = [
    r"\b긴급\b",
    r"\b급해\b",
    r"지금\s*당장",
    r"오늘\s*안에",
    r"마감\s*임박",
    r"asap",
]


@dataclass(frozen=True)
class Event:
    type: str
    evidence: list[str]
    severity: int
    meta: dict


def extract_events_from_messages(message_texts: list[str]) -> list[Event]:
    text = "\n".join(message_texts)
    lowered = text.lower()
    events: list[Event] = []

    def add_event(event_type: str, evidence: list[str], severity: int, meta: dict | None = None) -> None:
        if not evidence:
            return
        events.append(
            Event(
                type=event_type,
                evidence=evidence[:3],
                severity=severity,
                meta=meta or {},
            )
        )

    def find_hits(patterns: list[str]) -> list[str]:
        hits: list[str] = []
        for pattern in patterns:
            if re.search(pattern, lowered):
                hits.append(pattern)
        return hits

    money_hits = find_hits(_MONEY_REQUEST_PATTERNS)
    add_event("money_request", money_hits, severity=3)

    payment_hits = find_hits(_PAYMENT_METHOD_PATTERNS)
    add_event("payment_method_risky", payment_hits, severity=3)

    wealthy_hits = find_hits(_WEALTHY_PATTERNS)
    add_event("romance_scam_wealthy", wealthy_hits, severity=4)

    soldier_hits = find_hits(_SOLDIER_PATTERNS)
    add_event("romance_scam_soldier", soldier_hits, severity=4)

    customs_hits = find_hits(_CUSTOMS_PATTERNS)
    add_event("romance_scam_customs", customs_hits, severity=4)

    platform_hits = find_hits(_PLATFORM_SWITCH_PATTERNS)
    add_event("platform_switch", platform_hits, severity=2)

    impersonation_hits = find_hits(_IMPERSONATION_PATTERNS)
    add_event("impersonation_role", impersonation_hits, severity=2)

    personal_hits = find_hits(_PERSONAL_INFO_PATTERNS)
    add_event("personal_info_request", personal_hits, severity=2)

    urgency_hits = find_hits(_URGENCY_PATTERNS)
    add_event("urgency_pressure", urgency_hits, severity=2)

    if re.search(r"\b해외\b|\b외국\b|overseas|abroad", lowered):
        add_event("overseas_distance", ["overseas"], severity=1)

    return events
