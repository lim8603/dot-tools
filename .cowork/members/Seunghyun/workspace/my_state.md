# My State — Seunghyun

> 개인 작업 상태 인덱스 — 내 세션의 AI가 가장 먼저 읽는 개인 문서

---

## 문서 정보

| 항목 | 내용 |
|------|------|
| 이름 | Seunghyun |
| 역할 (Role ID) | 프로젝트 오너 |
| 활성 Milestone | **없음** — MS-023(v1.3.0) **Done·게시 완료**. 다음 Milestone은 Human 결정 대기 |
| 마지막 갱신일 | 2026-08-26 |
| 참조 세션 로그 | session_2026-08-26_020.md |

---

## 현재 담당 작업

| Task ID | 제목 | 관련 Milestone | 상태 | 진행률 | 블로커 |
|---------|------|----------------|------|--------|--------|
| (없음) | **v1.3.0 게시 완료** — 다음 작업은 Human 결정 후 등록 | MS-023 | Done | 100% | 없음 |

> **🚀 v1.3.0 게시 완주(세션 #020, MS-023 Done).** 세션 #019의 5항목에 더해, Human 지적("이 메시지박스 쿨하지 않다")으로 **Delete Build Tree UI를 재설계**했다(ADR-022/D-26): 모달 → **QuickPick(`canPickMany`, 전 항목 기본 체크)** + **휴지통 폐기·즉시 삭제** + `confirmDeleteBuildTree` 설정. **배포 번들에 `modal:!0` 0건** — 확장에서 화면을 막는 대화상자가 사라졌다. F5 6종 완주 PASS, 도중 결함 2건(오보고 경로 / 설명 잘림) 발견·수정. KB 인사이트 #6·안티패턴 #18·#19.
> (직전) **✅ v1.3.0 F5 검증(세션 #019, MS-023).** 백로그 4항목(B-4 Clean/Delete·B-5 configureOnSelect·B-6 probe 정합성·scan.exclude) + **docs 13종 누적 동기화**. 착수 직전 Human 질문("Clean Target? Clean All?")으로 **같은 버튼이 어댑터마다 다르게 동작**함이 드러나 어댑터가 `CleanScope[]`를 선언하고 UI는 나열만 하도록 재설계(칩과 같은 모델). **F5에서 결함 3건 발견·수정** — 셋 다 화면상 "정상 완료"로 보였고 파일시스템·실행 명령 대조로 드러났다(KB #16·#17). unit **379**·통합 6.
> (직전) **🚀 v1.2.1 게시(세션 #019 전반).** "보기만 해도 configure" 6경로 차단 + 목록 순서 고정. 릴리즈 직전 **stale vsix 발견**(패키징이 최종 수정보다 22분 앞섬 — #018의 스모크는 F5 실패본으로 통과한 것)해 재패키징 후 게시(KB #14).
> (직전) **🚀 v1.2.0 게시(세션 #017, D-25/ADR-021) — MS-022 Done.** Visual Studio 어댑터(7번째 툴체인: .sln/.slnx/.vcxproj·MSBuild 직접 구동·CMakeCache 마커 제외·A안 .csproj=dotnet 소유)+B-3 언어 필터+플랫 벡터 아이콘. F5 통과(토스트 축약 피드백 반영) → Marketplace 게시+GitHub Release. 버전 이력: …→v1.1.0→**v1.2.0**.
> (직전) **🚀 v1.1.0 게시(세션 #016, D-24/ADR-019/ADR-020) — MS-021 Done.** 실사용 피드백 7건: CMake 중첩 하위 프로젝트(VS 솔루션식)·lib 타겟+차단 토스트·All targets·**런그룹 멤버 디버그**·Ctrl+Alt+T·설정창 블랭크 fix·아이콘 투명화. F5 2회 통과 → Marketplace 게시+GitHub Release. 버전 이력: …→v1.0.0→**v1.1.0**. 원격디버그(MS-019)·크로스컴파일(MS-020)은 INT-002(Draft, v1.2.0+ 후보).

---

## 오늘의 세션 Intent

| 세션 | 날짜 | 세션 Intent | 대상 Milestone | 대상 Task | 결과 |
|------|------|------------|----------------|-----------|------|
| #001 | 2026-08-13 | 온보딩 + 설계서 전체 반입(DEFINE·DESIGN·BUILD준비) + F20 신규 + Gate 1·3 통과 + 커밋 | MS-001 | 프로젝트 공통 | 완료 |
| #002 | 2026-08-15 | VS2026식 프로젝트 속성 논의 → 호출 구성 오버레이(ADR-011)·설정 페이지·옵션 카탈로그(ADR-012)·언어별 능력 정리, F21/FR-014 신규 반영 | MS-006(설계) | 프로젝트 공통 | 완료 |
| #003 | 2026-08-15 | TASK-001 F5·병합 → OQ-002 확정 → TASK-002 types.ts → TS2584 수정 → TASK-003 어댑터 스텁 → MS-002 병합 → 상세설계서 v1.2·imported_context 이동 → MS-003 착수·TASK-004(CargoBridge+mocha) | MS-001·002·003 | TASK-001~004 | 완료 |
| #004 | 2026-08-15 | **MS-003·004·005 완료·병합 + MS-006 코어 F5 통과(미병합)**. TASK-005~014: CargoBridge I/O·CargoAdapter·상태바/저장/감시·실행/디버그·**설정 페이지(옵션 편집·명령 미리보기·오버레이 주입)**. mocha 61. CLAUDE/AGENTS 컨텍스트·ui_spec 작성 | MS-003~006 | TASK-005~014 | MS-006 병합만 남음 |
| #005 | 2026-08-15 | **MS-006 코어 병합 + TASK-015(export/import F12) 완료 → MS-006 Done.** C-4 확정(ProfileExport=PersistedState 정렬). 파생: 옵션 example bare화+injectsAs/docUrl·preview env 표시. F5 라운드트립 통과. mocha 73 | MS-006 | TASK-015 | **MS-001~006 전부 완료·병합** |
| #006 | 2026-08-16 | **대형 세션 — v0.1.0 릴리즈 + MS-008(F20 마법사) 완주 + 수동검증 + v0.2.0 릴리즈.** ① TASK-021→MS-007 Done→v0.1.0(publisher lim8603·codicon PNG 목업·vsce·설치스모크) ② MS-008 TASK-022~024(마법사 4언어 생성, 계약 `createProject: task\|files`, workspace.fs D-13)→Done ③ 수동검증 TC-02/03/09 Pass·TC-11 Deferred ④ 검증 중 버그 2건 수정(features 칩 e7b462b·untrusted 무한스피너 eb8983a) ⑤ **v0.2.0 릴리즈**(main push). unit 99+통합 3 | MS-007·008 | TASK-021~024 | **MS-001~008 전부 완료·v0.2.0** |
| #007 | 2026-08-16 | **초대형 세션 — INT-001 완주 로드맵 착수.** ① 로드맵 확정(MS-009~013)+**C-3 폐기**(D-15/ADR-013) ② **MS-009**(L-1 자유 rustflags·persistSetting 계약 제거)→Done·병합 ③ **MS-010 C#**(TASK-027~029: `msbuild -getProperty` 감지·`-p:` 주입·coreclr 디버그·Doctor, **디버그 RID 경로 fix**)→Done·병합·F5 ④ **MS-011 Python** TASK-030(감지+environment/target 칩)Review ⑤ KB #8 승격. unit 128, cargo/dotnet10/py3.12 스모크 | MS-009·010·011 | TASK-025~030 | **MS-009·010 완료·병합 / MS-011 진행(TASK-031부터)** |
| #008 | 2026-08-16 | **초대형 세션 — MS-011 완주·병합 + MS-012 착수.** ① **MS-011 Python**: TASK-031(실행·resolveExecutable=스크립트경로·PYTHONOPTIMIZE·taskDef)·032(debugpy·collectDiagnostics). F5(Doctor 제외) 통과. F5 유래 3수정: A)Environment 실경로 dedup B)New Project 폴더 선택창 C)`Rescan Projects`(+invalidateAll 스텁 관용 fix). ② 커밋+**main FF 병합·push**(MS-009·010·011 origin 반영). ③ **Edge Tools 경고=이전 세션 스크래치패드**(우리 코드 아님) 규명 + 설정 웹뷰 a11y 수정(`ff2ee13`). ④ **MS-012 착수**: ADR-014(자체 cmake CLI)+TASK-033 Doctor 슬라이스 → **cmake 미설치로 Doctor ❌+E1 실검증 통과**(Human이 cmake 4.4.2 설치). unit **142** | MS-011·012 | TASK-030~033 | **MS-011 Done·병합 / MS-012 진행(TASK-033 계속)** |
| #009 | 2026-08-16 | **MS-012 CMake 핵심 루프 완성.** TASK-033(listProjects+chips+File API codemodel)·034(prepareInvocation 훅+`cmake --build`+`-D` 주입+resolveExecutable)·035(run build-then-exec + debug 컴파일러 자동판별 cppvsdbg/cppdbg+gdb/lldb+override). 전부 F5 통과·커밋(`8664be9`~`61f6ac3`). unit 165. KB #6/#9 | MS-012 | TASK-033·034·035 | **핵심 루프(switch/build/run/debug) 완성 / TASK-041 남음** |
| #010 | 2026-08-17 | **TASK-041 CMakePresets.json F5 통과 → MS-012 구현 완료.** `ChipDescriptor.appliesTo` 동적 대체(Preset 칩↔profile/arch, D-17) + `parseConfigurePresets`/`resolvePresetBinaryDir`(순수, inherits/hidden/매크로) + `cmake --preset` configure(binaryDir·--config 생략) + target/디버거 자동판별 재사용. 프리셋 픽스처(msvc-x64/x86/clangcl). unit **172**·실 cmake 스모크·**실 F5**(msvc-x64 build/run/debug 중단점). 커밋(feat+docs)·미병합 | MS-012 | TASK-041 | **MS-012 전 Task F5 통과, main 병합 대기** |
| #011 | 2026-08-17 | **MS-013 Run Group: TASK-036·037·038 완료 + 버전 정책 반전.** Human 결정(준비=프로세스 시작·Run 전용) + **D-19**(v1.0.0 자동 안 함·v0.x.x 유지·TASK-042 게이트) + **ADR-015** + **036**(모델·저장·순수 계획) + **037**(TaskRunner.start·sequencer·GroupOrchestrator·커맨드) + **038**(설정 페이지 Run Groups 탭·상태바 런처·순수 편집). **TASK-042/MS-014** 신설. unit **196**·prod 99.3kb·미커밋 | MS-013 | TASK-036·037·038 | **엔진+UI 완료(Review), 다음: 전체 F5 → TASK-040(v0.4.0)** |
| #012 | 2026-08-17 | **TASK-042 추가 기능·논의 → v1.0.0 완주 로드맵 확정(D-21).** v1.0.0 = MS-015 Go·MS-016 Node/TS·MS-017 단축키·MS-018 준비감지(0.5~0.8) → MS-014 최종점검+게시. **원격디버그(019)·크로스(020)는 단위 커 post-1.0 재스케줄**(v1.1.0/v1.2.0 후보). registry 반영 | MS-014~020 | TASK-042 | 로드맵 확정+재스케줄. 다음: MS-015(Go) 착수 |
| #013 | 2026-08-17 | **MS-016 Node/TS(v0.6.0)+MS-017 키보드 단축키(v0.7.0) 완주.** MS-016: script+packageManager 칩·**배열형 ShellExecution**(ADR-016/NFR-002b·Node24 `.cmd` EINVAL 실측)·js-debug·`.vscode-test` 스캔제외 fix. MS-017: 정적 키바인딩(Ctrl+Alt+B/R/S/D/P/G/,·`when:hasProjects`)·General 탭 딥링크(**ADR-017**·내장키 불간섭)·F5 유래 `devSwitcher.stop`(태스크+디버그세션)·상태바 Stop 버튼(세션 Map 추적·stale 버그 fix). **F5 전부 통과.** unit 235·통합 16커맨드. main FF·`v0.6.0`/`v0.7.0` 태그·push | MS-016·017 | TASK-046~050 | 완료·배포. 다음: MS-018 준비감지 |
| #014 | 2026-08-17 | **B-2 Project 카드 + MS-018 준비 감지(v0.8.0) 완주 + README 스크린샷 리프레시.** B-2: 어댑터 무지 카드(툴체인 ✅/❌·칩 요약)·순수 `projectCard.ts`. MS-018(**ADR-018**): 포트 open/HTTP 상태코드 게이트·순수 `readiness.ts`+I/O `readinessProbe.ts`·타임아웃/취소=abort+teardown·**취소 가능**·Run Groups UI 재설계(멤버 카드·Add 드롭다운)·seedMemberDefaults. F5(svc-a→svc-b 포트 게이트 4s 대기). README: SIX 히어로·Go/Node 신규·clean triple. unit 268·통합 3·`v0.8.0.vsix` 스모크. **main FF·`v0.8.0` 태그·push.** KB 패턴#10·안티패턴#10. **v1.0.0 로드맵 4개 MINOR 전부 완료** | B-2·MS-018 | 051·052·053 | 완료·배포. 다음: 품질점검→MS-014 |
| #015 | 2026-08-17 | **🏁 MS-014 v1.0.0 완주 — INT-001 Closed·첫 Marketplace 게시.** Human 완주 선언(D-23·TC-11=Known Issue). 최종 재검증(EV-019)·v1.0.0 스탬프·**docs/ 공식 산출물 13종**(에이전트 12기 병렬·소스 승격 2종)·Gate 5 Pass → `v1.0.0` 태그·**repo public**(+기여 차단: PR 자동닫기·CONTRIBUTING·Issues 유지)·**GitHub Release**(vsix)·Human 온보딩(aex 직행·PAT·publisher) 후 **`vsce publish` DONE**. 트러블슈팅: README 이미지=GitHub 전역 장애(레포 정상)·리스팅 404=검증 지연(→200). KB 패턴#11 | MS-014 | TASK-042·054·055 | **v1.0.0 완주.** 다음: Human 결정(INT-002·B-3·TC-11) |
| #017 | 2026-08-19 | **🚀 MS-022 v1.2.0 Visual Studio 지원 완주 — 세 번째 Marketplace 게시.** Human 신규 요구 "VS 프로젝트 대응 가능?" → 타당성 검토(어댑터 독립·CMake 생성물 충돌 1건) → **D-25**(CMakeCache 마커 제외·A안 .csproj=dotnet 소유·Windows 전용)·**ADR-021** → 당일 구현: `vsBridge`(순수 sln/slnx/vcxproj 파서+vswhere/MSBuild I/O)·`vsAdapter`(솔루션=루트 계층[ADR-019 재사용]·Configuration/Platform 칩·`-getProperty:TargetPath`·cppvsdbg)·**KB #3**(솔루션 vs 단독 빌드 출력 불일치→`/p:SolutionDir` 주입, 실측)·**B-3 해소**(`languages.enabled` fail-open 필터+General 탭 체크박스)·아이콘 플랫 벡터(Human 제작). F5 통과(피드백=토스트 축약, KB 안티패턴 #11) → v1.2.0 스탬프·docs 7툴체인 주석 갱신·vsix 스모크·main 병합(`330b2b0`)·태그·**`vsce publish` DONE**·**GitHub Release**. unit 318·통합 3 | MS-022 | TASK-063~065 | **v1.2.0 게시 완료.** 다음: Human 결정(INT-002·TC-11) |
| #018 | 2026-08-24 | **리포 정리 + v1.2.1 결함 수정(F5 대기).** ① vsix 10개 → `release/`(+`package:vsix`) **커밋 완료** ② 기능1(전후 이벤트)=착수 전 취소 · 기능2(`scan.exclude`)=구현 후 **전량 롤백**(재검토 예정) ③ **v1.2.1**: "프로젝트를 보기만 해도 cmake configure되어 읽기 전용 서브모듈에 `build/`가 생긴다" 결함 수정 — 유발 경로 **6개**(최대는 활성화 시 `gatherValidItems`)를 `probe` 옵션 도입으로 차단, 파급 2건(reconcile이 저장값 삭제 / Run Group 시딩 차단) 선제 방어. 곁가지로 **목록 순서 재배치 버그**(findFiles 미정렬, v1.0.0부터 잠복) 수정. README 설치 예제 버전 고착도 수정. unit 321·통합 3·vsix 스모크 통과. **AI가 두 번 오진 → 계측으로 특정**(KB 인사이트 #5·안티패턴 #13). 백로그 B-4·B-5 추가 | — | — | **v1.2.1 코드 완료·F5만 남음(내일)** |
| #016 | 2026-08-18~19 | **🚀 MS-021 v1.1.0 실사용 피드백 완주 — 두 번째 Marketplace 게시.** 회사 실사용 7건(Human): ① 중첩 CMake 하위 프로젝트(**ADR-019**: 루트=솔루션·타겟 선언 디렉토리=하위·`paths.source` 스코프·`ProjectInfo.parentId/library`) ② lib 타겟+`validateAction` 차단 토스트+`projects.showLibraries` ③ 설정창 블랭크 fix(퀵 페인트·가드·에러 배너) ④ 아이콘 투명화(flood fill+밝기×거리 페이드) ⑤ Ctrl+Alt+T(`pickTarget`, Node=script 폴백) ⑥ All targets(`--target` 생략) ⑦ **런그룹 멤버 Launch Run/Debug**(**ADR-020**, ADR-015 "Run 전용" 대체)+`N running` 표기. D-24(3결정). F5 2회 통과·unit 286·통합 3·실 cmake 스모크 → v1.1.0 스탬프·vsix 스모크·main 병합·태그·**`vsce publish` DONE**·**GitHub Release**. nested 픽스처 신설 | MS-021 | TASK-056~062 | **v1.1.0 게시 완료.** 다음: Human 결정(INT-002·B-3·TC-11) |
| #019 | 2026-08-25 | **🚀 v1.2.1 게시 + v1.3.0 완주(릴리즈만 남음).** 전반: v1.2.1 F5 검증(파일시스템 PASS) → dotnet 픽스처 오탐을 **실험 3건으로 C# Dev Kit design-time build로 규명**(KB #15) → **stale vsix 발견**(패키징이 최종 커밋보다 앞섬, KB #14) → 재패키징·게시. 후반: **v1.3.0** 계획→구현 5항목(B-4·B-5·B-6·scan.exclude·docs 동기화)→F5. Human 설계 개입 2건: ① Clean 범위를 **어댑터 선언 모델**로("못하는 걸 억지로 시킬 수 없으니 행위를 상세히 표현하고 할 수 있는 것만 제공") ② 테스트 픽스처 보강 지시(cargo 워크스페이스·vendor 트리 신설). **F5 결함 3건**: cargo 워크스페이스 `target/` 위치 오판(ADR-005 미준수)·`cargo clean` 축 누락·모달/피커 **가운데 잘림으로 안전장치 무력화**. docs 13종+README 반영. KB 안티패턴 #14~#17 | MS-023 | v1.3.0 5항목 | **v1.2.1 게시 완료 / v1.3.0 릴리즈 대기(내일)** |

---

## 다음 시작점

1. **Human 결정 대기** — 활성 Intent·Milestone 없음. 후보 셋: ① **INT-002**(원격·크로스, Draft) 승인·착수 ② **TC-11**(WSL) 검증으로 Known Issue 해소 ③ 실사용 피드백 수집 후 다음 MINOR.
2. **정리(선택)** — 병합된 `feature/ms-023-v1.3.0` 브랜치 삭제. main과 동일 커밋이라 언제 지워도 무방.
3. **릴리즈 후 확인(선택)** — Marketplace 리스팅 반영은 몇 분 걸린다. `https://marketplace.visualstudio.com/items?itemName=lim8603.devswitcher-tools` 에서 1.3.0 표기 확인.
2. **다음 사이클 결정(Human)** — ① INT-002(원격디버그 MS-019·크로스컴파일 MS-020, Draft) 승인·착수 여부 ② TC-11(WSL) 검증으로 Known Issue 해소.
3. **성능·품질 코드리뷰** — 세션 #018부터 계속 이월 중. v1.4.0 묶음 후보.

## 최근 결정/작업 메모

- 프로젝트 = DevSwitcher Tools (`devswitcher-tools`) VSCode 확장. 상세설계서 v1.1 "확정" 상태.
- 협업 실행 모드 = solo, 권한 = Master.
- DEFINE 반입 + Gate 1 통과. ADR-001~010 반입(DD-01~09 + 마법사).
- 신규 결정 F20(시작 마법사, ADR-010): 매니페스트 부재 폴더에서 수동 명령으로 새 프로젝트 생성, 전 언어 실동작. 파일 부재 비대칭 해소.
- 세션 #002 신규 결정 F21(호출 구성 오버레이, ADR-011·012): VS2026식 속성(컴파일옵션·출력·링커·env·빌드전후)을 **파일 무편집**으로 (프로젝트×구성)별 저장 후 `--config`/env 주입. 설정 UI = WebviewPanel "설정 페이지" + 어댑터 선언 옵션 카탈로그(설명·예제·타입 에디터). 캐노니컬 파일 편집은 v2. 언어별 능력 SSOT = `interface_contract.md` §8.

---

## 이월 항목

- **성능·품질 코드리뷰** — #018에서 착수 예정이었으나 계속 밀림. 다음 기능 묶음에서.
- (완료) **B-4** Clean / 빌드 트리 삭제 — v1.3.0에서 둘 다 구현(명령 팔레트만)
- (완료) **B-5** 미구성 프로젝트 칩 목록 옵션 — v1.3.0 `cmake.configureOnSelect`(기본 false) + "not listed yet" 플레이스홀더
- (완료) **B-6** dotnet probe 미준수 — v1.3.0에서 dotnet·cargo·go·python 전 어댑터 감사·수정
- (완료) **`scan.exclude`** — #018 롤백분을 v1.3.0에서 설계 그대로 재구현
- (완료) C-4 `ProfileExport` 확정(세션 #005) · MS-003~006 병합 · C-5 pre/postBuild 배선
- C-3: (v2) 호출 구성 오버레이 → 캐노니컬 파일 영구 반영 — **폐기됨**(D-15/ADR-013, 파일 무편집이 영구 불변식)

---

## 참조 세션 로그

| 세션 | 날짜 | 주요 내용 |
|------|------|----------|
| #001 | 2026-08-13 | 첫 세션 온보딩, 멤버/상태 문서 초기화, 진행 방향 논의 |
| #002 | 2026-08-15 | VS2026식 속성 논의 → 호출 구성 오버레이·설정 페이지·언어별 능력 설계 반영(ADR-011·012, F21) |
