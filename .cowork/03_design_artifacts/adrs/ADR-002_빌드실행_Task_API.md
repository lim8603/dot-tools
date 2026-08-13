# ADR-002 (DD-02) — 빌드/실행을 VSCode Task API로 실행

## ADR ID
`ADR-002`

## 제목
빌드/실행을 `vscode.tasks.executeTask`(Task API)로 실행한다.

## 상태
`Accepted`

## 날짜
2026-08-13

---

## Context (맥락)
빌드/실행을 어떻게 구동할지 결정해야 한다. 개념설계 원안은 터미널에 명령을 전송(`runInTerminal`)했다.

## Decision (결정)
VSCode Task API로 실행한다. 기각: 터미널 명령 전송.

## 근거 / Consequences
- 터미널 방식은 **종료 코드를 받을 수 없어** `ensureBuilt()`(디버그 전 최신 빌드 보장)가 불가능하다.
- Task API는 `onDidEndTaskProcess`로 종료 코드 감지, problem matcher 연동(F13 자동 해결), 출력 패널 재사용을 제공한다.
- 어댑터는 `vscode.Task` 객체 생성까지만 책임지고 실행·대기·종료 코드 감지는 `TaskRunner`가 전담한다.
- `ProcessExecution`(배열 인자) 사용 → 셸 이스케이프 문제 원천 차단(NFR-002).

## 관련 문서
| 항목 | 참조 |
|------|------|
| 관련 Intent | INT-001 |
| 관련 Requirement | FR-005, NFR-002 |
| 관련 ADR | ADR-005(디버그 경로 해석은 이 위에 성립) |
| 출처 | 상세설계서 §2 DD-02, §7 |
