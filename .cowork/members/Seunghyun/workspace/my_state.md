# My State — Seunghyun

> 개인 작업 상태 인덱스 — 내 세션의 AI가 가장 먼저 읽는 개인 문서

---

## 문서 정보

| 항목 | 내용 |
|------|------|
| 이름 | Seunghyun |
| 역할 (Role ID) | 프로젝트 오너 |
| 활성 Milestone | **없음** — MS-012 C++(CMake) **Done·main 병합 완료**(C-7 완주). 다음: MS-013 Run Group / v1.3 릴리즈 (논의) |
| 마지막 갱신일 | 2026-08-17 |
| 참조 세션 로그 | session_2026-08-17_010.md |

---

## 현재 담당 작업

| Task ID | 제목 | 관련 Milestone | 상태 | 진행률 | 블로커 |
|---------|------|----------------|------|--------|--------|
| 없음 | (MS-012 완료·병합) | — | — | 다음 세션 방향 논의 | 없음 |

> **TASK-001~035·041 완료 · MS-012 main FF 병합(2026-08-17) → C-7 완주**(Rust·C#·Python·C++ 4개 언어 전부 스위처 실동작). 세션 #010: TASK-041 CMakePresets(`ChipDescriptor.appliesTo` 동적 대체·`cmake --preset`·프리셋 binaryDir 스레드·target/디버거 재사용) F5 통과(msvc-x64/x86/clangcl) + 설정 페이지 appliesTo 일관성·profile read-only 문구 정정. 14커밋 병합·병합 브랜치(ms-011·012) 삭제. unit 172. **다음 세션 논의**: C-6(MS-013 Run Group, INT-001 마지막 조건) / v1.3 릴리즈 / KB 정리 / origin push.

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

---

## 다음 시작점

1. **MS-012 main 병합** — 브랜치 `feature/ms-012-cmake-adapter`(TASK-033·034·035·041 전부 F5·커밋) FF 병합 → MS-012 Done(C-7 완주 = 4개 언어 전부 스위처 실동작). Human 지시 시.
2. **C-6** — MS-013 Run Group(C-7 이후, TASK-036~040). 위생: KB 17항목 통합 검토. 별도 트랙: TC-11(WSL, Deferred, GAP-001). **C-3은 폐기**(D-15/ADR-013).

---

## 최근 결정/작업 메모

- 프로젝트 = DevSwitcher Tools (`devswitcher-tools`) VSCode 확장. 상세설계서 v1.1 "확정" 상태.
- 협업 실행 모드 = solo, 권한 = Master.
- DEFINE 반입 + Gate 1 통과. ADR-001~010 반입(DD-01~09 + 마법사).
- 신규 결정 F20(시작 마법사, ADR-010): 매니페스트 부재 폴더에서 수동 명령으로 새 프로젝트 생성, 전 언어 실동작. 파일 부재 비대칭 해소.
- 세션 #002 신규 결정 F21(호출 구성 오버레이, ADR-011·012): VS2026식 속성(컴파일옵션·출력·링커·env·빌드전후)을 **파일 무편집**으로 (프로젝트×구성)별 저장 후 `--config`/env 주입. 설정 UI = WebviewPanel "설정 페이지" + 어댑터 선언 옵션 카탈로그(설명·예제·타입 에디터). 캐노니컬 파일 편집은 v2. 언어별 능력 SSOT = `interface_contract.md` §8.

---

## 이월 항목

- C-1: `ui_spec.md`(화면설계서, 권장) — UI 구현 착수 시 작성 (설정 페이지 옵션 브라우저 포함)
- C-2: MS-002~008 상세 Task 분해 — 해당 Milestone 착수 시
- C-3: (v2) 호출 구성 오버레이 → 캐노니컬 파일 영구 반영(편집/승격, 구 §8.7) — v2 착수 시
- (완료) C-4: `ProfileExport` 확정 + data_model §2 정합화 — TASK-015에서 해소(세션 #005)
- (완료) MS-006 전체 main FF 병합 완료 (코어 335f982 + TASK-015 b7864cf, 세션 #005). MS-006 Done
- (완료) MS-003·004·005 main FF 병합 완료 (TASK-004~011)
- C-5: pre/postBuild 실행 배선 + buildEvent 편집 — MS-007

---

## 참조 세션 로그

| 세션 | 날짜 | 주요 내용 |
|------|------|----------|
| #001 | 2026-08-13 | 첫 세션 온보딩, 멤버/상태 문서 초기화, 진행 방향 논의 |
| #002 | 2026-08-15 | VS2026식 속성 논의 → 호출 구성 오버레이·설정 페이지·언어별 능력 설계 반영(ADR-011·012, F21) |
