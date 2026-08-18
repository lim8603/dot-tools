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
| 현재 Phase | **Evolve** (유지보수 트랙 — **MS-021 v1.1.0 실사용 피드백** 진행 중, 세션 #016. INT-002 승인 여부·B-3·TC-11은 여전히 Human 결정 대기) |
| 활성 Intent | **없음** — INT-001 Closed(v1.0.0, D-23). **MS-021은 무Intent 유지보수 트랙**. INT-002(원격·크로스, Draft)는 착수 여부 Human 결정 대기 |
| 활성 Milestone | **MS-021** (v1.1.0 실사용 피드백 7건) — In Progress: 1차 4건 F5 통과, 2차 3건 코드 완료·**F5 대기** |
| 활성 Task | TASK-056~059 (Done) · TASK-060·061·062 (Review, F5 대기) |
| 상태 | Green |
| 대화 언어 | 한국어 |
| 작업 문서 언어 | 한국어 |
| 공식 산출물 문서 언어 | 한국어 |
| 마지막 갱신일 | 2026-08-18 |
| 마지막 갱신자 | AI |
| 참조 세션 로그 | session_2026-08-18_016.md |
| 최신 배포 | **v1.0.0 — Marketplace 게시 완료** (`lim8603.devswitcher-tools`, `vsce publish` DONE) + **GitHub Release v1.0.0**(vsix 첨부) + **repo public**. 첫 안정판·첫 공개 배포 |

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
> 현재 프로젝트 상태를 한두 문장으로만 요약한다.

- **MS-021 v1.1.0 실사용 피드백 7건(2026-08-18, 세션 #016, D-24/ADR-019/ADR-020).** 1차 4건(중첩 하위 프로젝트·lib 타겟·설정창 블랭크 fix·아이콘 투명화) **F5 통과·Done**. 2차 3건(Ctrl+Alt+T Switch Target·루트 "All targets" 전체 빌드·**런그룹 멤버별 Launch Run/Debug**) 코드 완료·**F5 대기**. unit 286·통합 3·실 cmake 스모크. 브랜치 `feature/ms-021-v1.1.0` 미병합. 2차 F5 통과 시 v1.1.0 게시.
- (직전) **🏁 v1.0.0 완주(2026-08-17, 세션 #015, D-23) — INT-001 Closed.** repo public·GitHub Release·**Marketplace 게시**(`lim8603.devswitcher-tools`). TC-11(WSL)=Known Issue. INT-002(Draft) 승인 여부·B-3은 Human 결정 대기.

### 현재 작업 스트림
> 핵심 작업 스트림만 3~5줄 이내로 유지한다.

- **완료(세션 #015)**: **🏁 MS-014 v1.0.0 완주 — INT-001 Closed.** TASK-054(최종점검 EV-019·docs 13종·Gate 5) + TASK-055(repo public·기여차단·GitHub Release·**Marketplace 게시**). Human 온보딩(Azure DevOps 조직→PAT→publisher `lim8603`→`vsce login`) 후 `vsce publish` DONE.
- **완료(세션 #014)**: MS-018 준비 감지 → v0.8.0 배포 + B-2 Project 카드 + README 스크린샷 6언어 리프레시. 상세는 핸드오프.
- **다음**: Human 결정 대기 — ① INT-002(원격·크로스) 승인·착수 ② B-3(언어별 enable) ③ TC-11(WSL) 검증으로 Known Issue 해소 ④ Marketplace 반응 후 폴리시.

---

## 활성 Task 요약
> 현재 바로 재개할 Task만 1~3개 남기고, 상세 배경은 목록 문서 / Task 문서 / 세션 로그에 둔다.

| Task ID | 제목 | 담당 | 상태 | 마지막 갱신일 | 다음 액션 |
|---------|------|------|------|---------------|-----------|
| TASK-060 | Switch Target 단축키 (Ctrl+Alt+T) | AI | Review | 2026-08-18 | F5(Human): 타겟 퀵픽(Node=script 폴백) |
| TASK-061 | CMake 루트 "All targets" 전체 빌드 | AI | Review | 2026-08-18 | F5(Human): 전체 빌드·run/debug 안내 토스트 |
| TASK-062 | 런그룹 멤버별 Launch (Run/Debug) | AI | Review | 2026-08-18 | F5(Human): Debug 멤버 중단점·게이트·그룹 Stop 시 세션 종료 |

> **TASK-001~050 Done(039 제외)·MS-017 키보드 단축키 완료·v0.7.0 배포**(세션 #013, unit **235**, 통합 16커맨드). **v1.0.0 로드맵(D-21)**: MS-015 Go(✅) → MS-016 Node/TS(✅) → MS-017 단축키(✅ v0.7.0) → **MS-018 준비감지(TASK-039, 다음)** → MS-014 최종점검+게시. **원격디버그(019)·크로스(020)는 INT-002**(D-22). MS-017 상세(단축키·stop·Stop버튼)는 session #013. C-3 폐기(D-15). TC-11(WSL) Deferred. 백로그 B-2·B-3.

- `상태` 값은 `Planned` / `In Progress` / `Review` / `Done`을 사용한다.
- `담당`, `상태`, `마지막 갱신일`, `다음 액션`은 `task_registry.md` / `tasks/TASK-*.md`와 같은 의미로 유지한다.

---

## 다음 시작점
> 다음 세션이 바로 시작할 수 있도록 1~3개 우선 행동만 남긴다.

1. **MS-021 2차 F5 수동검증(Human)** — 세션 로그 #016 체크리스트 3항목(Ctrl+Alt+T·All targets 빌드/차단·런그룹 멤버 Debug 기동/게이트/teardown). 통과 → version 1.1.0 스탬프·test_case/EV 기록·vsix 스모크·main 병합·태그·**Marketplace 게시**·GitHub Release.
2. **다음 사이클 결정(Human)** — ① INT-002(원격디버그 MS-019·크로스컴파일 MS-020, Draft) 승인·착수 여부 ② B-3(언어별 enable, 저우선) ③ TC-11(WSL) 검증으로 Known Issue 해소.
3. 유지보수 트랙: Marketplace 버그 신고(Issues) 대응 → 패치는 v1.1.x, 기능은 v1.x.0(SemVer).

---

## 이월 백로그 (Carryover Backlog)

> **이월의 단일 SSOT.** 흩어진 이월 메모(다음 시작점·my_state·세션 로그)를 이 표 하나로 모은다. 매 세션 브리핑(§1D)에 포함하고, 항목 추가/해소 시 및 `마무리` 시 이 표를 갱신한다. 상세 배경은 출처 세션 로그. 이월 트리거 감시는 AI의 책임이다 — Human이 찾아 지시하기 전에 브리핑·작업 중 이 표를 대조해 먼저 꺼낸다.

**지금 지시만 하면 착수 가능 (트리거 없음)**

| # | 항목 | 내용 | 출처 |
|---|------|------|------|
| ~~**B-2**~~ | **해소(2026-08-17, 세션 #014, v0.8.0)** — 설정 Project 탭 카드형 강화 완료. 프로젝트별 displayName·매니페스트 경로·툴체인 ✅/❌(Doctor probe)·활성 프로파일·칩 요약+개수를 카드로. 어댑터 무지(INV-2) 유지=선언적 필드. 순수 `projectCard.ts`(deriveToolchain·formatChipValue) 분리·단위테스트. F5 통과 | 세션 #013 Human 제안 → #014 구현 |
| **B-3** | **언어별 enable 옵션(UX·저우선)** — `devSwitcher.languages.enabled` 설정으로 스캔/표시 언어 필터. **성능 목적 아님**(코드 분석: 미사용 언어 비용=빈 findFiles뿐, 툴체인 프로브·메타데이터는 detectAdapters로 존재 언어만 스코프). 순수 노이즈/취향 제어. 활성화 이벤트는 정적이라 스캔/표시 레벨 필터. 필요 시에만 | 세션 #013 Human 제안·AI 성능분석 |
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
> 다음 세션이 바로 이어받는 데 필요한 핵심만 2~5줄로 남긴다.

- DevSwitcher Tools = 다언어(Rust·C++·C#·Python·Go·Node/TS) 통합 상태바 UX VSCode 확장. 핵심 설계는 `LanguageAdapter` + `ChipDescriptor[]`(ADR-003), SSOT 파사드(ADR-007), workspaceState 저장(ADR-001), Task API 실행(ADR-002), cargo가 실행 경로 해석(ADR-005).
- **세션 #016 — MS-021 v1.1.0 실사용 피드백 코드 완료(F5 대기)**: Human 실사용 4건 → D-24(타겟 선언 디렉토리=하위·lib 기본 보임·v1.1.0 단일 릴리즈)+**ADR-019**. ► **TASK-059(아이콘, Done)**: 배경이 진짜 검정이라 Marketplace 검은 사각형 → icon-origin에서 flood fill+페더 알파+글로우 밝기×거리 페이드로 512/256/128 재생성(`f3db2fc`). ► **TASK-056**: `classifyManifests`(순수: project() 루트=최상위·타겟 선언 중첩=하위·최근접 루트 귀속)·`ProjectInfo.parentId/library`(additive)·`rootSrcDirOf`(parentId `cmake:<rel>`에서 유도)·configure/preset/build 루트 트리 공유·Target 칩 `paths.source` 스코프·계층 표시(퀵픽·설정 카드·드롭다운 인덴트, 순수 `core/projectTree`). ► **TASK-057**: `readReplyDir` lib 4타입 포함(`CMakeTarget.type/sourceDir`)·칩 타입 주석·**`validateAction` 훅 신설**(run/debug 전 어댑터 사유 반환→오케스트레이터 토스트, INV-2 유지)·`devSwitcher.projects.showLibraries`(기본 true·General 탭). ► **TASK-058(설정창 블랭크)**: webview를 Node 구동 재현 하네스로 검증→정상, 원인=extension측 state 미도착(느린 listItems=CMake configure 동기 대기+`appliesTo` 무가드) → 정적 로딩 플레이스홀더·퀵 첫 페인트→풀 state 후속·`chipApplies` fail-open·실패 시 인페이지 에러 배너. ► 픽스처 `nested/`(exe 2+static lib 1·루트 무타겟=③ 재현 겸용). **unit 280·esbuild 135.1kb·실 cmake 4.4.2 스모크**(3타겟 타입/스코프·`--target mathlib` .lib). 브랜치 `feature/ms-021-v1.1.0` 미병합. **다음=F5(로그 #016 체크리스트) → 릴리즈 시퀀스.**
- **세션 #015 — MS-014 v1.0.0 완주(D-23)**: Human "v1.0.0 완주 + TC-11은 Known Issue + DELIVER=repo public→Release→Marketplace" 선언. ► **TASK-054**: 베이스라인 재검증(check-types·lint·unit **268**·통합 3·esbuild, EV-019) → TC-11 Known Issue 처리(test_case ❗·EV-008·GAP-001·README Known limitations·CHANGELOG) → version 1.0.0 스탬프(package.json·CHANGELOG [1.0.0]·README Install=Marketplace 우선) → **docs/ 공식 산출물 13종 병렬 생성**(전담 에이전트 12기, export_spec 헤더·추적성·미확정 표기 규칙. 12 운영서=해당없음. release_note·user_manual은 빈 템플릿→소스 승격 후 export. docs/README.md 인덱스) → deliverable_plan 수집상태 전항목 완료 → Gate 5(v1.0.0) Pass 기록. ► **TASK-055**: `devswitcher-tools-1.0.0.vsix`(15파일 274.91KB) 격리 스모크 ✅·비밀정보 스캔(추적 파일+전체 이력 173커밋) 클린 → 커밋·`v1.0.0` 태그·push → **repo private→public**(gh)+설정(description·topics·homepage) → **GitHub Release v1.0.0**(vsix 첨부) → Human 온보딩(portal 리다이렉트 이슈 → `aex.dev.azure.com` 직행 안내·조직 생성·PAT[All orgs·Marketplace Manage]·publisher `lim8603` 생성·`vsce login` 성공) → **`vsce publish` DONE → 🏁 MS-014 Done·INT-001 Closed**. ► **기여 차단(Human 추가 지시·선택: PR만 차단)**: Wiki/Projects/Discussions off·**Issues 유지**·`CONTRIBUTING.md`·PR 자동닫기 워크플로(`pull_request_target`+github-script, PR 코드 미체크아웃)·README 노트·vsix 재패키징(275.03KB)·Release 자산 교체(`3e8dd02`).
- **세션 #014 — MS-018 Run Group 준비 감지 완주·v0.8.0 배포 + B-2 Project 카드 + README 스크린샷 리프레시**: 작업 순서(Human)=B-2 → TASK-039. ► **B-2**: 설정 Project 탭을 카드형으로(어댑터 무지 INV-2 유지=선언적) — displayName·매니페스트·**툴체인 ✅/❌**(Doctor probe, 어댑터별 캐시)·프로파일·칩 요약+개수. 순수 `projectCard.ts`(`deriveToolchain` 이름중복 dedup·`formatChipValue` 가드)·단위테스트. F5 "아주 좋아". ► **MS-018(TASK-051/052/053)**: **ADR-018**(준비=프로세스 시작→포트 open/HTTP 상태코드 게이트). **모델** `RunGroupMember.readiness?`(port/http, additive) + 순수 `core/readiness.ts`(`pollUntilReady` now/sleep/signal 주입·`readinessProblems`·`describeReadiness`) + I/O `core/readinessProbe.ts`(`probePort` net·`probeHttp` http/https·`waitForReadiness`, Node 내장만) + `validateGroup` 준비검사 + 순수 `withMemberReadiness`. **게이트**: `groupSequencer` AbortLike signal + `startMember` `gateReadiness`(spawn 후 `waitForReadiness`·타임아웃/취소=`started:false`→**abort+teardown**) + `runGroup` **cancellable** withProgress(Token→AbortController→signal·진행 메시지·실패 멤버명). **Human 결정**: 타임아웃=abort+teardown·HTTP=지정코드(기본200)·취소 가능. **Run Groups UI 재설계**(Human "성의없다"→"깔끔해"): 전체 체크박스 나열 → **멤버 카드**(Stage 정렬·Remove) + **Add 드롭다운**(비멤버만·중복 방지) + 준비 편집기. **seedMemberDefaults**(그룹 멤버 기본값 시드, Script 미선택 차단 해소). **F5 통과**: `svc-a`(부팅 ~4s→포트 7801)→`svc-b` **4초 뒤 시작**(게이트 작동). 픽스처 `fixtures/node/svc-a`·`svc-b`. **README 스크린샷 재생성**(Human 지적): 히어로 "FOUR"→**"SIX toolchains"** 6행·Go/Node 개별 신규·Rust 트리플 `x86_64-pc-windows-msvc`(unknown 제거·Rust만 features 칩 빼서 길이 균형)·install 0.8.0. codicon 폰트 Edge 헤드리스 2x. unit **268**·통합 3·`v0.8.0.vsix`(15파일 274KB) 스모크. **main FF 병합·`v0.8.0` 태그·push 완료.** 다음=MS-014 v1.0.0 최종점검+게시(Human 선언).
- **세션 #013 (계속) — MS-017 키보드 단축키 완주·v0.7.0 배포**: 정적 `contributes.keybindings`(Build/Run/Stop/Debug/Switch/Groups/Settings=Ctrl+Alt+B/R/S/D/P/G/,·mac 변형·`when:devSwitcher.hasProjects`)·orchestrator `refresh` setContext·General 탭 "Keyboard shortcuts"(확장 packageJSON을 SSOT로 `buildShortcutList` 나열 + `openGlobalKeybindings` 딥링크 + 행별 Edit + 리맵 안내). **ADR-017**: VSCode 런타임 키바인딩 API 부재→정적+네이티브 편집기, 내장키(F5/Ctrl+Shift+B) 불간섭·리맵 안내만(Human). **F5 유래 추가**: ① **`devSwitcher.stop`**(Ctrl+Alt+S)=활성 프로젝트 태스크(`devSwitcher.*` taskDef+projectId 매칭 terminate)+**디버그 세션** 종료·user-stop은 실패토스트 억제 ② **Run Groups**=Ctrl+Alt+G ③ **상태바 Stop 버튼**(`$(debug-stop)`·Run 뒤·실행 중일 때만). **버그 fix**: `onDidTerminateDebugSession`에서 `activeDebugSession`이 stale→Stop 버튼 잔존 → 디버그 세션을 Map(`session.id→project`)으로 명시 추적(start/end 이벤트, extension.ts). F5 전부 통과(단축키·stop[run+디버그]·상태바 버튼 토글). unit **235**·통합 **16커맨드**·`v0.7.0.vsix`(13파일 241.55KB) 스모크. **main FF 병합·`v0.7.0` 태그·origin push·브랜치 삭제 완료.** 다음=MS-018 준비 감지(v0.8.0). 백로그 B-2(Project 탭)·B-3(언어별 enable).
- **세션 #013 — MS-016 Node/TS 어댑터 완주·v0.6.0 배포(6개 언어 완성)**: `nodeBridge`(순수 `parseScripts`·`nodeProjectName`·`packageManagerFromLockfile` + I/O `checkToolchain`·DI·vscode-free)·`nodeAdapter`·`nodeTemplate`(F20). 감지(`package.json`·`.vscode-test`/node_modules 제외)·**script 칩**(npm scripts·start/dev/serve 기본)·**packageManager 칩**(npm/pnpm/yarn·lockfile 자동감지)·`<pm> run <script>`/`<pm> run build`·**js-debug 디버그**(`buildNodeDebugConfig`·`runtimeExecutable:<pm>`·확장 불요)·Doctor(node). **ADR-016/NFR-002b**(핵심): 구현 중 Node 24가 셸 없이 `npm.cmd` spawn을 `EINVAL`로 거부함을 실측 → **배열형 `ShellExecution`**(인자 인용=인젝션 차단, NFR-002 목표 유지). 나머지 5언어는 ProcessExecution 유지. **코어 신규 `ActionCapabilities.debugRequiresBuild`**(Node=false: 디버그 전 강제 build 스킵·npm prestart/prebuild가 처리·build 스크립트 없는 JS도 디버그 가능; 기본=build-first로 5언어 보존). **F5 유래 fix**: `**/package.json`이 `.vscode-test`(통합테스트 VSCode 다운로드·내장확장·`node_modules.asar`) 수백 개를 잡아 스위처 범람 → 공유 `EXCLUDE_GLOB`에 `.vscode-test` 추가(스캔 제외·속도↑). **F5 전부 통과**(감지 정리·2칩·`npm run start`·js-debug 중단점 index.js:2 정지·확장 프롬프트 없음). unit **231**·통합 3·실 node24 셸 스모크·`devswitcher-tools-0.6.0.vsix`(13파일 239.61KB) 스모크. 커밋 7개(046 feat/docs·047 feat/docs·048 feat/docs·`.vscode-test` fix). **main FF 병합·`v0.6.0` 태그·origin push·브랜치 삭제 완료.** 다음=MS-017 키보드 단축키(v0.7.0).
- 상세설계서 §16 로드맵 M0~M6이 사실상의 Milestone 후보. v1 실구현 대상은 CargoAdapter(Rust) 단독.
- **세션 #002~#005 완료 서사**: [state_archive.md](state_archive.md) `#002~#005 이관분` 참조 (R1 다이어트, 세션 #008 마무리 이관). 요지: ADR-011·012(오버레이·설정페이지) → MS-001~006(스캐폴드·types·CargoBridge/Adapter·상태바/저장/감시·실행/디버그·설정페이지+export/import) → MS-007(Doctor·E1칩·rustup·pre/postBuild·통합테스트) 전부 Done·병합.
- **세션 #006 — TASK-021 완료·MS-007 Done·v0.1.0 릴리즈**: README.md(한국어: 소개·지원범위·요구사항·설치·상태바 칩표·명령·설정페이지·settings·한계) + package.json(version 0.1.0·publisher `lim8603`·repository `github.com/lim8603/dot-tools`·keywords) + `.vscodeignore`(dist+README+LICENSE+CHANGELOG+images/png만; 소스맵·CLAUDE/AGENTS·.claude·profile.json·workspace 제외) + LICENSE(MIT) + CHANGELOG(v0.1.0). **상태바 목업 2종**: 처음 손그림 SVG→PNG했으나 아이콘이 실물과 달라, **실제 VSCode codicon 폰트(simple-browser/media/codicon.css 내장 base64)로 HTML 렌더 후 Edge headless 스크린샷** → 실 codicon PNG(`images/status-bar.png`·`status-bar-compact.png`), 2x+LCD off로 색번짐 제거. `vsce package`→`devswitcher-tools-0.1.0.vsix`(9파일 34.68KB), 격리 프로필 설치 스모크 통과(`lim8603.devswitcher-tools@0.1.0`). Gate 5 조건부 Pass(D-12). 잔여 수동검증(TC-11 WSL 등)은 지시 시.
- **세션 #006 (계속) — v0.1.0 병합·push + MS-008 착수(TASK-022 코드완료·F5 대기)**: `feature/task-021-readme-vsix`→main FF 병합·`git push`(GitHub v0.1.0 반영). MS-008 분해(TASK-022~024, D-13). **TASK-022 구현**: `core/projectName.ts`(순수 검증·mocha4)+`ui/newProjectWizard.ts`(폴더→언어→이름)+`types.ts NEW_PROJECT_TASK_TYPE`+`cargoAdapter.createProjectTask`(`cargo new`, ProcessExecution 셸無)+`adapterRegistry.adapter()/creatableAdapters()`+`orchestrator.newProject()`(마법사→createProjectTask→TaskRunner(synthetic lock)→성공 시 refresh+findCreatedProject→setActiveProject+renderActive 자동전환 OQ-001; 실패 시 Run Doctor; 스텁 throw catch)+`extension.ts`/`package.json`(newProject 커맨드·devswitcher-newproject taskDef). check-types·lint·**unit 96**·esbuild OK. TASK-022 F5 통과·커밋(ab58c15/6999f34).
- **세션 #006 (계속) — TASK-023 코드완료·F5 대기**: 계약 일반화 `createProjectTask→createProject(target): {kind:'task'}|{kind:'files'}`(types.ts `ProjectFile`/`ProjectCreation`). cargo/dotnet=네이티브 new(task, `dotnet new console -o`), **cmake/python=확장이 `workspace.fs`로 템플릿 작성(files)** — D-13을 ShellExecution→workspace.fs로 개정(셸 종류 미제어·C++ `<>` 충돌 발견). `cmakeTemplate.ts`/`pythonTemplate.ts`(순수·mocha2) + orchestrator `newProject` kind 분기 + `writeProjectFiles`(createDirectory+writeFile). interface_contract §5 갱신. **scope A**: v1 스위처 자동등장=Rust만(나머지 3개 listProjects v2 스텁). check-types·lint·**unit 98**·esbuild OK. TASK-023 F5 통과(4언어 생성·내용 검증)·커밋(2684ee7/467f8f3).
- **세션 #006 (계속) — TASK-024·MS-008 Done**: 통합 테스트에 `newProject` 추가 + **퍼블리셔 회귀 fix**(EXTENSION_ID `seunghyun`→`lim8603`) → `npm run test:integration` **3 passing**. test_case(§1 퍼블리셔·11커맨드·§2 TC-14~17 F20 Pass·요약 Manual 11)·verification_evidence(EV-007 F20·EV-001 unit98·EV-002 11커맨드)·CHANGELOG([Unreleased] F20) 갱신. **MS-008 Done → 등록 Milestone(MS-001~008) 전부 완료.** 브랜치 `feature/ms-008-new-project-wizard` 5커밋(022·023 각 feat+docs + 024) **병합 대기**. **다음: main FF 병합+push (지시 시) → 선택적 v0.2.0 릴리즈.**
- **세션 #012 — v1.0.0 완주 로드맵 확정(D-21) + 재스케줄**: TASK-042 추가 기능·논의. **v1.0.0 로드맵 = 4개 MINOR**: **MS-015 Go**(v0.5.0)·**MS-016 Node/TS**(v0.6.0, 6개 언어 완성)·**MS-017 키보드 단축키**(v0.7.0, 설정 페이지 General 탭 기본+변경, 팀 필수)·**MS-018 준비감지**(v0.8.0, TASK-039 승격=포트/헬스체크) → **MS-014 v1.0.0 최종점검+Marketplace 게시+GitHub Release**. 버전 사다리 0.4.0→0.5~0.8→1.0.0(중간은 vsix+태그, 게시는 1.0.0만). **원격디버그(MS-019)·크로스컴파일(MS-020)은 단위가 커 post-1.0로 재스케줄**(Deferred; v1.1.0/v1.2.0 후보; 설계서 §16이 원래 이 둘을 "v2+ 백로그·v1 범위 밖"으로 분류했던 위치로 복귀) **→ 이후 새 Intent INT-002(원격·크로스 개발 환경 확장, Draft)로 분리**(D-22): INT-001은 v1.0.0(MS-014)으로 완주, 원격/크로스는 INT-002에서 v1.0.0 후 착수. MS-015~018 신설·MS-019/020=INT-002·MS-014 재정의·intent/milestone/task registry 반영. 순서 근거: 검증된 패턴(언어·준비감지)·핵심 가치 확장만 v1.0.0, 큰 아키텍처(§12.4 "한 창=한 환경" 한계 도전)는 1.0 이후. **다음: MS-015(Go) 착수**(Task 미분해). 원격/크로스·단축키 구현방식은 착수 시 ADR. **README/LICENSE/package.json 저작권 표기** `LIM SEUNG HYUN`으로 통일·커밋(`9e3310b`). ► **MS-015 Go 어댑터 완료·v0.5.0 배포**: TASK-043(감지·**target 칩**[main 패키지, 칩=target only D-21/Human]·createProject files·collectDiagnostics)·044(build/run `assembleGoArgs`·`$devswitcher-go` 매처·옵션 카탈로그 ldflags/gcflags/tags/race/trimpath/CGO_ENABLED)·045(delve `buildDelveConfig`·심볼 보존 위해 릴리즈 ldflags 제외). `goBridge`(순수 파서+I/O·DI·vscode-free)·`goTemplate`·`goAdapter`. **F5 전부 통과**(Doctor 슬라이스=go 미설치 시 ❌+E1→설치 후 ✓ / build/run / delve 중단점·`dlv.exe` 자동설치). unit **219**·실 go1.26.6 스모크(go list/build/run)·`devswitcher-tools-0.5.0.vsix`(13파일 237.64KB) 스모크. **main FF 병합(`75bdf22`)·`v0.5.0` 태그·origin push·브랜치 삭제 완료.** 다음=MS-016 Node/TS(v0.6.0).
- **세션 #011 — MS-013 Run Group 착수 + TASK-036(모델·저장·순수 계획/검증) 코드 완료 + 버전 정책 반전(D-19)**: 브리핑 후 **MS-013 착수**. **Human 설계 결정(2문항)**: ① 준비 신호=**프로세스 시작 감지**(`onDidStartTaskProcess`), 헬스체크는 후속 마이너 / ② 멤버=**Run 전용**. 추가 지시: **v1.0.0 자동 완주 안 함 — 특별 지시 전까지 v0.x.x 유지**, 추가논의 TASK 신설 후 그때 v1.0.0 결정. → **D-19**(버전 정책 반전: MS-013=v0.4.0, v1.0.0=Human 선언) + **TASK-042/MS-014**(v1.0.0 완주 결정 게이트) 신설. **ADR-015**(실행 모델: 준비=프로세스 시작·Run 전용·계층적 위상정렬·teardown=terminate·저장=workspaceState.groups). **TASK-036 구현**: `types.ts` `RunGroup`/`RunGroupMember`/`PersistedState.groups`(additive·`StateStore` 로드시 `[]` 정규화·importState 보존·profileExport `next.groups` 이월) + `stateStore` groups 접근자(get/save/delete) + 순수 `core/runGroupPlan.ts`(`planGroupExecution` Kahn 계층화[cyclic 잔여 보고]·`validateGroup`). **TASK-037 구현(동일 세션)**: `TaskRunner.start`(종료 대기 없이 시작·`onDidStartTaskProcess`=`ready`·`onDidEndTaskProcess`=`done`·`terminate`, 프로젝트 락 공유·`StartedTask`/`StartResult` 타입) + 순수 `core/groupSequencer.ts`(`sequenceGroup` — 계층 병렬 기동·준비 대기 후 다음 계층·실패 시 역순 teardown, injectable startMember) + `core/groupOrchestrator.ts`(`runGroup` validate→plan→sequence→추적·done prune / `stopGroup` terminate / required칩 가드[appliesTo] / prepareInvocation·runRequiresBuild 빌드 선행 / profile 오버레이 / `promptRunGroup`·`promptStopGroup` QuickPick) + extension/package `devSwitcher.runGroup`·`stopGroup` 커맨드 + 통합테스트 커맨드목록. unit `runGroupPlan`·`groupSequencer`=191·esbuild prod 91.5kb. **TASK-038 구현(동일 세션)**: 설정 페이지 **Run Groups 탭**(html.ts renderGroups/renderGroupEditor — 워크스페이스-레벨·activeProject 무관 렌더·그룹 CRUD·멤버 체크박스·종속 "starts after" 박스·검증경고·Run/Stop) + `settingsPanel`(GroupOrchestrator 주입·group 메시지 7종·`buildGroupViews` running/problems·`makeGroupId`) + 상태바 `setGroups`(`$(run-all) Groups`·GROUP_CHIP·render sweep/hideAll 면제) + extension 배선(`syncGroups`·setOnChange) + 순수 편집 `withMember`/`withMemberDependencies`(runGroupPlan, dangling 정리) + 단위 +5. **F5-1 버그 fix**(Human 스크린샷=설정 페이지 공백): `renderProfile`의 `project\'s`가 템플릿 리터럴서 `'`로 소비→webview JS 문자열 깨짐(세션 #010 유입 잠복 버그, **v0.3.0 설정 페이지 이미 깨짐**). 아포스트로피 제거 + `import type * as vscode` + 회귀 가드 `settingsHtml.test.ts`(스크립트 문법 파싱 검사). unit 197·esbuild prod 99.3kb. **F5-2 피드백 반영(D-20)**: ① 순서 UI **스테이지 번호**(종속 매트릭스→멤버별 Stage, `memberStages`/`withMemberStage` 순수, dependsOn/엔진 불변) ② 중복=**이미 실행 중 건너뛰기**(`startMember` `isRunning` 가드) ③ 상태바 **아이콘만** + **통합 메뉴** `promptGroups`(Run/Stop/Stop-all)·`stopAll`·`devSwitcher.groups` 커맨드 ④ 상태바 **Run 바로 뒤**(`TRAILING_ORDER`). unit **203**. **재-F5 통과**(Human) → TASK-036·037·038 Done. **TASK-040 완료 → v0.4.0 배포**: README Run groups·CHANGELOG [0.4.0]·TC-18~20·EV-009·`devswitcher-tools-0.4.0.vsix`(13파일 235.6KB) 스모크 통과. **4커밋 main FF 병합·`v0.4.0` 태그·origin push·브랜치 삭제.** **MS-013 Done → INT-001 등록 조건(C-7+C-6) 전부 충족.** 다음=TASK-042(추가 기능·논의 + v1.0.0 결정, Human). 039(준비감지)=후속 마이너.
- **세션 #010 — TASK-041(CMakePresets.json) F5 통과 → MS-012 구현 완료**: **핵심 설계(Human 승인)**=Preset 칩 **동적 대체**(D-17). **코어 계약(제네릭)**: `types.ts` `ChipDescriptor.appliesTo?(project):Promise<boolean>`(false=칩 숨김+필수 프롬프트/기본 시딩 생략) · `statusBar` `RenderOptions.hiddenChipIds` 존중 · `orchestrator` `resolveHiddenChips`(렌더 전 해소·stash)+`renderBar`(5개 render 통일)+ensureRequiredChips/applyDefaults appliesTo 가드. **UI는 predicate 결과만 알 뿐 프리셋 무지(BR-003).** **`cmakeBridge`(순수)**: `parseConfigurePresets`(main+user 병합·`inherits` binaryDir 상속[cyclic 가드]·`hidden` 제외[상속 부모로 유지])·`resolvePresetBinaryDir`(`${sourceDir}`/`${presetName}` 확장·폴백) + I/O `configurePreset`(`cmake --preset` cwd=srcDir·서명캐시)·`targetsForPreset`·`dropTargetCache` + `buildArgs` config **옵셔널**(프리셋 `--config` 생략). **`cmakeAdapter`**: `presetCache`(srcDir별·동기 peek)·`readPresetsFor`(workspace.fs 읽기전용·`siblingUri` 원격안전)·`configuredTargets`(프리셋↔플레인 단일 분기) + **Preset 칩**(required·appliesTo=프리셋有·displayName)·profile/architecture appliesTo=프리셋無. build/run(sync peekActivePreset)·prepare/resolve/debug(async configuredTargets). **target 칩·디버거 자동판별은 프리셋 binaryDir에서 재사용.** 픽스처 `fixtures/cmake/presets/`(hidden vs-base 상속·`${sourceDir}/out/build/${presetName}` 매크로·msvc-x64/x86/clangcl 전환). check-types·lint·unit **172**(+7)·esbuild 84.8kb. **실 cmake 4.4.2 스모크 통과**(실 브리지: parse→`cmake --preset msvc-x64`→File API `preset-demo`→MSVC 판별→build→run 인자). **F5 완전 통과(Human)**: Preset 칩 노출·profile/arch 숨김·`cmake --build …\out\build\msvc-x64`(--config無)·run 출력·debug cppvsdbg 중단점. 비프리셋(hello/test-cmake) 현행 유지. 커밋(feat+docs)·미병합. **다음: MS-012 main 병합→Done(C-7 완주).** ※ Human 질문: 스모크 절대경로는 스크래치패드 일회성 스크립트(미배포·미커밋), 확장 소스는 런타임 프로젝트 경로 유도로 이식성 무결.
- **세션 #009 — TASK-033 계속(listProjects+chips+File API) 코드 완료(Review, F5 대기)**: cmake 4.4.2+VS18(2026)로 `hello` 픽스처 configure→**File API reply 실구조 확보**. **`cmakeBridge.ts`**: 순수 파서 `hasProjectCommand`/`parseProjectName`(project() 루트·이름, 주석제거·변수명 폴백) + File API 4종(`parseReplyIndexCodemodel`·`parseCodemodelConfigs`·`parseTargetInfo`·`executableArtifact`) + fs `readReplyDir`(index→codemodel→target, EXECUTABLE 필터·config 선택/폴백) + `CMakeBridge.listTargets`(shared query `codemodel-v2` 작성+plain configure+readReplyDir, (buildDir,config) 캐시)+`invalidateCache` 확장. **`cmakeAdapter.ts`**: `listProjects`(project() 루트 판별·`workspace.fs`·id=`cmake:${rel}`) + chips 3종(**profile** 정적 4 build type·default Debug / **architecture** 정적 플랫폼 Host default+x64/Win32/ARM64[Human 승인, `-A` 주입은 TASK-034] / **target** File API EXECUTABLE·단일 자동선택·configure 실패 시 [] graceful) + **`requiredExtensions` `[]`**(ADR-014: 빌드/실행 무의존, 디버거 확장 TASK-035). 픽스처: `fixtures/cmake/hello/`(F5용) + `fixtures/cmake/file-api-reply/`(실 reply 5파일). 테스트 +12(File API 파서·readReplyDir 실 픽스처 end-to-end). check-types·lint·**unit 154**·esbuild **76.9kb** OK. **실 cmake end-to-end 스모크 통과**: `listTargets(Debug)`→`Debug/hello.exe`, `listTargets(Release)`→`Release/hello.exe`(구성별 artifact 경로 정확). **F5 통과·커밋**(`8664be9`+`4ca0330`). ► **TASK-034**(동일 세션): 핵심이슈=동기 단일 Task 모델에 configure+build 2단계 담기 → **optional `prepareInvocation` 훅**(Human 승인; 오케스트레이터가 build/run/debug Task 전 await; CMake만 구현, 나머지 no-op). `cmakeBridge` `configureArgs`/`buildArgs`/`overlayDefines`+오버레이-aware `configure`(서명캐시)/`targetsFor`. `cmakeAdapter` `createBuildTask`=`cmake --build`(셸無·`$msCompile`)+`prepareInvocation`=오버레이 configure+`resolveExecutable`=File API artifact `join(buildDir,·)`. `package.json` `devSwitcher.cmake` taskDef. interface_contract §4 반영. unit **158**(+4). **실 cmake 빌드/실행 스모크 통과**(configure 오버레이→`cmake --build`→exe 산출·실행) + **F5 통과**(test-cmake.exe). F5 피드백: 교차-컴파일러 옵션 예시 수정(`/O2 /W4` MSVC·MSVC/GCC 병기, **KB #9**). **F5 통과·커밋**(`c0f564a`+`a231e24`+`814d654`). ► **TASK-035**(run+debug): 디버거는 컴파일러 강결합이라 File API `toolchains`(`CMAKE_CXX_COMPILER_ID`)로 **자동판별**(`debuggerFor`: MSVC→cppvsdbg/GNU→cppdbg+gdb/Clang→cppdbg+lldb, WSL/MinGW 자동대응) + **override 설정**(`devSwitcher.cmake.debugger`). `createDebugConfig`가 판별 확장 **동적 ensure**(requiredExtensions=[] 유지). run=**build-then-exec**(`ActionCapabilities.runRequiresBuild`→오케스트레이터 사전 build + `createRunTask`=`peekArtifact` 동기캐시 exe·디버거 무의존). 오케스트레이터 Task 생성을 prepareInvocation 이후로 이동. unit **165**(+7). 실 cmake 스모크(detectCompiler→MSVC·debuggerFor→cppvsdbg·peekArtifact→Debug/hello.exe) + **F5 Run+Debug 통과**(중단점 정지). **KB #6**(환경결속 툴 자동판별). **다음: 커밋(이 세션 마무리) → TASK-041(CMakePresets)**.
- **세션 #008 — TASK-031(Python 실행) 코드 완료(Review, F5 대기)**: `makePythonRunTask`(ProcessExecution 셸無 NFR-002 · 인터프리터=environment 칩값, 순수 helper `resolveInterpreter`로 미선택 시 `python` 폴백[createRunTask 동기라 checkToolchain await 불가] · script=target 칩 · runArgs 뒤따름 · **problemMatcher 없음**[인터프리터 런은 컴파일 진단 없음]) + createRunTask 배선 + `taskEnv`(config.env 전달, dotnet 동형 — Python은 outputDir/RUSTFLAGS 아날로그 없음, env가 전부 §8) + `resolveExecutable`=**대상 `.py` 절대경로**(빌드 없음 → exec 호출 없이 경로 해석·부재 시 E6). **설계 판단**: registry는 "인터프리터 경로"였으나 debugpy launch가 `program`=스크립트/`python`=인터프리터 구조 → project_state handoff("스크립트 경로") 채택(TASK-032 디버그 `program` 직결). optionCatalog `PYTHONOPTIMIZE`(env, ≡`-O`) 추가 + `devSwitcher.python` taskDef 등록. **실 python 3.12 run 스모크 통과**(PYTHONPATH 모듈 import·PYTHONOPTIMIZE→`__debug__=False`·argv). **TASK-032(디버그+진단)**: 순수 `buildDebugpyConfig`(debugpy: program=스크립트·python=인터프리터[run 동일]·`console:integratedTerminal`[stdin]·justMyCode·env 비면 생략) + `createDebugConfig`(빌드 없음 §7.4 직행) + `collectDiagnostics`(Python 인터프리터 critical tier2 + `ms-python.python` optional tier1). debug 플로우는 어댑터-무지라 코드 변경 불요(build===false→빌드 스킵, requiredExtensions ensure로 Python 확장=debugpy 번들 설치 유도). **디버그 타입=`debugpy`**(구 `python` 아님, 현행 확장 등록). check-types·lint·**unit 133**(+debugpy 2)·esbuild 71.1kb OK. **MS-011 어댑터 계약 전 메서드 실구현 완성**(createBuildTask만 build===false 미호출 스텁). **F5(Human): 감지·리트머스·칩·Run·debugpy 통과 / Doctor 미확인.** F5 유래 수정 2건: **[A] Environment 칩 중복**(`python`/`python3` 동일 인터프리터 2회) → probe를 `-c`(버전+`sys.executable`)로 바꿔 실경로 `interpreterKey` dedup(선호순 유지·venv 겹침도 처리). **[B] New Project 항상 루트 생성** → 마법사 step1을 네이티브 폴더 선택창(showOpenDialog·하위 폴더 자유 선택·워크스페이스 내부 검증)으로 교체(`target.folderUri`만 변경, 배선 무변경). functional_spec F20 §2 동기화. **[C] 수동 재스캔 명령 부재**(감시가 폴더 이동 놓쳐 이전 경로 기억) → `DevSwitcher: Rescan Projects`(`devSwitcher.rescan`) 추가: `registry.invalidateAll`(전 어댑터 캐시)→`orchestrator.rescan`(refresh+진단+개수 토스트)+명령 등록+통합 12커맨드+README/functional_spec F17/EV-002 동기화. **F5 재현 버그 fix**: `invalidateAll`이 CMake 스텁 `invalidateCache`(notImplemented throw)까지 호출해 rescan 실패 → try/catch 관용(scan()이 스텁 listProjects throw 관용과 동일). check-types·lint·**unit 135**·**통합 3 passing**·esbuild 72.1kb OK. **다음: MS-011 재-F5(Doctor·A·B·C) → Done → v1.2.**
- **세션 #007 — INT-001 완주 로드맵 착수 + C-3 폐기 + L-1 구현**: ① 진척 브리핑 중 task_registry TASK-022·023 stale(`Review`) 발견→`Done` 정정. ② **INT-001 완료 조건 = C-7(다언어 실구현)+C-6(Run Group)** 확정. **C-3(캐노니컬 파일 편집) 폐기**(D-15/**ADR-013** — "파일 무편집 = 영구 불변식"; 영속화는 export/import가 이미 해결; `persistSetting` 계약 제거=TASK-026). ③ 스케줄 등록: **MS-009**(정리: L-1+계약정리) → **MS-010 C#** → **MS-011 Python** → **MS-012 CMake**(=C-7) → **MS-013 Run Group**(C-6). TASK-025~040. ④ **MS-009 Done**: TASK-025(L-1 Extra rustflags) — cargo optionCatalog `stringList`(**Compiler 섹션**) + `applyOption` 빈배열 제거 + `buildConfigArgs` rustflags 스킵 + `buildRustflags(linker, compiler)` append + 설정 페이지 stringList 에디터(textarea·blur) + preview RUSTFLAGS. **F5 통과**(1차 UX 버그=Linker 섹션 오배치→Compiler 이동 후 재확인 통과). TASK-026 — `persistSetting` 계약 제거(types.ts + 4어댑터 stub + cargo import 정리 + interface_contract/domain_model/functional_spec 정리, 호출처 0). **unit 104·esbuild 61.7kb OK.** **다음: MS-010(TASK-027 DotnetBridge)부터 C-7 착수.**

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
