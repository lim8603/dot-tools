# Task Registry

> Task 인덱스 및 경량 WBS — 실제 실행 단위를 등록하고 추적한다

---

## 목적

- 현재 진행 중인 Task와 의존 관계를 빠르게 파악한다
- WBS의 기본 인덱스로 사용한다
- 상세 실행 계획이 필요한 Task는 `tasks/TASK-*.md`로 확장한다

---

## 기록 규칙

- registry에는 `TASK-000` 같은 더미 ID를 남기지 않는다.
- 항목이 없을 때는 표에 예시 행을 넣지 않고 `현재 등록 Task 없음`만 남긴다.
- `담당`, `상태`, `의존`은 실제 운영 상태만 기록한다.
- `문서 경로`는 `tasks/TASK-*.md`를 생성한 경우에만 채우고, 경량 운영이면 비워둘 수 있다.

---

## 최소 동기화 규칙

- `task_registry.md`, `tasks/TASK-*.md`, `project_state.md`의 활성 Task 요약은 최소한 `담당`, `상태`, `마지막 갱신일`, `다음 액션`을 같은 의미로 유지한다.
- 상세 실행 맥락, 판단 근거, 작업 로그는 `tasks/TASK-*.md`나 세션 로그에 두고, registry에는 재개에 필요한 핵심만 적는다.
- `project_state.md`에는 현재 활성 또는 다음 세션에 바로 재개할 Task만 요약한다.

---

## Task 목록

