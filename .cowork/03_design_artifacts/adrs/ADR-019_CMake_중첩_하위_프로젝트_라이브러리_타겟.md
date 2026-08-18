# ADR-019 — CMake 중첩 하위 프로젝트 + 라이브러리 타겟 모델

## ADR ID
`ADR-019`

## 제목
중첩 CMakeLists 프로젝트는 **project() 루트 = 최상위 항목("솔루션"), 타겟 선언 디렉토리 = 하위 프로젝트** 모델로 표시·조작한다(MS-021, v1.1.0). 하위 프로젝트는 **루트의 빌드 트리를 통해** configure/build 되며(`cmake --build <루트 build> --target <t>`), Target 칩은 File API `paths.source`로 **자기 디렉토리 이하의 타겟만** 스코프한다. 타겟 발견은 EXECUTABLE 전용 필터를 풀어 **라이브러리 타겟(STATIC/SHARED/MODULE/OBJECT)도 포함**하되, 라이브러리는 **빌드만 가능하고 실행/디버그는 차단**한다(Visual Studio 동작) — 차단 사유는 새 어댑터 훅 `validateAction`이 반환하고 오케스트레이터가 토스트로 표시한다(INV-2 유지). 노출 제어는 General 탭 옵션 `devSwitcher.projects.showLibraries`(기본 **보임**, Human 결정)로 한다.

## 상태
`Accepted`

## 날짜
2026-08-18

---

## ADR 필요성 판단

- 코어 계약 변경: `ProjectInfo.parentId`/`library`(additive), `LanguageAdapter.validateAction` 훅 신설 — 어댑터 6종·UI 전반에 영향을 주는 인터페이스 결정.
- 대안이 실재: "project() 있는 중첩만 하위" / "File API 타겟 단위 하위 항목" 두 대안을 Human 질의로 기각(세션 #016) — 근거를 남기지 않으면 재론된다.
- 실사용 피드백(회사 nested 프로젝트)이 직접 동기 — 재현 픽스처와 함께 기록한다.

---

## Context (맥락)

v1.0.0 실사용에서 두 격차가 확인됐다(세션 #016, Human 보고):

1. **중첩 CMakeLists 프로젝트가 최상위만 보인다.** 기존 `listProjects`(TASK-033)는 `project()` 없는 CMakeLists를 "add_subdirectory 잎"으로 간주해 전부 건너뛰었다. 실무 C++ 레포는 루트 `project()` 아래 `add_subdirectory`로 exe/lib 디렉토리를 붙이는 구조가 표준이라, 스위처가 트리의 실체(하위 exe 2개·lib 1개 등)를 전혀 보여주지 못했다.
2. **lib 타겟이 아예 안 보인다.** `readReplyDir`가 `type !== 'EXECUTABLE'`을 전부 걸러(TASK-033), lib만 빌드하고 싶은 워크플로가 불가능했다.

Visual Studio의 멘탈 모델(솔루션 = 루트, 프로젝트 = 타겟 디렉토리, lib 프로젝트는 시작 프로젝트로 실행 불가)이 Human의 기대 기준이다.

## Decision Drivers (결정 요인)

- **VS 유사 멘탈 모델** — Human 명시 요구("Visual Studio처럼").
- **한 루트 = 한 빌드 트리** — 하위 디렉토리 단독 configure는 project() 없인 불가하고, 있어도 트리가 이중으로 생긴다. 루트 트리 공유가 캐시·디스크·의미 모두 우월.
- **INV-2(어댑터 무지 UI)** — UI는 `parentId`/`library`라는 선언적 필드와 `validateAction`의 사유 문자열만 소비한다. CMake 지식이 코어/UI로 새지 않는다.
- **additive 계약** — 기존 5개 어댑터는 무변경(필드 생략 = 기존 동작).

## Considered Options (검토한 대안)

1. **타겟 선언 디렉토리 = 하위 프로젝트 (채택)** — add_executable/add_library를 선언한 모든 중첩 CMakeLists. project() 유무 무관, 최근접 루트에 귀속.
2. project() 있는 중첩만 하위 — 실무 레포의 다수 잎이 project() 없이 타겟만 선언 → 이번 피드백 사례가 해결되지 않음. 기각(Human).
3. File API 타겟 단위 하위 항목 — VS와 가장 유사하나 기존 Target 칩과 역할 중복·코어 구조 변경 대형화. 기각(Human).

## Decision (결정)

- **분류(순수)**: `classifyManifests`(cmakeBridge) — project() 선언 + project() 조상 없음 = **root**; 루트 아래에서 타겟 또는 project() 선언 = **sub**(최근접 루트 귀속); 그 외(타겟 없는 잎, 루트 없는 고아) 제외. add_library만 선언 = `library: true`.
- **코어**: `ProjectInfo.parentId?`/`library?`(additive) · `LanguageAdapter.validateAction?(action, project, sel, config) → Promise<string | undefined>`(사유 반환 시 오케스트레이터가 정보 토스트 후 중단; `prepareInvocation` 뒤 호출로 캐시 웜 보장).
- **하위 프로젝트 동작**: configure/build/preset 조회 전부 `rootSrcDirOf`(parentId의 `cmake:<rel>`에서 유도, 레지스트리 불필요) 기준. Target 칩은 `paths.source` 프리픽스 매칭으로 스코프. run cwd만 자기 디렉토리.
- **라이브러리 타겟**: `readReplyDir`가 EXECUTABLE + 4개 라이브러리 타입 유지(UTILITY/INTERFACE 제외), `CMakeTarget.type`·`sourceDir` 노출. Target 칩에 "static library" 등 주석. run/debug는 `validateAction`이 차단.
- **노출 옵션**: `devSwitcher.projects.showLibraries`(기본 true). off 시 프로젝트 퀵픽에서 lib-only **하위**만 숨김(루트는 항상 표시), Target 칩에서 lib 타겟 숨김(단 lib-only 프로젝트는 자기 타겟 유지 — 칩이 비면 빌드 불가).
- **표시**: 퀵픽·설정 Project 카드·설정 드롭다운 모두 `core/projectTree.orderByHierarchy`로 루트 직후 하위 배치 + 인덴트(↳) + library 배지.

## Consequences (결과)

- (+) 실무 중첩 레포가 VS 솔루션 뷰처럼 표시되고, lib만 빌드하는 워크플로가 생긴다.
- (+) 코어 변경이 additive라 타 어댑터 무영향; Node 모노레포 workspaces 등이 같은 `parentId`를 재사용할 수 있다.
- (−) 루트/하위가 각자 profile 칩을 가지므로 서로 다른 빌드 타입 선택 시 같은 트리가 재-configure된다(시그니처 캐시가 교대 비용을 관리; VS의 구성 전환과 동일한 의미라 수용).
- (−) 하위 프로젝트 id(`cmake:<rel>`)가 신규 발급되므로 기존 저장 선택과는 별개 항목이다(루트 id는 불변 — 마이그레이션 불필요).

## 관련
- ADR-014(CMake 자체 CLI + File API) · ADR-013(파일 무편집) · D-24(세션 #016 Human 3결정: 타겟 선언 디렉토리 / 기본 보임 / v1.1.0 단일 릴리즈)
- 픽스처: `src/test/fixtures/cmake/nested/` (exe 2 + static lib 1, 루트 무타겟)
