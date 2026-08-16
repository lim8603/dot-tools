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
| 1 | 빌드 옵션 호출 시점 주입 (파일 무편집) | INT-001 | MS-006 | `cargo --config KEY=VAL`(Rust 1.63+) + env(`RUSTFLAGS`·`CARGO_TARGET_DIR`)로 profile/build/target 설정을 `Cargo.toml` 편집 없이 호출 시점 덮어쓰기 가능. dotnet `-p:`, cmake `-D` 동일. 호출 구성 오버레이(ADR-011)의 기술 근거. | ADR-011, 세션 #002 | 2026-08-15 |
| 2 | 상태바 목업 이미지 = codicon 폰트 렌더 후 PNG | INT-001 | MS-007 | **VSCode 확장 README·Marketplace는 마크다운 SVG를 렌더하지 않음**(GitHub은 됨). 상태바 목업을 실물처럼 만들려면: VSCode 설치본의 `codicon.css`(폰트가 base64로 내장됨, `resources/app/.../simple-browser/media/codicon.css`)를 HTML에 링크→`<span class="codicon codicon-NAME">`로 실제 글리프 렌더→**Edge headless `--screenshot`**로 PNG화. 얇은 획 색번짐은 `--disable-lcd-text --font-render-hinting=none` + 2x 크기로 제거. PNG는 GitHub/VSCode/Marketplace 모두 렌더 | 세션 #006, TASK-021 | 2026-08-16 |

---

## 효과적이었던 패턴

| # | 패턴 | 적용 맥락 | 관련 Intent | 관련 Milestone | 결과 | 출처 |
|---|------|----------|-------------|----------------|------|------|
| 1 | 소유 대신 조립 — 중계는 캐노니컬 파일을 편집하지 않고 호출을 조립한다 | 설정 저장 모델이 SSOT(ADR-007)와 긴장할 때 | INT-001 | MS-006 | 파일 소유(편집) vs 호출 시점 주입을 분리 → SSOT 유지 + VS식 (프로젝트×구성) 속성 동시 달성. F16(runArgs)의 일반화 | ADR-011, 세션 #002 |
| 2 | 순수 로직은 `import type`로만 vscode 타입 참조 → VSCode 호스트 없이 순수 Node에서 단위 테스트 | 파싱·인자 조립 등 VSCode 무의존 로직을 mocha로 빠르게 테스트할 때 | INT-001 | MS-003 | `import type`은 컴파일 시 제거되어 런타임에 `require('vscode')`를 끌지 않음 → 순수 함수만 뽑아 tsc→out→mocha로 즉시 검증(cargoBridge 19 테스트). VSCode API가 필요한 배선은 어댑터 계층으로 분리. 값 import가 필요하면 그 심볼을 vscode-free 모듈로 분리(예: `DevSwitcherError`→`core/errors`) | 세션 #003·#004, TASK-004·005 |
| 3 | Webview 설정 UI를 "어댑터 무지 + 단방향"으로 | 언어별 설정 페이지를 어댑터 추가 시 무변경으로 유지할 때 | INT-001 | MS-006 | 탭·에디터를 `ChipDescriptor[]`/`optionCatalog`/`configCategories`로만 렌더(언어 무지). **명령 미리보기는 재조립하지 말고** `adapter.createBuildTask(...).execution`(`ProcessExecution.process/args`)에서 역으로 읽어 어댑터 무지 유지. 상태는 단방향(변경→확장이 전체 `state` 재전송) + 오케스트레이터 `renderActive`의 `viewSync` 훅으로 상태바/감시 등 외부 변경도 열린 페이지에 자동 반영(수동 Refresh 불필요) | 세션 #004, TASK-013·014 |
| 4 | 스캐폴딩 계약을 `task \| files` 판별 유니온으로 | 언어별 "새 프로젝트 생성"에 네이티브 도구가 있기도/없기도 할 때 | INT-001 | MS-008 | `createProject(target): {kind:'task', task} \| {kind:'files', files}`. 네이티브 스캐폴더(cargo new·dotnet new)는 Task 반환→TaskRunner 실행. 없는 언어(CMake·Python)는 템플릿 파일 목록 반환→오케스트레이터가 `workspace.fs`로 작성. **ShellExecution로 파일 쓰기는 금물**(안티패턴 6 참조). 어댑터별 방식 차이를 오케스트레이터가 kind 분기로 흡수 | 세션 #006, TASK-023 |

