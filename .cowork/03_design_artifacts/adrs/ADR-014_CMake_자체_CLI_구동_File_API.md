# ADR-014 — CMake 어댑터는 자체 `cmake` CLI를 구동한다 (CMake Tools 확장 미위임)

## ADR ID
`ADR-014`

## 제목
C++(CMake) 어댑터는 스위치/빌드/실행/디버그를 **`cmake` CLI를 직접 구동**해 구현한다(cargo/dotnet/python 선례). CMake Tools 확장(`ms-vscode.cmake-tools`)에 위임하지 않는다. configure/build 2단계는 `cmake -S -B -D …`(configure) + `cmake --build --target [--config]`(build)로 표현하고, 타깃·실행 경로는 **CMake File API(codemodel-v2)** 로 해석한다(경로 추측 없음). 디버그만 디버거 확장(cpptools/CodeLLDB)에 의존하며, 이에 따라 `requiredExtensions`를 `ms-vscode.cmake-tools`에서 디버거 확장으로 교체한다.

## 상태
`Accepted`

## 날짜
2026-08-16

---

## ADR 필요성 판단

- 제약·확장성: 한 언어 전체의 실행 모델(도구 위임 vs 자체 구동)을 장기적·불가역적으로 규정한다. 오버레이 주입 지점(§8 2단계)과 확장 의존 구조를 결정한다.
- 운영 영향: 코어 기능(빌드/실행)이 외부 확장에 하드의존하는지 여부를 가른다.
- 두 축 이상이 얽히고 되돌리기 어려운 결정 → ADR로 남긴다.

---

## Context (맥락)

MS-012에서 CMake 어댑터를 스텁에서 실구현으로 전환한다. cmake는 **configure/build 2단계**라 단일 빌드 시점의 cargo와 주입 지점이 다르다(interface_contract §8 note). 스텁의 `requiredExtensions`는 `ms-vscode.cmake-tools`로 선언되어 있었으나, 이는 초기 설계 가정일 뿐 실구현 방식을 확정한 것은 아니다.

이미 cargo(§8), dotnet(`msbuild -getProperty`/`-p:`), python(인터프리터 직접 실행) 세 어댑터가 **"vscode-free 브리지 + 얇은 vscode 배선 + ProcessExecution(셸無) + 호출시 오버레이 주입 + 실 빌드출력에서 실행경로 해석(DD-05/KB #8)"** 패턴을 확립했다. CMake도 같은 틀에 맞출 수 있는지, 아니면 CMake Tools 확장에 위임할지가 이 ADR의 쟁점이다.

interface_contract §8은 CMake 주입을 이미 규정한다: 구성축=`CMAKE_BUILD_TYPE`/`--config`, 컴파일러=`-D CMAKE_CXX_FLAGS[_<CFG>]`, 링커=`-D CMAKE_EXE_LINKER_FLAGS`, 인클루드=`-D` 일부 주입. 이 주입 모델은 **호출 시점 `-D` 주입**을 전제하므로 자체 CLI 구동과 자연스럽게 맞물린다.

---

## Decision Drivers (결정 요인)

