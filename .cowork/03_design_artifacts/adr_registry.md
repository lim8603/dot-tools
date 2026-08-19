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
| ADR-015 | Run Group 실행 모델 (준비=프로세스 시작, 계층적 위상정렬, Run 전용) | Accepted (일부 대체) | 2026-08-17 | INT-001 | MS-013 | `adrs/ADR-015_Run_Group_실행_모델.md` | 세션 #011 신규. 준비 신호=`onDidStartTaskProcess`(종료 아님). 헬스체크=후속 마이너(TASK-039). 저장=workspaceState.groups(ADR-001). D-19(버전 정책) 연계. **"멤버=Run 전용" 항목은 ADR-020(멤버별 Launch 모드)으로 대체(2026-08-18)** — 나머지 항목 유지 |
| ADR-016 | Node 스크립트는 배열형 ShellExecution으로 실행 (NFR-002 문서화된 예외) | Accepted | 2026-08-17 | INT-001 | MS-016 | `adrs/ADR-016_Node_스크립트_ShellExecution_배열형_실행.md` | 세션 #013 신규. npm/pnpm/yarn=`.cmd` 심 → 셸-less spawn 불가(Node 24 EINVAL 실측). 배열형 ShellExecution은 인자별 인용으로 인젝션 차단(NFR-002 보안 목표 유지) — NFR-002a와 동급 예외. 나머지 5언어는 ProcessExecution 유지 |
| ADR-017 | 키보드 단축키 = 정적 기본값 + 네이티브 편집기 딥링크 | Accepted | 2026-08-17 | INT-001 | MS-017 | `adrs/ADR-017_키보드_단축키_정적_기본값_네이티브_편집기.md` | 세션 #013 신규. VSCode 런타임 키바인딩 등록 API 부재 → 정적 `contributes.keybindings`(Ctrl+Alt+글자·`when:hasProjects`) + General 탭 딥링크(`openGlobalKeybindings` 확장 필터). 인페이지 재바인딩/keybindings.json 편집 비채택(취약·ADR-013 반함) |
| ADR-018 | Run Group 준비 감지 = 포트/HTTP 헬스체크(멤버별 게이트) | Accepted | 2026-08-17 | INT-001 | MS-018 | `adrs/ADR-018_Run_Group_준비_감지_포트_HTTP.md` | 세션 #014 신규. ADR-015 후속(준비 신호 프로세스 시작 → 포트 open/HTTP 상태코드). `RunGroupMember.readiness?`(additive·optional·미설정=프로세스 시작). 순수 폴링(`core/readiness.ts`)+I/O 프로브(`core/readinessProbe.ts`, Node net/http). 타임아웃=abort+teardown·HTTP=지정코드(기본200)·취소 가능(CancellationToken→AbortSignal). Node 내장만(ADR-009) |
| ADR-019 | CMake 중첩 하위 프로젝트 + 라이브러리 타겟 모델 | Accepted | 2026-08-18 | 없음(유지보수) | MS-021 | `adrs/ADR-019_CMake_중첩_하위_프로젝트_라이브러리_타겟.md` | 세션 #016 신규(v1.0.0 실사용 피드백). project() 루트 = 최상위·타겟 선언 디렉토리 = 하위(최근접 루트 귀속, 루트 빌드 트리 공유, `paths.source` 스코프). `ProjectInfo.parentId`/`library`(additive)·`validateAction` 훅(lib 타겟 run/debug 차단 토스트, VS 동작)·`devSwitcher.projects.showLibraries`(기본 보임). 대안(project() 중첩만/File API 타겟 단위) Human 기각(D-24) |
| ADR-020 | Run Group 멤버별 Launch 모드 (Run/Debug) | Accepted | 2026-08-18 | 없음(유지보수) | MS-021 | `adrs/ADR-020_Run_Group_멤버별_Launch_모드.md` | 세션 #016 신규(Human 요청: 그룹 멤버 디버깅). `RunGroupMember.debug?`(additive)·debug 멤버=`createDebugConfig`+`startDebugging`을 StartedTask로 래핑(ready/done/terminate=stopDebugging)·준비 게이트(ADR-018) 동일 적용·그룹 경로에도 validateAction(ADR-019) 적용. **ADR-015 "Run 전용" 대체** |
| ADR-021 | Visual Studio(.sln/.vcxproj) 어댑터: MSBuild 직접 구동 | Accepted | 2026-08-19 | 없음(유지보수) | MS-022 | `adrs/ADR-021_Visual_Studio_어댑터_MSBuild.md` | 세션 #017 신규(Human 요구·D-25). 7번째 어댑터 `vs` — 감지=`.vcxproj`만(A안: 솔루션 내 `.csproj`=dotnet 소유 유지), `.sln`/`.slnx`=계층 루트(ADR-019 재사용). **CMake 생성물은 `CMakeCache.txt` 마커로 제외**(공존 충돌 차단). vswhere→MSBuild 발견·`-getProperty:TargetPath` 실행경로·cppvsdbg 디버그·Windows 전용(비-Windows=Doctor ❌) |

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
