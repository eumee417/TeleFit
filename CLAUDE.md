# CLAUDE.md — telefit 프로젝트 지침

이 문서는 AI 코딩 어시스턴트(Claude Code 등)가 이 레포에서 작업할 때 따라야 할 규칙이다.
`agent/`, `backend/`, `frontend/`, `infra/` 전체에 적용된다. 각 서비스 폴더에 별도
CLAUDE.md/AGENTS.md가 있다면 이 문서를 우선 원칙으로 삼고 세부사항만 보충한다.

## 프로젝트 한 줄 요약

통신사 요금제·결합할인·단말기 보조금을 통합 계산해 최적 조합을 추천하는 LangGraph 기반 AI Agent 서비스.
원티드 AI 챔피언십 출품작 + AI Agent 개발자 취업 포트폴리오.

## 기술 스택

| 영역 | 스택 |
|---|---|
| frontend | Next.js, TypeScript, Tailwind (Vercel 배포) |
| backend | NestJS, TypeScript |
| agent | Python, FastAPI, LangGraph |
| DB | PostgreSQL + pgvector |
| 임베딩/리랭커 | Hugging Face (`sentence-transformers`, 크로스인코더) |
| jobId 저장소 | Redis (raw SET/GET/EXPIRE만 사용, BullMQ 등 큐 라이브러리 미사용, TTL 10분) |
| 배포 | Docker Compose (nginx, backend, agent, postgres, redis) on EC2 |

## 절대 원칙 (위반 시 반려)

1. **금액 계산은 절대 LLM이 직접 하지 않는다.** 반드시 `agent/tools/cost_calculator.py`의
   파이썬 함수를 Tool Calling으로 호출한다. LLM이 프롬프트 안에서 숫자를 곱하거나 더하는
   코드를 작성/승인하지 않는다.
2. **결합상품 검증 규칙은 코드에 하드코딩하지 않는다.** 새 결합상품 조건은 `combine_rules`
   테이블에 데이터로 추가한다. `RuleValidator`는 항상 DB에서 규칙을 조회해 순회하는
   범용 함수로 유지한다 (`if combine_type == "가족결합"` 같은 분기 금지).
3. **PII는 저장·로그에 남기지 않는다.** `screenshot_image`, `raw_text_input`은 마스킹/파싱
   직후 폐기한다. `masked_input` 이후 단계만 로그 가능.
4. **서버는 사용자 세션을 갖지 않는다.** 되묻기(Clarification)는 프론트가
   `priorRequirements`를 다음 요청에 실어 보내는 방식으로 처리한다. Redis는 jobId 단위
   진행상황 추적(TTL 10분)에만 쓰고, 로그인/인증 상태 저장에는 쓰지 않는다.
5. **Grader 재시도 상한은 3회다.** `MAX_RETRIES = 3`을 넘기면 무한 루프 대신 위반 항목이
   가장 적은 조합을 Fallback으로 반환한다 (`isFallback: true`).
6. **DB 접근은 Retriever Node로만 한정한다.** Calculator/Grader는 DB를 직접 쿼리하지 않고,
   Retriever가 State에 담아준 `structured_context`/`unstructured_context`만 사용하는
   순수 함수로 유지한다.
7. **큐 라이브러리(BullMQ, Celery 등)와 WebSocket은 쓰지 않는다.** 진행상황 추적은
   NestJS가 Redis에 `job:{jobId}` 키로 상태를 직접 SET/GET하고, 프론트는 1~2초 간격
   폴링(`GET /api/recommend/:jobId`)으로 확인한다. Python `agent`는 Redis를 전혀 모르며,
   NestJS가 HTTP로 동기 호출하는 FastAPI 서비스로만 존재한다.

## 네이밍 컨벤션

- TypeScript 계층(frontend, backend API): **camelCase**
- Python/DB 계층: **snake_case**
- 변환 경계는 NestJS DTO에서만 처리한다. Python이나 프론트가 서로의 네이밍 컨벤션을
  직접 알 필요는 없다.

## 폴더 구조 및 배치 규칙

```
telefit/
├── agent/
│   ├── core/         # state.py, config.py, db 조회, 임베딩/리랭커 모델 로딩
│   ├── nodes/         # router/retriever/calculator/grader/output 각 LangGraph 노드
│   ├── tools/          # cost_calculator.py, rule_validator.py — 순수 함수, LLM 컨텍스트 없이 단위 테스트 가능해야 함
│   └── worker.py        # FastAPI 엔트리포인트 (/agent/recommend 노출). NestJS가 동기 HTTP로 호출
├── backend/
│   └── src/
│       ├── recommend/    # POST /api/recommend(즉시 202+jobId 반환 후 백그라운드로 agent 호출),
│       │                   GET /api/recommend/:jobId(Redis에서 상태 조회, 폴링용)
│       ├── jobs/           # Redis SET/GET/EXPIRE 래퍼 (큐 라이브러리 아님, 단순 상태 저장소)
│       ├── plans/           # POST /api/plans/search
│       └── calculate/        # POST /api/calculate
├── frontend/
│   └── app/
│       └── components/       # ScreenshotUpload, ChatInput, PlanCard 등
└── infra/
    ├── db_init/                # schema.sql, seed/*.sql
    └── docker-compose.yml     # nginx, backend, agent, postgres, redis
```

새 파일을 어디에 둘지 애매하면 위 표를 따르고, 표에 없는 종류의 파일이면 만들기 전에
사용자에게 배치 위치를 확인한다.

## API 계약

전체 요청/응답 스펙은 `docs/api_contract.md`를 따른다. 임의로 필드명을 바꾸거나
엔드포인트를 추가하기 전에 그 문서를 먼저 갱신한다.

- `POST /api/recommend` → `202 { jobId }`, `GET /api/recommend/:jobId`로 폴링
- `POST /api/plans/search` → 즉시 응답 (LangGraph 미사용)
- `POST /api/calculate` → 즉시 응답 (Router/Retriever/Grader 미거침, Calculator만 단독 호출)

## State 스키마

`agent/core/state.py`의 `AgentState`가 단일 진실 소스(source of truth)다. 새 필드가
필요하면 이 파일을 먼저 수정하고, 다른 노드 코드를 그에 맞춰 갱신한다. State는 요청
1건 처리 중에만 메모리에 존재하며 DB에 영속 저장하지 않는다.

## DB 스키마 원칙

`infra/db_init/schema.sql`이 기준이다. 3NF 원칙을 따르고, 새 테이블/컬럼을 추가할 때는
- 정형 데이터(가격, 조건 등 SQL로 필터링해야 하는 값) → 일반 컬럼
- 비정형 데이터(약관 문구 등 의미 검색이 필요한 텍스트) → `terms_documents` + pgvector
로 구분해서 넣는다. 숫자·명칭 데이터를 벡터 검색으로만 다루지 않는다.
