# ADR-023 — Node 스크립트 실행: 셸을 고정하고 명령줄을 직접 이스케이프한다

## ADR ID
`ADR-023`

## 제목
Node.js / TypeScript 어댑터의 build/run Task는 셸을 **확장이 고정**(Windows `cmd.exe /d /s /c`, 그 외 `/bin/sh -c`)하고, `<pm> run <script> -- <args>` 명령줄을 **확장이 직접 이스케이프**한 단일 문자열로 `ShellExecution`에 넘긴다. ADR-016의 "배열형 ShellExecution + VS Code 인자별 인용" 결정 중 **인용 방식 부분을 대체**한다(셸 경유 자체는 유지).

## 상태
`Accepted`

## 날짜
2026-11-18

---

## Context (맥락)

ADR-016은 npm/pnpm/yarn이 Windows에서 `.cmd` 심이라 셸 경유가 불가피하다고 보고, VS Code의 배열형 `ShellExecution`이 인자를 개별 인용하므로 셸 주입 표면이 없다고 판단했다.

2026-11-18 코드리뷰(TASK-068 C6)가 그 전제를 의심했고, 세션 #023에서 **실측**했다. 어댑터의 실제 run 태스크를 Extension Host에서 실행하고, VS Code 자동화 셸을 cmd · Windows PowerShell 5.1 · Git Bash로 바꿔 가며 13개 인자의 전달 결과를 비교했다.

| 인자 | 배열형(기존) | 배열형 + `ShellQuoting.Strong` | 셸 고정 + 자체 이스케이프 |
|---|---|---|---|
| `a\|b` | 3셸 모두 **파이프로 해석**(오른쪽을 명령으로 실행) | 통과 | 통과 |
| `%PATH%` | cmd에서 확장 | cmd에서 확장 | 통과 |
| `$HOME` | PowerShell · bash에서 확장 | 통과 | 통과 |
| `it's` | PowerShell · bash 실패 | PowerShell · bash 실패 | 통과 |
| `q"uote` | 3셸 모두 깨짐 | cmd · PowerShell 깨짐 | 통과 |
| `''`(빈 인자) | 3셸 모두 사라짐 | PowerShell에서 사라짐 | 통과 |
| `&` · `;` · `$()` · 백틱 | 통과 | 통과 | 통과 |

즉 기존 방식은 **명령 주입(`|`)과 변수 확장이 실제로 가능**했다. VS Code의 인자 인용은 공백이 있을 때 위주로 동작하고, 셸마다 이스케이프 규칙이 다르며, 어떤 셸이 쓰일지는 사용자의 터미널 프로필에 달려 있다.

## Decision (결정)

1. 셸은 확장이 고른다: Windows는 `%ComSpec%`(없으면 `cmd.exe`)에 `/d /s /c`, 그 외는 `/bin/sh -c`. `ShellExecution`의 `executable` · `shellArgs` 옵션으로 지정한다.
2. 명령줄은 순수 함수 `nodeShellCommand`(`nodeBridge.ts`)가 만든다.
   - Windows: npm 생태계가 `.cmd` 실행에 쓰는 cross-spawn 규칙. 인자마다 MSVCRT 인용(따옴표 앞 역슬래시를 두 배로, 따옴표 이스케이프, 전체를 따옴표로 감쌈) 뒤 cmd 메타문자(`()[]%!^"\`<>&|;, *?`)를 `^`로 **두 번** 이스케이프한다(`.cmd` 심이 한 번 더 파싱하므로). 명령줄 전체는 `"…"`로 감싸 `/s /c`가 바깥 따옴표만 벗기게 한다.
   - POSIX: 각 토큰을 작은따옴표로 감싸고, 안의 `'`는 `'\''`로 바꾼다.
3. 셸 경유 이유(`.cmd` 심, Node 24 EINVAL)와 NFR-002의 문서화된 예외 지위는 ADR-016 그대로 유지한다.

## 결과

- 13개 인자 × 3개 프로필 모두 인자가 그대로 전달되고 주입 흔적이 없다(통합 테스트 `nodeArgsQuoting.test.ts`가 회귀 가드). POSIX 규칙은 Git의 `sh`로도 같은 13개를 확인했다.
- 패키지 매니저의 `--` 전달은 npm · pnpm 9/10 · yarn 1/4에서 모두 인자를 그대로 넘긴다(실측). yarn 1은 "앞으로는 `--`도 그대로 넘기겠다"는 경고만 낸다.
- 사용자의 터미널 셸 설정이 Node 태스크에는 적용되지 않는다. 태스크 출력은 전과 같이 터미널 패널에 보인다.
- 미확인: 디버그 경로(js-debug `runtimeExecutable`)는 js-debug가 직접 실행하므로 이 ADR 범위 밖이며, 별도로 재지 않았다.

## 대안

- **배열형 + `ShellQuoting.Strong`**: `|`와 PowerShell · bash 확장은 막지만 cmd `%` 확장, `'` · `"` · 빈 인자가 남는다(실측). 기각.
- **사용자 셸을 읽어 셸별 이스케이프**: `automationProfile` · `defaultProfile` 해석을 VS Code와 똑같이 재현해야 해서 깨지기 쉽다. 기각.
- **ProcessExecution으로 패키지 매니저의 JS 진입점 직접 실행**: npm · pnpm · yarn의 설치 위치 · 버전별 진입점을 찾아야 한다. 기각.

## 관련

ADR-016(부분 대체), NFR-002 · NFR-002b, TASK-069(R-1), 세션 #023.
