# Coding Convention

> 코드 작성 규칙 — AI가 생성하는 코드와 Human이 작성하는 코드가 동일한 스타일을 유지하도록
> 명시적인 규칙을 정의한다.

---

## 사용 방법

1. **기술스택 확정 시**: `03_design_artifacts/tech_stack.md`에 기술이 확정되면, AI가 이 문서의 언어/프레임워크별 섹션을 자동으로 구성한다.
   - 확정된 기술에 해당하는 컨벤션 섹션만 존재한다.
   - 프로젝트에서 사용하지 않는 기술의 컨벤션은 포함하지 않는다.
   - 기존에 없는 기술이 선정되면 AI가 모범 사례 기반으로 초안을 제안한다.
2. **AI 자동 적용**: `CLAUDE.md` 또는 `copilot-instructions.md`에서 이 파일을 참조하므로,
   세션 시작 후 AI가 자동으로 해당 컨벤션을 따른다.
3. **추가/수정**: 팀 규칙에 맞게 각 섹션을 자유롭게 수정한다.

---

## 공통 규칙 (모든 언어)

| 항목 | 규칙 |
|------|------|
| 파일 인코딩 | UTF-8 |
| 줄 끝 | LF (Windows 프로젝트는 CRLF) |
| 후행 공백 | 제거 |
| 최종 개행 | 파일 끝 개행 1개 |
| 대화 언어 | 한국어 |
| 코드 / 커밋 언어 | 영문 |

### 주석 규칙 (공통)

| 항목 | 규칙 |
|------|------|
| 공개 API | 반드시 문서 주석 작성 |
| 복잡한 로직 | Why 중심 주석 (What은 코드가 설명) |
| TODO | `// TODO(담당자): 설명` |
| FIXME | `// FIXME: 설명 + 재현 조건` |

### Git 컨벤션 (공통)

**Commit Message (Conventional Commits)**
```
<type>(<scope>): <subject>

<body>

<footer>
```
**Types:** `feat` `fix` `refactor` `docs` `test` `chore` `perf` `ci`

**Branch Naming**
```
<type>/<short-description>
예: feat/motion-planner-refactor, fix/velocity-overflow
```

### Git Workflow (팀 프로젝트)

> 아래는 기본 템플릿이다. 프로젝트 초기에 AI가 팀 규모와 프로젝트 성격을 분석하여 적절한 전략을 제안하고, Human 승인 후 확정한다.

**브랜치 전략**

| 브랜치 | 역할 | 머지 대상 |
|---------|------|----------|
| `main` | 안정 릴리즈 | ← `develop` (Quality Gate 통과 후) |
| `develop` | 통합 개발 | ← `feature/*`, `fix/*`, `docs/*` |
| `feature/<설명>` | 기능 개발 | → `develop` |
| `fix/<설명>` | 버그 수정 | → `develop` |
| `docs/<설명>` | 문서 변경 (`.cowork/` 포함) | → `develop` |

> 1인 프로젝트나 소규모 팀에서는 `main` + `feature/*` 단순 구조로 충분하다.

**머지 규칙**

| 대상 | 규칙 |
|------|------|
| feature → develop | PR 필수, 최소 1인 리뷰 (팀 2인 이상 시) |
| develop → main | Quality Gate 통과 + Master 승인 |
| 긴급 수정 (hotfix) | main에서 분기 → main + develop 동시 머지 |

**커밋 분리 원칙**

| 커밋 유형 | 접두사 | 예시 |
|----------|---------|------|
| `.cowork/` 문서 변경 | `docs(cowork):` | `docs(cowork): update project_state for Phase 2` |
| 소스코드 변경 | `feat/fix/refactor:` | `feat(planner): add velocity limit check` |
| 테스트 변경 | `test:` | `test(planner): add boundary condition tests` |

> `.cowork/` 문서 변경과 소스코드 변경은 별도 커밋으로 분리한다.

### .cowork 파일 충돌 방지 및 해결

팀 프로젝트에서 `.cowork/` 파일의 머지 충돌을 최소화하기 위한 규칙이다.

**충돌 방지 설계**

| 파일 | 수정 범위 | 충돌 위험 |
|------|----------|----------|
| `project_state.md` | 세션 종료 시 동기화 | 중간 — push 전 pull 필수 |
| `team_board.md` | 각자 담당 행만 수정 | 낮음 — 행 단위 분리로 충돌 최소 |
| `my_state.md` | 본인만 수정 | 없음 |
| 개인 `session_logs/` | 본인만 생성, git 제외 | 없음 |
| ADR 파일 | 신규 생성 (기존 수정 듬무) | 낮음 |
| `deliverable_plan.md` | 확정 후 변경 드뭄 | 낮음 |
| `requirement_spec.md` 등 공유 문서 | 복수 팀원 수정 가능 | 중간 — docs/ 브랜치 권장 |

