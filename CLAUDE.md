# 프로젝트 작업 컨벤션 (BirdGuard / mc4on)

팀 프로젝트 (Yeaeun, jh 등 공동 작업). 브랜치 정리 시 팀원과 먼저 상의할 것.

## 브랜치
- `main`: 배포 가능 상태
- `feature/*`, `fix/*`: 기능/버그
- 팀원별 브랜치(`Yeaeun`, `jh` 등)는 기존 관례 유지, 새 작업은 `feature/*`로 전환 권장

## 커밋 메시지
```
feat: 새 기능
fix: 버그 수정
refactor: 동작 변화 없는 개선
docs: 문서만 변경
chore: 빌드설정, 의존성
```

## 이 프로젝트 특이사항 (중요 — 민감정보 다루는 앱)
- **`.env`, `ENCRYPTION_KEY`, `GROQ_API_KEY`, `GOOGLE_CLIENT_ID` 등은 절대 커밋하지 않는다.** `.env.example`만 갱신.
- **AI(Groq)는 위험 "판단"이 아니라 "설명/태그 생성"에만 쓴다.** 이 경계를 넘는 프롬프트 변경(예: AI가 직접 "이건 사기다"라고 단정하게 만드는 것)은 하지 않는다 — 오탐으로 인한 관계 훼손 리스크 때문.
- **TAG_TAXONOMY(`domain/taxonomy.py`)에 태그를 추가/변경할 때는 팀과 합의 후 진행.** 임의로 태그를 늘리면 프론트/AI 프롬프트와 어긋난다.
- **DATA_RETENTION_DAYS(90일) 정책을 건드리는 변경은 신중히.** 개인정보(대화 내용) 보존 기간과 직결됨.
- 외부 검증 API(link/account/photo) 키가 없어도 개발 가능하도록 캐시/mock 경로가 있는지 확인 후 작업.

## 커밋 전 체크
- `alembic upgrade head`로 마이그레이션 정합성 확인
- 민감 데이터가 로그에 그대로 찍히지 않는지 확인 (카톡 원문, 개인정보 등)
