# Release Note

> 릴리즈 노트 — 각 릴리즈의 변경 사항, 신규 기능, 버그 수정, 알려진 이슈를 기록한다

---

## 문서 정보

| 항목 | 내용 |
| --- | --- |
| 프로젝트 | DevSwitcher Tools (`devswitcher-tools`) |
| 버전 | v1.2.0 (최신 릴리즈) |
| 릴리즈 일자 | 2026-08-19 |
| 기준 문서 | `CHANGELOG.md`(영문 원본) · `.cowork/04_implementation/milestone_registry.md` |

---

## 작성 기준

- 각 릴리즈 항목은 짧고, 외부 공유 기준으로 빠르게 훑을 수 있게 유지한다.
- 내부 작업 메모를 그대로 복사하지 말고 실제 배포된 변경 내용을 중심으로 요약한다.
- 아직 내용이 없으면 애매하게 비워두지 말고 `없음`으로 명시한다.
- 사용자 영향, 운영 영향, Breaking Change, 후속 조치를 드러내야 하는 경우 분명히 적는다.
- 사실 관계는 `CHANGELOG.md`를 기준으로 하며, CHANGELOG에 없는 사실은 추가하지 않는다. 불명확한 항목은 `미확정`으로 표시한다.

---

## 릴리즈 이력 요약

| 버전 | 일자 | 핵심 | 관련 Milestone |
| --- | --- | --- | --- |
| v1.2.0 | 2026-08-19 | Visual Studio(.sln/.vcxproj) 지원 — 7번째 툴체인 + 언어별 표시 필터 | MS-022 |
| v1.1.0 | 2026-08-19 | 실사용 피드백 1차 — CMake 중첩 하위 프로젝트·라이브러리 타겟·런그룹 디버그 | MS-021 |
| v1.0.0 | 2026-08-17 | 첫 안정판 — 6개 언어 완성 + Marketplace 게시 + 저장소 public | MS-014 |
| v0.8.0 | 2026-08-17 | Run Group 준비 감지(포트/HTTP 게이트) + 설정 페이지 카드 UI | MS-018 |
| v0.7.0 | 2026-08-17 | 키보드 단축키 + Stop 커맨드 | MS-017 |
| v0.6.0 | 2026-08-17 | Node.js/TypeScript 지원 — 6번째 언어 | MS-016 |
| v0.5.0 | 2026-08-17 | Go 지원 — 5번째 언어 | MS-015 |
| v0.4.0 | 2026-08-17 | Run Group — 의존 순서 일괄 실행 | MS-013 |
| v0.3.0 | 2026-08-17 | C#·Python·C++(CMake) 실구현 — 4개 언어 완성 | MS-010 · MS-011 · MS-012 (MS-009 일부 반영) |
| v0.2.0 | 2026-08-16 | 시작 마법사(F20) | MS-008 |
| v0.1.0 | 2026-08-16 | 첫 개인 릴리즈 — Rust(Cargo) 완전 구현 | MS-001~MS-007 |

- Breaking Change: 전 릴리즈 공통 `없음` (CHANGELOG 기준 기록된 Breaking Change 없음).
- 배포 방식: v0.1.0~v0.8.0은 `.vsix` + git 태그, v1.0.0부터 Visual Studio Marketplace + GitHub Release.

---

## 릴리즈 이력

### v1.2.0 — 2026-08-19

#### 핵심 요약

- **7번째 툴체인: C++ (Visual Studio).** 네이티브 `.sln`/`.slnx` 솔루션과 `.vcxproj` C++ 프로젝트를 MSBuild 직접 구동으로 지원(Windows). 솔루션=루트(전체 빌드)·`.vcxproj`=하위 항목, Configuration·Platform 칩, `vswhere` 발견, `-getProperty:TargetPath` 실행 경로, `cppvsdbg` 디버그. CMake 생성물은 CMakeCache.txt 마커로 자동 제외, 솔루션 내 C# 프로젝트는 .NET 항목 유지.
- **언어별 표시 필터** — `devSwitcher.languages.enabled`(General 탭 체크박스, fail-open).
- **확장 아이콘** 플랫 벡터 디자인 교체 + 차단 토스트 문구 축약.
- 관련 Milestone: MS-022 / Breaking Change: 없음 / 알려진 이슈: TC-11(WSL) 이월, VS 지원은 Windows 전용·실행/디버그 경로 해석은 MSBuild 17.8+.

