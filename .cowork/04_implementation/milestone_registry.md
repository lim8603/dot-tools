# Milestone Registry

> 마일스톤 인덱스 — Intent와 Task 사이의 중간 완료 지점을 관리한다

---

## 목적

Milestone은 `Phase`와 다르다.
`Phase`가 프레임워크의 고정 라이프사이클이라면, Milestone은 프로젝트별 중간 완료 단위다.

- 어떤 묶음이 "의미 있게 끝났다"고 볼 수 있는지 정의한다
- Task를 묶는 중간 계층으로 사용한다
- 작은 프로젝트에서는 상세 파일 없이 이 문서만으로 경량 운영할 수 있다

---

## 기록 규칙

- registry에는 `MS-000` 같은 더미 ID를 남기지 않는다.
- 항목이 없을 때는 표에 예시 행을 넣지 않고 `현재 등록 Milestone 없음`만 남긴다.
- `문서 경로`는 상세 Milestone 문서를 만든 경우에만 채우고, 경량 운영이면 비워둘 수 있다.
- `관련 Task`에는 현재 진행을 대표하는 `TASK-*`만 짧게 적고, 연결된 Task가 없으면 `없음`으로 적거나 비운다.

---

## Milestone 목록

| Milestone ID | 제목 | 관련 Intent | 주 Phase | 상태 | 관련 Task | 문서 경로 | 비고 |
|--------------|------|-------------|----------|------|-----------|----------|------|
| MS-001 | M0 셋업 — 스캐폴드 + F5 Hello World | INT-001 | Build | Done | TASK-001 | | 스캐폴드 + F5 Hello World 검증 완료(2026-08-15). main 병합 |
| MS-002 | M1 코어 타입·칩 프레임워크 | INT-001 | Build | Done | TASK-002, TASK-003 | | `types.ts` + 4개 어댑터 칩 스텁(Python 리트머스) + F20 createProject 계약. 인터페이스 확정 검증(tsc) 완료, main 병합(2026-08-15) |
| MS-003 | M2 CargoBridge + CargoAdapter | INT-001 | Build | Done | TASK-004, TASK-005, TASK-006 | | 메타데이터/빌드 JSON 파싱·인자 조립·features·resolveExecutable + 단위테스트(34). TASK-004·005·006 Done — build/run/resolveExecutable/chips/listProjects 실동작. main 병합(FF, 2026-08-15). **디버그 구성=M4, cargo createProjectTask=MS-008(F20)로 이월** |
| MS-004 | M3 상태바·상태 저장·감시 | INT-001 | Build | Done | TASK-007, TASK-008, TASK-009 | | 칩 렌더링·QuickPick·StateStore·reconcile·ManifestWatcher. TASK-007·008·009 Done. **F5 end-to-end 검증 통과**, main 병합(FF, 2026-08-15). Rust 선택 UX 실사용 가능 |
| MS-005 | M4 실행·디버그 | INT-001 | Build | Done | TASK-010, TASK-011 | | TaskRunner·problem matcher·디버그 플로우·키바인딩. TASK-010·011 Done. **F5 검증 통과**(Build/Run + Debug 중단점), main 병합(FF, 2026-08-15). Rust 빌드·실행·디버그 실사용 가능. F19·Doctor 이월 |
| MS-006 | M5 설정 페이지 | INT-001 | Build | Done | TASK-012, TASK-013, TASK-014, TASK-015 | 2026-08-15 | 코어(012 주입·013 Webview 셸·014 호출구성 탭) + **015 export/import(F12)** 모두 **F5 통과·main 병합**. pre/postBuild 실행은 C-5로 MS-007 이월. **Cargo.toml 국소편집은 v2 이월** |
| MS-007 | M6 품질·배포 | INT-001 | Build | Done | TASK-016~021 | 2026-08-16 | 016 Doctor 모델·017 Doctor UI+E1칩·018 rustup target·019 pre/postBuild(C-5)·020 통합테스트+체크리스트(F18)·021 README+VSIX 전부 Done·병합. **v0.1.0 vsix 산출**(`devswitcher-tools-0.1.0.vsix`). Gate 5 = README·VSIX 해소, 잔여 수동검증(TC-11 WSL·TC-09·TC-02/03)은 문서화된 잔여 리스크로 v0.1 확정 |
| MS-008 | 시작 마법사 (F20) | INT-001 | Build | Done | TASK-022~024 | 2026-08-16 | 022 마법사 코어+Cargo·023 dotnet/cmake/python(계약 `createProject: task\|files`)·024 통합테스트+검증. **4개 언어 생성 F5 통과**(Rust/C#=네이티브 new, C++/Python=workspace.fs, D-13). OQ-001=자동 활성전환. scope A: v1 스위처 자동등장=Rust만. unit 98+통합 3 |
| MS-009 | v1.1 정리 — 자유 플래그(L-1) + 계약 정리 | INT-001 | Build | Done | TASK-025, TASK-026 | 2026-08-16 | 025 `stringList` 자유 플래그(Extra rustflags, Compiler 섹션) F5 통과 · 026 `persistSetting` 계약 제거(C-3 폐기 후속, D-15/ADR-013). unit 104·esbuild OK |
| MS-010 | C# (Dotnet) 어댑터 실구현 | INT-001 | Build | Done | TASK-027~029 | 2026-08-16 | **F5 통과**(C# 프로젝트 등장·Config/TFM 칩·build/run·coreclr 중단점·Doctor). 메타데이터=`msbuild -getProperty`(JSON)·실행경로=TargetPath·주입=`-p:`·디버그=coreclr. 디버그 RID 경로 fix(빌드와 동일 인자 재사용). C# fixture 추가. unit 123. C-7 1/3. main FF 병합 |
| MS-011 | Python 어댑터 실구현 (리트머스) | INT-001 | Build | Done | TASK-030~032 | 2026-08-16 | environment 축·실행(`python <script>`·PYTHONPATH/PYTHONOPTIMIZE env)·디버그(debugpy)·진단. `actions.build=false` 리트머스. F5(감지·리트머스·칩·Run·debugpy 통과, Doctor는 MS-012 cmake로 실검증). unit 133·실 python 3.12 스모크. **main FF 병합·push**. C-7 2/3. (v0.3.0 번들에 포함 예정) |
| MS-012 | C++ (CMake) 어댑터 실구현 | INT-001 | Build | Done | TASK-033~035·041 | 2026-08-17 | **ADR-014**(자체 `cmake` CLI·File API). 033(감지+chips+File API)·034(prepareInvocation+`-D` 주입+resolveExecutable)·035(run build-then-exec+debug 컴파일러 자동판별)·**041(CMakePresets: `ChipDescriptor.appliesTo` 동적 대체·`cmake --preset`·D-17)**. unit 172·실 cmake 4.4.2+VS18 스모크·**실 F5**(msvc-x64/x86/clangcl build/run/debug 중단점). **main FF 병합·브랜치 삭제.** C-7 3/3 **완주**. **v0.3.0 릴리즈**(2026-08-17) |
| MS-013 | Run Group (C-6) | INT-001 | Build | Done | TASK-036~040 | | **완료·v0.4.0 배포(세션 #011).** 그룹 상태 모델+GroupOrchestrator(계층적 위상정렬·병렬/순차·teardown·skip)+설정 페이지 Run Groups 탭(스테이지 순서)+상태바 통합 메뉴. **ADR-015**(준비=프로세스 시작·Run 전용)·**D-20**(스테이지 UI·skip·아이콘). TASK-036·037·038 F5 통과·040 검증. unit **203**. **TASK-039(준비 감지=포트/헬스체크)는 후속 마이너로 분리.** C-6 충족 → v0.4.0(v1.0.0은 D-19대로 TASK-042 결정) |
| MS-014 | v1.0.0 완주 — 최종 점검 + 게시 | INT-001 | Deliver | Planned | TASK-042 | | **로드맵 최종 단계(D-21, 실행 순서상 MS-015~018 이후).** 통합 테스트 최종 보강(dotnet/cmake/python/go/node 픽스처) + **VS Code Marketplace 게시** + **GitHub Release 생성**(`v1.0.0` 태그 + vsix 첨부) → **v1.0.0 완주 선언**(INT-001 종료, Human). 이전엔 "완주 결정 게이트"였으나 D-21로 로드맵이 구체화되며 **v1.0.0 릴리즈 마일스톤으로 재정의** |
| MS-015 | Go 어댑터 실구현 (v0.5.0) | INT-001 | Build | Planned | (TASK 미분해) | | **로드맵 v0.5.0(D-21).** Go(`go build`/`go run`·`dlv` 디버그) 어댑터 — 어댑터 프레임워크 5번째 언어. 감지(`go.mod`) + switch/build/run/debug. 착수 시 Task 분해 |
| MS-016 | Node/TS 어댑터 실구현 (v0.6.0) | INT-001 | Build | Planned | (TASK 미분해) | | **로드맵 v0.6.0(D-21).** Node/TypeScript(npm/pnpm scripts·`tsc`·node `--inspect` 디버그) 어댑터 — 6번째 언어. 감지(`package.json`). **완료 시 6개 언어 완성.** 착수 시 Task 분해 |
| MS-017 | 키보드 단축키 설정 (v0.7.0) | INT-001 | Build | Planned | (TASK 미분해) | | **로드맵 v0.7.0(D-21).** 설정 페이지 General 탭에 기본 단축키 제공 + 변경 가능. 6개 언어 명령 세트 확정 후 착수. **구현 방식(네이티브 Keyboard Shortcuts 필터 vs 인페이지 캡처)은 착수 시 ADR 확정.** 팀 필수 UX |
| MS-018 | Run Group 준비 감지 (v0.8.0) | INT-001 | Build | Planned | TASK-039 | | **로드맵 v0.8.0(D-21) — v1.0.0 마지막 기능.** TASK-039 승격 — Run Group 멤버 준비 신호를 프로세스 시작 → **포트/헬스체크**로 강화(멤버별 포트·URL·타임아웃, docker-compose `depends_on` 유사). ADR-015 후속 |
| MS-019 | 원격 디버그 타깃 (post-v1.0.0) | INT-001 | Evolve | Deferred | (TASK 미분해) | | **v1.0.0 이후 백로그(D-21 갱신)** — v1.1.0 후보. 로컬 빌드 + 원격 실행·어태치(lldb-server/gdbserver/debugpy attach). 단위가 커 1.0 이후로 재스케줄 — 설계서 §16 원래 "v2+ 백로그·v1 범위 밖" 위치로 복귀. §12.4 "한 창=한 환경" 한계 도전. **착수 시 ADR + Task 분해.** MS-020과 순서/번호는 1.0 이후 확정 |
| MS-020 | 크로스 컴파일 (도커 기반) (post-v1.0.0) | INT-001 | Evolve | Deferred | (TASK 미분해) | | **v1.0.0 이후 백로그(D-21 갱신)** — v1.2.0 후보(모델 크게 변경 시 v2.0.0). `cross` 연동 — 아키텍처 칩 확장, 도커 기반 타깃 빌드. 단위가 커 1.0 이후로 재스케줄 — 설계서 §16 원래 v2+ 위치. **착수 시 ADR + Task 분해** |

> 현재 등록 Milestone: MS-001~MS-020 (M0~M6 + F20 완료 / MS-009~013 = INT-001 등록조건 로드맵 / **MS-015~018 + MS-014 = v1.0.0 완주 로드맵(D-21)**: Go → Node/TS → 단축키 → 준비감지 → 최종점검+게시 / **MS-019·020 = v1.0.0 이후 백로그**: 원격디버그·크로스컴파일)

- `주 Phase`: `Define` / `Design` / `Build` / `Verify` / `Evolve` / `Deliver`
- `상태`: `Planned` / `In Progress` / `Review` / `Done` / `Deferred`
- 상세 계획이 필요한 Milestone은 `milestones/MS-*.md`를 생성한다(현재는 registry 경량 운영).
- 의존 순서: MS-001 → … → MS-008 **전부 Done(2026-08-16, v0.2.0)**. **INT-001 등록조건 로드맵**: MS-009(정리) → MS-010 C# → MS-011 Python → MS-012 CMake(= C-7, **Done·v0.3.0**) → MS-013 Run Group(C-6, **Done·v0.4.0**). **v1.0.0 완주 로드맵(D-21)**: MS-015 Go(v0.5.0) → MS-016 Node/TS(v0.6.0) → MS-017 단축키(v0.7.0) → MS-018 준비감지(v0.8.0) → **MS-014 v1.0.0 최종점검+게시**(로드맵상 최종, 번호는 채번 순서). **post-v1.0.0 백로그**: MS-019 원격디버그(v1.1.0 후보) → MS-020 크로스컴파일(v1.2.0 후보). **C-3(캐노니컬 파일 편집)은 폐기**(D-15 — "파일 무편집" 영구 불변식).
- **버전 정책(SemVer, D-21 갱신 2026-08-17)**: 1.0 이전은 `0.y.z` 개발 단계. 현재 배포=**v0.4.0**(C-6 Run Group). **v1.0.0은 INT-001 등록 조건(C-7+C-6) 충족만으로 자동 트리거되지 않는다** — v1.0.0 완주 로드맵(D-21)의 추가 기능을 MINOR로 쌓은 뒤 **Human이 명시적으로 완주 선언할 때** v1.0.0으로 올린다(D-19). 특별 지시 전까지 **v0.x.x 유지**. **버전 사다리(D-21)**: 0.4.0 → **0.5.0**(Go) → **0.6.0**(Node/TS) → **0.7.0**(단축키) → **0.8.0**(준비감지) → **1.0.0**(통합테스트+Marketplace+GH Release, Human 선언). ※ v0.8.0 → v1.0.0 점프 정상(최종 점검+게시 단계에서 MAJOR로 승격). 중간 릴리즈(0.5~0.8)는 vsix + git 태그만, GitHub Release 페이지·Marketplace 게시는 v1.0.0에서만. **post-v1.0.0**: 원격디버그=**v1.1.0** 후보, 크로스컴파일=**v1.2.0** 후보(모델 크게 변경 시 v2.0.0). ※ 과거 "INT-001 완주=v1.0.0" 표기는 폐기.

---

## 운영 규칙

- AI가 초안을 제안하고 Human이 승인하여 확정한다.
- 상세 계획이 필요한 경우 `milestones/MS-*.md`를 생성한다.
- 짧은 프로젝트에서는 이 문서의 행 단위로만 관리할 수 있다.
