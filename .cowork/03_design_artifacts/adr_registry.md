# ADR Registry

> 아키텍처 의사결정 인덱스 — 승인된 결정과 검토 중 결정을 짧게 추적한다

---

## 목적

- ADR의 상태와 제목, 날짜를 빠르게 확인한다
- 상세 결정 내용은 `adrs/ADR-*.md`에서 관리한다
- 기술스택, 설계 변경, 주요 예외 판단의 추적 기준으로 사용한다

---

## 기록 규칙

- registry에는 `ADR-000` 같은 더미 ID를 남기지 않는다.
- 항목이 없을 때는 표에 예시 행을 넣지 않고 `현재 등록 ADR 없음`만 남긴다.
- `관련 Intent`, `관련 Milestone`에는 실제 연결된 ID만 적고, 관계가 없으면 `없음`으로 적거나 비운다.
- 대체되거나 폐기된 ADR도 삭제하지 않되, 상태를 실제 값으로 갱신하고 대체 ADR이 있으면 `비고`에 남긴다.

---

## ADR 목록

| ADR ID | 제목 | 상태 | 날짜 | 관련 Intent | 관련 Milestone | 문서 경로 | 비고 |
|--------|------|------|------|-------------|----------------|----------|------|
| ADR-001 | 선택 상태를 workspaceState(Memento)에 저장 | Accepted | 2026-08-13 | INT-001 | 없음 | `adrs/ADR-001_선택상태_workspaceState_저장.md` | DD-01 승격 |
| ADR-002 | 빌드/실행을 VSCode Task API로 실행 | Accepted | 2026-08-13 | INT-001 | 없음 | `adrs/ADR-002_빌드실행_Task_API.md` | DD-02 승격 |
| ADR-003 | Capabilities를 선언적 칩 배열(ChipDescriptor[])로 | Accepted | 2026-08-13 | INT-001 | 없음 | `adrs/ADR-003_선언적_칩_배열.md` | DD-03 승격. 설계 핵심 |
| ADR-004 | v1 범위에 F15·F16·F17 포함 | Accepted | 2026-08-13 | INT-001 | 없음 | `adrs/ADR-004_v1_범위_features_runargs_watcher.md` | DD-04 승격 |
| ADR-005 | 디버그 경로를 cargo JSON 메시지로 해석 | Accepted | 2026-08-13 | INT-001 | 없음 | `adrs/ADR-005_디버그_경로_cargo_json.md` | DD-05 승격. RSK-002·003 해소 |
| ADR-006 | 감지를 글롭 스캔 + 멀티루트로 | Accepted | 2026-08-13 | INT-001 | 없음 | `adrs/ADR-006_글롭_스캔_멀티루트.md` | DD-06 승격 |
| ADR-007 | SSOT 파사드 — 값은 캐노니컬 파일에만 | Accepted | 2026-08-13 | INT-001 | 없음 | `adrs/ADR-007_SSOT_파사드.md` | DD-07 승격 |
| ADR-008 | 원격 환경 지원 (extensionKind: workspace) | Accepted | 2026-08-13 | INT-001 | 없음 | `adrs/ADR-008_원격_환경_지원.md` | DD-08 승격 |
| ADR-009 | 의존성 온디맨드 3단계 (extensionDependencies 미사용) | Accepted | 2026-08-13 | INT-001 | 없음 | `adrs/ADR-009_의존성_온디맨드_3단계.md` | DD-09 승격 |
| ADR-010 | 프로젝트 시작 마법사 도입 (스위처 + 이니셜라이저) | Accepted | 2026-08-13 | INT-001 | 없음 | `adrs/ADR-010_프로젝트_시작_마법사_도입.md` | 세션 #001 신규. F20·FR-013·US-011 |
| ADR-011 | 호출 구성 오버레이 (파일 무편집, --config/env 주입, 편집 v2 이월) | Accepted | 2026-08-15 | INT-001 | MS-006 | `adrs/ADR-011_호출_구성_오버레이.md` | 세션 #002 신규. F21·FR-014. ADR-007 보완 |
| ADR-012 | 설정 페이지(WebviewPanel) + 선언적 옵션 카탈로그 | Accepted | 2026-08-15 | INT-001 | MS-006 | `adrs/ADR-012_설정_페이지_옵션_카탈로그.md` | 세션 #002 신규. 명칭 정정(다이얼로그→페이지). ADR-003 연장 |
| ADR-013 | 캐노니컬 파일 무편집 = 영구 불변식 (C-3 폐기) | Accepted | 2026-08-16 | INT-001 | MS-009 | `adrs/ADR-013_캐노니컬_파일_무편집_영구_불변식.md` | 세션 #007 신규. ADR-011 v2 이월 항목 종결. `persistSetting` 계약 제거(TASK-026). D-15 |
| ADR-014 | CMake 어댑터는 자체 `cmake` CLI 구동 (CMake Tools 미위임, File API) | Accepted | 2026-08-16 | INT-001 | MS-012 | `adrs/ADR-014_CMake_자체_CLI_구동_File_API.md` | 세션 #008 신규. cargo/dotnet/python 선례·§8 `-D`/`--config` 주입·KB #8 경로해석. requiredExtensions=디버거(TASK-035) |

> ADR-001~009 = 상세설계서 §2 DD-01~09 승격(제목에 DD 번호 병기). ADR-010 = 세션 #001 신규. ADR-011·012 = 세션 #002 신규(호출 구성 오버레이·설정 페이지). ADR-013 = 세션 #007 신규(C-3 폐기·파일 무편집 불변식).

- `상태`: `Proposed` / `Accepted` / `Deprecated` / `Superseded`
- `날짜`: `YYYY-MM-DD`

---

## 운영 규칙

- 모든 설계 메모를 ADR로 만들지 않는다. `제약`, `비용`, `확장성`, `보안`, `운영 영향` 중 하나라도 장기적이고 되돌리기 어렵거나 두 축 이상이 함께 얽힌 결정만 ADR로 승격한다.
- 위 기준에 못 미치는 소규모 결정은 관련 canonical 문서 또는 세션 로그에 남기고, ADR registry에는 등록하지 않는다.
- ADR 승격이 필요하다고 판단되면 `adrs/ADR-*.md`를 생성하고 이 문서에 등록한다.
- `tech_stack.md`, `domain_model.md`, `interface_contract.md`의 주요 결정은 관련 ADR과 연결한다.
- 폐기된 ADR도 삭제하지 않고 상태를 갱신한다.
