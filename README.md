# BirdGuard (mc4on)

외국인 연인을 둔 사람을 위한 로맨스 스캠(연애 사기) 탐지 앱. 카카오톡 대화를 분석해서 위험 신호를 감지하고, 위험도가 일정 수준을 넘으면 신고를 유도한다.

## 문제의식

국제 연애 사기(로맨스 스캠)는 상대가 실제로 존재하지 않거나 신원을 속이는 경우가 많은데, 피해자는 감정적으로 얽혀 있어 위험 신호를 스스로 알아채기 어렵다. BirdGuard는 대화 내용을 분석해 전형적인 스캠 패턴(급전 요구, 금액 escalation, 결혼 미끼, 만남 회피 등)을 태깅하고, 이를 근거 자료로 정리해서 신고까지 이어지도록 설계했다. 판단은 사용자가 하도록 하고, 앱은 "관찰/기록" 톤을 유지해 단정적으로 몰아가지 않는 것을 원칙으로 했다.

## 핵심 기능

- 카카오톡 대화 내보내기 파일 업로드 및 분석 (`kakao_import`)
- 스캠 패턴 태그 자동 분류 — 28개 태그 체계(`money_request`, `urgency`, `marriage_future_bait`, `avoid_meeting`, `wealthy_claim`, `frozen_assets_tax`, `catfishing`, `crypto_moneygram` 등)
- 링크/계좌/사진에 대한 외부 평판 조회 (사기 링크, 도용 프로필 사진 등 확인)
- 위험도 기반 타임라인 및 리포트
- 기간별 증거 자료(evidence) 번들 export — 신고 시 활용
- 90일 데이터 보존 정책 및 민감정보 암호화 저장
- Google 로그인 기반 인증

## 아키텍처

```
[Expo(React Native) 모바일 앱]  ── Google OAuth 로그인
        │
        ▼
[FastAPI 백엔드]
   ├─ kakao_import → 대화/메시지 파싱 및 저장 (PostgreSQL, SQLAlchemy/Alembic)
   ├─ risk / ai_risk → 규칙 기반 이벤트 탐지 + Groq LLM 기반 태그·설명 생성
   ├─ external_checks → 링크 평판 / 계좌 위험도 / 사진 역검색 API 연동 (캐시 TTL 적용)
   ├─ evidence → 기간별 증거 자료 번들링 및 export
   └─ retention → 90일 보존 정책에 따른 자동 삭제
        │
        ▼
[PostgreSQL]  Conversation / Message / RiskEvent / User (partner_country, partner_job 등)
```

## 기술 스택

| 영역 | 기술 |
|---|---|
| Frontend | Expo (React Native), TypeScript, expo-router |
| Backend | FastAPI, SQLAlchemy, Alembic, PostgreSQL |
| AI | Groq API (위험 태그·설명 생성) |
| 인증/보안 | Google OAuth, 대화 데이터 암호화(`ENCRYPTION_KEY`) |
| 외부 연동 | Link Reputation API, Account Check API, Photo Check API |

## 기술적으로 고민한 부분

- **AI의 역할을 "판단"이 아닌 "설명"으로 제한**: 위험 여부 자체는 규칙 기반 이벤트(키워드, 금액 escalation 패턴 등)로 탐지하고, Groq LLM은 이미 탐지된 이벤트에 대해 중립적인 설명과 태그만 생성하도록 프롬프트를 제한했다("설명은 단정하지 말고 관찰/기록 톤을 유지"). 연애 관계에 대한 민감한 판단을 AI가 확정적으로 내리지 않게 하려는 설계.
- **28개 태그 분류 체계 설계**: 실제 로맨스 스캠 사례에서 반복되는 패턴(급전 요구 → 금액 상승 → 긴급성 강조 → 결혼 언급 → 만남 회피 → 관세/의료비 명목 송금 요구 → 암호화폐/머니그램 결제)을 태그로 구조화해서, 단순 키워드 매칭보다 스토리 흐름(`script_stage`)까지 잡아내려 했다.
- **외부 검증 API 캐싱**: 링크/계좌/사진 검증은 외부 API 호출 비용과 응답 지연이 있어서, 항목별로 캐시 TTL을 다르게 뒀다 (사진 검증 7일, 계좌/링크 1일) — 같은 데이터를 반복 조회하지 않도록.
- **민감 데이터 처리 원칙**: 대화 내용이라는 민감한 개인정보를 다루기 때문에, 암호화 저장과 90일 자동 삭제(`DATA_RETENTION_DAYS`) 정책을 초기 설계 단계부터 넣었다.

## 실행 방법

**Backend**
```bash
cd backend
cp .env.example .env   # DATABASE_URL, GROQ_API_KEY, GOOGLE_CLIENT_ID 등 채우기
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload
```

**Frontend**
```bash
cd frontend
npm install
npx expo start
```

## 회고 / 다음 할 것

- 외부 검증 API(링크/계좌/사진) 연동은 실제 제공사 키가 필요해 현재는 목업/개발 환경 위주로 검증됨
- 다국어(파트너 언어) 대응 확장 여지 있음
- 신고 유도 이후 실제 신고 플로우(기관 연계)는 아직 안내 수준

---

이 프로젝트는 팀 프로젝트로 진행되었다 (여러 브랜치: `Yeaeun`, `jh`, `backlogic` 등).