**충돌 발생 시 해결 우선순위**

1. **`project_state.md`**: 최신 세션 데이터 우선 — 더 최근에 갱신된 데이터 채택
2. **`team_board.md`**: 각자 담당 행은 해당 팀원의 버전 우선
3. **공유 소스 문서**: 승인된 ADR/결정 기록 우선 → 세션 로그 → 대화 내용
4. **판단 불가 시**: 두 버전 모두 보존하고 Human에게 확인 요청

---

## 언어/프레임워크별 컨벤션

> 확정 기술스택: TypeScript / esbuild / VSCode Extension API (`tech_stack.md`).

### 프로젝트 폴더 구조 (2026-08-13 확정)

```
devswitcher-tools/
├─ .vscode/ { launch.json (F5 디버그), tasks.json }
├─ src/
│  ├─ extension.ts              # activate/deactivate, 배선(wiring)만
│  ├─ core/
│  │  ├─ types.ts               # 전체 타입 단일 정의 지점 (interface_contract 기준)
│  │  ├─ adapterRegistry.ts     # 스캔·어댑터 매칭 (ADR-006)
│  │  ├─ orchestrator.ts        # 명령 핸들러, 활성 컨텍스트
│  │  ├─ stateStore.ts          # workspaceState·reconcile·export/import (ADR-001)
│  │  ├─ taskRunner.ts          # Task 실행 → 종료 코드 (ADR-002)
│  │  └─ manifestWatcher.ts     # FileSystemWatcher + 디바운스 (F17)
│  ├─ ui/
│  │  ├─ statusBar.ts           # 칩/버튼 렌더 (어댑터 무지, ADR-003)
│  │  ├─ picks.ts               # QuickPick 헬퍼
│  │  ├─ newProjectWizard.ts    # ★F20 시작 마법사 플로우
│  │  └─ settingsPanel/         # Webview (HTML/메시지 프로토콜)
│  ├─ adapters/
│  │  ├─ cargo/ { cargoAdapter, cargoBridge, cargoToml }   # v1 구현
│  │  ├─ cmake/cmakeAdapter.ts      # 스텁 (+ createProjectTask ★F20)
│  │  ├─ dotnet/dotnetAdapter.ts    # 스텁 (+ createProjectTask ★F20)
│  │  └─ python/pythonAdapter.ts    # 스텁 (칩 선언 + createProjectTask ★F20)
│  └─ test/ { unit/, integration/, fixtures/ }
├─ package.json         # 매니페스트 + contributes (commands·keybindings·problemMatchers·configuration)
├─ tsconfig.json · esbuild.js · .vscodeignore · eslint.config.js
├─ .gitignore · README.md · CHANGELOG.md · LICENSE · icon.png
└─ dist/ · node_modules/   (gitignore)
```

- `src/` 구조는 상세설계서 §3.2 승계 + F20 반영. LSP가 아니므로 client/server 분리 없음(레이어드 단일 src).

### TypeScript / VSCode 확장 컨벤션

| 항목 | 규칙 |
|------|------|
| 명명 | 함수·변수 `camelCase`, 타입·클래스 `PascalCase`, 파일 `camelCase.ts` |
| 타입 정의 | `core/types.ts` 단일 지점. 어댑터·UI는 여기서 import |
| 의존 방향 | UI(statusBar/settingsPanel) → Orchestrator → Adapter. **역방향 금지**(INV-2) |
| 순수 함수 분리 | 파싱·인자 조립(`cargoBridge` 등)은 VSCode API 무의존 순수 함수로 → 단위 테스트 대상 |
| 경로 | `vscode.Uri`·워크스페이스 API 기반. OS 경로 형식 가정 금지(원격 안전, ADR-008) |
| 프로세스 실행 | `ProcessExecution`(배열 인자) + Task API. 셸 문자열 지양(NFR-002) |
| 산출물 경로 | 조합 금지 — cargo가 알려주는 값 사용(ADR-005) |
| 에러 처리 | `DevSwitcherError(code, message, cause?)`로 래핑. 사용자 메시지 ↔ Output 채널 상세 로그 분리 |
| 어댑터 추가 | `chips[]` + `listItems` + Task 생성 + `createProjectTask`만 구현. UI/오케스트레이터 무변경(ADR-003) |
| Webview | CSP `default-src 'none'`, 외부 리소스 금지. 상태는 확장에서 재요청(단방향) |

> 1인 프로젝트: 브랜치는 `main` + `feature/*` 단순 구조. `.cowork/` 문서 커밋은 `docs(cowork):`, 소스는 `feat/fix/refactor:`로 분리.
