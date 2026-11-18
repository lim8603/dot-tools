# 처리 리포트 — 코드리뷰 이월 R-1~R-5 (세션 #023, 2026-11-18)

> 다음 세션에서 한 번에 리뷰하기 위한 문서다. 무엇을 왜 바꿨는지, 무엇으로 확인했는지, 무엇을 아직 확인하지 않았는지, 리뷰 때 정해 주실 것을 순서대로 적었다.

## 한눈에

- **위치:** 브랜치 `fix/review-backlog`. 커밋 6개(코드 5 + 문서 1). **main 미병합 · 미배포 · 원격 미푸시.**
- **범위:** 2026-11-18 코드리뷰(TASK-068) 36건 중 v1.3.3에 넣지 않은 18건(R-1~R-5). 모두 처리했고, 버리거나 다시 미룬 항목은 없다.
- **새 ADR 3개:** ADR-023(Node 셸 고정) · ADR-024(칩 조회 문맥 · CMake 구성 일관성) · ADR-025(멀티루트 프로젝트 id). ADR-016은 "일부 대체"로 표시했다.
- **검증:** unit 404 → **428** 통과. 통합 테스트는 단일 루트 **15** 통과 + 1 건너뜀(POSIX 전용), 새로 만든 멀티루트 호스트 **3** 통과. tsc · eslint 통과.
- **리뷰 때 정해 주실 것:** 아래 [결정 요청](#결정-요청)의 3가지.

## 커밋

| 순서 | 커밋 | 항목 | Task |
|---|---|---|---|
| 1 | `6eede7c` | R-1 Node 인자 인용(보안) | TASK-069 |
| 2 | `1742030` | R-4 어댑터 소결함 4건 | TASK-070 |
| 3 | `31d2bb7` | R-5 core · UI 7건 | TASK-071 |
| 4 | `c1b648e` | R-2 CMake 구성 일관성 | TASK-072 |
| 5 | `445be4a` | R-3 멀티루트 프로젝트 id | TASK-073 |
| 6 | (문서 커밋) | CHANGELOG `[Unreleased]` · 레지스트리 · EV-027 · KB · 이 리포트 | — |

---

## R-1 Node 실행 인자가 셸에서 해석되던 문제 (보안) — ADR-023

**리뷰 지적:** VS Code의 배열형 `ShellExecution`이 공백 없는 `&` · `|` · `%VAR%`를 인용하지 않는다(ADR-016 전제 의심).

**실측 결과(지적보다 범위가 달랐다).** Extension Host에서 어댑터의 실제 run 태스크를 cmd · Windows PowerShell 5.1 · Git Bash 각각으로, 13개 인자를 넣어 돌렸다.

| 인자 | 기존(배열형) | Strong 인용만 | **채택안** |
|---|---|---|---|
| `a\|b` | 3셸 모두 **파이프로 해석 = 명령 주입** | 통과 | 통과 |
| `%PATH%` | cmd에서 확장 | cmd에서 확장 | 통과 |
| `$HOME` | PowerShell · bash에서 확장 | 통과 | 통과 |
| `it's` · `q"uote` · 빈 인자 | 깨지거나 사라짐 | 일부 남음 | 통과 |
| `&` · `;` · `$()` · 백틱 | 주입 안 됨 | 통과 | 통과 |

**변경:** 셸을 확장이 고정한다(Windows `cmd.exe /d /s /c`, 그 외 `/bin/sh -c`). 명령줄은 `nodeShellCommand`가 직접 이스케이프한다. Windows 쪽은 npm 생태계가 `.cmd` 실행에 쓰는 cross-spawn 규칙을 쓴다.
- 결과: 13개 × 3셸 모두 통과했다. 통합 테스트 `nodeArgsQuoting.test.ts`가 회귀를 막는다.
- POSIX 규칙은 Git의 `sh`로 같은 13개를 확인했다.

**함께 종결:** pnpm · yarn의 `--` 전달 의심은 실측 결과 문제가 아니다(npm · pnpm 9/10 · yarn 1/4 모두 정상).

**사용자 영향:** Node 태스크에는 사용자의 터미널 셸 설정이 적용되지 않는다(CHANGELOG에 명시).

## R-4 어댑터 소결함 4건

| 항목 | 변경 | 근거 |
|---|---|---|
| Node 패키지 매니저(모노레포) | 패키지 폴더에서 워크스페이스 폴더까지 올라가며 가장 가까운 `packageManager` 필드 → lockfile 순으로 찾는다 | 결정: 명시 선언인 필드가 lockfile보다 우선 |
| Cargo 링커 · rustflags | 링커는 `--config target.'cfg(all())'.linker="…"`, 추가 플래그는 `--config target.'cfg(all())'.rustflags=[…]`. env에 `RUSTFLAGS`가 이미 있으면 기존처럼 덧붙인다 | cargo 1.99.1 실측: `RUSTFLAGS`가 프로젝트 config rustflags를 **대체**하고 공백 경로를 쪼갬. 실제 rustc 인자로 확인 |
| 프로필마다 기본값이 다른 옵션 | dotnet `Optimize`에 더해 **cargo `opt-level` · `codegen-units`도 같은 결함을 찾아 함께 고침**. 선택형은 `default`가 기본값(저장 안 함), 숫자는 빈칸이 미설정 | release에서 `0`을 고르면 "기본값"이라며 버려지던 문제 |
| VS 솔루션 Clean 플랫폼 | 멤버의 `Win32`를 솔루션의 `x86`으로 대응한다(반대 방향도) | **미실측**(MSBuild를 돌리지 않음) |

알려진 한계: `build.rustflags`만 쓰는 Rust 프로젝트는, 추가 rustflags를 넣으면 여전히 프로젝트 값이 빠진다. 기존과 같고 더 나빠지지는 않는다(cargo 규칙상 피할 수 없음).

## R-5 core · UI 7건

1. **겹치는 스캔 · 렌더:** 세대 번호를 붙여 나중에 시작한 쪽이 결과를 정한다. 스캔은 어댑터별로 병렬로 돌고, Doctor는 스캔 결과를 재사용한다.
2. **설정 패널:**
   - 편집 한 번에 상태를 한 번만 보낸다.
   - 늦게 도착한 오래된 상태는 버린다.
   - 패널을 닫은 뒤 나던 TypeError를 막았다.
   - 입력 중에 도착한 상태는 포커스가 빠질 때 반영한다.
   - **웹뷰 동작이라 수동 확인 필요.**
3. **빌드 이벤트 정책 일원화(결정):**
   - pre-build는 Build · Run · Debug · 그룹 멤버 모두 앞에서 돈다.
   - post-build는 그 흐름의 빌드가 성공한 뒤에 돈다. Run은 프로그램이 정상 종료된 뒤(기존 유지), Debug는 디버거 시작 전, 그룹 Run 멤버는 정상 종료 뒤다.
   - 그동안 그룹 멤버와 Debug에서는 빌드 이벤트가 전혀 돌지 않았다. UI 문구도 갱신했다.
4. **프로필 가져오기 확인(결정):** pre/post-build 명령이 들어 있으면 QuickPick으로 "포함 / 명령 빼고 / 취소"를 묻는다(D-26 원칙).
5. **폴더 추가 · 제거 시 재스캔.**
6. **Go 새 main 패키지(결정):** `.go` 파일의 **생성 · 삭제만** 감시한다(저장은 무시). 새 선택 필드 `LanguageAdapter.structureGlobs`를 두었다.
7. **CMake File API 반복 파싱:** 최신 index 파일 이름을 키로 캐시한다. VS의 `CMakeCache.txt` 검색에 스캔 제외 규칙을 적용했다. 순환 import를 피하려고 `excludeGlob`를 `core/workspaceExclude.ts`로 옮겼다.

## R-2 CMake 구성 일관성 — ADR-024

- **칩 조회 문맥:** `listItems` · `defaultValue`의 옵션을 `ChipQueryOptions { probe, selection, config }`로 넓혔다(선택 필드, 하위 호환). 코어 · UI는 값을 넘기기만 하고 해석은 어댑터가 한다.
- **Target 목록 = 빌드의 트리:** 리뷰 B2의 실패(Architecture x64 · Target 미설정 · 첫 Build에서 `-A` 충돌)를 통합 테스트로 재현했고 통과한다. 수정 전 실패는 리뷰어가 실측한 것이고, 이번에 다시 재지는 않았다.
- **빌드 폴더 위치(동작 변화):** 플랫폼을 고르면 `build/<platform>`, Host default는 `build/`. 기존에 x64로 빌드한 프로젝트는 `build/x64`에서 한 번 새로 configure된다.
- **지운 `-D`는 `-U`로 제거**한다(이번 세션에 configure한 트리만 해당). env 오버레이가 configure에도 가고, preset 경로도 `-D` 오버레이를 받는다. configure 실패 메시지에 cmake 오류 마지막 3줄을 붙인다.
- 실측: `-U` 뒤 캐시에서 값이 사라지는 것과 `--preset p -D …`가 적용되는 것을 진짜 cmake로 확인했다.

## R-3 멀티루트 프로젝트 id — ADR-025

- id 경로는 VS Code `asRelativePath(uri)` 기본 규칙을 따른다. **폴더가 둘 이상일 때만** `<폴더 이름>/` 접두사가 붙고, **단일 폴더 사용자는 바뀌지 않는다.**
- 저장 상태(선택값 · 오버레이 · 활성 프로젝트 · Run Group 멤버)는 reconcile 전에 새 id로 자동 이전한다.
  - 모호한 옛 id는 첫 폴더로 옮긴다(예전에 실제로 가리키던 곳).
  - 첫 후보에 이미 자기 상태가 있으면 옮기지 않는다. 처음 구현에는 이 경우 다른 폴더로 옮기는 결함이 있었는데 단위 테스트가 잡아서 고쳤다.
- **멀티루트 통합 테스트 호스트를 새로 만들었다**(`fixtures/multiroot`, 폴더 2개). 폴더별 id와 함께, v1.3.1 이후 자동 테스트 밖이던 폴더 단위 `scan.exclude`도 이제 확인된다.
- 한계: 이름이 같은 폴더 두 개는 구분하지 못한다(VS Code 자체 한계).

---

## 확인하지 않은 것 (리뷰 · 실사용 때 볼 것)

1. 설정 패널: 입력 중 배경 갱신이 와도 글자가 남는지(R-5-2).
2. 프로필 가져오기 확인 QuickPick의 모양과 동작(R-5-4).
3. Node **디버그** 경로(js-debug `runtimeExecutable`)의 인자 전달. 이번 수정은 run · build 태스크만 다룬다.
4. VS 솔루션 전체 Clean(Win32 멤버) 실제 MSBuild 실행.
5. CMake `build/<platform>` 전환 실사용(기존 x64 프로젝트에서 한 번 다시 configure되는지).
6. 멀티루트 실제 작업 공간에서 저장 상태가 이전되는지(단위 · 통합 테스트로는 확인함).
7. 패키징 · 격리 설치 스모크(릴리즈 단계에서).

## 결정 요청

1. **버전:** 권고는 **v1.4.0 하나로 묶어 배포**하는 것이다. 빌드 폴더 위치와 멀티루트 id가 바뀌어 동작 변화가 있어서 MINOR가 맞다. 처음에 말씀드린 "R-1 · R-4 · R-5는 패치, R-2 · R-3은 마이너"로 나누려면 브랜치를 쪼개야 하는데, 한 번에 리뷰하신다고 해서 한 브랜치에 모았다.
2. **Node 태스크의 셸 고정(ADR-023):** 사용자 터미널 셸 설정이 Node 태스크에 적용되지 않는 것을 받아들일지. 권고는 수용이다. 보안상 필요하고 태스크 출력은 그대로 보인다.
3. **빌드 이벤트 정책(R-5-3):** Debug와 그룹 멤버에도 pre/post-build를 돌리는 것. 권고는 수용이다. 설정 화면 문구가 원래 "build/run 전에 돈다"였다.

## 참고 위치

- 세션 로그 판정 · 결정 상세: `members/Seunghyun/workspace/session_logs/session_2026-11-18_023.md`(로컬 전용 · git 제외)
- ADR: `03_design_artifacts/adrs/ADR-023`~`025`
- 검증 기록: `05_verification/verification_evidence.md` EV-027
- 사용자용 변경 요약: `CHANGELOG.md` `[Unreleased]`
