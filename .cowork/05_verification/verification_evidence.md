# Verification Evidence

> 검증 근거 인덱스 — 테스트, 리뷰, NFR, 릴리즈 readiness 근거를 한곳에서 요약하고 연결한다

---

## 목적

이 문서는 Verify 단계에서 생성되는 근거를 **게이트 판정용 canonical 인덱스**로 정리한다.

- 세션 로그나 개별 Task 문서에 흩어진 검증 근거를 빠르게 복원한다
- Gate 4, Gate 5 판정 시 "무엇이 검증되었고 어디에 근거가 있는가"를 한 번에 보여 준다
- 원본 로그, 스크린샷, 외부 리포트를 이 문서에 복제하지 않고 **요약 + 위치 링크**만 유지한다
- TDD처럼 테스트량이 누적되는 프로젝트에서도, 이 문서는 로그 저장소가 아니라 **신뢰 가능한 증거 인덱스**로 유지한다

---

## 문서 정보

| 항목 | 내용 |
|------|------|
| 관련 Intent | INT-001 |
| 관련 Milestone | MS-001~008 (구현·검증·배포) · MS-009~012 (INT-001 로드맵·C-7) · **MS-013 (Run Group·C-6)** |
| 관련 Test Strategy | `test_strategy.md` |
| 관련 Test Case | `test_case.md` |
| 마지막 갱신일 | 2026-08-17 (TASK-040, v0.4.0 준비) |

---

## 운영 원칙

- 이 문서는 Verify/Release 판정의 **증거 요약 인덱스**다.
- 상세 절차와 기대 결과는 `test_strategy.md`, `test_case.md`, `review_checklist.md`, 관련 `TASK-*` 문서에서 관리한다.
- 원본 실행 로그, 외부 리포트, 측정 결과 원문은 원래 위치에 두고, 이 문서에는 무엇을 입증하는지와 위치만 적는다.
- 가능하면 Gate 4, Gate 5 항목은 `EV-*` ID로 추적한다.
- 근거가 아직 부족하면 삭제하지 말고 `Open Evidence Gaps`에 남긴다.

---

## 근거 영역 요약

| 영역 | 최근 상태 | 주요 근거 문서 | 마지막 갱신일 | 비고 |
|------|----------|----------------|--------------|------|
| Review Evidence | In Progress | 세션 로그 #004·#005, 커밋 이력 | 2026-08-15 | 각 Task F5 통과 후 병합 |
| Test Execution Evidence | Pass | `test_case.md`(Auto 3 + Manual 24) | 2026-08-17 | Unit **268**·Integration 3 Pass, Manual **21 Pass**/2 Partial/1 Known Issue(TC-11 WSL, D-23). v1.0.0 최종 재검증(EV-019) |
| NFR Evidence | Partial | `test_strategy.md` §3 | 2026-08-15 | NFR-002/002a 설계 준수. 성능 NFR 별도 측정 없음 |
| Release Readiness Evidence | Pass | `quality_gate.md`, TASK-054·055, EV-019 | 2026-08-17 | **v1.0.0 릴리즈(MS-014)**: Gate 5 Pass — 최종 재검증(EV-019)·docs/ 공식 산출물 13종·README/CHANGELOG 1.0.0. TC-11=Known Issue(D-23). Marketplace 게시+repo public+GitHub Release는 TASK-055 |

---

## Evidence Index

