# ADR-016 — Node 스크립트는 배열형 ShellExecution으로 실행 (NFR-002 문서화된 예외)

## ADR ID
`ADR-016`

## 제목
Node.js / TypeScript 어댑터(MS-016)의 build/run Task는 **배열형 `ShellExecution`**(`new vscode.ShellExecution(pm, args, options)`)으로 npm 스크립트를 실행한다. 기존 5개 언어가 쓰는 `ProcessExecution`(셸 無, NFR-002)이 아니라 **셸을 경유**하는데, npm/pnpm/yarn이 Windows에서 `.cmd` 심(shim)이라 셸 없이는 spawn 불가하기 때문이다(Node 24는 `.cmd`의 셸-less spawn을 `EINVAL`로 거부 — CVE-2024-27980 완화책). 배열형 ShellExecution은 **인자를 VSCode가 개별 인용**하므로 셸 인젝션 표면이 없어, NFR-002의 실질 보안 목표(인젝션 차단)를 인자 배열 인용으로 보존한다. 따라서 이 결정은 **NFR-002의 문서화된 예외**이며 NFR-002a(빌드 전/후 이벤트의 ShellExecution 허용)와 같은 성격이다.

## 상태
`Accepted`

## 날짜
2026-08-17

---

## ADR 필요성 판단

- 보안: **Canonical 보안 요구(NFR-002)** 의 실행 프리미티브를 한 어댑터에서 변경한다. 인젝션 차단이라는 보안 목표를 어떤 메커니즘으로 지키는지를 규정한다.
- 제약·운영 영향: npm 실행은 `.exe`가 아닌 `.cmd` 심을 거치는 근본적으로 다른 실행 경로다. 이후 Node/TS 디버그·Run Group 멤버 실행도 이 선례를 따른다.
- 보안 축이 얽히고 되돌리기 어려운 선례 → ADR로 남긴다.

---

## Context (맥락)

기존 5개 언어(cargo·dotnet·go·python·cmake)는 모두 실제 실행 파일(`cargo.exe`·`dotnet.exe`·`go.exe`·`python.exe`·`cmake.exe`)을 호출하므로 [`ProcessExecution`](../../../src/core/taskRunner.ts)(셸 無, 배열 인자)로 문제없이 spawn된다 — NFR-002가 요구하는 형태다.

