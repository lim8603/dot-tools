# 상태 아카이브 (State Archive)

> `project_state.md` / `my_state.md`에서 하베스트된 과거 완료 서사·핸드오프 이력의 **append-only 원문 저장소**(Log / Archive 역할).
> 매 세션 로드 대상이 아니다. `project_state.md`의 요약이 포인터로 가리키며, 특정 과거 세션 맥락이 필요할 때만 해당 섹션을 연다.

---

## 목적 / 운영 규칙

- 이 문서는 **다이어트 규칙 R1**(→ `session_protocol.md` §공유 상태 인덱스 관리, `project_state.md` §작성/유지 규칙)의 **하베스트 대상**이다.
- `마무리` 선언 시, `project_state.md`·`my_state.md`의 서술형 완료 서사(✅완료·AI 핸드오프 블록) 중 **최근 N세션(기본 3) 초과분**을 여기로 **원문 이관**한다. 본문에는 1줄 포인터만 남긴다.
- 이관은 **append-only**다 — 여기서는 요약·삭제하지 않고 원문을 그대로 누적한다. 정제·요약은 `project_state.md` 본문 쪽에서만 한다.
- 이관 단위는 세션(#NNN) 또는 이관 회차다. 아래 `## 이관분` 아래에 `### #NNN 이관분`(또는 회차) 섹션을 추가한다.
- 이 문서 자체가 과도하게 비대해져도 **압축하지 않는다** — 아카이브의 역할은 원문 보존이다. 필요하면 회차/기간 단위로 파일을 분리(`state_archive_YYYY.md` 등)하되, 이는 Human 승인 후 진행한다.

---

## 이관분 (project_state.md)

> `project_state.md`의 `다음 시작점`·`AI 핸드오프 메모`·`최근 완료 서사`에서 이관된 원문. 최신 이관분을 위에 쌓는다.

### #002~#005 이관분 (2026-08-16, 세션 #008 마무리 — R1 다이어트)

> 세션 #008 마무리 시 `project_state.md` AI 핸드오프 메모에서 최근 3세션(#006·#007·#008) 초과분을 원문 이관.

- **세션 #002 신규(ADR-011·012)**: 설정은 3계층(①확장설정 ②캐노니컬 정의 ③호출 구성 오버레이). VS2026식 속성은 계층 ③으로 흡수 — 파일 무편집, `(프로젝트×구성)`별 저장, 빌드/실행 시 `--config`/env 주입. 설정 UI = WebviewPanel "설정 페이지" + 어댑터 선언 옵션 카탈로그. **언어별 능력은 `interface_contract.md` §8 매트릭스가 SSOT.** 캐노니컬 파일 편집은 v2. 구현은 MS-006(M5)에서.
- **세션 #003**: MS-001·002 완료·main 병합(스캐폴드·types.ts·4개 어댑터 스텁, tsc 인터페이스 확정). OQ-002 확정 = `config` 별도 인자. 상세설계서 v1.2 최신화 후 `06_evolution/imported_context/`(영문명 Detailed/Concept-Design)로 이동 — 운영 SSOT는 .cowork, 상세설계서는 **회사 툴 재사용용 통합 스냅샷**. cargo 구현 기준 = 상세설계서 §8.
- **세션 #004**: **TASK-005(cargo CLI I/O) 완료(Review)** — `cargoBridge.ts`에 I/O 계층 추가: `execCapture`+`defaultExec`(child_process.execFile, **셸無** NFR-002, DI로 테스트 가능) + `CargoBridge` 클래스(`fetchMetadata`+manifestPath 캐시·`listInstalledTargets`·`checkToolchain`·`invalidateCache`). 캐시는 시간만료 없음(watcher/명시적만, §8.1). **핵심 결정**: `DevSwitcherError`를 `core/errors.ts`(vscode-free)로 분리 → 브리지가 값으로 throw해도 mocha에서 `vscode` require 안 됨. `types.ts`는 재-export로 하위호환. mocha 14 신규(총 33)·tsc/eslint/esbuild OK·**실 cargo 1.96 스모크**(checkToolchain·metadata·targets·E2=CARGO_METADATA_FAILED).
- **세션 #004 (계속)**: **TASK-006(CargoAdapter 실구현) 완료(Review)** — `cargoAdapter.ts` 런타임 스텁을 실구현으로 교체(vscode-aware 얇은 배선). 모듈 싱글턴 `CargoBridge` 보유, `ProjectInfo→manifestPath/cwd` 변환 담당. listProjects(최단경로 우선·member 중복제거·`id=cargo:${상대경로}`)·chips 4종·createBuild/RunTask(`ProcessExecution`, 셸無, `config.env`+`CARGO_TARGET_DIR`)·resolveExecutable(build `--message-format=json`+`pickExecutable`, E6=`EXECUTABLE_NOT_FOUND`)·invalidateCache 위임. `CargoBridge.peekMetadata` 추가(동기 hasDefault 판정). **의도 이월**: createDebugConfig→M4, createProjectTask→MS-008, persistSetting→v2. problemMatcher/커스텀 profile/F19/compiler·linker 오버레이도 후속. **MS-003 3개 Task 모두 Review**. 34 테스트·tsc/eslint/esbuild OK.
- **세션 #004 (계속)**: **MS-003 main FF 병합**(d249de2, 브랜치 삭제). **MS-004(M3) 코드 완료** — 3분할 구현: TASK-007 데이터(AdapterRegistry 스캔·매칭 + StateStore workspaceState·reconcile, 순수코어 `stateReconcile.ts` mocha 8)·TASK-008 UI(StatusBarController 칩/버튼 렌더 어댑터무지 + picks QuickPick + `defaultChipFormat` mocha 2)·TASK-009 배선(Orchestrator pickChip/switchProject·applyDefaults·ManifestWatcher 500ms 디바운스·extension.ts activate·package.json 5커맨드+activationEvents·cargo 픽스처 `src/test/fixtures/cargo/hello`). mocha 44. 액션버튼 렌더만(실행=MS-005), 툴체인경고칩(E1)=MS-007, 30일GC/export=후속. **F5 end-to-end 검증 통과**. **MS-004 Done → main FF 병합.** CLAUDE.md·AGENTS.md 프로젝트 컨텍스트 작성.
- **세션 #004 (계속)**: **MS-005(M4 실행·디버그) 코드 완료 — F5 검증 대기.** 2분할: TASK-010 실행(`core/taskRunner.ts` executeTask+onDidEndTaskProcess 종료코드·프로젝트별 동시실행 거부 E9 · orchestrator.build()/run() = required 칩 검증 E4→Task 실행→실패 시 Problems 포커스 토스트 · 상태바 spin · `$devswitcher-rustc` 자체 problemMatcher(package.json, Rust 확장 없이 resolve) · ctrl+alt+b/r/d 키바인딩)·TASK-011 디버그(`cargoAdapter.createDebugConfig`=resolveExecutable+순수 `buildLldbConfig` · `core/ensureExtension.ts` CodeLLDB 온디맨드 설치 §13.3 · orchestrator.debug() §7.4 전체 플로우 · launch.json "Run Extension (with extensions)" 구성 추가). mocha 46(buildLldbConfig 2 신규). **F5 검증 통과**(Build/Run + Debug 중단점 정지). `ensureExtension` 온디맨드 설치 루프 fix(39af4ac). **MS-005 Done·main FF 병합.**
- **세션 #004 (계속)**: **MS-006 코어(설정 페이지) 구현·F5 검증 통과 — 미병합 `feature/ms-006-settings-page`.** 3분할: TASK-012(오버레이 주입 — `buildConfigArgs`/`tomlScalar`/`buildRustflags`/`parseArgsLine`, cargoAdapter가 compiler→`--config profile.<p>.<id>`·linker→RUSTFLAGS·env/outputDir 주입, execCapture에 env 추가로 resolveExecutable 동일 아티팩트)·TASK-013(`ui/settingsPanel/` WebviewPanel CSP·단방향 state·프로젝트/Features/프로파일RO 탭·`openSettings`+상태바 기어)·TASK-014(옵션 카탈로그 에디터·`core/invocationConfig.ts applyOption`(compiler/linker record·outputDir·env[label])·`core/argsLine.ts`(parseArgsLine 이동)·build/run 명령 미리보기(Task의 ProcessExecution 역읽기)). mocha 61. F5 피드백 반영: 명령 미리보기 2줄(runArgs 표시)·**자동갱신**(orchestrator `viewSync`→settingsPanel.refresh, Refresh 버튼 제거)·키바인딩 제거(충돌)·enum 기본값 튐 수정(실효값 표시)·입력창 넓힘/라벨 위 배치·**launch 기본을 확장 포함으로**(clean은 별도 구성). ui_spec.md 작성(C-1 해소). **다음: MS-006 병합 + TASK-015(export/import).**
- **세션 #005**: **MS-006 코어 main FF 병합 완료**(335f982, `feature/ms-006-settings-page` 삭제). 병합 전 게이트 재확인 — check-types/eslint clean·mocha 61·esbuild 41.4kb OK. B-1 해소.
- **세션 #005 (계속)**: **TASK-015(export/import F12) 완료 — F5 통과·main FF 병합(b7864cf), MS-006 Done.** `core/profileExport.ts`(vscode-free: build/parse(검증→`PROFILE_IMPORT_INVALID`)/merge(스캔 존재분만 반영·skip)) + `ProfileExport`(C-4: PersistedState 정렬, activeProjectId 제외) + StateStore getState/importState + orchestrator export/importProfile(save/open 다이얼로그+`workspace.fs`, import 후 refresh reconcile) + 커맨드 2종. **파생 개선(설정 페이지 UX)**: 옵션 `example`을 주입형태→**bare 값(placeholder)**로 교정하고 `injectsAs`(주입 힌트)·`docUrl`(공식문서 링크) 분리 — 사용자가 예제를 복붙해 이중 접두사 되던 문제 해결. Command preview에 **env 주입 표시**(`VAR=val` 접두사) 추가로 RUSTFLAGS/CARGO_TARGET_DIR/RUST_LOG 검증 가능. F5: export→값변경→import 라운드트립 복원 + preview env 정상 + docs 링크 정상 확인. mocha 73. **다음: MS-007(품질·배포) 착수 — Task 분해부터.**
- **세션 #005 (계속) — MS-007 016~020 완료·병합**: TASK-016·017(Doctor — `core/diagnostics.ts` 순수판정 + `LanguageAdapter.collectDiagnostics` + QuickPick + **E1 툴체인 경고칩** + 디버그취소 Run Doctor)·TASK-018(rustup target 자동설치 — `listAllTargets`/`parseTargetList`/`addTarget` + `ChipDescriptor.onPick` 훅 + **미설치 target 토글 접기**(`secondary`/`secondaryToggle`))·TASK-019(pre/postBuild 실행 — `core/buildEvents.ts` ShellExecution Task, NFR-002a 셸예외, pre 실패→중단 + buildEvent 에디터, **C-5 해소**)·TASK-020(`@vscode/test-electron` 통합 하네스 3 passing + §15.2 체크리스트 + 05_verification 3종). **부가 v1 UX**: 상태바 `compact`(아이콘만)·`selectedOnly`(값 없는 optional 칩 숨김, `isBlank`로 features 'default'도) 설정 + 설정페이지 General 탭 토글. **버그 fix**: 설정페이지 백지(템플릿 리터럴 `\n`→`\\n`)·**taskDefinitions 등록**(작업형식 경고 제거)·옵션/RunArgs 필드 UX 통일(placeholder 제거·2줄). 아키텍처 미선택=`default`(`unsetText`)·`Host default` 복귀(`clearValueId`). mocha 92 + 통합 3. **ChipDescriptor 확장**: onPick·secondary·secondaryToggle·unsetText·clearValueId·isBlank.

_(이하 이관분은 시간 역순으로 위에 쌓는다.)_

---

## 이관분 (my_state.md)

> `members/<이름>/workspace/my_state.md`의 `오늘의 세션 Intent`·`최근 결정/작업 메모`·`참조 세션 로그`에서 이관된 원문.

_아직 이관된 항목이 없다._

---

## 작성 / 유지 규칙

- 포인터 규율: `project_state.md`에서 이관분을 가리킬 때는 `[state_archive.md](state_archive.md) #NNN 이관분` 형태의 1줄 포인터를 남긴다.
- 이 문서는 기준 본문(Canonical)이 아니라 로그/아카이브(Log/Archive)다. 확정 사실의 근거로 삼을 때는 항상 승인된 기준 문서/ADR을 우선하고, 여기 원문은 보조 근거로만 쓴다.
- imported context와 달리 이 문서는 프로젝트가 스스로 생산한 이력이므로 VCS로 추적한다(세션 로그와 달리 gitignore 대상이 아니다).
