# Knowledge Base

> 축적된 인사이트 — 프로젝트 진행 중 습득한 지식과 패턴의 영구 저장소

---

## 목적

세션이 리셋되어도 **프로젝트에서 축적된 지식이 보존**되도록
핵심 인사이트, 패턴, 안티패턴을 기록한다.

- 복사한 대화 원문, 회의 메모, 외부 자료 전문은 `imported_context/`에 보관한다
- 이 문서에는 재사용 가치가 있는 요약된 인사이트만 승격해 기록한다
- 항목이 과도하게 늘어나면 주제별 통합 요약을 우선하고, 상세 근거는 로그/아카이브에 남긴다
- 특정 인사이트가 특정 Intent 또는 Milestone에서 나왔다면 관련 ID를 함께 기록한다

---

## 누적 / 분리 기준

- 이 문서는 **재사용 가능한 요약**만 남기는 곳이다. 같은 주제의 반복 발견은 새 행을 계속 추가하기보다 기존 행을 갱신하거나 통합 요약으로 압축한다.
- 길이 트리거: 빈 예시 행을 제외한 실질 항목이 **총 15개를 넘기면** 주제별 통합 요약 또는 분리 검토를 시작한다.
- 최근 참조 트리거: **최근 3개 세션 중 2개 이상**이 같은 주제, 같은 `INT-*`, 같은 `MS-*`만 반복 참조하고 나머지 항목은 계속 비참조라면 그 묶음을 별도 주제 단위로 분리 검토한다.
- 분리하더라도 이 문서는 전체 프로젝트 관점의 짧은 인덱스로 유지하고, 상세 내용은 주제별 문서나 관련 source 문서에서 이어간다.

---

## 기술적 인사이트

| # | 주제 | 관련 Intent | 관련 Milestone | 내용 | 출처 | 발견 날짜 |
|---|------|-------------|----------------|------|------|----------|
| 1 | 상태바 목업 이미지 = codicon 폰트 렌더 후 PNG | INT-001 | MS-007 | **VSCode 확장 README·Marketplace는 마크다운 SVG를 렌더하지 않음**(GitHub은 됨). 상태바 목업을 실물처럼 만들려면: VSCode 설치본의 `codicon.css`(폰트가 base64로 내장됨, `resources/app/.../simple-browser/media/codicon.css`)를 HTML에 링크→`<span class="codicon codicon-NAME">`로 실제 글리프 렌더→**Edge headless `--screenshot`**로 PNG화. 얇은 획 색번짐은 `--disable-lcd-text --font-render-hinting=none` + 2x 크기로 제거. PNG는 GitHub/VSCode/Marketplace 모두 렌더 | 세션 #006, TASK-021 | 2026-08-16 |
| 2 | 불투명 배경 아이콘의 투명화 = flood fill(경계+구멍 시드) + 밝기×거리 페이드 글로우 처리 | 없음(유지보수) | MS-021 | AI 생성 아이콘 등 **배경이 알파가 아니라 실제 검정**인 PNG는 Marketplace/GitHub 밝은 테마에서 검은 사각형이 된다. 도구 없이(.NET `System.Drawing`+LockBits) 고칠 때: ① 배경은 **테두리+내부 구멍 좌표를 시드로 flood fill**(임계=배경 max채널과 아트워크 어두운 면 사이, 실측 샘플링으로 결정) 후 밝기 비례 **페더 알파**(a²) ② 문제는 넓은 **글로우 띠** — 밝기 임계만 올리면 아트워크의 어두운 음영까지 침식(v2 실패), 그대로 두면 흰 배경에 얼룩(v1 실패) → **밝기 램프와 "밝은 픽셀까지의 거리" 페이드를 max()로 결합**: 아트워크에 가까운 글로우는 유지(자연스러운 드롭섀도), 먼 halo는 소멸, 이음새 없음 ③ 검증은 **흰/검 배경 합성 미리보기 + 알파맵 그레이스케일 렌더**로 육안 확인. 다운스케일은 32bppArgb+HighQualityBicubic(Clear(Transparent) 선행) | 세션 #016, TASK-059 | 2026-08-18 |

---

## 효과적이었던 패턴

