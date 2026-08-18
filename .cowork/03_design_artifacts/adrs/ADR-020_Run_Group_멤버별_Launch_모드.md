# ADR-020 — Run Group 멤버별 Launch 모드 (Run / Debug)

## ADR ID
`ADR-020`

## 제목
Run Group 멤버는 **멤버별 Launch 모드(Run/Debug)**를 가진다(MS-021, v1.1.0). `RunGroupMember.debug?: boolean`(additive)으로 저장하고, 그룹 기동 시 debug 멤버는 run task 대신 **어댑터의 `createDebugConfig` → `vscode.debug.startDebugging`**으로 시작한다. 디버그 세션은 run 멤버와 동일한 `StartedTask` 형태로 래핑되어 준비 게이트(포트/HTTP, ADR-018)·추적·teardown(`stopDebugging`)이 균일하게 적용된다. **ADR-015의 "멤버=Run 전용" 항목을 대체**한다(나머지 항목 — 계층적 위상정렬·teardown·workspaceState 저장 — 은 유지).

## 상태
`Accepted` (ADR-015 일부 대체)

## 날짜
2026-08-18

---

## Context (맥락)

ADR-015(세션 #011)는 Run Group 멤버를 **Run 전용**으로 결정했다 — 당시 Human 결정이었고 구현 단순화가 목적이었다. v1.0.0 실사용에서 Human이 직접 격차를 보고했다(세션 #016): *"런그룹, 이거 그냥 실행이라 디버깅 하고 싶을 땐 어떻게 하지?"* — 그룹으로 서비스 체인을 띄운 뒤 그중 한 서비스에 중단점을 걸고 싶은 것은 멀티서비스 개발의 표준 워크플로다. 우회(멤버를 그룹에서 빼고 그룹 기동 후 개별 Ctrl+Alt+D)는 종속 순서·준비 게이트를 잃는다.

기술적 제약: 디버그 세션은 Task가 아니라 `vscode.tasks.taskExecutions`에 안 잡히고, `startDebugging`은 boolean만 반환한다. 세션 획득은 `onDidStartDebugSession`에서 구성 이름(`Debug <project>` — 전 어댑터 공통 네이밍)으로 매칭해야 한다.

## Decision (결정)

- **모델**: `RunGroupMember.debug?: boolean` — additive, 생략=Run(기존 그룹 무변경). 순수 편집 `withMemberLaunch`(false=필드 제거). `withMemberReadiness`의 클리어 경로는 다른 필드를 보존하도록 수정(재구성 → 필드 삭제).
- **기동**: `startMember`가 debug 멤버를 분기 — 빌드 규칙은 개별 Debug와 동일(`actions.build && debugRequiresBuild !== false`, ADR-016의 Node 예외 유지). `startDebugMember`가 세션을 `StartedTask` 형태(`ready`=startDebugging 성공, `done`=onDidTerminateDebugSession, `terminate`=stopDebugging)로 래핑 → 추적·prune·teardown 코드 무변경.
- **준비 게이트**: run과 동일하게 `gateReadiness` 적용 — 디버그로 띄운 서비스도 포트/HTTP 게이트로 종속 멤버를 대기시킬 수 있다.
- **안전 장치**: 세션 미포착 시 `terminate`는 no-op — `stopDebugging(undefined)`은 소유하지 않은 세션까지 전부 죽이므로 금지.
- **어댑터 veto 일관성**: 그룹 기동 경로에도 `validateAction`(ADR-019)을 적용 — lib 타겟 멤버는 run/debug 모두 멤버 이름을 지목하며 fail-fast.
- **UI**: 멤버 카드에 **Launch** 셀렉트(Run/Debug) 추가, `setMemberLaunch` 메시지로 저장.

## Consequences (결과)

- (+) 그룹 체인 안에서 특정 서비스만 중단점 디버깅 — VS의 다중 시작 프로젝트(Multiple startup projects: Start/Start with debugging)와 동등한 UX.
- (+) additive 저장 — 기존 그룹·프로파일 export 하위 호환.
- (−) debug 멤버는 TaskRunner 프로젝트 락을 잡지 않는다(개별 Debug와 동일한 기존 특성). skip-if-running 가드는 task 기준이므로, 동일 프로젝트를 이미 개별 디버깅 중이면 그룹이 세션을 하나 더 띄울 수 있다 — 개별 Debug 동작과 동일한 한계로 수용.
- (−) 세션 매칭이 구성 이름 기반 — 어댑터 네이밍(`Debug <project>`)이 계약이 된다(기존에도 stop/Stop 버튼이 같은 가정 사용).

## 관련
- ADR-015(대체되는 "Run 전용" 항목·유지되는 실행 모델) · ADR-018(준비 게이트) · ADR-016(Node debugRequiresBuild:false) · ADR-019(validateAction)
- 세션 #016 Human 요청 · TASK-062
