# Test Case

> 테스트 케이스 — 개별 검증 항목의 입력, 절차, 기대 결과를 정의한다

---

## 문서 정보

| 항목 | 내용 |
| --- | --- |
| 관련 Intent | INT-001 |
| 관련 Milestone | MS-008 (F20 마법사), 검증 대상은 MS-001~008 전체 |
| 관련 Test Strategy | `test_strategy.md` |
| 관련 Verification Evidence | `verification_evidence.md` |
| 출처 | 상세설계서 §15.2 (통합 테스트 + 수동 체크리스트) |

---

## 1. 자동 통합 스모크 (@vscode/test-electron)

`npm run test:integration` — 실제 VSCode 호스트에서 cargo 픽스처를 워크스페이스로 열고 실행.
파일: `src/test/integration/extension.test.ts`. 설정: `.vscode-test.mjs`.

| TC | 항목 | 기대 결과 | 결과 | 실행일 |
| --- | --- | --- | --- | --- |
| TC-A1 | 확장 활성화 | `lim8603.devswitcher-tools` present + activate | ✅ Pass | 2026-08-16 |
| TC-A2 | 커맨드 기여 | **15개 커맨드**(switchProject·pickChip·build·run·debug·openSettings·export/importProfile·doctor·rescan·newProject·toggleCompact·**groups·runGroup·stopGroup**) 등록 | ✅ Pass | 2026-08-17 |
| TC-A3 | 설정 페이지 오픈 | `devSwitcher.openSettings` 예외 없이 실행 | ✅ Pass | 2026-08-16 |

> 단위 테스트(mocha 98, `out/test/unit`)는 순수 코어 전담 — `test_strategy.md` §1 참조.

---

## 2. 수동 체크리스트 (상세설계서 §15.2 — 13항목)

> 유형: Auto=통합 자동, Manual=수동(F5). 근거는 세션 로그 / MS.