| # | 패턴 | 적용 맥락 | 관련 Intent | 관련 Milestone | 결과 | 출처 |
|---|------|----------|-------------|----------------|------|------|
| 1 | 소유 대신 조립 — 중계는 캐노니컬 파일을 편집하지 않고 호출을 조립한다 | 설정 저장 모델이 SSOT(ADR-007)와 긴장할 때 | INT-001 | MS-006 | 파일 소유(편집) vs 호출 시점 주입을 분리 → SSOT 유지 + VS식 (프로젝트×구성) 속성 동시 달성. F16(runArgs)의 일반화. **기술 근거(4어댑터 공통)**: `cargo --config KEY=VAL`(Rust 1.63+)·env(`RUSTFLAGS`·`CARGO_TARGET_DIR`)·dotnet `-p:`·cmake `-D`로 캐노니컬 파일 편집 없이 호출 시점 덮어쓰기(ADR-011 근간, D-15/ADR-013 "파일 무편집 영구 불변식"으로 확정) | ADR-011, 세션 #002 |
| 2 | 순수 로직은 `import type`로만 vscode 타입 참조 → VSCode 호스트 없이 순수 Node에서 단위 테스트 | 파싱·인자 조립 등 VSCode 무의존 로직을 mocha로 빠르게 테스트할 때 | INT-001 | MS-003 | `import type`은 컴파일 시 제거되어 런타임에 `require('vscode')`를 끌지 않음 → 순수 함수만 뽑아 tsc→out→mocha로 즉시 검증(cargoBridge 19 테스트). VSCode API가 필요한 배선은 어댑터 계층으로 분리. 값 import가 필요하면 그 심볼을 vscode-free 모듈로 분리(예: `DevSwitcherError`→`core/errors`) | 세션 #003·#004, TASK-004·005 |
| 3 | Webview 설정 UI를 "어댑터 무지 + 단방향"으로 | 언어별 설정 페이지를 어댑터 추가 시 무변경으로 유지할 때 | INT-001 | MS-006 | 탭·에디터를 `ChipDescriptor[]`/`optionCatalog`/`configCategories`로만 렌더(언어 무지). **명령 미리보기는 재조립하지 말고** `adapter.createBuildTask(...).execution`(`ProcessExecution.process/args`)에서 역으로 읽어 어댑터 무지 유지. 상태는 단방향(변경→확장이 전체 `state` 재전송) + 오케스트레이터 `renderActive`의 `viewSync` 훅으로 상태바/감시 등 외부 변경도 열린 페이지에 자동 반영(수동 Refresh 불필요) | 세션 #004, TASK-013·014 |
| 4 | 스캐폴딩 계약을 `task \| files` 판별 유니온으로 | 언어별 "새 프로젝트 생성"에 네이티브 도구가 있기도/없기도 할 때 | INT-001 | MS-008 | `createProject(target): {kind:'task', task} \| {kind:'files', files}`. 네이티브 스캐폴더(cargo new·dotnet new)는 Task 반환→TaskRunner 실행. 없는 언어(CMake·Python)는 템플릿 파일 목록 반환→오케스트레이터가 `workspace.fs`로 작성. **ShellExecution로 파일 쓰기는 금물**(안티패턴 6 참조). 어댑터별 방식 차이를 오케스트레이터가 kind 분기로 흡수 | 세션 #006, TASK-023 |
| 5 | 스텁 어댑터를 Doctor로 먼저 검증 — `collectDiagnostics`만 구현하면 switch/build 전에 진단·E1이 산다 | 새 언어 어댑터 착수 시, 또는 도구 부재(critical-missing) 경로를 실검증하고 싶을 때 | INT-001 | MS-012 | Doctor의 `refreshDiagnostics`는 `registry.detectAdapters()`(manifest **글롭** 존재 여부, `listProjects`/`scan` 무관)로 대상 어댑터를 고름 → 워크스페이스에 매니페스트 픽스처(예: `CMakeLists.txt`)만 있으면 **listProjects 스텁이어도** 해당 어댑터의 `collectDiagnostics`가 호출됨. 그래서 어댑터 착수 시 **브리지 `checkToolchain`+`collectDiagnostics`(critical 프로브)만 먼저** 구현하면, 그 도구가 미설치일 때 **Doctor ❌ + E1 경고칩(worstStatus=error) 경로를 실제로 밟아 검증**할 수 있다(설치된 도구들로는 못 밟는 경로). cmake 미설치를 그대로 Doctor 리트머스로 활용 | 세션 #008, MS-012 TASK-033 | 2026-08-16 |
| 6 | 환경 결속 툴(디버거)은 "옵션"이 아니라 **권위 소스에서 자동판별** + 필요한 곳만 override | 디버거/툴 선택이 플랫폼·컴파일러에 강결합될 때(특히 크로스 컴파일러) | INT-001 | MS-012 | 디버거는 컴파일러에 강결합(MSVC PDB↔gdb 불가) → OS 추측도, 자유 선택 옵션도 위험(호환 안 되는 조합 가능). **권위 소스에서 자동판별이 정답**: CMake File API `toolchains`의 `CMAKE_CXX_COMPILER_ID`(MSVC/GNU/Clang) → `cppvsdbg`/`cppdbg`+gdb/`cppdbg`+lldb 매핑. 실 컴파일러 기반이라 **WSL/MinGW/Linux/Mac 자동대응**(configure한 컴파일러를 그대로 따라감). 진짜 취향이 갈리는 곳(Clang: cpptools vs CodeLLDB)만 **override 설정**. 파생: 디버거가 동적이면 `requiredExtensions`(정적) 대신 `createDebugConfig`에서 판별 확장을 `ensureExtension`; 빌드/실행은 확장 무의존 유지(ADR-009) | 세션 #009, MS-012 TASK-035 (Human "WSL 디버거는?" 논의) | 2026-08-16 |
| 7 | 스스로 빌드하는 디버거는 program=소스/패키지, 디버그 빌드엔 심볼 제거 플래그 제외 | 디버거가 대상을 자체 컴파일하는 언어(Go delve `mode:debug`) | INT-001 | MS-015 | delve `mode:debug`는 대상 패키지를 **직접 컴파일**해 디버그 → launch `program`은 빌드 산출물(바이너리)이 아니라 **패키지 디렉터리**(resolveExecutable가 `go list`의 `.Dir` 반환). 또 릴리즈용 심볼 제거 플래그(`-ldflags "-s -w"`)를 디버그 빌드에 넣으면 **중단점이 안 잡힘** → 오버레이의 릴리즈 플래그는 디버그 경로에서 제외하고 build 태그 정도만 `buildFlags`로 전달. 대비: cargo/dotnet은 **사전 빌드된 아티팩트**를 program으로(KB #7↔#... 안티패턴 #7 참조) — 디버거가 빌드하지 않음. 새 언어 어댑터 착수 시 디버거가 "빌드까지 하는지" 먼저 판별 | 세션 #012, MS-015 TASK-045 | 2026-08-17 |
| 8 | `.cmd`/`.bat` 런처(npm/pnpm/yarn)는 배열형 `ShellExecution`으로 실행 — 셸-less spawn 불가 | VSCode 확장이 패키지 매니저/배치 런처를 Task로 돌릴 때(특히 Windows) | INT-001 | MS-016 | npm/pnpm/yarn은 Windows에서 `.exe`가 아니라 `.cmd` 배치 심 → **셸 없이 spawn 불가**. **Node 24는 CVE-2024-27980(BatBadBut) 완화책으로 `.cmd`의 셸-less spawn을 `EINVAL`로 거부**(실측: `execFile('npm.cmd', …, {shell:false})`→EINVAL). `ProcessExecution`(NFR-002·셸無)로는 못 돌림. 해결: **배열형 `new vscode.ShellExecution(cmd, [args], opts)`** — 셸이 `.cmd` 해석 + VSCode가 인자 개별 인용 → **셸 인젝션 표면 없음**(raw 명령줄 문자열 형태와 근본적으로 다름). 실제 `.exe`인 언어(cargo/dotnet/go/python/cmake)는 ProcessExecution 유지. NFR-002 예외로 문서화(NFR-002b·ADR-016). 디버그(js-debug `runtimeExecutable:npm`)는 디버거가 `.cmd`를 알아서 해석 | 세션 #013, MS-016 TASK-047, ADR-016 | 2026-08-17 |
| 9 | 키보드 단축키는 정적 `contributes.keybindings` + 네이티브 편집기 딥링크 — 런타임 등록 API 없음 | 확장에 기본 단축키 제공 + 사용자 변경 UI가 필요할 때 | INT-001 | MS-017 | **VSCode는 런타임 키바인딩 등록 API가 없다**(출처는 정적 `contributes.keybindings` + 사용자 `keybindings.json`뿐). "인페이지 키 캡처→즉시 재바인딩"은 원리적으로 불가(유일 우회=사용자 config 파일 직접 편집=취약·비관용·ADR-013 반함). 정답: 정적 기본값(`when:<contextKey>`로 스코프해 충돌 최소화) + 설정 UI는 확장 packageJSON을 SSOT로 목록 렌더 + `workbench.action.openGlobalKeybindings`에 `@ext:<publisher.name>` 쿼리로 **네이티브 편집기 딥링크**(충돌감지·When절·플랫폼·오버라이드를 VSCode가 처리). **내장 키(F5/Ctrl+Shift+B)는 오버라이드 말고 리맵 안내만**(강제 시 launch.json/tasks.json 사용자 놀람). 사용자 오버라이드 키는 읽는 API가 없어 목록엔 *기본값* 표시 | 세션 #013, MS-017 TASK-049, ADR-017 | 2026-08-17 |
| 10 | "준비 대기(timeout+cancel)"는 순수 폴링 루프(now/sleep/signal 주입) + I/O 프로브 분리 + `AbortSignal` | 무언가가 준비될 때까지 재시도 대기하되 타임아웃·사용자 취소가 필요할 때(포트/HTTP 헬스체크 등) | INT-001 | MS-018 | 재시도 **정책**(언제 재시도/포기)은 순수 함수로, 실제 **시도**(TCP connect·HTTP GET)는 얇은 I/O로 분리. `pollUntilReady(attempt, {timeoutMs, intervalMs, now, sleep, signal})` — `now`/`sleep`을 주입해 **가짜 클록으로 단위 테스트**(실 타이머 없이 데드라인 도달 검증). 취소는 표준 **`AbortSignal`**(`{aborted:boolean}` 인터페이스로 추상화해 vscode-free 유지)을 sequencer·폴링·프로브까지 관통 — VSCode `CancellationToken`→`AbortController.abort()`로 연결(`withProgress({cancellable:true})`의 취소 버튼). I/O 프로브는 Node 내장(`net`/`http`/`https`)만(ADR-009), 각 시도에 짧은 소켓 타임아웃으로 블랙홀 호스트 방지. 실패(timeout/cancel)=미준비→호출부가 "시작 실패"와 동일 취급(abort+teardown) | 세션 #014, MS-018 TASK-051/052, ADR-018 | 2026-08-17 |
| 11 | VS Code Marketplace 첫 게시 — 온보딩 경로와 함정 (aex 직행·PAT All-orgs·게시 직후 404 정상) | 확장을 Marketplace에 처음(또는 새 publisher로) 게시할 때 | INT-001 | MS-014 | ① `dev.azure.com`이 **portal.azure.com(Azure 클라우드 콘솔)로 리다이렉트되는 함정** → 조직 관리는 **`aex.dev.azure.com` 직행**(Azure DevOps는 무료·카드/구독 불필요·조직만 있으면 되고 프로젝트 불필요). PAT 페이지 직행 URL: `dev.azure.com/<org>/_usersSettings/tokens`. ② PAT는 **Organization="All accessible organizations"**(조직 한정 PAT는 게시 실패) + Scopes=Custom→Show all scopes→**Marketplace: Manage**. ③ publisher ID는 package.json `publisher`와 **정확 일치**(marketplace.visualstudio.com/manage에서 생성). ④ `npx @vscode/vsce login <publisher>`(자격증명 OS 저장, `ls-publishers`로 확인) → `vsce publish`(워킹트리에서 재패키징·업로드). ⑤ **게시 성공 직후 아이템 페이지 404는 정상**(검증·전파 몇 분) — `vsce show <id>`로 갤러리 API 등재를 먼저 확인. 검색창 노출(인덱싱)은 수 시간. ⑥ 리스팅 README의 상대 이미지는 vsce가 **GitHub raw URL로 재작성** → repo가 public이어야 보이고, GitHub raw 장애 시 리스팅 이미지도 같이 깨짐(장애 진단: 대조군 레포 raw + githubstatus.com 확인으로 자기 레포 결함 배제) | 세션 #015, MS-014 TASK-055 | 2026-08-17 |
| 12 | Webview "빈 화면" 진단 = 스크립트를 Node에서 DOM 셔밍으로 실구동 → "webview vs state 미도착" 이분법 | 없음(유지보수) | MS-021 | 설정 페이지류 webview가 백지로 열릴 때 원인은 둘 중 하나: (a) webview 스크립트 런타임 오류 (b) **extension 쪽에서 state 메시지가 아예 안 옴**(빌드 중 예외가 `void promise`로 삼켜짐/느린 await 대기). (a)는 **인라인 스크립트를 정규식으로 추출해 Node에서 최소 DOM 셔밍(getElementById 스텁·클릭 디스패치)으로 실구동**하며 실제 state 형태를 먹여 전 탭 렌더를 검증하면 즉시 판별된다(구문 파싱 가드 `new Function()`보다 한 단계 깊은 검증). (b)가 원인이면 처방 3종: **정적 로딩 플레이스홀더**(첫 메시지 전에도 백지 아님) + **퀵 첫 페인트**(느린 조회는 생략한 state 먼저, 풀 state 후속) + **state 빌드 전체 try/catch → 인페이지 에러 배너**(어댑터 훅 예외는 fail-open 가드). 교훈: `void this.postState()`처럼 버려지는 promise 안의 예외는 UI를 소리 없이 죽인다 — 최후 방어선을 UI 쪽에 둔다 | 세션 #016, TASK-058 | 2026-08-18 |

---

## 안티패턴 / 함정

| # | 안티패턴 | 발생 맥락 | 관련 Intent | 관련 Milestone | 교훈 | 출처 |
|---|---------|----------|-------------|----------------|------|------|
| 1 | 편집기 phantom 타입 오류(예: TS2584 `console` 미해석) — CLI `tsc`는 통과 | 편집기 내장 TypeScript가 `@types/node`의 `typesVersions` 레이아웃을 워크스페이스 TS와 다르게 해석 | INT-001 | MS-002 | TS 서버 재시작·완전 재시작으로도 안 풀리면 편집기/CLI의 TS 버전·타입 로딩 차이를 의심. 해결: `tsconfig`에 `types:["node",...]` 명시(자동수집 대신 강제 포함) + `.vscode/settings.json` `typescript.tsdk`로 워크스페이스 TS 고정. `lib`에 `dom` 추가는 Node 확장엔 오답 | 세션 #003, `fix(build) 387eb77` |
| 2 | Dev Host `--disable-extensions`가 필수 확장(CodeLLDB)·디버그를 막음 | 확장 개발 시 콘솔 잡음 제거하려 기본 launch에 `--disable-extensions`를 넣었을 때 | INT-001 | MS-005 | 그 세션에선 CodeLLDB가 비활성 → 온디맨드 설치해도 `getExtension` 미인식 → 디버그 프롬프트 무한반복 + VSCode "확장 다시 로드" 배너 지속. 교훈: clean-console용 `--disable-extensions`는 **기본이 아닌 별도 launch 구성**으로 두고, 기본은 확장 포함(디버그 동작). 온디맨드 설치는 설치 후 미인식 시 "Reload Window" 복구를 제공해 dead-end 루프 방지 | 세션 #004, `fix 39af4ac` |
| 3 | enum 옵션의 기본값이 선택지에도 있으면 "기본값 선택 시 오버레이 제거 → UI가 (default)로 튐" | 카탈로그 옵션 에디터에서 최소 오버레이(기본값=미저장) 정책과 드롭다운이 충돌 | INT-001 | MS-006 | 예: LTO 기본값 `false`인데 드롭다운에 `(default)`+`false` 중복 → `false` 선택 시 제거되어 `(default)`로 되돌아감(혼란). 교훈: 저장은 최소 유지하되 **UI는 실효값(저장값 ?? 기본값)을 표시**하고 별도 `(default)` 항목을 두지 않는다 | 세션 #004, TASK-014 |
| 4 | Webview 인라인 스크립트를 TS 템플릿 리터럴로 생성 시 **이스케이프 문자가 바깥 리터럴에 소비돼** 스크립트 전체가 깨짐 | `return \`<script>...\`` 안 JS 문자열의 `\n`(→진짜 줄바꿈) 또는 `\'`(→아포스트로피) | INT-001 | MS-007·013 | 바깥 템플릿 리터럴이 컴파일 시 `\n`→줄바꿈, `\'`→`'`로 치환 → 웹뷰 JS에 미종료/깨진 문자열 → **인라인 스크립트 전체 파싱 실패 → 설정 페이지 백지**(정적 topbar만). **tsc·eslint는 문자열 속 JS라 못 잡음**(런타임에만 드러남). 교훈: 웹뷰 스크립트 문자열엔 `\\n`(이중 이스케이프)이나 **아예 아포스트로피 없는 문안**을 쓴다. **영구 가드(세션 #011 구현)**: `settingsHtml.test.ts`가 `getSettingsHtml` emit 스크립트를 `new Function()`으로 파싱 검사(문법 오류 시 실패). ※ **재발 실증**: `\'`(세션 #010 profile 문구 유입)가 v0.3.0 설정 페이지를 잠복 파손 → 세션 #011에 표면화·수정 | 세션 #005 TASK-019(`\n`)·세션 #011 MS-013(`\'`) |
| 5 | `executeTask`로 커스텀 Task 실행 시 3대 함정 (등록·신뢰·settle) | ① 커스텀 `type` Task 실행 ② untrusted 폴더 실행 ③ 실행 종료 감지 | INT-001 | MS-007·008 | ① **`type` 미등록** → 매 실행 "'x' 등록된 작업 형식이 없습니다" 경고 반복 → `package.json` `contributes.taskDefinitions`에 등록(속성 스키마 포함; `devSwitcher.cargo`·`devswitcher-buildevent` 등). ② **untrusted 워크스페이스** → VSCode가 Task를 막아 프로세스가 안 떠 **`onDidEndTaskProcess`가 영영 안 옴** → run Promise·프로젝트 락·스피너 고착(복구 Reload뿐) → 실행 전 `vscode.workspace.isTrusted` 가드로 안내·차단. ③ TaskRunner는 `onDidEndTaskProcess`뿐 아니라 **`onDidEndTask`(프로세스 없이 종료도 발화)** 도 청취해 항상 settle | 세션 #005·#006, TASK-019·fix eb8983a |
| 6 | `showQuickPick(canPickMany)`는 셸 파일쓰기·빈 선택·OK 버튼에서 함정 | ① 파일 생성용 셸 명령 생성 ② 다중선택 칩 | INT-001 | MS-008 | ① **ShellExecution은 사용자 기본 셸(cmd/pwsh)을 제어 못 함** + C++ `<iostream>`·`<<`가 셸 리다이렉션과 충돌 → 파일 생성은 `workspace.fs`로. ② `showQuickPick(canPickMany)`는 **전부 해제 후 OK를 `undefined`(취소)와 구분 못 함** → 마지막 값 고착. 또 **OK 버튼을 숨길 수 없음**. 해결: `createQuickPick`(canSelectMany 없이)로 `$(check)` 토글 목록 구성 → OK 버튼 제거·클릭=라이브 토글·Esc=확정. ③ 다중선택 빈 배열 `[]`은 유효 상태(none)이니 reconcile이 삭제 않게 보존(전부-무효화만 폴백) | 세션 #006, TASK-023·fix e7b462b | 2026-08-16 |
| 7 | 디버그 program 경로가 실제 빌드 출력과 어긋남 (출력 경로 축 누락) | resolveExecutable이 빌드와 다른 인자로 출력 경로를 계산 (dotnet RID 선택 시) | INT-001 | MS-010 | 디버그 program 경로는 **실제 빌드 아티팩트와 정확히 일치**해야 함(coreclr/디버거는 존재를 먼저 확인). 출력 경로가 RID/구성/TFM 등 축에 따라 하위폴더로 갈라지면(dotnet `-r`→`bin/<cfg>/<tfm>/<rid>/`) resolver가 축 하나만 빠뜨려도 없는 경로 실행→"프로그램이 존재하지 않습니다". **견고한 기법: 경로 추측 금지, 빌드와 동일 인자를 재사용해 도구에 물어봄** — dotnet `<build args> -getProperty:TargetPath`(단, 이건 **빌드 없이 평가만** 하므로 아티팩트는 오케스트레이터 사전 빌드가 보장), cargo `--message-format=json`. **CMake resolveExecutable(TASK-034)은 File API codemodel `artifacts` 경로를 `join(buildDir,·)`로 사용해 동일 원칙 충족(실 스모크: Debug/…exe·Release/…exe)** | 세션 #007, fix `de92085`, ADR-005 연장 | 2026-08-16 |
| 8 | 다중 컴파일러 언어의 옵션 예시가 한 컴파일러 문법에만 맞음 | CMake처럼 툴체인(MSVC/GCC/Clang)이 갈리는 언어의 `optionCatalog` 예시 | INT-001 | MS-012 | `cxx-flags` 예시 `-O2 -Wall`(GCC/Clang)을 **MSVC(cl.exe)** 환경에서 입력→cl이 미인식으로 무시(경고 D9002, 오류 아님이라 조용히 실패). 게다가 `-O2`의 대문자 O가 0으로 오독돼 오타 유발. 교훈: **툴체인이 갈리는 옵션 예시는 (a) 어느 툴체인용인지 `description`에 명시하고 (b) 실제/주 툴체인(Windows=MSVC) 문법으로 `example`을 쓴다.** 적용: cmake `cxx-flags` `example`=`/O2 /W4`, `exe-linker-flags` `/DEBUG`, description에 MSVC/GCC 병기 | 세션 #009, MS-012 TASK-034 F5 (Human 피드백) | 2026-08-16 |
| 9 | `vscode.debug.activeDebugSession`은 종료 이벤트에서 stale — 세션은 id로 명시 추적 | 디버그 세션 상태로 UI(Stop 버튼 등)를 토글할 때 | INT-001 | MS-017 | `onDidTerminateDebugSession` 핸들러 시점에 `vscode.debug.activeDebugSession`이 **아직 방금 끝난 세션을 가리킨다**(즉시 안 지워짐) → 이를 폴링하면 "아직 실행 중"으로 오판해 **Stop 버튼이 안 사라지고 고착**(F5 실증). 또 VSCode엔 "모든 활성 세션 목록" API가 없다(`activeDebugSession` 하나뿐). 해결: **`onDidStartDebugSession`/`onDidTerminateDebugSession`으로 우리 세션을 `Map<session.id, …>`에 직접 추적**(종료는 `session.id`로 확실히 삭제) → UI는 이 맵을 읽음. 세션이 "우리 것"인지는 우리가 만든 launch config `name`(`Debug <project>`) + `workspaceFolder`로 식별. 태스크(`taskExecutions`)와 디버그 세션은 **별개 시스템**이라 Stop은 둘 다 처리 | 세션 #013, MS-017, `fix 1be94cc` | 2026-08-17 |
| 10 | 칩 기본값 시드가 "활성화 경로에만" 있으면 배치/그룹 실행이 required-칩 미설정으로 막힌다 | 개별 실행과 별개의 일괄/헤드리스 실행 경로가 있을 때(Run Group 등) | INT-001 | MS-018 | 개별 실행은 프로젝트 **활성화 시** `applyDefaults`가 required 칩 기본값(node Script→`start`·profile→`dev`)을 시드하지만, **그룹 멤버는 한 번도 활성화된 적 없으면** 저장값이 없어 **`assertConfigured`(E4)가 "Script 미선택"으로 그룹 시작을 차단**(F5 실증). 교훈: **기본값 시드는 "활성화" 이벤트가 아니라 "실행 직전" 불변식으로 취급** — 일괄/그룹 실행 경로도 시작 전에 동일한 시드(`chip.defaultValue` 순회)를 돌린 뒤, 그래도 남는 **기본값 없는 required 칩만** 차단. 어느 진입점이든 "실행 = 시드 후 검증" 순서를 공유 | 세션 #014, MS-018 TASK-052, `seedMemberDefaults` | 2026-08-17 |

---

## 외부 참고 자료

| # | 제목 | 출처 | 요약 |
|---|------|------|------|
| 1 | AWS AI-DLC | [link](https://prod.d13rzhkk8cj2z0.amplifyapp.com/) | AI-Driven Development Lifecycle 방법론 |

---
