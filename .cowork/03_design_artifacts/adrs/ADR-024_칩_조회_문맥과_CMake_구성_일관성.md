# ADR-024 — 칩 조회 문맥(selection·config)과 CMake 구성 일관성

## ADR ID
`ADR-024`

## 제목
칩의 `listItems` · `defaultValue`가 받는 옵션을 `ChipQueryOptions { probe?, selection?, config? }`로 넓혀, 코어 · UI가 프로젝트의 현재 칩 값과 호출 구성 오버레이를 넘긴다. CMake 어댑터는 이 문맥이 있으면 **빌드가 쓸 바로 그 트리**(선택된 preset, 플랫폼별 빌드 폴더, 오버레이 옵션)에서 Target 목록을 얻는다. 같은 결정에 CMake 구성 일관성 네 가지를 묶는다.

## 상태
`Accepted`

## 날짜
2026-11-18

---

## Context (맥락)

2026-11-18 코드리뷰(TASK-068, B2 · B7 · B8 · B9)가 CMake 구성의 불일치를 실측했다.

1. **Target 칩이 선택을 모른다(B2).** `listItems(project, {probe})`에는 선택값이 없어서, Target 목록은 첫 preset · 기본 `build/` · 빈 옵션으로 configure했다. 그래서 Architecture를 x64로 두고 Target이 비어 있는 상태에서 Build를 누르면, 먼저 `-A` 없이 `build/`가 configure되고, 이어 빌드 쪽이 `-A x64`로 다시 configure하다 cmake가 "Does not match the platform used previously"로 실패했다(리뷰어 실측).
2. **플랫폼 전환 · 지운 플래그가 트리에 남는다(B8).** configure는 `-A` · `-D`를 더하기만 해서, 지운 오버레이 플래그는 캐시에 남고 같은 트리에서의 플랫폼 전환은 cmake가 거부한다.
3. **configure가 오버레이를 일부 무시한다(B9).** env 오버레이(CC/CXX 등)가 configure 프로세스에 가지 않았고, preset 경로는 컴파일러 · 링커 오버레이를 버렸다.
4. **configure 실패 이유가 보이지 않는다(B7).** stderr가 `Error.cause`에만 있고 읽는 곳이 없었다.

## Decision (결정)

1. **칩 조회 문맥.** `ChipQueryOptions`에 `selection?: Selection` · `config?: InvocationConfig`를 둔다(선택 필드, 하위 호환). 코어(`orchestrator` · `groupOrchestrator`) · UI(`picks` · `settingsPanel`)는 프로젝트의 현재 값을 넘기기만 한다. 해석은 어댑터 몫이다(INV-2: UI는 언어를 모른다). 문맥이 없으면 어댑터는 예전처럼 답한다.
2. **CMake Target 목록 = 빌드의 트리.** 문맥이 있으면 probe가 켜진 조회는 `configuredTargets`(빌드 · 디버그가 쓰는 바로 그 경로)를 쓰고, probe가 꺼진 조회는 같은 트리를 configure 없이 읽는다(`buildTreeFor` → `targetsIfConfigured`).
3. **플랫폼별 빌드 폴더.** 오버레이 출력 폴더가 없을 때 빌드 트리는 `build/`(Host default) 또는 `build/<platform>`이다. 플랫폼마다 트리가 달라 `-A` 충돌이 생기지 않고, `build/` 아래라 사용자의 `.gitignore` 범위를 벗어나지 않는다.
4. **지운 `-D`는 `-U`로 제거.** 이번 세션에 그 트리를 configure한 서명과 비교해, 빠진 오버레이 키는 `-U <KEY>`로 캐시에서 지운다(실측: `-U FOO` 뒤 캐시에서 사라짐). 세션을 넘긴 트리는 이전 서명을 모르므로 대상이 아니다.
5. **configure에 오버레이 전부.** env 오버레이를 configure 프로세스에 넘긴다. preset 경로도 `cmake --preset <name> -D …`로 컴파일러 · 링커 오버레이를 적용한다(실측: `--preset p -D FOO=…` 적용). preset 서명에 `-D`가 들어가 바뀌면 다시 configure한다.
6. **실패 이유 노출.** configure 실패 메시지에 stderr 마지막 세 줄(최대 400자)을 붙인다.

## 결과

- 리뷰 B2의 실패 상황(x64 · Target 미설정 · 첫 Build)을 통합 테스트로 재현해 통과를 확인했다. `build/x64`만 `-A x64`로 한 번 configure되고, 플랫폼 없는 트리는 생기지 않는다. 수정 전 실패는 리뷰어 실측이며 이번 세션에서 다시 재지 않았다.
- 기존 x64 사용자의 트리는 `build/`에서 `build/x64`로 옮겨 한 번 새로 configure된다. 예전 `build/`는 남는다(Delete Build Tree로 정리).
- Host default 트리(`build/`)를 Delete Build Tree로 지우면 그 아래 `build/<platform>`도 함께 지워진다.

## 대안

- **CMake 어댑터가 마지막 prepareInvocation의 선택을 기억**: 칩 조회가 오래된 선택을 쓸 수 있고, 한 번도 빌드하지 않은 프로젝트에서는 효과가 없다. 기각.
- **플랫폼이 바뀌면 CMakeCache.txt 삭제**: 사용자가 만든 트리일 수 있어 파괴적이다. 기각.
- **`build-<platform>` 형제 폴더**: 사용자 `.gitignore`가 보통 `build/`만 덮어, 저장소에 추적되지 않은 파일이 생긴다(v1.2.1이 막은 종류). 기각.

## 관련

ADR-003(칩 배열), ADR-014(CMake CLI 구동), ADR-019, TASK-072(R-2), 리뷰 B2 · B7 · B8 · B9, 세션 #023.
