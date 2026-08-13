# ADR-001 (DD-01) — 선택 상태를 workspaceState(Memento)에 저장

## ADR ID
`ADR-001`

## 제목
프로파일·아키텍처·타깃 등 선택 상태를 `context.workspaceState`(Memento)에 저장한다.

## 상태
`Accepted`

## 날짜
2026-08-13

---

## Context (맥락)
선택 상태(프로파일/아키텍처/features/타깃)를 어디에 영속화할지 결정해야 한다. 개념설계 원안은 워크스페이스 `settings.json`에 저장했다.

## Decision (결정)
`context.workspaceState`(Memento)에 저장한다. 기각: `settings.json` 저장.

## 근거 / Consequences
- `settings.json`은 `.vscode/`가 git에 커밋되는 순간 개인 선택 상태가 팀원과 충돌하고 diff를 오염시킨다.
- `workspaceState`는 기계 로컬·워크스페이스별 저장이라 이 문제가 없다.
- 공유가 필요할 때만 F12 export/import로 명시적으로 파일화 → **F12의 존재 이유가 명확해진다**.
- 부수 이점: 같은 레포를 Windows 창 + WSL 창으로 열면 각 창이 선택 상태를 독립 기억(§12.4).
- Trade-off: 선택 상태는 기계 로컬이라 클론 간 자동 공유 안 됨(의도된 것 — 공유는 F12).

## 관련 문서
| 항목 | 참조 |
|------|------|
| 관련 Intent | INT-001 |
| 관련 Requirement | FR-004 |
| 관련 ADR | ADR-007(SSOT, 값 아닌 선택만 저장) |
| 출처 | 상세설계서 §2 DD-01, §6 |
