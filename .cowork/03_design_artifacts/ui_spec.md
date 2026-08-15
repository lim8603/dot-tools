# UI Spec — 화면설계서 (경량)

> DevSwitcher Tools의 사용자 대면 UI 설계. 상태바는 상세설계서 §5로 충분하므로 여기서는
> **설정 페이지(SettingsPanel, MS-006)** 레이아웃을 중심으로 기술한다. (C-1, 세션 #004에서 착수)
>
> 근거: 상세설계서 §5(상태바)·§10(설정 페이지), ADR-011(호출 구성 오버레이), ADR-012(설정 페이지·옵션 카탈로그), `interface_contract.md` §7·§8.

---

## 1. 상태바 (StatusBarController) — 요약

구현 완료(MS-004). 상세는 상세설계서 §5. 좌측 정렬, 프로젝트 칩이 가장 왼쪽.

```
$(repo) hello  $(layers) dev  $(chip) (Architecture)  $(checklist) default  $(symbol-method) hello   [$(tools)][$(debug-alt)][$(play)]
   프로젝트        Profile        Architecture(미선택)        Features            Target(required)          Build Debug Run
```

- 미선택 표시 `(라벨)`, required 미선택 = `warningBackground`, 매니페스트 오류 = 프로젝트 칩 `errorBackground`, 실행 중 = `$(sync~spin)`.
- 칩 클릭 → QuickPick, 액션 버튼 클릭 → build/run/debug.

---

## 2. 설정 페이지 (SettingsPanel, WebviewPanel) — MS-006

진입: 명령 `DevSwitcher: Open Settings`(`devSwitcher.openSettings`). 에디터 탭으로 열리는 WebviewPanel.
원칙(§10.1): **값을 자체 저장하지 않는다.** 캐노니컬 정의(계층②)는 읽기 전용, 호출 구성 오버레이(계층③)만 `(프로젝트×구성)`별 `workspaceState`에 저장.

### 2.1 전체 레이아웃 (마스터-디테일)

```
┌─ DevSwitcher Settings ─────────────────────────────────────────────┐
│ Project: [ hello ▼ ]   Profile: [ dev ▼ ]              [Refresh]    │  ← 상단 컨텍스트 바
├──────────────┬─────────────────────────────────────────────────────┤
│ TABS (좌)    │ DETAIL (우)                                          │
│              │                                                      │
│ • Project    │  (선택된 탭 내용)                                    │
│ • Profile    │                                                      │
│ • Features   │                                                      │
│ • Invocation │                                                      │
│ • General    │                                                      │
└──────────────┴─────────────────────────────────────────────────────┘
```

- **탭 표시 조건(§10.2, 칩/카테고리 기반 — 어댑터 추가 시 코드 무변경)**:
  | 탭 | 표시 조건 | 저장 |
  |---|---|---|
  | Project | 항상 | activeProjectId |
  | Profile | `chips`에 `profile` | (v1 읽기전용, 편집 v2) |
  | Features | `chips`에 `features` | 선택=StateStore, 정의=RO |
  | Invocation | `configCategories` 비어있지 않음 | InvocationConfig (프로젝트×구성) |
  | General | 항상 | — (export/import은 TASK-015) |

### 2.2 Invocation(호출 구성) 탭 — 옵션 카탈로그 브라우저 (핵심)

```
┌ Categories ─┬ Options (opt catalog) ─┬ Editor / Detail ──────────────┐
│ Compiler  ▸ │ • Optimization level   │ Optimization level            │
│ Linker      │ • LTO                  │ ─────────────────────────────  │
│ Output      │ • Codegen units        │ How much the compiler         │
│ Env         │                        │ optimizes... (description)    │
│ Run args    │                        │                               │
│ Build events│                        │ Value: [ 3 ▼ ]  (enum editor) │
│             │                        │ e.g. cargo build --config     │
│             │                        │      profile.dev.opt-level=3  │
└─────────────┴────────────────────────┴───────────────────────────────┘
  Command preview:  cargo build -p hello --profile dev --config profile.dev.opt-level=3
```

- 3단 마스터-디테일: **카테고리 → 옵션(OptionSpec) → 에디터**. 에디터 타입은 `OptionSpec.type`으로 결정:
  - `enum` → 드롭다운(`allowedValues`) · `bool` → 토글 · `int` → 숫자 입력 · `string` → 텍스트 · `stringList` → 여러 줄.
- 각 옵션은 **설명·예제**(`description`/`example`)를 함께 표기(옵션을 모르는 개발자 교육, ADR-012).
- **Run args / Build events**는 카탈로그가 아닌 자유 편집: runArgs 1줄 입력 → 순수 `parseArgsLine()`로 토큰화해 미리보기.
- 하단 **명령 미리보기**: 현재 선택+오버레이로 조립될 실제 `cargo …` 명령을 실시간 표시.
- `configCategories`에 없는 카테고리는 숨김 — 예: Python은 `actions.build=false`라 Compiler/Linker/Output이 사라지고 Env·Run args만 남음(리트머스, INV-2).

### 2.3 상호작용 / 데이터 흐름 (§10.3)

- **단방향**: Webview는 상태를 자체 보관하지 않고, 변경 시 확장에 메시지를 보내고 → 확장이 갱신된 `state`를 되돌려줌.
- 메시지: `ready`·`switchProject`·`setChipValue`·`setInvocation`·(`export`/`import`은 TASK-015) ↔ `state`/`error`.
- **CSP**: `default-src 'none'; script-src ${cspSource}; style-src ${cspSource}` — 외부 리소스 금지. 스크립트/스타일은 인라인(nonce) 또는 확장 번들 자원만.
- `retainContextWhenHidden: false` — 숨겨지면 상태는 다음 표시 시 재요청(메모리 절약).

---

## 3. QuickPick (칩 선택) — 요약

구현 완료(MS-004, §5.3). 단일=`showQuickPick`, 복수(features)=`canPickMany`, 현재값 `picked` 표시. 취소 시 미변경.

---

## 4. 미해결 / 후속

- 프로파일 **편집**(커스텀 프로파일 생성, `opt-level` 등 스칼라 국소편집) = **v2**(ADR-011, 구 §8.7). v1은 읽기전용.
- export/import(F12) UI = TASK-015(분리). `devswitcher.profile.json`.
- 시작 마법사(F20) QuickPick 플로우 = MS-008에서 별도 기술.