- 아키텍처 일관성 — cargo/dotnet/python과 동일 패턴(자체 CLI·셸無·호출시 주입)으로 UI/오케스트레이터 무변경(INV-2).
- 파일 무편집 불변식(ADR-013) — `-D`를 configure에 주입할 뿐 CMakeLists.txt를 편집하지 않는다. CMake Tools 위임은 확장 설정(`cmake.configureSettings`) 경유라 상태 소유가 이원화된다.
- 경로 정확성(KB #8/DD-05) — File API codemodel의 `artifacts` 경로를 읽어 실 빌드출력과 100% 정렬(추측 없음). 멀티구성 제너레이터의 `<config>/` 하위 폴더 문제를 원천 회피.
- 의존 최소화(ADR-009) — 빌드/실행은 확장 무의존, 디버그만 디버거 확장 온디맨드. 코어 기능이 확장 부재로 막히지 않는다.

---

## Options Considered (검토한 옵션)

### Option A: CMake Tools 확장(`ms-vscode.cmake-tools`)에 위임
- 장점: kit/generator 선택·타깃 탐색·디버그를 성숙한 확장이 처리. 사용자가 이미 쓰는 경우 친숙.
- 단점: 코어 기능(빌드/실행/디버그)이 확장에 하드의존. 오버레이 주입이 확장 설정 경유라 "파일/설정 무편집"(ADR-013) 원칙과 충돌·상태 이원화. 확장 명령/API 표면이 제한적·불안정. cargo/dotnet/python과 다른 패러다임 → 어댑터 계약 이질.

### Option B: 자체 `cmake` CLI 구동 + CMake File API — 채택
- 장점: 세 언어 선례와 동일 패턴. `-D`/`--config` 호출시 주입 = §8 그대로. File API로 타깃·경로 정확 해석. 빌드/실행 확장 무의존. ADR-013 유지.
- 단점: 타깃/구성 탐색을 직접 구현(File API JSON 파싱). configure/build 2단계·제너레이터별 차이를 어댑터가 흡수해야 함. 로컬에 cmake 미설치 시 실 스모크 불가(검증 전략에 영향).

---

## Decision (결정)

**Option B** — 자체 `cmake` CLI 구동. 세부:

- **configure**: `cmake -S <srcDir> -B <buildDir> -D CMAKE_BUILD_TYPE=<cfg> -D <오버레이 -D 플래그…>`. 오버레이(컴파일러/링커/인클루드)는 이 시점에 `-D`로 주입.
- **build**: `cmake --build <buildDir> --target <target> [--config <cfg>]`(멀티구성 제너레이터는 `--config`). ProcessExecution·셸無(NFR-002).
- **타깃/실행경로 해석**: **CMake File API** — configure 전 `<buildDir>/.cmake/api/v1/query/`에 codemodel-v2 쿼리를 쓰고, configure 후 `reply/`의 codemodel + target JSON에서 실행 타깃(type=EXECUTABLE)과 `artifacts` 경로를 읽는다. resolveExecutable은 이 경로를 반환(추측 없음, KB #8).
- **구성 칩(profile)**: 표준 build type(Debug/Release/RelWithDebInfo/MinSizeRel) 정적 목록(dotnet Debug/Release 방식). 커스텀은 후속.
- **buildDir**: 기본 `build/`(옵션 카탈로그 `build-dir`로 오버레이 가능, output 카테고리).
- **디버그 (TASK-035 확정)**: 디버거는 **컴파일러 강결합**이라 File API `toolchains`의 `CMAKE_CXX_COMPILER_ID`로 **자동판별** — MSVC→`cppvsdbg`, GNU→`cppdbg`+gdb, Clang→`cppdbg`+lldb (모두 cpptools). OS 추측 아닌 실 컴파일러 기반이라 **WSL/MinGW/Linux/Mac 자동대응**. 사용자 **override 설정**(`devSwitcher.cmake.debugger`=auto/cpptools/codelldb)으로 CodeLLDB(`lldb`)까지 선택. **CMake Tools 미사용.**
- **run (TASK-035 확정)**: 단일 명령이 없어 **build-then-exec** — `ActionCapabilities.runRequiresBuild`로 오케스트레이터가 build 후 산출 exe 직접 실행(디버거 무의존, ADR-009). 경로=File API artifact(`peekArtifact` 동기 캐시).
- **requiredExtensions**: `ms-vscode.cmake-tools` → **`[]`**(빌드/실행 무의존). 디버거 확장은 정적 배열이 아니라 **동적**(판별된 cpptools/CodeLLDB를 `createDebugConfig`가 `ensureExtension`).
- **CMakePresets.json (TASK-041 확정)**: 실 프로젝트는 컴파일러/제너레이터/빌드타입을 **프리셋**으로 관리한다(GCC/Clang/MSVC 전환). `CMakePresets.json`(+`CMakeUserPresets.json`)의 `configurePresets`를 **읽기 전용**(ADR-013)으로 파싱해 **Preset 칩**으로 노출하고, `cmake --preset <name>`로 configure한다. 프리셋 활성 시 `ChipDescriptor.appliesTo`로 **Preset 칩이 profile/architecture 칩을 대체**(프리셋이 세 축을 인코딩)하며, `--config`를 생략하고 configure는 프리셋의 `binaryDir`(`${sourceDir}`/`${presetName}` 매크로 확장·`inherits` 상속 해소)로 향한다. 프리셋 없으면 현행 `-S -B -D` 폴백. **target 칩·디버거 자동판별(File API)은 프리셋의 binaryDir에서 그대로 재사용.** 프리셋 파싱은 vscode-free 순수 함수(`parseConfigurePresets`/`resolvePresetBinaryDir`), 파일 읽기는 `workspace.fs`(원격 안전, ADR-008). 동기 build/run Task는 `prepareInvocation`이 데운 프리셋 캐시를 peek.

## Consequences (결과)

### 긍정적
- 4개 어댑터가 단일 패턴으로 수렴 → UI/오케스트레이터·설정 페이지 무변경으로 CMake 등장(INV-2 재확인, Python 리트머스 이어 C++도 무편집 검증).
- File API 기반 경로 해석으로 멀티구성 제너레이터 하위폴더 문제·경로 추측 제거.
- 빌드/실행 확장 무의존 → 진입 장벽·실패 지점 감소.

### 부정적 / Trade-off
- CMake Tools의 kit/generator 자동 선택을 못 쓴다 → 기본 제너레이터·기본 buildDir 가정으로 시작하고, 필요한 축만 칩/오버레이로 노출(v1 범위 관리).
- File API JSON 파싱·2단계 흡수 코드를 직접 유지해야 한다.
- **로컬 cmake 미설치**(2026-08-16 확인) → MS-010/011식 실 스모크가 불가. 순수 helper 단위테스트 + File API 픽스처(reply JSON 샘플) 기반 검증으로 대체하고, 실 configure/build/F5는 cmake 설치 환경에서 수행한다.

---

## 관련 문서

| 항목 | 참조 |
|------|------|
| 관련 Intent | INT-001 |
| 관련 Milestone | MS-012 (TASK-033~035·041) |
| 관련 ADR | ADR-005/KB #8(빌드출력 경로 해석), ADR-013(파일 무편집), ADR-009(의존 온디맨드), ADR-003(선언적 칩) |
| 관련 계약 | interface_contract.md §8(CMake 주입 매트릭스) |
| 출처 | 세션 #008 논의 (2026-08-16), Human 승인 |
