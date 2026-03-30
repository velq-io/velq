\# CLAUDE.md — Velq Project Guide



\## 프로젝트 개요



Velq는 Paperclip(MIT 라이선스)을 포크하여 만든 차세대 AI 에이전트 오케스트레이션 플랫폼이다.

"Based on Paperclip (MIT)" 원본 크레딧을 유지하며, 아래 21개 항목을 개선/추가한다.



\- 공식 사이트: https://velq.io

\- GitHub: https://github.com/velq-io/velq

\- FA 마켓플레이스 (Phase 5): market.velq.io



\---



\## 기술 스택 (원본 유지)



\- Runtime: Node.js 20+, pnpm 9.15+

\- Backend: TypeScript, Express (localhost:3100)

\- Frontend: React (same-origin dev middleware)

\- Database: Embedded PostgreSQL (auto-managed)

\- Data 경로: \~/.paperclip/ → 리브랜딩 후 \~/.velq/

\- 라이선스: MIT



\---



\## 디렉토리 구조 (핵심)



&#x20;   velq/

&#x20;   ├── CLAUDE.md                 ← 이 파일

&#x20;   ├── LICENSE                   ← MIT (원본 Paperclip 크레딧 유지)

&#x20;   ├── package.json

&#x20;   ├── pnpm-workspace.yaml

&#x20;   ├── packages/

&#x20;   │   ├── server/               ← API 서버 (Express + DB)

&#x20;   │   ├── ui/                   ← React 대시보드

&#x20;   │   ├── cli/                  ← CLI (paperclipai → velq 변경)

&#x20;   │   ├── shared/               ← 공유 타입/유틸

&#x20;   │   └── adapters/             ← 에이전트 어댑터

&#x20;   ├── doc/                      ← 문서

&#x20;   ├── scripts/                  ← 스크립트

&#x20;   └── data/                     ← 로컬 데이터



\---



\## 개발 명령어



&#x20;   pnpm install              # 의존성 설치

&#x20;   pnpm dev                  # 풀 개발 모드 (API + UI, watch)

&#x20;   pnpm dev:once             # watch 없이 실행

&#x20;   pnpm build                # 전체 빌드

&#x20;   pnpm typecheck            # 타입 체크

&#x20;   pnpm test:run             # 테스트 실행

&#x20;   pnpm db:generate          # DB 마이그레이션 생성

&#x20;   pnpm db:migrate           # 마이그레이션 적용



\---



\## 리브랜딩 가이드 (Phase 0 — 최우선)



포크 직후 아래를 먼저 수행한다:



1\. 이름 교체: 모든 파일에서 일괄 치환

&#x20;  - Paperclip → Velq

&#x20;  - paperclip → velq

&#x20;  - PAPERCLIP → VELQ

&#x20;  - paperclipai → velq (CLI 명령어)



2\. CLI 명령어: npx paperclipai → npx velq



3\. 데이터 경로: \~/.paperclip/ → \~/.velq/



4\. 환경 변수 접두사: PAPERCLIP\_ → VELQ\_



5\. README.md: Velq 소개로 교체. "Based on Paperclip (MIT)" 명시



6\. 로고/헤더 이미지: doc/assets/ 교체 (임시로 텍스트 로고 OK)



7\. package.json 변경:

&#x20;  - name: "paperclip" → "velq"

&#x20;  - @paperclipai/server → @velq/server

&#x20;  - @paperclipai/ui → @velq/ui

&#x20;  - @paperclipai/db → @velq/db

&#x20;  - repository URL → https://github.com/velq-io/velq



8\. LICENSE 파일: 원본 Paperclip MIT 표기 유지 + Velq 추가



주의사항:

\- DB 마이그레이션 파일 내부의 테이블/컬럼명은 건드리지 않는다 (호환성)

\- 치환은 대소문자 구분하여 위 3패턴으로 처리

\- pnpm-workspace.yaml 내부 패키지명도 함께 변경



\---



\## 21개 개선 항목 로드맵



\### Phase 1 — 기반 (먼저)



| #  | 항목              | 설명                                                                 |

|----|-------------------|----------------------------------------------------------------------|

| 7  | DB/메모리 릭 수술  | heartbeat-runs API에 offset/limit 페이지네이션. /stats 경량 엔드포인트. UI 무한스크롤 |

| 14 | 테스트 인프라      | Mock Agent 시뮬레이터, E2E 시나리오, CI/CD 연동                         |

| 8  | 태스크 상태 머신   | 상태 확장: in\_progress/blocked/needs\_human/needs\_verification/done      |



\### Phase 2 — 안전



| #  | 항목                    | 설명                                                              |

|----|-------------------------|-------------------------------------------------------------------|

| 4  | 보안 최고 등급           | 에이전트별 Docker 격리, 파일/네트워크 퍼미션, API 키 암호화, 스킬 스캐너 |

| 9  | 서킷 브레이커            | 동일 오류 3회 자동 중단, 인간 에스컬레이션, 태스크당 토큰 상한         |

| 12 | 에러 격리               | 에이전트 독립 실행, 블라스트 래디우스 제한, 의존 그래프 재시도           |

| 15 | 동시성/레이스 컨디션     | DB row-level lock, 파일 메모리 → DB 전환 또는 파일 잠금              |



\### Phase 3 — 효율



| #  | 항목              | 설명                                                                |

|----|-------------------|---------------------------------------------------------------------|