---

## 안티패턴 / 함정

| # | 안티패턴 | 발생 맥락 | 관련 Intent | 관련 Milestone | 교훈 | 출처 |
|---|---------|----------|-------------|----------------|------|------|
| 1 | 편집기 phantom 타입 오류(예: TS2584 `console` 미해석) — CLI `tsc`는 통과 | 편집기 내장 TypeScript가 `@types/node`의 `typesVersions` 레이아웃을 워크스페이스 TS와 다르게 해석 | INT-001 | MS-002 | TS 서버 재시작·완전 재시작으로도 안 풀리면 편집기/CLI의 TS 버전·타입 로딩 차이를 의심. 해결: `tsconfig`에 `types:["node",...]` 명시(자동수집 대신 강제 포함) + `.vscode/settings.json` `typescript.tsdk`로 워크스페이스 TS 고정. `lib`에 `dom` 추가는 Node 확장엔 오답 | 세션 #003, `fix(build) 387eb77` |
| 2 | Dev Host `--disable-extensions`가 필수 확장(CodeLLDB)·디버그를 막음 | 확장 개발 시 콘솔 잡음 제거하려 기본 launch에 `--disable-extensions`를 넣었을 때 | INT-001 | MS-005 | 그 세션에선 CodeLLDB가 비활성 → 온디맨드 설치해도 `getExtension` 미인식 → 디버그 프롬프트 무한반복 + VSCode "확장 다시 로드" 배너 지속. 교훈: clean-console용 `--disable-extensions`는 **기본이 아닌 별도 launch 구성**으로 두고, 기본은 확장 포함(디버그 동작). 온디맨드 설치는 설치 후 미인식 시 "Reload Window" 복구를 제공해 dead-end 루프 방지 | 세션 #004, `fix 39af4ac` |
| 3 | enum 옵션의 기본값이 선택지에도 있으면 "기본값 선택 시 오버레이 제거 → UI가 (default)로 튐" | 카탈로그 옵션 에디터에서 최소 오버레이(기본값=미저장) 정책과 드롭다운이 충돌 | INT-001 | MS-006 | 예: LTO 기본값 `false`인데 드롭다운에 `(default)`+`false` 중복 → `false` 선택 시 제거되어 `(default)`로 되돌아감(혼란). 교훈: 저장은 최소 유지하되 **UI는 실효값(저장값 ?? 기본값)을 표시**하고 별도 `(default)` 항목을 두지 않는다 | 세션 #004, TASK-014 |
| 4 | Webview 인라인 스크립트를 TS 템플릿 리터럴로 생성 시 `\n`이 실제 줄바꿈이 되어 스크립트 전체가 깨짐 | `return \`<script>...\``  안에서 JS 문자열에 `'\n'` 사용 | INT-001 | MS-007 | 바깥 템플릿 리터럴이 `\n`을 컴파일 시 진짜 줄바꿈으로 치환 → 웹뷰 JS에 미종료 문자열 → 스크립트 파싱 실패 → **설정 페이지 백지**(정적 topbar만 남음). 교훈: 웹뷰 스크립트 문자열엔 `\\n`(이스케이프). 검증: 생성된 HTML의 `<script>`를 `new Function()`으로 파싱 체크 | 세션 #005, TASK-019 |
| 5 | 확장이 커스텀 `type` Task를 실행하면 "작업 형식 없음" 경고 반복 | `new vscode.Task({type:'x',...}, ...)` + `executeTask`인데 `type` 미등록 | INT-001 | MS-007 | 빌드는 되지만 매 실행마다 "'x' 등록된 작업 형식이 없습니다" 경고. 교훈: 커스텀 Task `type`은 `package.json` `contributes.taskDefinitions`에 등록(속성 스키마 포함). `devSwitcher.cargo`·`devswitcher-buildevent` 등록으로 해소 | 세션 #005, TASK-019 |
| 6 | `showQuickPick(canPickMany)`는 셸 파일쓰기·빈 선택·OK 버튼에서 함정 | ① 파일 생성용 셸 명령 생성 ② 다중선택 칩 | INT-001 | MS-008 | ① **ShellExecution은 사용자 기본 셸(cmd/pwsh)을 제어 못 함** + C++ `<iostream>`·`<<`가 셸 리다이렉션과 충돌 → 파일 생성은 `workspace.fs`로. ② `showQuickPick(canPickMany)`는 **전부 해제 후 OK를 `undefined`(취소)와 구분 못 함** → 마지막 값 고착. 또 **OK 버튼을 숨길 수 없음**. 해결: `createQuickPick`(canSelectMany 없이)로 `$(check)` 토글 목록 구성 → OK 버튼 제거·클릭=라이브 토글·Esc=확정. ③ 다중선택 빈 배열 `[]`은 유효 상태(none)이니 reconcile이 삭제 않게 보존(전부-무효화만 폴백) | 세션 #006, TASK-023·fix e7b462b | 2026-08-16 |
| 7 | untrusted 워크스페이스에서 Task 실행 시 무한 대기 | 임시/미신뢰 폴더에서 build/run/create Task 실행 | INT-001 | MS-008 | VSCode가 Workspace Trust로 Task를 막으면 프로세스가 안 떠 **`onDidEndTaskProcess`가 영영 안 옴** → run Promise·프로젝트 락·상태바 스피너 고착(복구는 Reload Window뿐). 교훈: ① 실행 전 `vscode.workspace.isTrusted` 가드로 안내 후 차단 ② TaskRunner는 `onDidEndTaskProcess`뿐 아니라 **`onDidEndTask`(프로세스 없이 종료도 발화)** 도 청취해 항상 settle | 세션 #006, fix eb8983a | 2026-08-16 |
| 8 | 디버그 program 경로가 실제 빌드 출력과 어긋남 (출력 경로 축 누락) | resolveExecutable이 빌드와 다른 인자로 출력 경로를 계산 (dotnet RID 선택 시) | INT-001 | MS-010 | 디버그 program 경로는 **실제 빌드 아티팩트와 정확히 일치**해야 함(coreclr/디버거는 존재를 먼저 확인). 출력 경로가 RID/구성/TFM 등 축에 따라 하위폴더로 갈라지면(dotnet `-r`→`bin/<cfg>/<tfm>/<rid>/`) resolver가 축 하나만 빠뜨려도 없는 경로 실행→"프로그램이 존재하지 않습니다". **견고한 기법: 경로 추측 금지, 빌드와 동일 인자를 재사용해 도구에 물어봄** — dotnet `<build args> -getProperty:TargetPath`(단, 이건 **빌드 없이 평가만** 하므로 아티팩트는 오케스트레이터 사전 빌드가 보장), cargo `--message-format=json`. **CMake(빌드트리·구성별 출력) resolveExecutable(TASK-034)도 동일 원칙 적용** | 세션 #007, fix `de92085`, ADR-005 연장 | 2026-08-16 |

---

## 외부 참고 자료

| # | 제목 | 출처 | 요약 |
|---|------|------|------|
| 1 | AWS AI-DLC | [link](https://prod.d13rzhkk8cj2z0.amplifyapp.com/) | AI-Driven Development Lifecycle 방법론 |

---