그러나 Node 프로젝트의 "무엇을 실행할지"는 **npm 스크립트**(`package.json`의 `scripts`)이고(설계 확정 ①, 세션 #013), 이를 실행하는 패키지 매니저(npm/pnpm/yarn)는 **Windows에서 실행 파일이 아니라 `.cmd` 배치 심**이다. `.cmd`는 PE 실행 파일이 아니라 콘솔 호스트(`cmd.exe`)를 거쳐야 실행되므로, 셸 없는 spawn으로는 실행할 수 없다.

**실측(2026-08-17, 세션 #013)**: Node 24(v24.18.0)에서 `child_process.execFile('npm.cmd', args, { shell: false })`는 `spawn EINVAL`로 실패한다. 이는 CVE-2024-27980(BatBadBut) 완화책으로 Node가 `.bat`/`.cmd`의 셸-less spawn을 차단했기 때문이다. 즉 `ProcessExecution('npm.cmd', …)`(셸 無)로는 npm 스크립트를 실행할 수 없다.

동시에 NFR-002의 실질 목표는 **셸 인젝션 차단**(사용자·외부 입력이 셸 명령줄에 주입되지 않게)이다. 이 목표는 "ProcessExecution 사용" 자체가 아니라 "인자를 배열로 개별 전달"에서 나온다.

---

## Decision Drivers (결정 요인)

- **보안 목표 보존** — 인젝션 차단이 핵심. 배열형 ShellExecution은 각 인자를 VSCode가 셸 규칙에 맞게 개별 인용(default quoting)하므로, `runArgs`에 `; rm -rf` 같은 값이 들어와도 **한 인자로 인용**되어 명령으로 해석되지 않는다. Raw 명령줄 문자열(`new ShellExecution(commandLine)`)과는 근본적으로 다르다.
- **플랫폼 견고성** — 셸이 `.cmd` 심을 해석하므로 Windows/macOS/Linux에서 동일하게 동작. VSCode 내장 npm 태스크 제공자도 같은 방식(shell)을 쓴다.
- **어댑터 국소성(INV-2)** — 이 선택은 Node 어댑터 내부의 Task 생성에만 국한된다. 오케스트레이터·UI·다른 어댑터는 무변경. NFR-002는 나머지 전 언어에 그대로 유효하다.
- **선례 일관성(NFR-002a)** — NFR-002는 이미 "빌드 전/후 이벤트는 ShellExecution 허용"이라는 문서화된 예외(NFR-002a)를 갖는다. Node 실행도 같은 성격의 **좁고 명시적인 예외**다.

---

## Options Considered (검토한 옵션)

- **Option A — 배열형 ShellExecution (채택)**: `new vscode.ShellExecution('npm', ['run', script, ...args], { cwd, env })`. 셸이 `.cmd` 해석, VSCode가 인자별 인용 → 인젝션 무차단. 크로스플랫폼·검증됨.
- **Option B — `ProcessExecution('npm.cmd')` + VSCode pty 의존**: NFR-002 문자 유지. Windows에서 VSCode 태스크 터미널(ConPTY)이 `.cmd`를 실행할 수도 있으나 **미검증**이고, raw spawn은 EINVAL. 플랫폼/Node 버전에 취약해 견고성 낮음.
- **Option C — `node <npm-cli.js>` 직접 호출**: `.cmd` 우회해 ProcessExecution 유지. 그러나 npm-cli.js 위치가 설치 방식(nvm·volta·corepack·system)마다 달라 신뢰성 낮고 pnpm/yarn엔 부적용.
- **Option D — 스크립트 대신 `node <entry>` 직접 실행**: 패키지 매니저 우회. 그러나 설계 확정 ①/③(npm 스크립트 기반)과 배치되고 `dev`/`build` 스크립트의 부가 동작을 못 담는다.

---

## Decision (결정)

**Option A — 배열형 ShellExecution**. 세부:

- Node 어댑터의 `makeNodeTask`는 `new vscode.ShellExecution(pm, args, { cwd, env })`로 build/run Task를 만든다. `pm`은 bare `npm`/`pnpm`/`yarn`(셸이 `.cmd` 해석), `args = ['run', <script>, ...(runArgs? ['--', ...runArgs] : [])]`.
- **인젝션 안전**: 배열 인자는 VSCode가 개별 인용한다. Raw 명령줄 문자열 형태는 사용하지 않는다. 스크립트 이름은 `package.json`의 통제된 집합에서 선택되고, `runArgs`는 인용된 인자로만 전달된다.
- **NFR-002 예외 문서화**: `requirement_spec.md`에 NFR-002의 예외로 명시한다(NFR-002a와 동급). 나머지 5개 언어는 NFR-002(ProcessExecution) 유지.
- **디버그(TASK-048)**: js-debug `runtimeExecutable: <pm>`도 같은 이유로 패키지 매니저를 셸 경유로 구동한다(js-debug가 내부적으로 처리). 이 ADR의 선례를 따른다.
- **실증(세션 #013)**: `npm run start` / `npm run start -- --hello world`(runArgs `--` 전달) / `npm run build`($tsc) / `NODE_OPTIONS` env 오버레이 — `cmd.exe`(`.cmd` 해석) 스모크 전부 통과.

## Consequences (결과)

### 긍정적
- Windows에서 npm/pnpm/yarn 스크립트가 안정적으로 실행된다(핵심 목표). 크로스플랫폼 견고.
- NFR-002의 보안 목표(인젝션 차단)를 배열 인자 인용으로 그대로 보존한다.
- 어댑터 국소 변경 — 오케스트레이터/UI/타 어댑터 무영향, NFR-002는 다른 언어에 유효.

### 부정적 / Trade-off
- 실행 프리미티브가 언어별로 갈린다(5개=ProcessExecution / Node=ShellExecution). 리뷰 시 "Node만 ShellExecution"을 인지해야 한다 → 코드 주석·이 ADR로 명시.
- 셸을 경유하므로 인자 인용은 VSCode의 default quoting에 의존한다. Raw 명령줄 문자열 사용은 금지(주석으로 고정).

---

## 관련 문서

| 항목 | 참조 |
|------|------|
| 관련 Intent | INT-001 |
| 관련 Milestone | MS-016 (TASK-047 build/run, TASK-048 debug) |
| 관련 요구 | NFR-002(셸 인젝션 차단·ProcessExecution), NFR-002a(빌드 이벤트 ShellExecution 예외) |
| 관련 ADR | ADR-002(Task API 실행), ADR-003(어댑터 무지 UI/INV-2), ADR-013(파일 무편집) |
| 관련 코드 | `src/adapters/node/nodeAdapter.ts`(makeNodeTask), `src/adapters/node/nodeBridge.ts`(assembleNodeArgs) |
| 출처 | 세션 #013 구현 중 발견(Node 24 `.cmd` EINVAL 실측) + Human 승인(2026-08-17) |