| EV ID | 유형 | 검증 대상 / 범위 | 판정 | 관련 Gate | 원본 근거 위치 | 마지막 갱신일 | 비고 |
|-------|------|------------------|------|-----------|----------------|--------------|------|
| EV-001 | Unit | 순수 코어 **231 케이스**(파서·reconcile·오버레이·export·진단·argsLine·이름검증·템플릿·Run Group 계획/검증/스테이지·시퀀서·webview 스크립트 문법 가드·Go 브리지·**Node 브리지: parseScripts·nodeProjectName·packageManager·assembleNodeArgs·buildNodeDebugConfig·nodeProjectFiles**) | Pass | Gate 4 | `out/test/unit`, `npm run test:unit` | 2026-08-17 | CI 가능. 세션 #013 +Node(+12) |
| EV-002 | Integration | 확장 활성화·**16 커맨드**(+newProject·+rescan·+groups/runGroup/stopGroup·**+stop**)·설정 페이지 오픈. 퍼블리셔 `lim8603` | Pass | Gate 4 | `src/test/integration/extension.test.ts`, `npm run test:integration` (3 passing) | 2026-08-17 | VSCode 호스트 실행. 세션 #013 devSwitcher.stop 추가 |
| EV-003 | E2E(Manual) | TC-01·04·05·07·08·12·13 (칩·빌드·디버그·watcher·export/import·target add·Doctor) | Pass | Gate 4 | 세션 로그 #004·#005 F5 | 2026-08-15 | 7 케이스 |
| EV-004 | E2E(Manual) | TC-06(디버그×오버레이)·TC-10(E1 칩) | Partial | Gate 4 | 세션 #005 | 2026-08-15 | 코어 검증됨, 결합 재확인 권장 |
| EV-005 | E2E(Manual) | TC-09(재시작 복원)·TC-02(workspace 3멤버)·TC-03(멀티루트) | Pass | Gate 4/5 | 세션 #006 F5 (scratchpad/verify 픽스처) | 2026-08-16 | 검증 중 버그 2건 발견·수정(features e7b462b·untrusted eb8983a) |
| EV-008 | E2E(Manual) | TC-11(WSL/F18) | Known Issue | Gate 5 | — | 2026-08-17 | **v1.0.0 Known Issue 수용(Human D-23)** — 릴리즈 비차단, README·CHANGELOG 공지. WSL 검증 시 해소 |
| EV-006 | Packaging | `vsce package` → `devswitcher-tools-0.1.0.vsix`(9파일 34.68KB) + 격리 프로필 설치 스모크(`lim8603.devswitcher-tools@0.1.0` 인식) | Pass | Gate 5 | `npx @vscode/vsce package`, `code --install-extension`(격리 dir) | 2026-08-16 | TASK-021. README·LICENSE·CHANGELOG 포함 |
| EV-010 | Packaging/Release | **v0.4.0** `devswitcher-tools-0.4.0.vsix`(13파일 235.6KB) + 격리 프로필 설치 스모크(`lim8603.devswitcher-tools@0.4.0` 인식). main FF 병합·`v0.4.0` 태그·origin push | Pass | Gate 5 | `npx @vscode/vsce package`, `code --install-extension`(격리 dir), `git push origin main/v0.4.0` | 2026-08-17 | TASK-040. Run Group(C-6) 번들 |
| EV-007 | E2E(Manual) | F20 시작 마법사 — 4개 언어 생성(TC-14~17): Rust(`cargo new`+자동전환)·C#(`dotnet new`)·C++/Python(workspace.fs 템플릿, `<iostream>` 온전) | Pass | Gate 4 | 세션 #006 F5 (생성 파일 내용 검증) | 2026-08-16 | TASK-022·023. cmake/python은 scope A로 스위처 미등장(생성만) |
| EV-011 | E2E(Manual) | **Go 어댑터(MS-015, v0.5.0)** — TC-21: 감지(`go.mod`)·target 칩(main 패키지 자동선택)·`go build`/`go run`·delve 디버그(중단점)·Doctor 슬라이스(go 미설치 ❌+E1 → 설치 후 ✓) | Pass | Gate 4 | 세션 #012 F5 (`dlv.exe` 자동설치·중단점 정지) + 실 go1.26.6 스모크(go list/build/run) | 2026-08-17 | TASK-043·044·045 |
| EV-012 | Packaging/Release | **v0.5.0** `devswitcher-tools-0.5.0.vsix`(13파일 237.64KB, prod 107.3kb) + 격리 프로필 설치 스모크(`lim8603.devswitcher-tools@0.5.0` 인식) | Pass | Gate 5 | `npx @vscode/vsce package`, `code --install-extension`(격리 dir) | 2026-08-17 | TASK-045. Go(MS-015) 번들 |
| EV-009 | E2E(Manual) + Unit | **Run Group(C-6, MS-013)** — TC-18~20: 설정 Run Groups 탭 그룹 정의·멤버별 Stage(같은 Stage 병렬)·Stage 순서 계층 기동(프로세스 시작 시점 전진)·이미 실행 중 skip·상태바 통합 메뉴(Run/Stop/Stop all). 순수 계획/검증/스테이지/시퀀서 단위 커버 | Pass | Gate 4 | 세션 #011 F5 (6멤버·Stage 1~5, preset-demo→test-python 순차) + `runGroupPlan.test.ts`·`groupSequencer.test.ts` | 2026-08-17 | ADR-015·D-20. 준비 감지(포트/헬스체크)=후속 마이너(TASK-039) |
| EV-013 | E2E(Manual) + Unit | **Node/TS 어댑터(MS-016, v0.6.0)** — TC-22: 감지(`package.json`·`.vscode-test` 제외)·script 칩(npm scripts)·packageManager 칩(lockfile 자동감지)·`<pm> run <script>`/`build`(배열형 ShellExecution·`$tsc`)·js-debug 디버그(**중단점 정지**·확장 불요)·Doctor(node). 순수 파서/인자/디버그config 단위 커버 | Pass | Gate 4 | 세션 #013 F5(중단점 index.js:2 정지) + 실 node 24 셸 스모크(start·runArgs `--`·build·NODE_OPTIONS) + `nodeBridge.test.ts` | 2026-08-17 | TASK-046·047·048. ADR-016(ShellExecution 배열형)·NFR-002b |
| EV-014 | Packaging/Release | **v0.6.0** `devswitcher-tools-0.6.0.vsix`(13파일 239.61KB, prod 113.1kb) + 격리 프로필 설치 스모크(`lim8603.devswitcher-tools@0.6.0` 인식) + 통합 3 passing(활성화·15 커맨드). **main FF 병합(`55ea62a`)·`v0.6.0` 태그·origin push·브랜치 삭제 완료** | Pass | Gate 5 | `npx @vscode/vsce package`, `code --install-extension`(격리 dir), `npm run test:integration`, `git push origin main/v0.6.0` | 2026-08-17 | TASK-048. Node/TS(MS-016) 번들 |
| EV-015 | E2E(Manual) + Unit | **키보드 단축키(MS-017, v0.7.0)** — TC-23: 정적 `contributes.keybindings`(Build/Run/**Stop**/Debug/Switch/**Groups**/Settings = Ctrl+Alt+B/R/S/D/P/G/,·`when:hasProjects`)·orchestrator setContext·**`devSwitcher.stop`**(태스크+**디버그세션** 종료·user-stop 실패토스트 억제)·**상태바 Stop 버튼**(실행 중일 때만·세션 Map 추적)·General 탭 목록+딥링크(`openGlobalKeybindings` 확장 필터)+행별 Edit. `buildShortcutList` 순수 단위 커버 | Pass | Gate 4 | 세션 #013 F5 전부 통과(단축키·General 탭·딥링크·stop[run+디버그]·상태바 버튼 토글) + `shortcuts.test.ts`(4)·`settingsHtml.test.ts` + 통합 16커맨드 | 2026-08-17 | TASK-049·050. ADR-017 |
| EV-016 | Packaging/Release | **v0.7.0** `devswitcher-tools-0.7.0.vsix`(13파일 241.55KB, prod 116.56kb) + 격리 프로필 설치 스모크(`lim8603.devswitcher-tools@0.7.0` 인식) + 통합 3 passing(활성화·**16 커맨드**) | Pass | Gate 5 | `npx @vscode/vsce package`, `code --install-extension`(격리 dir), `npm run test:integration` | 2026-08-17 | TASK-050. 키보드 단축키(MS-017) 번들. main 병합·태그·push |
| EV-017 | E2E(Manual) + Unit | **Run Group 준비 감지(MS-018, v0.8.0)** — TC-24: 멤버별 **Ready when**(process/port/HTTP)·포트 게이트로 종속 대기·타임아웃 abort+teardown(실패 멤버명)·취소 버튼·기존 무변경. 순수 `pollUntilReady`/`readinessProblems`/`withMemberReadiness`·sequencer 취소·probe(net/http) 단위 커버. UI 재설계(멤버 카드·Add 드롭다운)·seedMemberDefaults | Pass | Gate 4 | 세션 #014 F5 — svc-a(부팅~4s→7801)→svc-b **4초 뒤 시작**(게이트 작동) + 픽스처 스모크(7801 ~4071ms 개방) + `readiness.test.ts`·`groupSequencer.test.ts`(취소)·`runGroupPlan.test.ts` | 2026-08-17 | TASK-051·052·053. **ADR-018** |
| EV-018 | Packaging/Release | **v0.8.0** `devswitcher-tools-0.8.0.vsix`(15파일 273.43KB, prod 130.0kb) + 격리 프로필 설치 스모크(`lim8603.devswitcher-tools@0.8.0` 인식) + **README 스크린샷 재생성**(6개 언어 히어로 "SIX toolchains"·Go/Node 개별 이미지 신규·Rust 트리플 `pc-windows-msvc`, codicon 폰트 Edge 헤드리스 2x) | Pass | Gate 5 | `npx @vscode/vsce package`, `code --install-extension`(격리 dir) | 2026-08-17 | TASK-053. Run Group 준비 감지(MS-018) 번들. **v1.0.0 로드맵 마지막 기능** |
| EV-019 | Unit + Integration + Build | **v1.0.0 최종 검증(TASK-054)** — main(v0.8.0 병합 후) 클린 트리에서 재실행: check-types·lint 클린 → unit **268 passing** → 통합 **3 passing**(16커맨드) → esbuild prod 클린 | Pass | Gate 5 | `npm run check-types`·`lint`·`test:unit`·`test:integration`·`package` (세션 #015) | 2026-08-17 | v1.0.0 릴리즈 베이스라인. TC-11(WSL)만 Known Issue(D-23) |
| EV-020 | Packaging/Release/Publish | **v1.0.0 완주(TASK-055)** — `devswitcher-tools-1.0.0.vsix`(15파일 275.03KB) 격리 설치 스모크(`@1.0.0` 인식) + 비밀정보 스캔(추적 파일+전체 이력 173커밋) 클린 + `v1.0.0` 태그 push + **repo public 전환**(설명·토픽 12·homepage) + **GitHub Release v1.0.0**(vsix 첨부) + **Marketplace `vsce publish` DONE**(`lim8603.devswitcher-tools`) | Pass | Gate 5 | `gh repo edit/view`·`gh release create`·`vsce publish` 출력 (세션 #015) | 2026-08-17 | 첫 Marketplace 게시. 기여 차단: PR 자동닫기+CONTRIBUTING(Issues 유지) |
| EV-022 | Packaging/Release/Publish | **v1.1.0 완주(MS-021)** — `devswitcher-tools-1.1.0.vsix`(15파일 257.54KB, README/CHANGELOG 확정 후 재패키징) 격리 설치 스모크(`@1.1.0` 인식) + main FF 병합(`67fe903`)·`v1.1.0` 태그 push·브랜치 삭제 + **Marketplace `vsce publish` DONE**(`Published lim8603.devswitcher-tools v1.1.0`) + **GitHub Release v1.1.0**(vsix 첨부) | Pass | Gate 5 | `vsce package/publish`·`gh release create` 출력 (세션 #016) | 2026-08-19 | 두 번째 Marketplace 게시(저장된 PAT 재사용, Human 재로그인 불필요) |
| EV-024 | Packaging/Release/Publish | **v1.2.0 완주(TASK-065)** — `devswitcher-tools-1.2.0.vsix`(15파일 247.06KB) 격리 설치 스모크(`@1.2.0` 인식) + main FF 병합(`330b2b0`)·`v1.2.0` 태그 push·브랜치 삭제 + **Marketplace `vsce publish` DONE**(`Published lim8603.devswitcher-tools v1.2.0`) + **GitHub Release v1.2.0**(vsix 첨부) | Pass | Gate 5 | `vsce package/publish`·`gh release create` 출력 (세션 #017) | 2026-08-19 | 세 번째 Marketplace 게시(저장된 PAT 재사용) |
| EV-023 | E2E(Manual) + Unit + 실 스모크 | **MS-022 v1.2.0** — TC-26: ① VS 어댑터(fixtures/vs/demo): 솔루션 루트+app+mathlib 계층·Configuration/Platform 칩·빌드·app 실행("vs-demo: 2 + 3 = 5")·cppvsdbg 디버그·mathlib run/debug 차단 토스트 ② CMake 픽스처 공존(생성물 미등장) ③ B-3 언어 체크박스 필터 ④ 새 아이콘 | Pass | Gate 4 | 세션 #017 F5(Human, "잘 나온다·나머지 다 확인") + unit **318**(+32) + 통합 3 + **실 MSBuild(VS18 v145) 스모크**(vswhere 발견·솔루션/멤버 빌드·TargetPath 평가=빌드 출력 일치·exe 실행/인자) | 2026-08-19 | TASK-063·064. ADR-021·D-25. F5 피드백 1건(토스트 문구 축약) 반영 |
| EV-021 | E2E(Manual) + Unit | **MS-021 v1.1.0 실사용 피드백 7건** — TC-25: ① 중첩 하위 프로젝트 계층 표시(nested 픽스처: 루트+하위 3 인덴트, 퀵픽·설정 카드·드롭다운) ② 하위 exe build/run/debug ③ lib 타겟(mathlib) 빌드 성공·Run/Debug 차단 토스트 ④ `projects.showLibraries` off 필터 ⑤ 타겟 미선택 설정창 정상(블랭크 해소·로딩 표시) ⑥ Ctrl+Alt+T 타겟 퀵픽 ⑦ 루트 "All targets" 전체 빌드+run/debug 안내 ⑧ **런그룹 멤버 Launch=Debug**(중단점 정지·디버그 종료 후 잔여 멤버 유지·그룹 Stop 시 세션 종료) | Pass | Gate 4 | 세션 #016 F5 2회(1차 4건·2차 3건, Human) + unit **286**(+18: classify·타겟타입·projectTree·withMemberLaunch·settingsHtml 가드) + 실 cmake 4.4.2 스모크(File API 3타겟 타입/스코프·`--target mathlib` .lib) | 2026-08-19 | TASK-056~062. ADR-019·ADR-020·D-24 |

---

## Gate 판정 메모

| Gate | 판정 상태 | 핵심 EV ID | 요약 | 비고 |
|------|-----------|------------|------|------|
| Gate 4 | Partial | EV-001·002·003 | Unit·Integration·핵심 Manual Pass. TC-06·10 Partial | MS-007 진행 중 |
| Gate 5 | Pass (조건부) | EV-006 | README·VSIX(TASK-021) 완료·설치 스모크 Pass → v0.1.0 확정. WSL(TC-11) 등 EV-005는 문서화된 잔여 리스크로 수용 | 릴리즈 게이트 |
| Gate 5 (v1.0.0) | Pass | EV-019·EV-008 | 통합 3 Pass·unit 268·NFR(설계 준수, GAP-004 정성 수용)·문서 최종화(README·CHANGELOG 1.0.0)·**공식 산출물 docs/ 13종 생성**(deliverable_plan 활성 전체). TC-11(WSL)은 **Known Issue 수용(Human D-23)** — 릴리즈 비차단 | **v1.0.0 릴리즈 게이트(세션 #015)** |
| Gate 5 (v1.2.0) | Pass | EV-023·EV-024 | F5(Human) Pass·unit 318·통합 3·check-types/lint/esbuild 클린·실 MSBuild 스모크·`devswitcher-tools-1.2.0.vsix`(15파일 247.06KB) 격리 설치 스모크·문서 최종화(CHANGELOG [1.2.0]·README·docs/11 §3·docs 주석 7툴체인 갱신·소스 release_note). TC-11 Known Issue 이월(변동 없음) | **v1.2.0 릴리즈 게이트(세션 #017)** |
| Gate 5 (v1.1.0) | Pass | EV-021 | F5 2회(Human) Pass·unit 286·통합 3·check-types/lint/esbuild 클린·`devswitcher-tools-1.1.0.vsix`(15파일 257.54KB) 격리 설치 스모크(`@1.1.0` 인식)·문서 최종화(CHANGELOG [1.1.0]·README·docs/11 릴리즈노트 §3). TC-11 Known Issue 이월(변동 없음) | **v1.1.0 릴리즈 게이트(세션 #016)** |

---

## Open Evidence Gaps

| ID | 항목 | 부족한 근거 | 다음 액션 | 상태 |
|----|------|------------|----------|------|
| GAP-001 | F18 원격(WSL) 동일 동작 | TC-11 미실행 | WSL 내부 재클론 후 시나리오 1~7 수동 스모크 | **Known Issue 수용(v1.0.0, Human D-23)** — 릴리즈 비차단·README/CHANGELOG 공지. 검증 시 해소 |
| ~~GAP-002~~ | **해소(2026-08-16, 세션 #006)** — TC-09 Pass(features-demo 재시작 복원). features 칩 버그 수정 e7b462b | (해소) | 재시작 복원 확인 |
| ~~GAP-003~~ | **해소(2026-08-16, 세션 #006)** — TC-02(cargo-workspace 3멤버)·TC-03(멀티루트) Pass. untrusted 무한스피너 수정 eb8983a | (해소) | verify 픽스처로 확인 |
| GAP-004 | 성능 NFR 측정 | 측정치 없음 | v0.1은 규모 작아 정성 판단, 필요 시 측정 | Deferred |
