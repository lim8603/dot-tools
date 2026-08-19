# ADR-021 — Visual Studio(.sln/.vcxproj) 어댑터: MSBuild 직접 구동

## ADR ID
`ADR-021`

## 제목
7번째 어댑터 **`vs` — C++ (Visual Studio)**를 추가한다(MS-022, v1.2.0). MSBuild를 확장이 직접 구동하며(`vswhere` → MSBuild.exe 발견), 감지 대상은 **`.vcxproj`(C++)만**이다 — `.sln`/`.slnx`는 계층 루트("솔루션")로만 쓰고, 솔루션 안의 `.csproj`는 기존 dotnet 어댑터 소유를 유지한다(A안). **CMake가 생성한 .sln/.vcxproj는 같은/상위 디렉토리의 `CMakeCache.txt` 마커로 제외**해 CMake 어댑터와의 중복 감지를 차단한다. 어댑터는 실질적으로 **Windows 전용**이다(비-Windows에선 Doctor ❌).

## 상태
`Accepted`

## 날짜
2026-08-19

---

## Context (맥락)

Human 요구(세션 #017): "Visual Studio 프로젝트도 대응 가능한지? 기존 C++ CMake와 충돌 없을지? 같은 폴더에 공존하면?" — 타당성 검토 결과 어댑터 아키텍처(독립 글롭 감지·id 네임스페이스 분리)상 구조적 충돌은 없으나, **CMake VS 제너레이터가 빌드 트리에 .sln/.vcxproj를 생성**하므로(자체 픽스처 `fixtures/cmake/hello/build/`가 실증 — ZERO_CHECK·ALL_BUILD·hello.slnx) 순진한 `**/*.vcxproj` 글롭은 스위처를 범람시킨다(.vscode-test package.json 범람과 동일 실패 모드). 또 혼합 솔루션(.sln에 .vcxproj+.csproj)에서는 dotnet 어댑터(`**/*.csproj`)와의 이중 등장 문제가 있다.

## Decision (결정)

- **감지·제외**: 글롭 `**/*.sln`·`**/*.slnx`·`**/*.vcxproj`. listProjects에서 워크스페이스의 `CMakeCache.txt` 위치를 1회 수집해, **마커 디렉토리(및 하위)에 있는 매니페스트는 전부 제외**(순수 필터 `filterGeneratedManifests` — 단위 테스트 가능). CMake 빌드 트리의 생성물은 CMake 어댑터가 계속 소유한다.
- **.csproj 경계(A안)**: vs 어댑터는 `.vcxproj`만 프로젝트로 만든다. 솔루션 파싱 시 `.csproj` 항목은 무시 — dotnet 어댑터가 기존대로 감지·빌드·디버그. 혼합 솔루션의 C# 프로젝트는 솔루션 트리 밖 평면 dotnet 항목으로 표시(수용된 트레이드오프).
- **계층(ADR-019 재사용)**: `.sln`/`.slnx` = 루트 ProjectInfo("솔루션", VS 솔루션 뷰 멘탈 모델), 솔루션이 참조하는 `.vcxproj` = 하위(`parentId`). 어느 솔루션에도 속하지 않는 `.vcxproj`는 독립 최상위. `ConfigurationType`이 Application이 아닌 프로젝트는 `library: true` + `validateAction` veto("built, but not run").
- **칩**: **profile = Configuration**(vcxproj `ProjectConfigurations` 파싱, 기본 Debug) · **architecture = Platform**(x64/Win32/ARM64, 기본 x64). Target 칩 없음 — 프로젝트 단위가 이미 vcxproj라 CMake의 타겟 축이 불필요. 솔루션 루트 build = 전체 빌드, 루트 run/debug는 validateAction이 "하위 프로젝트를 고르라" 안내.
- **빌드**: `vswhere.exe`(고정 설치 경로 `%ProgramFiles(x86)%\Microsoft Visual Studio\Installer`)로 MSBuild.exe 발견(캐시), PATH msbuild 폴백. `MSBuild <sln|vcxproj> /p:Configuration /p:Platform /m` — ProcessExecution 셸無(NFR-002)·`$msCompile` 매처. 오버레이 주입은 env·runArgs·buildEvent만(v1).
- **실행 경로**: `msbuild -getProperty:TargetPath`(평가 전용, MSBuild 17.8+ — dotnet 어댑터의 `-getProperty` 검증 기법 재사용)로 exe 절대경로 해석, (proj×cfg×platform) 캐시. sync `createRunTask`는 `prepareInvocation`이 워밍한 캐시를 peek(CMake 동형).
- **디버그**: MSVC 고정이므로 `cppvsdbg`(ms-vscode.cpptools) — CMake의 컴파일러 자동판별 불필요, `ensureExtension` 동적 설치 유도.
- **Windows 전용**: 비-Windows에선 vswhere/msbuild 프로브 실패 → Doctor ❌(critical). 어댑터 등록 자체는 전 플랫폼 동일(감지될 일이 사실상 없음).
- **파서 방침**: `.sln`(텍스트)·`.slnx`(XML)·`.vcxproj`(XML)는 정규식 기반 경량 추출(Project 항목·ProjectConfigurations·ConfigurationType) — 외부 XML 라이브러리 금지(ADR-009, Node 내장만). 전량 순수 함수로 vsBridge에 격리.

## Consequences (결과)

- (+) CMake 없이 .sln/.vcxproj만 있는 레거시/VS 네이티브 프로젝트도 상태바 UX로 빌드·실행·디버그.
- (+) CMake·dotnet 어댑터와 감지 영역이 겹치지 않음(마커 제외 + A안) — 기존 6개 언어 무변경(additive).
- (−) 혼합 솔루션의 C# 프로젝트가 솔루션 계층 밖에 표시된다(A안 트레이드오프, 기능 손실은 없음).
- (−) `-getProperty`는 MSBuild 17.8(VS2022 17.8)+ 요구 — 구버전 VS는 실행 경로 해석 실패 시 안내 에러(E6). 빌드 자체는 구버전에서도 동작.
- (−) 정규식 파싱은 비정형 sln/vcxproj(조건부 ProjectConfigurations 등)에서 항목을 놓칠 수 있다 — v1 수용, 실사용 피드백으로 보강.

## 관련
- ADR-019(계층·library·validateAction 재사용) · ADR-009(외부 의존 금지) · ADR-014(어댑터가 툴체인 직접 구동 선례) · ADR-013(파일 무편집)
- 세션 #017 타당성 검토 · D-25(Human 승인: 마커 제외·A안·Windows 전용) · MS-022 / TASK-063