| TC | 시나리오 | 유형 | 결과 | 근거 (세션/MS) |
| --- | --- | --- | --- | --- |
| TC-01 | 단일 Rust 패키지 → 칩 4종 표시, 기본값(profile=dev, bin 1개면 target 자동) | Manual | ✅ Pass | MS-004 F5 (세션 #004) |
| TC-02 | cargo workspace(멤버 3) → 스위처 3개, 전환 시 선택 상태 독립 유지 | Manual | ✅ Pass | 세션 #006 F5 (verify/cargo-workspace: alpha/beta/gamma 감지·선택 독립. 가상 workspace 루트는 미표시=정상) |
| TC-03 | 멀티루트(Rust+Python) → 활성 프로젝트별 칩 변화, Python 스텁 미표시(v1 scope A) | Manual | ✅ Pass | 세션 #006 F5 (verify/multiroot: rust-app 정상·py-app 미표시·에러 없음). 부수: untrusted 워크스페이스 Run 무한스피너 버그 발견·수정(eb8983a) |
| TC-04 | 빌드 버튼 → Task 실행, 고의 컴파일 에러 → Problems(matcher), 종료코드 실패 감지 | Manual | ✅ Pass | MS-005 F5 (세션 #004) |
| TC-05 | 디버그 버튼 → 빌드 실패 시 중단(E5)/성공 시 CodeLLDB 중단점, runArgs 전달 | Manual | ✅ Pass | MS-005 F5 (중단점 정지 확인) |
| TC-06 | 커스텀 프로파일 + `CARGO_TARGET_DIR` 변경 상태 디버그 → 실행 파일 경로 해석 (DD-05) | Manual | 🟡 Partial | 오버레이 주입·preview 검증(MS-006). 디버그 결합은 재확인 권장 |
| TC-07 | Cargo.toml 프로파일/feature 추가 저장 → 상태바 자동 갱신(F17), 삭제 → E10 | Manual | ✅ Pass | MS-004 watcher F5 |
| TC-08 | export → import 라운드트립, 다른 클론에서 import(경로 독립성) | Manual | ✅ Pass | TASK-015 F5 (세션 #005). 다른 클론 import는 미확인 |
| TC-09 | VSCode 재시작 → workspaceState 복원 (DD-01) | Manual | ✅ Pass | 세션 #006 F5 (verify/features-demo: 칩 선택 Reload 복원). 부수: features 칩 버그 다수 발견·수정(e7b462b — 토글/카운트/none 보존) |
| TC-10 | cargo 미설치(PATH 제거) → E1 경고 칩 → Doctor 유도 | Manual | 🟡 Partial | Doctor QuickPick 검증(TASK-017). E1 칩은 PATH 조작 필요(worstStatus 단위테스트 커버) |
| TC-11 | WSL에서 동일 레포 → 시나리오 1~7 동일, Windows 창과 선택 독립 (F18·DD-01) | Manual | ❗ Known Issue | **v1.0.0에서 Known Issue로 수용(Human, D-23, 세션 #015)** — 릴리즈 비차단. README Known limitations·CHANGELOG [1.0.0]에 공지. 추후 WSL 내부 재클론 후 검증 시 해소 |
| TC-12 | CodeLLDB 온디맨드 설치 → 디버그 이어짐(E7) / 미설치 target 선택 → `rustup target add` (§13.4) | Manual | ✅ Pass | CodeLLDB=MS-005 F5, target add=TASK-018 F5 |
| TC-13 | Doctor 실행 → 항목별 상태 정확, 1단계 즉시 설치, 2·3단계 안내 (F19) | Manual | ✅ Pass | TASK-017 F5 (cargo/rustup/CodeLLDB ✅+버전) |
| TC-14 | New Project → Rust → 이름 → `cargo new` → 파일 생성 + **스위처 자동 등장·전환** (F20, OQ-001) | Manual | ✅ Pass | TASK-022·023 F5 (세션 #006) |
| TC-15 | New Project → C# → `dotnet new console -o` → `<name>/<name>.csproj`+Program.cs 생성 (도구 부재 시 Doctor) | Manual | ✅ Pass | TASK-023 F5 (dotnet SDK 존재, restore까지) |
| TC-16 | New Project → C++ → **workspace.fs** 작성 `<name>/CMakeLists.txt`+`main.cpp`(툴체인 불필요, `<iostream>` 온전) (F20, D-13) | Manual | ✅ Pass | TASK-023 F5 (생성 파일 내용 검증) |
| TC-17 | New Project → Python → **workspace.fs** 작성 `<name>/pyproject.toml`+`main.py` (F20, D-13) | Manual | ✅ Pass | TASK-023 F5 (생성 파일 내용 검증) |
| TC-18 | 설정 → **Run Groups 탭** → 그룹 생성·멤버 체크·멤버별 **Stage** 지정 → workspaceState 저장·재오픈 유지 (C-6, TASK-038) | Manual | ✅ Pass | 세션 #011 F5 (6멤버, Stage 1~5 지정·같은 Stage 병렬) |
| TC-19 | 그룹 Run → **Stage 순서대로 계층 기동**(프로세스 시작 시점 전진), 같은 Stage 병렬. 이미 실행 중 멤버는 **skip** (C-6, ADR-015/D-20) | Manual | ✅ Pass | 세션 #011 F5 (preset-demo→test-python 순차 실행 확인) |
| TC-20 | 상태바 `$(run-all)` 런처(아이콘, Run 뒤) → 통합 메뉴 Run/Stop/**Stop all** (C-6, TASK-038/D-20) | Manual | ✅ Pass | 세션 #011 F5 (아이콘·위치·메뉴 확인) |
| TC-21 | Go 모듈(`go.mod`) → 스위처 등장·**target 칩**(main 패키지 자동선택)·`go build`/`go run`·**delve 디버그**(중단점)·Doctor(go/golang.go) (MS-015, v0.5.0) | Manual | ✅ Pass | 세션 #012 F5 — Doctor 슬라이스(go 미설치 시 ❌+E1) → 설치 후 build/run + delve 중단점 정지(`dlv.exe` 자동설치) |
| TC-22 | Node 프로젝트(`package.json`) → 스위처 등장·**script 칩**(npm scripts)·**packageManager 칩**(lockfile 자동감지)·`<pm> run <script>`/`<pm> run build`(배열형 ShellExecution, `$tsc` 매처)·**js-debug 디버그**(중단점, 확장 불요)·Doctor(node) (MS-016, v0.6.0) | Manual | ✅ Pass | 세션 #013 F5 — `.vscode-test` 제외로 감지 정리·2칩·`npm run start` 출력·js-debug **중단점 정지**(index.js:2, 확장 프롬프트 없음). 실 node 24 셸 스모크(start·runArgs `--`·build·NODE_OPTIONS) |
| TC-23 | 키보드 단축키 — 활성 프로젝트에서 `Ctrl+Alt+B/R/S/D/P/G/,` → Build/Run/**Stop**/Debug/Switch/**Groups**/Settings 동작(프로젝트 없으면 무동작, `when:hasProjects`). **Stop**=실행 중 태스크+**디버그 세션** 종료. **상태바 Stop 버튼**(실행 중일 때만 노출·종료 시 사라짐). 설정 General 탭 "Keyboard shortcuts" 목록 + "Open Keyboard Shortcuts" 딥링크(확장 필터) + 행별 Edit… (MS-017, v0.7.0) | Manual | ✅ Pass | 세션 #013 F5 — B/R/D/P/, 발동·General 탭·딥링크·**Stop(run+디버그세션)**·**상태바 Stop 버튼 토글**(잔존 버그 fix 후 정상 사라짐)·Groups(Ctrl+Alt+G) 전부 확인 |
| TC-24 | Run Group **준비 감지** — Run Groups 탭 멤버 카드 **Ready when**(process/port/HTTP)·port/url/status/timeout 편집. 포트 게이트: 종속 멤버가 상위 멤버의 **포트 open까지 대기** 후 시작. **타임아웃**→그룹 abort+teardown(실패 멤버명 표기). **취소** 버튼→teardown. 기존(process start) 무변경. **멤버 카드 UI**(Stage 정렬·Add 드롭다운·Remove)·그룹 멤버 **기본값 자동 시드**(Script→start) (MS-018, v0.8.0) | Manual | ✅ Pass | 세션 #014 F5 — `svc-a`(부팅 ~4s→포트 7801) → `svc-b`(Stage 2)가 **4초 뒤 시작** 확인(게이트 작동). seedMemberDefaults로 Script 미선택 차단 해소. UI 재설계(멤버 카드·Add 드롭다운) Human 승인("깔끔해") |

> TC-15~17은 v1 scope A로 스위처엔 미등장(생성만) — 정상. 이름 검증·템플릿·**Run Group 계획/검증/스테이지·시퀀서**·Node(`parseScripts`·`assembleNodeArgs`·`buildNodeDebugConfig`)는 단위 테스트(mocha **231**) 커버. Run Group 준비 감지(포트/헬스체크)는 후속 마이너.

**요약**: Auto 3/3 Pass · Manual **21 Pass** · 2 Partial(TC-06·TC-10) · 1 Deferred(TC-11 WSL). 세션 #012 추가: TC-21(Go) Pass. 세션 #013 추가: TC-22(Node)·TC-23(단축키) Pass. 세션 #014 추가: TC-24(Run Group 준비 감지·포트 게이트·UI 재설계) Pass.
세션 #011 추가: TC-18~20(Run Group 정의·계층 기동·skip·상태바 통합 메뉴) Pass. 그 과정에서 설정 페이지 공백 버그(webview 스크립트 아포스트로피, 세션 #010 유입) 발견·수정 + 회귀 가드 단위 테스트 추가. TC-11(WSL/F18)은 WSL 내부 재클론 후 별도 진행.

---

## 3. 분할 승격 판단

- 실질 케이스 23개(A1~A3 + 01~20)로 12개 초과 — 다만 대부분 §15.2 원본 1:1 매핑 + F20(14~17) + Run Group(18~20)이라 **현 단일 문서 유지**가 추적에 유리. Milestone별 반복 참조가 생기면 `test_cases/` 승격 검토(§분할 기준).
