# 프로젝트 상태 (Project State)

> 공유 상태 인덱스 — 다음 세션의 AI가 가장 먼저 읽는 프로젝트 현재 상태 요약

---

## 현재 상태 요약

### 핵심 필드

| 항목 | 내용 |
|------|------|
| 프로젝트 | DevSwitcher Tools (`devswitcher-tools`) |
| 프로젝트 유형 | Greenfield(신규) — 코드 미착수, 확정 설계서 보유 |
| 팀 구성 | 1인 |
| 팀 규모 | 1인 |
| 협업 모드 | Active(Task 할당 완료) |
| 협업 실행 모드 | solo |
| 현재 Phase | **Evolve** — v1.3.2 Marketplace·GitHub Release 게시 완료(2026-09-20, #022) |
| 활성 Intent | **없음** — 유지보수(MS-023까지 완료). INT-001 Closed(v1.0.0, D-23). INT-002(원격·크로스, Draft)는 착수 여부 Human 결정 대기 |
| 활성 Milestone | **없음** — MS-023(v1.3.0) Done. v1.3.1은 실사용 제보발 패치로 Milestone 미배정. 다음 Milestone은 Human 결정 대기 |
| 활성 Task | **없음** — TASK-066 Done, v1.3.2 배포 완료 |
| 상태 | Green |
| 대화 언어 | 한국어 |
| 작업 문서 언어 | 한국어 |
| 공식 산출물 문서 언어 | 한국어 |
| 마지막 갱신일 | 2026-09-20 |
| 마지막 갱신자 | AI |
| 참조 세션 로그 | session_2026-09-20_022.md |
| 최신 배포 | **v1.3.2 Marketplace·GitHub Release 완료**(2026-09-20). Windows Cargo 경로의 D:/d: 혼재로 발생하던 중복 프로젝트 수정. VSIX 255.59 KB |

- `프로젝트 유형`: `Greenfield(신규)` / `Brownfield(기존)`
- `팀 구성`: `1인` / `확정팀` / `사전배분`
- `팀 규모`: `1인` / `소규모(2~5)` / `중규모(6~15)` / `대규모(16+)`
- `협업 모드`: `Inactive(준비 중)` / `Active(Task 할당 완료)`
- `협업 실행 모드`: `solo`(좌석 정의 유지 + 역할별 부기 생략) / `team`(역할별 부기 전부 운영) — 상세는 `decision_authority_matrix.md` §협업 실행 모드 (F-06)
- `현재 Phase`: `Define` / `Design` / `Build` / `Verify` / `Evolve` / `Deliver`
- `상태`: `Green` / `Yellow` / `Red`
- `활성 Intent`, `활성 Milestone`, `활성 Task`는 현재 실제 ID를 적고, 없으면 `없음`으로 적는다.
- `마지막 갱신자`: `Human` / `AI`
- `참조 세션 로그`: 최신 `session_YYYY-MM-DD_NNN.md`

### 한 줄 상태

- **세션 #022 (2026-09-20): TASK-066 Done, v1.3.2 게시 완료.** Windows Cargo metadata의 D:/d: 혼재로 같은 프로젝트가 중복 표시되는 결함 재현·수정. Uri.fsPath로 비교 키만 통일, 원본 실행 경로·프로젝트 ID 유지. unit 384·통합 9 Pass(POSIX 전용 1 skip), lint·check-types·VSIX 격리 설치 Pass. main/태그 push·GitHub Release·Marketplace 게시 완료. 최초 PAT 실패는 Human의 기존 자격 증명 저장소→새 저장소 복사 후 재시도 성공으로 해소.
> 현재 프로젝트 상태를 한두 문장으로만 요약한다.

- **🐛 v1.3.1 게시(2026-08-28, 세션 #021).** Human의 실사용 질문("특정 폴더 제외 어떻게 써?")에서 v1.3.0 기능의 **침묵 결함**이 드러났다 — `devSwitcher.scan.exclude`를 **폴더의 `.vscode/settings.json`에 쓰면 아무 일도 일어나지 않는다**. 원인은 `package.json`에 `scope` 미선언 → VS Code 기본값 `window` → 워크스페이스 폴더 레벨 설정 불가. 오류도 로그도 없고 **호버 툴팁 한 줄**이 전부였다. **D-27**: `scope: "resource"` 선언 + `excludeGlob()`이 **폴더 uri를 리소스 스코프로** 각 폴더 값을 읽어 합집합(선언만으론 부족 — `inspect()`를 리소스 없이 부르면 `workspaceFolderValue`가 계속 undefined). 폴더가 선언한 패턴도 스캔 전역 적용(**D-27a**, 스캔이 전역 `findFiles` 1회이므로). unit **384**·통합 6. **실사용 검증 PASS**(vsix 설치 후 Reload Window 필요). 부수적으로 **CLAUDE.md 컨텍스트 블록이 MS-004 시점에 멈춰 있던 것**을 Human 질문("MS-005는 뭐야?")으로 발견·정정. ▸ 남은 위험: 멀티루트 폴더 스코프는 **자동 테스트가 못 덮는다**(통합 테스트가 싱글루트 호스트).
- **🚀 v1.3.0 게시 완주(2026-08-26, 세션 #020, MS-023 Done).** Human 지적 "이 메시지박스 쿨하지 않다"에서 출발해 **Delete Build Tree UI를 재설계**했다(**ADR-022 / D-26**). ① 조사 결과 `modal: true`는 전체 **2곳뿐**이었고 진짜 문제는 **Delete만 혼자 모달**이라는 일관성(나머지 선택 11곳은 전부 QuickPick) ② 어댑터별 반환 개수를 전수 확인하니 **dotnet만 `bin`·`obj` 2개** → 단일 선택 불가 → **`canPickMany` + 전 항목 기본 체크**로 가면서 **모달이 못 하던 부분 삭제**가 생김 ③ F5에서 튀어나온 Windows 셸 대화상자를 프로세스 증거(MSBuild PID·C# Dev Kit buildhost)로 규명하니 진범은 **`useTrash`** — 우리 모달을 없앴더니 OS가 자기 것을 올린 것 ④ Human 근거(*"다시 빌드하려고 지우는 것"*)로 **휴지통 폐기·즉시 삭제**, 그 결정이 **오보고 결함까지 제거**(결함이 fallback 분기 안에 살았으므로) ⑤ `confirmDeleteBuildTree`(기본 true) 옵트인 해제. **F5 6종 완주 PASS**, 도중 결함 2건(오보고 / 설명 잘림) 발견·수정. **배포 번들에 `modal:!0` 0건.** unit **382**. KB 인사이트 #6 · 안티패턴 #18·#19. ▸ **다음=Human 결정(INT-002 · TC-11 · 실사용 피드백).**

### 현재 작업 스트림

- TASK-066 완료: Cargo 중복 프로젝트 수정·v1.3.2 Marketplace/GitHub 게시.
- 검증: unit 384·Windows 통합 9·check-types·lint·격리 설치 통과. POSIX 전용 1건은 Windows에서 skip.
- 다음: 업데이트 후 실사용 확인, 다음 개발 사이클은 Human 결정.

---

## 활성 Task 요약
> 현재 바로 재개할 Task만 1~3개 남기고, 상세 배경은 목록 문서 / Task 문서 / 세션 로그에 둔다.

| Task ID | 제목 | 담당 | 상태 | 마지막 갱신일 | 다음 액션 |
|---------|------|------|------|---------------|-----------|
| (없음) | TASK-066 Done — v1.3.2 게시 완료 | — | — | 2026-09-20 | 다음 작업은 Human 결정 |

> 과거 완료 Task 상세는 task_registry 및 state_archive.md의 #022 하베스트 참조.

- `상태` 값은 `Planned` / `In Progress` / `Review` / `Done`을 사용한다.
- `담당`, `상태`, `마지막 갱신일`, `다음 액션`은 `task_registry.md` / `tasks/TASK-*.md`와 같은 의미로 유지한다.

---

## 다음 시작점

1. **v1.3.2 사용 확인:** VS Code 확장 업데이트 후 Reload Window. Cargo 프로젝트 중복 표시가 해소되는지 실사용 확인.
2. **다음 사이클(Human 결정):** INT-002(원격·크로스, Draft), TC-11(WSL), 실사용 피드백·성능/품질 리뷰 후보. 활성 Task 없음.

---

## 이월 백로그 (Carryover Backlog)

| 항목 | 상태 / 다음 액션 | 출처 |
|---|---|---|
| v1.3.2 실사용 확인 | 업데이트·Reload Window 후 사용자 프로젝트 목록 확인. 자동 회귀 검증·게시 완료 | #022 |
| 성능·품질 코드리뷰 | 다음 범위 결정 시 검토 | #018~021 |
| 멀티루트 통합 테스트 | 폴더 스코프 회귀 검증 보강 | #021 |
| 폴더별 RelativePattern 스캔 | 폴더 제외 패턴을 해당 폴더에 한정하는 후속 개선 | #021, D-27a |
| TC-11 WSL | 기존 Known Issue, 수동 검증 대기 | D-23 |


> **이월의 단일 SSOT.** 흩어진 이월 메모(다음 시작점·my_state·세션 로그)를 이 표 하나로 모은다. 매 세션 브리핑(§1D)에 포함하고, 항목 추가/해소 시 및 `마무리` 시 이 표를 갱신한다. 상세 배경은 출처 세션 로그. 이월 트리거 감시는 AI의 책임이다 — Human이 찾아 지시하기 전에 브리핑·작업 중 이 표를 대조해 먼저 꺼낸다.

**지금 지시만 하면 착수 가능 (트리거 없음)**

| # | 항목 | 내용 | 출처 |
|---|------|------|------|
| ~~**B-6**~~ | **해소(2026-08-25, v1.3.0)** — dotnet뿐 아니라 cargo·go·python까지 전 어댑터 감사·수정. 원 내용: **dotnet `framework` 칩이 `probe`를 무시** | `dotnetAdapter.ts:201-207`의 `listItems`/`defaultValue`가 `opts.probe`와 무관하게 `bridge.fetchMetadata`를 호출한다. v1.2.1이 CMake에 세운 계약("부작용 있는 작업 없이 아는 것만 답하라")을 dotnet 어댑터는 따르지 않는 상태. **파일 오염은 없음이 실험으로 확정**(`dotnet msbuild -getProperty`는 obj/bin 없는 깨끗한 프로젝트에서 `obj/`조차 만들지 않음) — 따라서 v1.2.1 결함의 재발이 아니라 **프로세스 기동 비용**만의 문제이고, 메타데이터가 캐시되므로 프로젝트당 1회. 고치려면 `peekMetadata`(이미 존재)를 probe:false 경로에 물리면 됨 — CMake의 `targetsIfConfigured`와 같은 패턴. 저우선 | 세션 #019 검증 중 발견 |
| ~~**B-5**~~ | **해소(2026-08-25, v1.3.0)** — `devSwitcher.cmake.configureOnSelect`(기본 false) + 빈 칩 목록 "not listed yet" 플레이스홀더. 원 내용: **미구성 프로젝트의 칩 목록을 미리 채울지 설정으로** | v1.2.1이 "선택은 빌드가 아니다"를 지키느라, **한 번도 빌드 안 한 CMake 프로젝트는 설정 페이지 Target 드롭다운이 비어 있다**(상태바 칩 클릭 또는 Build 한 번이면 채워짐). 안전한 기본값이지만 빈 드롭다운이 고장처럼 보일 수 있음. → **설정으로 열어주자**(Human 결정): 예) `devSwitcher.cmake.configureOnSelect` **기본 false**(= v1.2.1 동작 유지, 오염 없음), true면 프로젝트 선택·설정 페이지 렌더 시에도 configure해서 목록을 미리 채움. 자기 소유 리포만 다루는 사용자를 위한 opt-in. 구현은 이미 깔린 `probe` 옵션(`ChipDescriptor.listItems`/`defaultValue`)에 설정값을 흘려보내면 됨 — `settingsPanel.buildChipViews`와 `orchestrator.applyDefaults`의 `probe:false`를 설정 기반으로 바꾸는 수준. **기본값은 반드시 false 유지**(true가 기본이면 v1.2.1이 고친 결함이 그대로 돌아옴). 대안으로 검토했던 "설정 페이지에서 요청 시 목록 로드"(웹뷰가 칩 탭 클릭 시 loadChipItems 메시지)는 더 낫지만 범위가 커서 보류 | 세션 #018 Human 결정 |
| ~~**B-4**~~ | **해소(2026-08-25, v1.3.0)** — Clean·Delete Build Tree 둘 다 구현(명령 팔레트만). 원 내용: **프로젝트 정리(Clean) / 빌드 트리 삭제(Delete build tree)** | Visual Studio의 "솔루션 정리"에 해당하는 기능이 DevSwitcher에도 VSCode에도 없다(VSCode Task 그룹은 `build`/`test`만 표준이고 `clean` 개념 자체가 없음. CMake Tools 확장엔 있으나 우리는 미의존 — ADR-014). 어댑터별 정리 명령이 이미 존재해 선언 패턴에 자연스럽게 들어감: cargo `clean` · cmake `--target clean` · vs `msbuild /t:Clean` · dotnet `clean` · go `clean` · node=표준 없음(스크립트 있으면) · python=해당없음. `ActionCapabilities`에 플래그 추가 + 미지원 어댑터는 false. **두 기능을 구분할 것**: `clean`은 산출물만 지우고 빌드 디렉토리(`CMakeCache.txt`·`.cmake/api/`)는 남으므로, v1.2.1 이전에 서브모듈에 생긴 `build/`를 원상복구하려면 **"빌드 트리 삭제"가 따로 필요**(VS로 치면 정리 vs bin/obj 폴더 삭제). 일상 정리=Clean, 완전 초기화=Delete 둘 다 후보. **v1.2.1은 새 오염을 막을 뿐 이미 생긴 `build/`는 지우지 않으므로, 그 정리는 당분간 수동** | 세션 #018 Human 제안 |
| ~~**B-2**~~ | **해소(2026-08-17, 세션 #014, v0.8.0)** — 설정 Project 탭 카드형 강화 완료. 프로젝트별 displayName·매니페스트 경로·툴체인 ✅/❌(Doctor probe)·활성 프로파일·칩 요약+개수를 카드로. 어댑터 무지(INV-2) 유지=선언적 필드. 순수 `projectCard.ts`(deriveToolchain·formatChipValue) 분리·단위테스트. F5 통과 | 세션 #013 Human 제안 → #014 구현 |
| ~~**B-3**~~ | **해소(2026-08-19, 세션 #017, MS-022/TASK-064)** — `devSwitcher.languages.enabled`(fail-open: 빈/무효=전체) + AdapterRegistry scan/detect/creatable 필터 + 설정 변경 자동 rescan + General 탭 언어 체크박스. F5 대기 | 세션 #013 Human 제안 → #017 구현 |
| ~~B-1~~ | **해소(2026-08-15, 세션 #005)** — MS-006 코어(TASK-012·013·014) main FF 병합 완료(335f982), `feature/ms-006-settings-page` 브랜치 삭제. 다음: TASK-015 착수 | 세션 #004 → #005 병합 |

**트리거 대기 (도래 시 해당 세션이 흡수)**

| # | 항목 | 트리거 | 출처 |
|---|------|--------|------|
| ~~C-1~~ | **해소(2026-08-15, 세션 #004)** — `03_design_artifacts/ui_spec.md` 작성(설정 페이지 마스터-디테일·탭·명령 미리보기·데이터 흐름). 마법사 QuickPick 상세는 MS-008에서 보강 | (해소) | 세션 #001 Gate 3 → #004 작성 |
| ~~C-2~~ | **해소(2026-08-16, 세션 #006)** — MS-008(F20) TASK-022~024 분해·완료. 등록 Milestone 전부 완료 | (해소) | task_registry 경량 운영 |
| ~~C-7~~ | **승격(2026-08-16, 세션 #007) → MS-010·011·012** — CMake/Dotnet/Python 어댑터 실구현(스위치·빌드·실행·디버그). 언어별 3 MS 순차. 완료 시 4개 언어 전부 스위처 자동등장(scope A 해제). INT-001 완료 조건 | (승격) | 세션 #006 scope A → #007 |
| ~~C-3~~ | **폐기(2026-08-16, 세션 #007, D-15)** — 오버레이→캐노니컬 파일 영구 편집/승격. "파일 무편집"이 ADR-011의 근간이고 영속화·공유는 프로파일 export/import(F12)가 이미 파일 무편집으로 해결. 파일 손상·머지충돌 리스크 회피. `persistSetting` 계약도 제거(TASK-026). ADR-013으로 "파일 무편집 = 영구 불변식" 기록 | (폐기) | 세션 #002 ADR-011 → #007 |
| ~~C-6~~ | **승격(2026-08-16, 세션 #007) → MS-013** — Run Group(실행 그룹·종속성): 여러 프로젝트를 그룹으로 묶어 종속 순서대로 일괄 기동/정리(예: auth→api→web). (선택)준비 감지=포트/헬스체크. 필요 요소: 그룹 상태 모델 + GroupOrchestrator + 정의/트리거 UI. TaskRunner 프로젝트별 락 기반 존재. C-7 이후 착수(다언어 그룹 가치 최대). INT-001 완료 조건 | (승격) | 세션 #005 → #007 |
| ~~C-4~~ | **해소(2026-08-15, 세션 #005, TASK-015)** — `ProfileExport` 확정(= PersistedState 정렬: selections+invocation, activeProjectId 제외, runArgs는 ADR-011 승격 위치) + `data_model.md §2` 예시 정합화 | (해소) | 세션 #003 → #005 |
| ~~C-5~~ | **해소(2026-08-15, 세션 #005, TASK-019)** — preBuild/postBuild를 ShellExecution Task로 실제 실행(pre 실패→중단, post 성공 후) + 설정 페이지 buildEvent 에디터 | (해소) | 세션 #004 → #005 |

**저심각 · 기록 (지시 시에만)**

| # | 항목 | 출처 |
|---|------|------|
| ~~L-1~~ | **승격(2026-08-16, 세션 #007) → MS-009/TASK-025 (In Progress)** — `stringList` 자유 플래그("extra flags") 카탈로그 항목+에디터+주입 추가 | 세션 #005 TASK-015 검증 → #007 |

---

## AI 핸드오프 메모

- v1.3.2 배포 완료, TASK-066 Done. Windows Cargo metadata D:/d: 혼재를 Uri.fsPath 비교 키로 해소. ID·실행 경로·저장 스키마 유지.
- PAT 오류는 `vsce login lim8603`의 이전 저장소→새 저장소 복사로 해소. 토큰 재발급 없이 재게시 성공.
- 실제 사용자 화면 재확인은 다음 사용 시 수행. WSL·멀티루트 테스트·성능 리뷰 이월은 아래 백로그 기준.
- 과거 완료 서사는 `state_archive.md`의 **#022 세션 마감 하베스트** 참조.

---

## Human 확인 필요 사항
> 열린 항목만 유지하고, 해결된 이력은 세션 로그나 관련 기준 문서에 남긴다.

| ID | 항목 | 우선순위 | 관련 문서 | 상태 |
|----|------|---------|----------|------|
| Q1 | 진행 방향 | High | `06_evolution/imported_context/*` | Resolved — 설계서 전체 반입 |
| Q2 | 현재 Phase | Medium | `project_state.md` | Resolved — Define부터 정식화 |
| Q3 | INT-001 승인 및 산출물 계획 확정 | High | `intents/INT-001*`, `deliverable_plan.md` | Resolved — 2026-08-13 승인 |
| Q4 | Gate 3: domain_model(도메인 모델) 검토 승인 | Medium | `domain_model.md` | Resolved — 2026-08-13 승인, Build 전환 |

- `우선순위`: `High` / `Medium` / `Low`
- `상태`: `Open` / `Resolved` / `Deferred`

---

## 주요 리스크 / 주의사항
> 현재 영향이 있는 리스크 위주로 유지하고, 닫힌 리스크의 상세 이력은 별도 기준 문서에 남긴다.

| ID | 내용 | 대응 상태 | 비고 |
|----|------|-----------|------|
| 없음 | - | - | - |

- `대응 상태`: `Open` / `Mitigating` / `Closed`

---

## 최근 승인된 결정

| ID | 결정 | 근거 문서 | 날짜 |
|----|------|-----------|------|
| D-01 | 설계서 전체를 cowork 기준 문서로 반입, Phase는 Define부터 정식화 | `06_evolution/imported_context/*` | 2026-08-13 |
| D-02 | INT-001 승인 (Approved) | `intents/INT-001*` | 2026-08-13 |
| D-03 | 산출물 계획 확정 (필수 5 / 권장 8 / 해당없음 1) | `deliverable_plan.md` | 2026-08-13 |
| D-04 | Gate 1 통과 | `quality_gate.md`, DEFINE 문서 | 2026-08-13 |
| D-05 | 신규: 프로젝트 시작 마법사(F20) 도입 — 전 언어·수동 호출·기본 템플릿·네이티브 위임 | `ADR-010` | 2026-08-13 |
| D-06 | 설계서 DD-01~09를 ADR-001~009로 승격 | `adr_registry.md` | 2026-08-13 |
| D-07 | Gate 3 통과 (domain_model 승인) → Build 전환 | `quality_gate.md`, `domain_model.md` | 2026-08-13 |
| D-08 | 호출 구성 오버레이 도입 — 컴파일옵션·출력·링커·env·빌드전후를 파일 무편집으로 (프로젝트×구성)별 저장·주입. 캐노니컬 파일 편집은 v2 이월 | `ADR-011` | 2026-08-15 |
| D-09 | 설정 UI = WebviewPanel "설정 페이지"(명칭 정정) + 어댑터 선언 옵션 카탈로그 브라우저 | `ADR-012` | 2026-08-15 |
| D-10 | OQ-002 확정 — InvocationConfig를 Task 생성 메서드에 별도 인자 `config`로 전달. Selection은 칩 선택만, runArgs는 InvocationConfig로 승격 | `interface_contract.md` §3·§4·§7·§11 | 2026-08-15 |
| D-11 | C-4 확정 — export 포맷(`ProfileExport`)을 `PersistedState`와 정렬(2-맵 selections+invocation, activeProjectId 제외, runArgs는 ADR-011 승격 위치). import는 스캔 존재 projectId만 반영 | `data_model.md §2`, `src/core/types.ts`, TASK-015 | 2026-08-15 |
| D-12 | v0.1.0 릴리즈 확정 — publisher=`lim8603`, `devswitcher-tools-0.1.0.vsix` 산출·설치 스모크 통과로 MS-007 Done. Gate 5 조건부 Pass(잔여 수동검증 TC-11 WSL 등은 문서화된 리스크로 수용) | `verification_evidence.md`, TASK-021 | 2026-08-16 |
| D-13 | MS-008 — OQ-001=자동 활성전환(생성 후 새 프로젝트 활성화). 계약 일반화 `createProject(target): {kind:'task'} \| {kind:'files'}`. cargo/dotnet=네이티브 new(task). **CMake/Python=확장이 `workspace.fs`로 템플릿 작성(files)** — 최초 "ShellExecution" 안에서 **셸 종류 미제어·C++ `<>` 리다이렉션 충돌** 발견해 workspace.fs로 개정(구현 중 우려 1회). ADR-010은 "네이티브 있으면 위임, 없으면 확장 작성"으로 해석. **v1 스위처 자동등장=Rust만**(scope A) | `interface_contract.md §5`, TASK-023 | 2026-08-16 |
| D-14 | v0.2.0 릴리즈 — F20 마법사 + 수동검증 중 발견한 버그 2건 수정(features 칩 토글/카운트/none 보존, untrusted 워크스페이스 무한스피너) 포함. `devswitcher-tools-0.2.0.vsix` 산출·설치 스모크 통과. version 0.1.0→0.2.0, CHANGELOG [Unreleased]→[0.2.0], README 마법사 반영 | `CHANGELOG.md`, `package.json` | 2026-08-16 |
| D-16 | **MS-012 CMake = 자체 `cmake` CLI 구동** (CMake Tools 확장 미위임). configure/build 2단계 `-D`/`--config` 호출시 주입, 타깃·실행경로=CMake File API(codemodel-v2), 디버그만 디버거 확장. cargo/dotnet/python 선례·§8·ADR-013(파일 무편집)에 부합. requiredExtensions=디버거(TASK-035 확정) | `ADR-014` | 2026-08-16 |
| D-18 | **v0.3.0 릴리즈** — C-7(C#/Python/C++ 실구현) 번들. version 0.2.0→0.3.0. **릴리즈 필수 fix**: `activationEvents`에 `.csproj`/`pyproject.toml`/`CMakeLists.txt` 추가(멀티언어 자동활성) + 확장 아이콘(icon-256) + keywords 확장. **README 전면 영문 재작성**(GitHub 랜딩 기준·유명 OSS 밀도·"Rust만" outdated 제거) + 실사용 상태바 이미지 재생성(codicon 폰트 렌더, hero 4언어 + 언어별 4). `devswitcher-tools-0.3.0.vsix`(13파일 230KB) 설치 스모크 통과. **SemVer: INT-001 완주 시 v1.0.0** | `package.json`, `CHANGELOG.md`, `README.md` | 2026-08-17 |
| D-17 | **CMakePresets = Preset 칩 동적 대체**(TASK-041). `ChipDescriptor.appliesTo` 제네릭 predicate 추가(false=칩 숨김+필수/기본 시딩 생략, UI 언어 무지 유지) → 프리셋 有 시 Preset 칩이 profile/architecture 대체(프리셋이 컴파일러+제너레이터+빌드타입 인코딩), 無 시 현행 `-S -B -D` 폴백. `cmake --preset <name>` configure는 프리셋 binaryDir(`${sourceDir}`/`${presetName}` 확장·`inherits` 해소)로·`--config` 생략. 프리셋 파일 workspace.fs 읽기전용(ADR-013). target 칩·디버거 자동판별 재사용. **F5 통과** | `ADR-014`, `interface_contract §2·§4` | 2026-08-17 |
| D-20 | **Run Group F5 피드백 결정** — ① 순서 지정 UI = **스테이지 번호**(멤버별 Stage, 같은 번호=병렬; N×N 종속 매트릭스 폐기; dependsOn/엔진 불변, stage는 투영) ② 중복 실행 = **이미 실행 중 멤버 건너뛰기**(abort 아님) ③ 상태바 그룹 = **아이콘만 + 통합 메뉴**(Run/Stop/Stop-all, `devSwitcher.groups`) ④ 상태바 위치 = **Run 바로 뒤** | `runGroupPlan.ts`(memberStages·withMemberStage), `groupOrchestrator.ts`(promptGroups·stopAll·skip), `statusBar.ts` | 2026-08-17 |
| D-19 | **버전 정책 반전** — INT-001 등록 조건(C-7+C-6) 충족만으로 **v1.0.0 자동 트리거 안 함**. C-6 Run Group(MS-013)=**v0.4.0**(MINOR). v1.0.0은 추가 기능·논의(MS-014/TASK-042) 후 **Human 명시 선언** 시. 특별 지시 전까지 v0.x.x 유지. 근거: 완주 후 추가 기능·논의 잔존(Human) | `milestone_registry.md`(SemVer), `task_registry.md`(TASK-042), ADR-015 | 2026-08-17 |
| D-22 | **원격/크로스 → INT-002 분리** — post-1.0 대형 확장(MS-019 원격디버그·MS-020 크로스컴파일)을 INT-001에서 떼어 새 Intent **INT-002**(원격·크로스 개발 환경 확장, Draft)로 신설. INT-001은 **v1.0.0(MS-014)으로 완주**. 근거: INT-001 코어 가치(로컬 다언어 UX)와 성격 상이·§16이 원래 v2+로 분류·각각 별도 ADR 필요 | `intent_registry.md`, `intents/INT-002*`, `milestone_registry.md`, 세션 #012 | 2026-08-17 |
| D-21 | **v1.0.0 완주 로드맵 확정 + 재스케줄** — TASK-042 추가 기능·논의 결과. **v1.0.0 = 4개 MINOR**: MS-015 Go(v0.5.0) → MS-016 Node/TS(v0.6.0, 6개 언어 완성) → MS-017 키보드 단축키(v0.7.0, General 탭 기본+변경) → MS-018 준비감지(v0.8.0, TASK-039 승격) → **MS-014 v1.0.0 최종점검+Marketplace 게시+GitHub Release**. **원격디버그(MS-019)·크로스컴파일(MS-020)은 단위가 커 post-1.0로 재스케줄**(v1.1.0/v1.2.0 후보; 설계서 §16 원래 "v2+ 백로그" 위치로 복귀). 중간 릴리즈(0.5~0.8)는 vsix+태그만·게시는 v1.0.0에서만. 원격/크로스·단축키 구현방식은 착수 시 ADR. D-19 연장 | `milestone_registry.md`, `task_registry.md`, 세션 #012 | 2026-08-17 |
| D-23 | **v1.0.0 완주 선언 + TC-11 Known Issue 수용** — Human이 v1.0.0 완주 선언(TASK-042 게이트 해소, D-19). TC-11(WSL 수동검증)은 지금 수행하지 않고 **Known Issue로 공지**(릴리즈 비차단, README·CHANGELOG·docs). DELIVER 순서 확정: docs 전체 산출 → **repo private→public + 설정** → **GitHub Release v1.0.0** → **Marketplace 게시**로 완주 | 세션 #015, `test_case.md`, `verification_evidence.md` | 2026-08-17 |
| D-26 | **Delete Build Tree UI 재설계** — ① 확인을 모달 → **QuickPick(`canPickMany`, 전 항목 기본 체크)**: 확장 전 UI가 피커인데 여기만 모달이었고, 모달 버튼은 VSCode 로케일을 따라 `Delete`/`취소`로 언어가 섞였다. dotnet이 `bin`·`obj` 2개를 반환하므로 단일 선택 불가 → 다중 선택으로 부분 삭제까지 가능해짐 ② **휴지통 폐기, 즉시 삭제**: 지우는 동기가 재생성이므로 내용물 가치 0이고, 디스크 회수를 휴지통이 방해하며, `useTrash`가 Windows 셸 대화상자를 부른다 ③ `devSwitcher.confirmDeleteBuildTree`(기본 `true`)로 확인 해제 옵트인. 부수 효과로 "건너뜀을 성공으로 보고"하던 결함이 분기째 소멸 | **ADR-022**, `orchestrator.ts`, `cleanPlan.ts`, 세션 #020 | 2026-08-26 |
| D-24 | **v1.1.0 범위·설계 3결정(실사용 피드백)** — ① 하위 프로젝트 판별=**타겟 선언 디렉토리**(add_executable/add_library, project() 유무 무관, 최근접 루트 귀속; 대안 "project() 중첩만"/"File API 타겟 단위" 기각) ② lib/dll **기본 보임** + General 옵션 `devSwitcher.projects.showLibraries` ③ 4건(중첩·lib·설정창 fix·아이콘) **v1.1.0 단일 릴리즈**. INT-002 후보 버전은 v1.2.0+로 밀림 | 세션 #016, ADR-019, `milestone_registry.md`(MS-021) | 2026-08-18 |
| ADR-019 | **CMake 중첩 하위 프로젝트+라이브러리 타겟 모델** — 루트=솔루션·하위=루트 빌드 트리 공유(`--target`)·Target 칩 `paths.source` 스코프·lib 타겟 포함하되 run/debug는 `validateAction` 훅으로 차단(VS 동작)·`ProjectInfo.parentId/library` additive | `adrs/ADR-019_CMake_중첩_하위_프로젝트_라이브러리_타겟.md` | 2026-08-18 |
| ADR-015 | **Run Group 실행 모델** — 준비 신호=**프로세스 시작**(`onDidStartTaskProcess`, 종료 아님)·**Run 전용**·**계층적 위상정렬**(병렬/순차)·teardown=`TaskExecution.terminate`·저장=`workspaceState.groups`(ADR-001·additive). 헬스체크(TASK-039)는 후속 마이너 분리. TaskRunner 프로젝트별 락 재사용 | `adrs/ADR-015_Run_Group_실행_모델.md` | 2026-08-17 |
| ADR-016 | **Node 스크립트=배열형 ShellExecution**(NFR-002b 예외) — npm/pnpm/yarn=Windows `.cmd` 심 → 셸-less spawn 불가(**Node 24 EINVAL 실측**, CVE-2024-27980). 배열형 ShellExecution은 인자 개별 인용으로 셸 인젝션 차단(NFR-002 보안 목표 유지). 나머지 5언어는 ProcessExecution 유지. `debugRequiresBuild:false`(Node)로 디버그 전 강제 build 스킵(npm prestart/prebuild가 처리) | `adrs/ADR-016_Node_스크립트_ShellExecution_배열형_실행.md`, NFR-002b | 2026-08-17 |
| ADR-017 | **키보드 단축키=정적 기본값+네이티브 편집기 딥링크** — VSCode 런타임 키바인딩 등록 API 부재 → 정적 `contributes.keybindings`(Ctrl+Alt+글자·`when:hasProjects`) + General 탭에서 `openGlobalKeybindings` 딥링크(확장 필터). 인페이지 재바인딩/keybindings.json 편집 비채택(취약·ADR-013 반함). **내장 키(F5/Ctrl+Shift+B) 불간섭 + 리맵 안내만**(Human) | `adrs/ADR-017_키보드_단축키_정적_기본값_네이티브_편집기.md` | 2026-08-17 |
| D-15 | **C-3 폐기(Won't Do)** — 오버레이를 캐노니컬 파일에 영구 편집/승격하는 기능을 v2 백로그에서 제거. 근거: ①ADR-011 근간이 "파일 무편집" ②영속화·공유는 프로파일 export/import(F12)가 이미 해결 ③TOML 손상·머지충돌 리스크. 후속: `LanguageAdapter.persistSetting` 계약 제거(TASK-026). "파일 무편집 = 영구 불변식"을 ADR-013으로 기록. **INT-001 완료 조건 = C-7(다언어 실구현)+C-6(Run Group)** 확정, 완주 로드맵 MS-009~013 착수 | `ADR-013`, `milestone_registry.md` | 2026-08-16 |

---

## 최근 변경 파일 / 산출물
> 최근 핵심 변경만 짧게 남기고, 장기 이력은 세션 로그에 누적한다.

| 파일 | 변경 요약 | 관련 작업 |
|------|----------|----------|
| `intents/INT-001*.md` | 프로젝트 루트 Intent (Approved) | DEFINE 반입 |
| `intent_registry.md` | INT-001 등록 | DEFINE 반입 |
| `deliverable_plan.md` | 프로파일 + 14종 확정 | 산출물 협상 |
| `requirement_spec.md` | FR/NFR/제약/의존/가정/OQ 반입 | DEFINE 반입 |
| `functional_spec.md` | F1~F19 기능 명세 | DEFINE 반입 |
| `domain_glossary.md` | 용어·약어·도메인 규칙 | DEFINE 반입 |
| `risk_register.md` | RSK-001~011 (R1~R11) | DEFINE 반입 |
| `user_story_registry.md` | US-001~011 등록 (US-010 설정창, US-011 마법사) | DEFINE 반입 |
| `adrs/ADR-001~010*.md` + `adr_registry.md` | DD-01~09 승격(ADR-001~009) + 마법사 ADR-010 | DESIGN 반입 |
| `functional_spec.md`, `requirement_spec.md`, `intents/INT-001*` | F20·FR-013 추가, 파일 부재 능동복구, 마법사 반영 | F20 신규 |
| `interface_contract.md`·`domain_model.md`·`data_model.md`·`tech_stack.md` | DESIGN 본문 반입 (F20 프로젝트 생성 계약 포함) | DESIGN 반입 |
| `coding_convention.md` | 폴더 구조 확정 + TS/VSCode 컨벤션 | BUILD 준비 |
| `milestone_registry.md`·`task_registry.md` | MS-001~008(M0~M6+F20), TASK-001~003 | BUILD 준비 |
| `adrs/ADR-011·012*.md` + `adr_registry.md` | 호출 구성 오버레이 + 설정 페이지·옵션 카탈로그 | 세션 #002 신규 |
| `interface_contract.md` | §7 호출 구성 계약(InvocationConfig·OptionSpec·optionCatalog) + §8 **언어별 호출 구성 능력 매트릭스** | 세션 #002 |
| `src/core/types.ts` | 전체 타입 단일 정의 지점 신규(§2~§7 LanguageAdapter·InvocationConfig·OptionSpec·PersistedState·DevSwitcherError) | TASK-002 |
| `interface_contract.md` | OQ-002 Resolved — config 별도 인자, Selection.runArgs 제거, runArgs 승격 | TASK-002 |
| `src/adapters/*` | 4개 어댑터 선언 스텁(cargo/cmake/dotnet/python) + cargo optionCatalog + notImplemented + index(ALL_ADAPTERS). Python 리트머스. tsc 인터페이스 확정 검증 | TASK-003 |
| `tsconfig.json`·`.vscode/settings.json` | 편집기 TS2584(console) 수정 — `types:[node,vscode]`, 워크스페이스 TS 고정 | 세션 #003 |
| `imported_context/DevSwitcher-Tools_{Detailed,Concept}-Design.md` (구 `docs/*`) | 상세설계서 v1.2 최신화(F20·F21·OQ-002 통합) 후 개념·상세설계서를 `imported_context/`로 이동·영문명. 참조 5문서 경로 갱신. 목적: 회사 전용 개발툴에 아키텍처 재사용 | 세션 #003 |
| `data_model.md` | 설정 3계층 + PersistedState에 `(projectId×profile)` invocation 차원 도입 | 세션 #002 |
| `src/core/errors.ts`(신규)·`src/core/types.ts` | `DevSwitcherError`를 vscode-free 모듈로 분리, types는 재-export(하위호환). 브리지가 순수 Node에서 throw 가능 | TASK-005 |
| `src/adapters/cargo/cargoBridge.ts` | I/O 계층 추가 — `execCapture`/`defaultExec`(execFile, 셸無, DI) + `CargoBridge`(fetchMetadata+캐시·listInstalledTargets·checkToolchain·invalidateCache). vscode-free 유지 | TASK-005 |
| `src/test/unit/cargoBridge.io.test.ts`(신규) | I/O 계층 14 테스트(가짜 exec + 실 node 바이너리 스모크) | TASK-005 |
| `src/adapters/cargo/cargoAdapter.ts` | 런타임 스텁→실구현: listProjects(§8.2)·chips 4종(listItems/format/defaultValue)·createBuild/RunTask(ProcessExecution·env·CARGO_TARGET_DIR)·resolveExecutable(§8.5)·invalidateCache 위임. 디버그/createProject/persist는 스텁 유지(M4/MS-008/v2) | TASK-006 |
| `src/adapters/cargo/cargoBridge.ts` | `peekMetadata`(동기 캐시 접근자) 추가 — 동기 Task 생성 시 hasDefault 판정용 | TASK-006 |
| `src/core/adapterRegistry.ts`·`stateStore.ts`·`stateReconcile.ts`(신규) | 스캔·매칭 + workspaceState 래퍼 + reconcile 순수코어 | TASK-007 |
| `src/ui/statusBar.ts`·`statusBarFormat.ts`·`picks.ts`(신규) | 칩/버튼 렌더(어댑터무지) + QuickPick + defaultChipFormat | TASK-008 |
| `src/core/orchestrator.ts`·`manifestWatcher.ts`(신규)·`extension.ts`·`package.json` | 배선·명령·감시·activate + contributes(5커맨드·activationEvents) | TASK-009 |
| `src/test/fixtures/cargo/hello/*`(신규)·`.gitignore` | F5/통합용 cargo 픽스처 + target 제외 | TASK-009 |
| `src/test/unit/stateReconcile.test.ts`·`statusBarFormat.test.ts`(신규) | 순수코어 mocha 10 (총 44) | TASK-007·008 |
| `src/core/taskRunner.ts`(신규)·`orchestrator.ts`·`ui/statusBar.ts`·`cargoAdapter.ts`·`extension.ts`·`package.json` | TaskRunner + Build/Run 실행 플로우·spin·$devswitcher-rustc 매처·키바인딩 | TASK-010 |
| `src/core/ensureExtension.ts`(신규)·`cargoBridge.ts`·`cargoAdapter.ts`·`orchestrator.ts`·`.vscode/launch.json` | Debug 플로우 §7.4·createDebugConfig·buildLldbConfig·CodeLLDB 온디맨드·확장포함 launch | TASK-011 |
| `functional_spec.md`·`requirement_spec.md` | F21·FR-014 추가, §8.7 파일편집 v2 이월, NFR-002a 셸 예외 | 세션 #002 |
| `user_story_registry.md`·`milestone_registry.md`·`domain_model.md`·`coding_convention.md`·`deliverable_plan.md` | US-010 정정+US-012, MS-006 범위, INV-6, 카탈로그 반영, 명칭(다이얼로그→페이지) | 세션 #002 |

> 상세 변경 이력은 세션 로그 session_2026-08-13_001, session_2026-08-15_002 참조.

---

## 활성 산출물
> 활성 상태인 항목만 유지하고, 상세 내용은 목록 문서에서 우선 찾은 뒤 필요 시 상세 문서를 본다.

| 유형 | ID | 제목 | 상태 | 비고 |
|------|----|------|------|------|
| Intent | INT-001 | 다언어 통합 상태바 UX VSCode 확장 | Approved | 2026-08-13 승인. v1.0.0 완주 로드맵(MS-015~018→MS-014) |
| Intent | INT-002 | 원격·크로스 개발 환경 확장 | Draft | 세션 #012 신설(D-22). v1.0.0 이후. MS-019/020 소속 |
| Milestone | MS-001 | M0 셋업 | Done | 스캐폴드 + F5 검증 완료 |
| Milestone | MS-002 | M1 코어 타입·칩 | Done | 인터페이스 확정(tsc), main 병합 |
| Milestone | MS-003 | M2 CargoBridge/CargoAdapter | Done | main 병합(FF, 2026-08-15). 디버그·createProject 이월 |
| Milestone | MS-004 | M3 상태바·저장·감시 | Done | F5 검증 통과, main 병합(2026-08-15) |
| Milestone | MS-005 | M4 실행·디버그 | Done | F5 검증 통과(빌드·실행·중단점), main 병합(2026-08-15) |
| Milestone | MS-006 | M5 설정 페이지·호출 구성 | Done | 코어(012·013·014) + export/import(015) F5 통과, main 병합(2026-08-15). pre/postBuild(C-5) 이월 |
| Milestone | MS-007 | M6 품질·배포·통합테스트 | Done | 016~021 전부 Done. **v0.1.0 vsix 산출**(2026-08-16). Gate 5 조건부 Pass |
| Milestone | MS-008 | F20 시작 마법사 | Done | 4개 언어 생성 F5 통과(2026-08-16). 스위처 자동등장=Rust(scope A) |
| Milestone | MS-009 | v1.1 정리 (자유 플래그 L-1 + 계약 정리) | Done | TASK-025(L-1, F5 통과)·TASK-026(persistSetting 제거). 2026-08-16 |
| Milestone | MS-010 | C# (Dotnet) 어댑터 실구현 | Done | F5 통과(build/run/coreclr 디버그·Doctor). main FF 병합. C-7 1/3 |
| Milestone | MS-011 | Python 어댑터 실구현 (리트머스) | Done | C-7 2/3. F5(Doctr 제외) 통과·main 병합·push. (v0.3.0 번들 예정) |
| Milestone | MS-012 | C++ (CMake) 어댑터 실구현 | Done | C-7 3/3 **완주**. ADR-014. TASK-033·034·035·041 전부 F5·**main FF 병합(2026-08-17)**. Preset 칩 동적 대체·`cmake --preset`. **4개 언어 전부 스위처 실동작.** |
| Milestone | MS-013 | Run Group (C-6) | Done | **완료·v0.4.0 배포**(세션 #011). ADR-015·D-20. 계층 기동·스테이지 순서·병렬·skip·상태바 통합 메뉴. 036·037·038·040 Done. TASK-039(준비감지)=후속 마이너 분리. C-6 충족 |
| Milestone | MS-014 | v1.0.0 완주 — 최종 점검 + 게시 | Planned | **로드맵 최종(D-21)**. 통합 테스트 보강 + Marketplace 게시 + GitHub Release → v1.0.0 완주 선언(Human, D-19). 실행 순서상 MS-015~018 이후 |
| Milestone | MS-015 | Go 어댑터 (v0.5.0) | Done | **완료·v0.5.0 배포**(세션 #012). 감지·target 칩·build/run·delve 디버그·Doctor·F20. F5 통과·unit 219 |
| Milestone | MS-016 | Node/TS 어댑터 (v0.6.0) | Done | **완료·v0.6.0 배포**(세션 #013). 감지·script+packageManager 칩·`<pm> run`/build(배열형 ShellExecution·ADR-016)·js-debug 디버그·Doctor. F5 통과·unit 231. **6개 언어 완성** |
| Milestone | MS-017 | 키보드 단축키 설정 (v0.7.0) | Done | **완료·v0.7.0 배포**(세션 #013). ADR-017(정적 키바인딩+네이티브 딥링크·내장키 불간섭). Ctrl+Alt+B/R/S/D/P/G/,·General 탭 목록·`devSwitcher.stop`(태스크+디버그세션)·상태바 Stop 버튼. F5 통과·unit 235 |
| Milestone | MS-018 | Run Group 준비 감지 (v0.8.0) | Planned | D-21 4단계(v1.0.0 마지막 기능). TASK-039 승격(포트/헬스체크) |
| Milestone | MS-019 | 원격 디버그 타깃 (INT-002) | Deferred | **INT-002 소속(D-22)·v1.0.0 이후** — v1.1.0 후보. 로컬 빌드+원격 실행/어태치. 착수 시 ADR |
| Milestone | MS-020 | 크로스 컴파일 (도커) (INT-002) | Deferred | **INT-002 소속(D-22)·v1.0.0 이후** — v1.2.0 후보. 아키텍처 칩 확장·도커 타깃 빌드. 착수 시 ADR |
| Release | v0.1.0 | `devswitcher-tools-0.1.0.vsix` | Superseded | 최초 개인 릴리즈 |
| Release | v0.2.0 | `devswitcher-tools-0.2.0.vsix` | Superseded | F20 마법사 + features/untrusted 수정 |
| Release | v0.7.0 | `devswitcher-tools-0.7.0.vsix` | Done | **키보드 단축키(MS-017)** — Ctrl+Alt+B/R/S/D/P/G/, 기본 키·General 탭 딥링크·`devSwitcher.stop`(태스크+디버그세션)·상태바 Stop 버튼. 13파일 241.55KB. 설치 스모크(`@0.7.0`). F5 통과·unit 235·통합 16커맨드. main FF·`v0.7.0` 태그·origin push·브랜치 삭제 |
| Release | v0.6.0 | `devswitcher-tools-0.6.0.vsix` | Superseded | **Node/TS 어댑터(MS-016)** — script+packageManager 칩·배열형 ShellExecution·js-debug. 13파일 239.61KB. main FF·`v0.6.0` 태그·push |
| Release | v0.5.0 | `devswitcher-tools-0.5.0.vsix` | Superseded | **Go 어댑터(MS-015)** — target 칩·`go build`/`go run`·delve 디버그. 13파일 237.64KB. main FF·`v0.5.0` 태그·push |
| Release | v0.4.0 | `devswitcher-tools-0.4.0.vsix` | Superseded | **Run Group(C-6)** — 계층 기동·스테이지 순서·병렬·skip·상태바 통합 메뉴 + 설정 페이지 공백 버그 fix. 13파일 235.6KB. 설치 스모크 통과(`@0.4.0`). main FF·`v0.4.0` 태그·origin push |
| Release | v0.3.0 | `devswitcher-tools-0.3.0.vsix` | Superseded | **C-7 3언어 실구현 번들**(C#/Python/C++·CMake presets·Rescan·다언어 activation·아이콘). **README 전면 영문 재작성** + 실사용 상태바 이미지(hero + 언어별 4). 13파일 230KB. 설치 스모크 통과(`lim8603.devswitcher-tools@0.3.0`) |

- `Intent`: `Draft` / `Approved` / `Superseded` / `Split` / `Closed`
- `Milestone`: `Planned` / `In Progress` / `Review` / `Done` / `Deferred`
- `User Story`: `Draft` / `Approved` / `Implemented`
- `Task`: `Planned` / `In Progress` / `Review` / `Done`

---

## 컨텍스트 로딩 가이드 (Context Loading Guide)

### 핵심 규칙

- 항상 로드: 이 문서(`project_state.md`), `02_project_definition/deliverable_plan.md`, `members/<이름>/workspace/my_state.md` (1인 프로젝트도 동일 경로), 최신 세션 로그
- 팀 프로젝트에서는 `members/team_board.md`도 함께 로드한다.
- 현재 Phase 관련 목록 문서를 먼저 읽고, 필요한 기준 본문과 상세 문서를 추가한다.
- `templates/`, `imported_context/`, `06_evolution/state_archive.md`, 오래된 세션 로그는 기본적으로 로드하지 않는다.
- `06_evolution/state_archive.md`는 과거 세션 완료 서사·핸드오프 이력 아카이브(Log/Archive)다. 이 문서의 요약이 포인터로 가리키며, 특정 과거 세션 맥락이 필요할 때만 해당 `#NNN 이관분` 섹션을 연다.
- `cowork.md`, `session_protocol.md` 등 규칙 문서는 첫 세션 숙지 후 필요할 때만 관련 섹션을 참조한다.
- imported context는 필요한 사실을 추출해 기준 문서에 반영한 뒤 보조 근거로만 활용한다.

### 권장 로딩 순서

1. `project_state.md` -> `deliverable_plan.md`
2. `members/<이름>/workspace/my_state.md` + 최신 세션 로그
3. 현재 Phase 관련 목록 문서 / 기준 본문
4. 필요한 상세 문서 (`INT-*`, `MS-*`, `TASK-*`, `ADR-*`)

### 단계별 로딩 맵 (Phase Map)

| Phase | 즉시 로드 | 필요 시 참조 |
|-------|----------|-------------|
| **Define** | `02_project_definition/intent_registry.md`, `02_project_definition/user_story_registry.md`, `02_project_definition/requirement_spec.md`, `02_project_definition/functional_spec.md`, `02_project_definition/risk_register.md`, `02_project_definition/deliverable_plan.md` | `02_project_definition/intents/INT-*.md`, `02_project_definition/user_stories/US-*.md`, `02_project_definition/domain_glossary.md` |
| **Design** | `03_design_artifacts/adr_registry.md`, `03_design_artifacts/domain_model.md`, `03_design_artifacts/interface_contract.md`, `03_design_artifacts/data_model.md`, `03_design_artifacts/tech_stack.md` | `03_design_artifacts/adrs/ADR-*.md`, `02_project_definition/requirement_spec.md`, `02_project_definition/functional_spec.md`, `03_design_artifacts/ui_spec.md` |
| **Build** | `04_implementation/milestone_registry.md`, `04_implementation/task_registry.md`, `04_implementation/coding_convention.md`, `04_implementation/review_checklist.md` | `04_implementation/milestones/MS-*.md`, `04_implementation/tasks/TASK-*.md`, `03_design_artifacts/interface_contract.md`, `03_design_artifacts/data_model.md` |
| **Verify** | `05_verification/test_strategy.md`, `05_verification/test_case.md`, `05_verification/verification_evidence.md`, `04_implementation/task_registry.md`, `05_verification/quality_gate.md` | `04_implementation/tasks/TASK-*.md`, `02_project_definition/requirement_spec.md`, `03_design_artifacts/*` |
| **Evolve** | `06_evolution/*` | 필요에 따라 전체 프로젝트 문서 |
| **Deliver** | `07_delivery/*`, `05_verification/quality_gate.md`, `05_verification/verification_evidence.md` | `02_project_definition/deliverable_plan.md`, 전체 프로젝트 문서 |

---

## 작성 / 유지 규칙

- 이 문서는 세션 로그를 대체하지 않는 공유 재개 인덱스다.
- 표와 요약 섹션에는 현재 실제 값만 적고, 값이 없으면 `없음`으로 적는다.
- `INT-*`, `MS-*`, `TASK-*` 표기는 형식 안내일 뿐이며, 실제 값이 생기면 바로 교체한다.
- `한 줄 상태`, `현재 작업 스트림`, `다음 시작점`, `AI 핸드오프 메모`는 보통 3~5줄 이내로 유지한다.
- 같은 사실을 여러 섹션에 반복하지 말고, 요약 1회 + 관련 ID/문서 경로로 연결한다.
- 세션 로그의 raw 메모, 미확정 가설, 1회성 디버깅 흔적은 그대로 복사하지 않는다.
- **완료 서사 하베스트 규칙 (R1 — 트리거형 다이어트).** 구 규칙("길어지면 압축")은 트리거가 없어 완료 서사가 세션마다 누적되기 쉽다. → **`다음 시작점`·`AI 핸드오프 메모`의 완료 서사(✅완료·핸드오프 블록)는 최근 N세션(기본 3)만 본문 유지.** `마무리` 선언 시 그보다 오래된 완료 서사는 [state_archive.md](state_archive.md) `#NNN 이관분`으로 **원문 이관(append-only)** 하고 본문엔 1줄 포인터만 남긴다. (상세: `session_protocol.md` §공유 상태 인덱스 관리)
- **표 셀 비대 분리 규칙 (R2).** `활성 Task 요약` 등 표 셀이 여러 세션 서사로 비대해지면 상세는 `tasks/TASK-*.md`(진행 중) 또는 세션 로그 포인터(Done + 맥락 영향 소멸)로 분리하고 셀엔 재개 핵심만 남긴다. **단, 현재 작업에 맥락이 영향을 주는 항목은 셀이 커도 그대로 둔다**(churn 금지). 정리 게이트 = "현재 작업 맥락에 영향이 없는가".
- `최근 변경 파일 / 산출물`, `Human 확인 필요 사항`, `주요 리스크`는 항목이 없더라도 `없음` 상태를 명시한다.