| Task ID | 제목 | 관련 Milestone | 관련 Intent | 관련 User Story | 담당 | 상태 | 마지막 갱신일 | 다음 액션 | 의존 | 문서 경로 | 비고 |
|---------|------|----------------|-------------|-----------------|------|------|---------------|-----------|------|----------|------|
| TASK-001 | 스캐폴드 + F5 Hello World | MS-001 | INT-001 | 없음 | AI | Done | 2026-08-15 | 완료 — F5 Hello World 검증(명령 팔레트 등록 + 알림 표시). `feature/task-001-scaffold` → main 병합 | 없음 | | M0. 완료 |
| TASK-002 | core/types.ts 전체 타입 확정 | MS-002 | INT-001 | 없음 | AI | Done | 2026-08-15 | 완료 — types.ts(§2~§7 + PersistedState + DevSwitcherError, OQ-002 별도인자). main 병합 | TASK-001 | | M1. 단일 정의 지점 |
| TASK-003 | 4개 어댑터 칩 선언 스텁 | MS-002 | INT-001 | US-003 | AI | Done | 2026-08-15 | 완료 — 4개 어댑터 선언(Python 리트머스), tsc 인터페이스 확정 검증 통과. main 병합 | TASK-002 | | M1 |
| TASK-004 | CargoBridge 순수 코어 + 테스트 하네스 | MS-003 | INT-001 | US-003 | AI | Done | 2026-08-15 | 완료 — 순수 함수 + mocha 19 테스트. main 병합(FF) | 없음 | | M2. vscode·cargo 무의존 순수 함수 |
| TASK-005 | CargoBridge cargo CLI 연동 | MS-003 | INT-001 | US-003 | AI | Done | 2026-08-15 | 완료 — execCapture/CargoBridge(fetchMetadata+캐시·listInstalledTargets·checkToolchain·invalidateCache). mocha 14 신규·실 cargo 스모크. main 병합(FF). DevSwitcherError→core/errors 분리 | TASK-004 | | M2. child_process I/O. vscode-free 유지 |
| TASK-006 | CargoAdapter 실구현 | MS-003 | INT-001 | US-003 | AI | Done | 2026-08-15 | 완료(M2 스코프) — listProjects·chips·createBuild/RunTask·resolveExecutable·invalidateCache + peekMetadata. main 병합(FF). **이월**: createDebugConfig→M4(MS-005), createProjectTask→MS-008(F20), persistSetting→v2 | TASK-005 | | M2. cargo 실구현. 커스텀 profile·F19·compiler/linker 오버레이는 후속 |
| TASK-007 | 데이터 계층 (AdapterRegistry + StateStore) | MS-004 | INT-001 | US-001·US-002 | AI | Done | 2026-08-15 | 완료 — AdapterRegistry(스캔·매칭)·StateStore(setValue·reconcile). reconcile 순수코어(stateReconcile.ts) mocha 8. 30일 GC·export/import은 후속 | 없음 | | M3 |
| TASK-008 | UI 계층 (StatusBar + QuickPick) | MS-004 | INT-001 | US-003 | AI | Done | 2026-08-15 | 완료 — StatusBarController(칩/버튼 렌더·경고/에러 배경)·picks(QuickPick). defaultChipFormat mocha 2. 액션 버튼 렌더만, 툴체인 경고칩(E1)은 MS-007 이월 | TASK-007 | | M3 |
| TASK-009 | 배선·감시 (Orchestrator + Watcher + activate) | MS-004 | INT-001 | US-003 | AI | Done | 2026-08-15 | 완료 — **F5 end-to-end 검증 통과**(상태바 hello+4칩·QuickPick 선택/복원·액션버튼 안내). main 병합(FF) | TASK-007·008 | | M3. Rust 선택 UX 실사용 가능 |
| TASK-010 | 실행 (TaskRunner + Build/Run 플로우) | MS-005 | INT-001 | US-003 | AI | Done | 2026-08-15 | 완료 — **F5 검증 통과**(Build 성공·Run "Hello..." 출력·실패 시 exit101 토스트). main 병합(FF) | 없음 | | M4. 액션버튼 실동작 |
| TASK-011 | 디버그 플로우 (createDebugConfig + CodeLLDB) | MS-005 | INT-001 | US-003 | AI | Done | 2026-08-15 | 완료 — **F5 검증 통과**(CodeLLDB→build→hello.exe 실행→중단점 정지). ensureExtension 루프 fix(Reload). main 병합(FF) | TASK-010 | | M4. F19·Doctor 이월 |
| TASK-012 | 호출 오버레이 주입 + 순수 코어 | MS-006 | INT-001 | US-010·US-012 | AI | Done | 2026-08-15 | 완료 — buildConfigArgs·buildRustflags·tomlScalar·parseArgsLine + cargoAdapter 주입(compiler→`--config`·linker→RUSTFLAGS·env). main 병합(FF, 335f982). pre/postBuild(C-5) 후속 | 없음 | | M5 |
| TASK-013 | SettingsPanel Webview 셸 | MS-006 | INT-001 | US-010 | AI | Done | 2026-08-15 | 완료 — F5 검증 통과(설정 페이지·탭·자동갱신). main 병합(FF) | TASK-012 | | M5 |
| TASK-014 | 호출 구성 탭 (옵션 카탈로그) | MS-006 | INT-001 | US-010·US-012 | AI | Done | 2026-08-15 | 완료 — F5 검증 통과(옵션 편집→명령 미리보기·오버레이 빌드 주입·입력 UX). mocha 61. main 병합(FF) | TASK-013 | | M5 |
| TASK-015 | 프로파일 export/import | MS-006 | INT-001 | 없음 | AI | Done | 2026-08-15 | 완료 — **F5 통과**(export→값변경→import 라운드트립 복원). `profileExport.ts`(build/parse/merge) + `ProfileExport`(C-4) + export/import 커맨드. 파생: 옵션 example bare화+injectsAs/docUrl, preview env 표시. main 병합(FF, b7864cf) | 없음 | `tasks/TASK-015.md` | M5. **MS-006 Done** |
| TASK-016 | Doctor 진단 모델 + 어댑터 진단 계약 | MS-007 | INT-001 | 없음 | AI | Done | 2026-08-15 | 완료 — `core/diagnostics.ts`(buildDiagnostics·worstStatus) + Diagnostic 타입/계약 + cargo 구현. mocha 10. main 병합(FF, 4ba6194). 순수 코어라 F5는 017과 함께 | 없음 | `tasks/TASK-016.md` | M6. F19 |
| TASK-017 | Doctor UI + E1 경고 칩 | MS-007 | INT-001 | 없음 | AI | Done | 2026-08-15 | 완료 — **F5 통과**(Doctor QuickPick cargo/rustup/CodeLLDB ✅+버전). `devSwitcher.doctor`·E1 칩·detectAdapters·디버그취소 Run Doctor. main 병합(FF, e842df3). MS-004 이월 E1 해소 | TASK-016 | `tasks/TASK-017.md` | M6. F19 |
| TASK-018 | rustup target 자동 설치 | MS-007 | INT-001 | 없음 | AI | Done | 2026-08-15 | 완료 — **F5 통과**(칩 토글로 설치 target만/전체 전환·미설치 선택→rustup target add 확인). `listAllTargets`/`parseTargetList`/`addTarget`·onPick 훅·secondary 토글. main 병합(FF, e0d9b31). §13.4 | TASK-017 | `tasks/TASK-018.md` | M6. F19 1단계 |
| TASK-019 | pre/postBuild 실행 배선 + buildEvent 편집 | MS-007 | INT-001 | US-010 | AI | Done | 2026-08-15 | 완료 — **F5 통과**(pre 실패→중단·post 성공 후·buildEvent 에디터·preview pre/post). taskDefinitions 등록·필드 UX 통일(placeholder 제거)·아키텍처 default 복귀. main 병합(FF, d88a493). **C-5 해소** | 없음 | `tasks/TASK-019.md` | M6. C-5 |
| TASK-020 | 통합 테스트 하네스 + 수동 체크리스트 | MS-007 | INT-001 | 없음 | AI | Done | 2026-08-15 | 완료 — `@vscode/test-electron` 하네스(3 passing: 활성화·10커맨드·설정오픈) + §15.2 13항목 체크리스트(7 Pass·2 Partial·4 Not Run) + test_strategy/verification_evidence. main 병합(FF, e3e0a41). **부가 v1 UX**: 상태바 compact 토글·selectedOnly 설정·General 탭 토글(isBlank) | TASK-016~019 | `tasks/TASK-020.md` | M6. F18 흡수 |
| TASK-021 | README + VSIX 패키징 | MS-007 | INT-001 | 없음 | AI | Planned | 2026-08-15 | README.md(사용법·기능·단축키) + version 0.1.0·publisher·`.vscodeignore`·LICENSE + `vsce package`→`devswitcher-tools-0.1.0.vsix` | TASK-016~020 | `tasks/TASK-021.md` | M6. 배포 산출물 |

> 현재 등록 Task: TASK-001~021. TASK-001~015 Done(MS-001~006 완료·main 병합). **MS-007(TASK-016~021) Planned — 016→017→018(Doctor 라인) → 019/020/021 순.**

- `담당`: `Human` / `AI` / `Role-*` / `(Role-* 인수자)`
- `상태`: `Planned` / `In Progress` / `Review` / `Done`
- `마지막 갱신일`: `YYYY-MM-DD`
- `다음 액션`: 다음 세션이 바로 이어받을 수 있는 한 줄 지시
- `의존`: 실제 연결된 `TASK-*` 또는 `없음`

---

## 경량 운영 규칙

- 짧은 작업은 이 문서와 세션 로그만으로 관리할 수 있다.
- 장시간 작업, 승인 지점이 많은 작업, 재개 가능성이 높은 작업은 `tasks/TASK-*.md`를 생성한다.
- `deliverable_plan.md`와 `export_spec.md`에서 WBS source로 이 문서를 우선 사용한다.
- `다음 액션`은 다음 세션이 바로 이어받을 수 있는 한 줄 지시로 유지하고, 여러 단계 상세 계획은 상세 Task 문서로 넘긴다.