| 1  | 빠른 반응 속도     | API 캐싱, DB 쿼리 최적화, 인덱싱, 프론트엔드 번들 최적화               |

| 2  | 토큰 소모량 절감   | 프롬프트 압축, 컨텍스트 윈도우 최적화, 동적 모델 라우팅                  |

| 10 | 옵저버빌리티       | 분산 트레이싱, 실시간 토큰 모니터링, 이상 탐지, JSON 구조화 로깅        |

| 16 | 백업/재해 복구     | 자동 DB 스냅샷 강화, 에이전트 상태 export/import, 원격 백업             |



\### Phase 4 — 고도화



| #  | 항목              | 설명                                                                |

|----|-------------------|---------------------------------------------------------------------|

| 3  | 자연어 판단 강화   | 태스크 완료 판정 정확도, 자가 평가 프롬프트, 판단 이유 로깅              |

| 5  | 에이전트 평가      | KPI 대시보드 (토큰절약25/보안25/성공률20/처리시간10/재작업10/에스컬5/협업5) |

| 6  | 에이전트 롤백      | 특정 시점 스냅샷으로 상태/설정 되돌리기                                 |

| 11 | 에이전트 간 통신   | 이벤트 기반 직통 메시지, 컨텍스트 핸드오프, DB 공유 상태                 |

| 13 | 클라우드 하이브리드 | 로컬/VPS/클라우드 분리, Docker-Compose/K8s, 상태 동기화                |

| 17 | 다국어/타임존      | i18n(react-i18next), 타임존(KST/UTC), 한국어 프롬프트                  |

| 18 | Agent HR 승진/좌천 | 등급 S/A/B/C/D/F, 주1회 평가, 모델/예산/권한/하트비트 자동 조정        |



\### Phase 5 — FA 마켓플레이스 (별도 클로즈드 소스)



| #  | 항목              | 설명                                                                |

|----|-------------------|---------------------------------------------------------------------|

| 19 | 자동 해고          | D등급 2주 지속 시 자동 비활성화, 스냅샷 저장, 성적표 생성               |

| 20 | 자동 채용          | 해고 발생 시 내부 승진 / FA 영입 / 신규 생성 옵션                      |

| 21 | FA 마켓플레이스    | market.velq.io, 에이전트 복사/벤치마크/등급인증/Stripe 결제/수수료15-20% |



\---



\## Agent HR 시스템 상세



\### 등급 체계



&#x20;   S등급 (★★★★★): Opus, 최대 자율/예산

&#x20;   A등급 (★★★★):  Sonnet, 높은 자율

&#x20;   B등급 (★★★):   Sonnet, 표준 (신규 에이전트 기본)

&#x20;   C등급 (★★):    Haiku, 승인 필요

&#x20;   D등급 (★):     Haiku, 최소 권한/해고 대기

&#x20;   F등급 (☠️):    자동 해고/대체 고용



\### KPI 가중치



&#x20;   토큰 절약률:        25%  →  (예상-실제)/예상 x 100

&#x20;   보안 지킴도:        25%  →  1 - (위반횟수/전체작업)

&#x20;   태스크 성공률:      20%

&#x20;   평균 처리 시간:     10%

&#x20;   재작업률:           10%

&#x20;   에스컬레이션 적절성: 5%

&#x20;   협업 기여도:         5%



\### 승진/좌천 로직 (주 1회 평가)



&#x20;   종합 점수 >= 90      → 승진 후보 (연속 2회 시 확정)

&#x20;   종합 점수 70-89      → 유지

&#x20;   종합 점수 50-69      → 경고 (연속 2회 시 좌천)

&#x20;   종합 점수 < 50       → 즉시 좌천

&#x20;   종합 점수 < 30 + 보안 위반 → 즉시 해고

&#x20;   보안 지킴도 = 0      → 무조건 좌천

&#x20;   토큰 절약률 마이너스  → 등급 동결



\---



\## 코딩 규칙



1\. 브랜치 전략: phase1/db-pagination, phase2/sandbox 등 Phase별 브랜치

2\. 커밋 메시지: \[Phase1] feat: add pagination to heartbeat-runs API

3\. 테스트: 모든 새 기능에 테스트 필수. pnpm test:run 통과 확인

4\. 타입 체크: pnpm typecheck 에러 0 유지

5\. DB 마이그레이션: 스키마 변경 시 pnpm db:generate → pnpm db:migrate

6\. 파일 단위 작업: 한 번에 하나의 파일/기능에 집중. 대규모 리팩토링 금지

7\. 원본 호환: Paperclip 원본 DB 스키마와 하위 호환 유지



\---



\## Phase 1 시작 순서 (권장)



&#x20;   1. 리브랜딩 (Phase 0)           ← 가장 먼저

&#x20;   2. 테스트 인프라 (#14)          ← 안전망 확보

&#x20;   3. DB 페이지네이션 (#7)         ← 가장 시급한 성능 이슈

&#x20;   4. 태스크 상태 머신 (#8)        ← 판단 정확도 기반



\---



\## 참고 링크



\- 원본 Paperclip: https://github.com/paperclipai/paperclip

\- 원본 문서: https://paperclip.ing/docs

\- 원본 Discord: https://discord.gg/m4HZY7xNG3

\- awesome-paperclip: https://github.com/gsxdsm/awesome-paperclip

\- 참고 이슈: #958 (페이지네이션), #1979 (태스크 상태), #447 (서킷 브레이커), #101 (퍼미션)