### v1.1.0 — 2026-08-19

#### 핵심 요약

- **첫 실사용 피드백 릴리즈(7건).** CMake 중첩 하위 프로젝트 계층 표시·라이브러리 타겟(+`projects.showLibraries`)·루트 "All targets"·런그룹 멤버 디버그 기동·Switch Target 단축키(Ctrl/Cmd+Alt+T)·설정 페이지 공백 열림 수정·아이콘 투명화.
- 관련 Milestone: MS-021 / Breaking Change: 없음 / 알려진 이슈: TC-11(WSL) 이월.

### v1.0.0 — 2026-08-17

#### 핵심 요약

- **첫 안정판.** 0.x 라인을 마무리하고 6개 언어(Rust · C++/CMake · C# · Python · Go · Node.js/TypeScript)를 하나의 상태바 UX로 지원한다.
- **Visual Studio Marketplace 게시**(`lim8603.devswitcher-tools`) + **GitHub 저장소 public 전환** + **GitHub Release 생성**.
- 프로젝트별 옵션 칩, 파일 무편집 호출 오버레이, 프로필 export/import, 설정 페이지, 준비 게이트 포함 Run Group, 키보드 단축키, 새 프로젝트 마법사, Doctor 진단을 모두 포함한다.

#### 릴리즈 범위

| 항목 | 내용 |
| --- | --- |
| 관련 Milestone / Intent | MS-014 (v1.0.0 완주 — 최종 점검 + 게시) / INT-001 |
| 배포 대상 | Visual Studio Marketplace (`lim8603.devswitcher-tools`) + GitHub Release (`.vsix` 첨부) |
| 비고 | v0.8.0 → v1.0.0 점프는 버전 사다리(D-21)상 정상 — 최종 점검·게시 단계에서 MAJOR 승격 |

#### 신규 기능 (Features)

- **Marketplace 배포** — Visual Studio Marketplace에서 직접 설치 가능(`lim8603.devswitcher-tools`). `.vsix`는 GitHub Releases에서 계속 제공.
- **공식 프로젝트 문서** — `docs/` 아래 공식 산출물 생성(요구사항, 기능 명세, 아키텍처, API 계약, WBS, 테스트 문서, 릴리즈 노트, 사용자 매뉴얼 — 한국어).

#### 개선 사항 (Improvements)

- 없음

#### 버그 수정 (Bug Fixes)

- 없음

#### 알려진 이슈 (Known Issues)

- **TC-11 — WSL/Remote 수동 검증 미수행.** 확장은 remote-safe 하게 구현되어 있으나(`workspace.fs`, `extensionKind: ["workspace"]`), 이번 릴리즈에서 WSL 수동 테스트 패스(TC-11)는 수행하지 않았다. **릴리즈 비차단으로 수용(Human 결정 D-23)**, README *Known limitations* 참조.

---

### v0.8.0 — 2026-08-17

#### 핵심 요약

- **Run Group 준비 감지(readiness gate)** — v1.0.0 이전 마지막 기능 릴리즈. 멤버별로 "준비 완료" 기준을 프로세스 시작 → 포트 open / HTTP 상태코드로 강화.
- 관련 Milestone: MS-018 (Run Group 준비 감지)

#### 신규 기능 (Features)

- **Run Group 준비 게이트** — Run Groups 탭의 멤버별 **Ready when** 컨트롤로 준비 기준 선언:
  - **process start** (기본값, 기존 동작) — 프로세스 실행 즉시 준비.
  - **port open** — `localhost:<port>` TCP 연결 성공 시 준비.
  - **HTTP status** — `GET <url>`이 기대 상태코드(기본 `200`) 반환 시 준비.
- 게이트는 통과하거나 멤버의 **timeout**이 만료될 때까지 폴링한다. 준비되지 않은 멤버는 그룹 시작을 중단(abort)하고 이미 시작된 멤버를 teardown하며, 긴 대기는 진행 알림에서 **취소** 가능. 게이트 없는 멤버는 기존 동작 유지(기존 그룹 무영향).

#### 개선 사항 (Improvements)

- **Run Groups 탭 정리** — 멤버를 스테이지 순 카드로 표시(스테이지·준비 게이트·**Remove** 버튼), 전체 체크박스 목록 대신 **Add a project** 드롭다운으로 추가. 멤버 실행 시 기본 칩 값 자동 시드(예: Node **Script** → `start`) — 활성 프로젝트였던 적 없는 멤버도 수동 설정 불필요.
- **Project 탭 강화** — 감지된 프로젝트를 카드로 표시(어댑터·매니페스트 경로·Doctor 기반 툴체인 상태·활성 프로필·칩별 옵션 개수 요약). 카드 클릭으로 프로젝트 전환.
- **문서** — README 상태바 스크린샷을 6개 언어 라인업으로 리프레시(Go·Node.js/TypeScript 추가, 히어로 이미지 갱신).

#### 버그 수정 (Bug Fixes)

- 없음

#### 알려진 이슈 (Known Issues)

- 없음 (CHANGELOG 기준 기록된 이슈 없음)

---

### v0.7.0 — 2026-08-17

#### 핵심 요약

- **키보드 단축키 + Stop 커맨드** — 코어 액션을 키보드로 조작 가능.
- 관련 Milestone: MS-017 (키보드 단축키 설정)

#### 신규 기능 (Features)

- **키보드 단축키** — 기본 키바인딩 제공: **Build** `Ctrl/Cmd+Alt+B`, **Run** `Ctrl/Cmd+Alt+R`, **Stop** `Ctrl/Cmd+Alt+S`, **Debug** `Ctrl/Cmd+Alt+D`, **Switch Project** `Ctrl/Cmd+Alt+P`, **Run Groups** `Ctrl/Cmd+Alt+G`, **Open Settings** `Ctrl/Cmd+Alt+,`. DevSwitcher 프로젝트가 있을 때만 활성(`when: devSwitcher.hasProjects`). 설정 페이지 **General** 탭에서 목록 확인 및 VS Code 단축키 편집기(DevSwitcher 필터)로 딥링크. VS Code 내장 키(`F5`, `Ctrl+Shift+B`)는 의도적으로 불간섭.
- **Stop 커맨드** — `DevSwitcher: Stop`(`Ctrl/Cmd+Alt+S`)으로 활성 프로젝트의 실행 중 태스크 종료 — 장시간 실행되는 `run`(개발 서버·워처)을 시작한 곳에서 그대로 중지.

#### 개선 사항 (Improvements)

- 없음

#### 버그 수정 (Bug Fixes)

- 없음

#### 알려진 이슈 (Known Issues)

- 없음 (CHANGELOG 기준 기록된 이슈 없음)

---

### v0.6.0 — 2026-08-17

#### 핵심 요약

- **Node.js / TypeScript 지원 — 6번째 언어(6개 언어 완성).**
- 관련 Milestone: MS-016 (Node/TS 어댑터 실구현)

#### 신규 기능 (Features)

- **Node.js/TypeScript 어댑터** — `package.json` 프로젝트가 스위처에 합류(빌드·실행·디버그).
  - **Script** 칩 — 프로젝트의 npm `scripts` 목록(실행 대상, 기본 선호 `start`/`dev`/`serve`).
  - **Package Manager** 칩 — lockfile로 npm / pnpm / yarn 자동 감지 + 수동 override.
  - **Run** = `<pm> run <script>`, **Build** = `<pm> run build`, run 인자는 `--` 뒤로 전달.
  - **Debug** — VS Code 내장 **js-debug**로 선택 스크립트 실행(추가 확장 설치 불필요).
  - 컴파일 옵션은 사용자의 `tsconfig.json`에 위치(무편집). `NODE_ENV` / `NODE_OPTIONS` / `NODE_PATH`는 설정 페이지 옵션으로 env 주입.
  - `DevSwitcher: New Project…`가 Node 프로젝트 스캐폴드(`package.json` + `index.js`). `package.json`은 절대 편집하지 않음.

#### 개선 사항 (Improvements)

- 없음

#### 버그 수정 (Bug Fixes)

- 없음

#### 알려진 이슈 (Known Issues)

- 없음 (CHANGELOG 기준 기록된 이슈 없음)

---

### v0.5.0 — 2026-08-17

#### 핵심 요약

- **Go 지원 — 5번째 언어.**
- 관련 Milestone: MS-015 (Go 어댑터 실구현)

#### 신규 기능 (Features)

- **Go 어댑터** — Go 모듈(`go.mod`)이 스위처에 합류(빌드·실행·디버그).
  - `go build` / `go run`은 Task API로 실행(셸 미사용, 자체 problem matcher).
  - **Target** 칩 — 모듈의 `main` 패키지 목록(1개면 자동 선택).
  - 디버그 — **delve** 사용(`golang.go` 확장, 필요 시 자동 설치).
  - 빌드 플래그 — `-ldflags`, `-gcflags`, `-tags`, `-race`, `-trimpath`, `CGO_ENABLED`를 설정 페이지 옵션으로 빌드 시 주입.
  - `DevSwitcher: New Project…`가 Go 모듈 스캐폴드(`go.mod` + `main.go`). `go.mod`는 절대 편집하지 않음.

#### 개선 사항 (Improvements)

- 없음

#### 버그 수정 (Bug Fixes)

- 없음

#### 알려진 이슈 (Known Issues)

- 없음 (CHANGELOG 기준 기록된 이슈 없음)

---

### v0.4.0 — 2026-08-17

#### 핵심 요약

- **Run Group** — 여러 프로젝트를 의존 순서대로 일괄 시작(예: `auth → api → web`).
- 관련 Milestone: MS-013 (Run Group, C-6)

#### 신규 기능 (Features)

- **Run Group** — 설정 페이지 **Run Groups** 탭에서 그룹 정의: 멤버 체크 + 멤버별 **Stage** 지정(같은 스테이지는 병렬, 높은 스테이지는 이전 스테이지의 프로세스 실행 후 대기). 그룹 버튼, 상태바 `$(run-all)` 런처, **`DevSwitcher: Run Groups…`**(+ **Stop all**)로 실행/중지. 개별 실행 중이거나 다른 그룹에서 실행 중인 멤버는 준비 완료로 간주해 skip. 이 버전의 준비 기준 = 프로세스 실행(포트/헬스체크 준비 감지는 이후 계획 → v0.8.0에서 구현).

#### 개선 사항 (Improvements)

- 없음

#### 버그 수정 (Bug Fixes)

- **설정 페이지 공백 렌더링** — 프로필 도움말 텍스트의 이스케이프되지 않은 아포스트로피가 webview 템플릿 리터럴에 삼켜져 인라인 스크립트 전체가 깨지던 문제 수정(0.3.0의 프로필 문구 변경 이후 잠복). webview 스크립트를 파싱하는 회귀 테스트 추가.

#### 알려진 이슈 (Known Issues)

- 없음 (CHANGELOG 기준 기록된 이슈 없음)

---

### v0.3.0 — 2026-08-17

#### 핵심 요약

- **C# · Python · C++(CMake) 실구현 — 4개 언어 완성.** 4개 언어가 상태바 스위처(전환/빌드/실행/디버그)를 공유하며 각각 자체 네이티브 CLI로 구동.
- 관련 Milestone: MS-010 (C#) · MS-011 (Python) · MS-012 (C++/CMake) — MS-009 일부(Extra rustflags) 반영

#### 신규 기능 (Features)

- **C# (.NET)** — `dotnet` 빌드·실행, coreclr 디버그, `-p:` 옵션 주입, Configuration / RID / target-framework 칩.
- **Python** — 인터프리터 실행 + `debugpy` 디버깅, Environment(venv/인터프리터) 칩과 스크립트 타깃 칩(빌드 단계 없음), `PYTHONPATH` / `PYTHONOPTIMIZE` / env 주입.
- **C++ (CMake)** — `cmake` 직접 구동(configure + build), CMake File API로 타깃·경로 해석, 컴파일러 기반 디버거 자동 선택(MSVC → cppvsdbg, GCC → gdb, Clang → lldb, `devSwitcher.cmake.debugger`로 override).
- **CMake presets** — `CMakePresets.json`이 있으면 **Preset** 칩이 프로필/아키텍처 칩을 대체하고 `cmake --preset`으로 configure — preset 선택만으로 컴파일러(MSVC / Clang-CL / GCC) 전환.
- **`DevSwitcher: Rescan Projects`** — 에디터 밖에서 폴더가 이동·변경됐을 때 강제 재스캔.
- **확장 아이콘** 추가 + 설정 페이지에 Rust용 "extra rustflags" 자유 입력 옵션.

#### 개선 사항 (Improvements)

- C#, Python, CMake 워크스페이스에서도 확장 활성화(기존 Cargo 전용).
- 디버그 확장을 툴체인별로 자동 선택하고 필요 시 자동 설치.

#### 버그 수정 (Bug Fixes)

- 설정 페이지 — preset 사용 CMake 프로젝트에서 Profile 탭 숨김(상태바와 일치), 프로필 섹션을 read-only by design으로 표기("편집 예정" 오해 제거).
- Python — Environment 칩의 인터프리터 중복 항목을 실경로 기준 중복 제거.
- 접근성 — 설정 webview 폼 컨트롤에 aria-label 부여.

#### 알려진 이슈 (Known Issues)

- 없음 (CHANGELOG 기준 기록된 이슈 없음)

---

### v0.2.0 — 2026-08-16

#### 핵심 요약

- **시작 마법사(F20)** — 폴더 → 언어 → 이름 플로우로 새 프로젝트 스캐폴드.
- 관련 Milestone: MS-008 (시작 마법사 F20)

#### 신규 기능 (Features)

- **`DevSwitcher: New Project…`** — Rust(`cargo new`)와 C#(`dotnet new console`)은 네이티브 스캐폴더 사용, C++(CMake)와 Python은 네이티브 도구가 없어 최소 템플릿 생성(`CMakeLists.txt` + `main.cpp` / `pyproject.toml` + `main.py`). 새 Rust 프로젝트는 상태바에 자동 선택되고, 다른 언어는 디스크에 생성된 뒤 해당 어댑터가 구현되면 스위처에 등장.

#### 개선 사항 (Improvements)

- 없음

#### 버그 수정 (Bug Fixes)

- **Features 칩** — 확인 버튼 없는 토글 리스트로 변경(클릭 즉시 적용), 개수 표시가 체크박스와 일치(빈 선택은 `none`으로 기본 on 상태와 구분). 의도적으로 빈 선택이 리로드 후에도 유지(기본값으로 리셋되지 않음).
- **untrusted workspace** — 빌드/실행/디버그(및 네이티브 프로젝트 생성)가 스피너 멈춤으로 행 걸리지 않고 "trust this workspace" 프롬프트를 표시. 프로세스를 스폰하지 못한 채 끝난 태스크가 run lock을 잠그지 못하도록 수정.

#### 알려진 이슈 (Known Issues)

- 없음 (CHANGELOG 기준 기록된 이슈 없음)

---

### v0.1.0 — 2026-08-16

#### 핵심 요약

- **첫 개인 릴리즈.** Rust(Cargo) 완전 구현, C++ · C# · Python은 선언 전용 어댑터 스텁으로 포함.
- 관련 Milestone: MS-001~MS-007 (M0 셋업 ~ M6 품질·배포)

#### 신규 기능 (Features)

- **상태바 UX** — 프로젝트·프로필·아키텍처(target triple)·features·실행 타깃 칩 + Build / Debug / Run 액션 버튼 + 설정 기어. 전부 각 어댑터의 `ChipDescriptor[]`만으로 렌더링.
- **Cargo 어댑터** — 프로젝트 스캔, Task API 기반 빌드/실행/디버그(셸 미사용), 실행 파일 해석, 자체 rustc problem matcher.
- **디버그** — CodeLLDB를 통한 LLDB 실행(없으면 자동 설치).
- **설정 페이지**(Webview) — 옵션 카탈로그 편집기, 호출 구성 오버레이(컴파일러 옵션·링커·출력 디렉터리·환경 변수)를 `Cargo.toml` 무편집으로 적용, 라이브 커맨드 프리뷰(env 주입 포함), pre/postBuild 이벤트.
- **프로필 export / import** — 선택 상태와 호출 구성 저장·복원.
- **Doctor** — 환경 진단(cargo, rustup, 필수 확장) + 툴체인 경고 칩 + 가이드 수정.
- **rustup target 자동 설치** — Architecture 칩에서 누락된 크로스 컴파일 타깃 바로 추가.
- **상태바 옵션** — `statusBar.compact`(아이콘 전용 칩), `statusBar.selectedOnly`(미선택 옵션 칩 숨김).

#### 개선 사항 (Improvements)

- 없음 (최초 릴리즈)

#### 버그 수정 (Bug Fixes)

- 없음 (최초 릴리즈)

#### 알려진 이슈 (Known Issues)

- 없음 (CHANGELOG 기준 기록된 이슈 없음)
