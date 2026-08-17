# ADR-018 — Run Group 준비 감지 (포트/HTTP 헬스체크, 멤버별 게이트)

## ADR ID
`ADR-018`

## 제목
Run Group 멤버의 "준비" 신호를 프로세스 시작(ADR-015)에서 **선택적 포트 open / HTTP 상태코드 게이트**로 강화한다. `RunGroupMember.readiness?`(additive·optional)로 멤버별 준비 조건(포트·URL·기대 상태코드·타임아웃)을 선언하며, **미설정 시 기존 프로세스 시작 준비**로 동작한다(하위호환). 준비 폴링은 **순수 제어 루프**(`core/readiness.ts`, now/sleep/signal 주입)와 **I/O 프로브**(`core/readinessProbe.ts`, `net` TCP·`http(s)` GET)로 분리한다. 준비 조건이 **타임아웃 내에 충족되지 않으면 그룹 시작을 중단(abort)하고 이미 시작된 멤버를 역순 teardown**한다(ADR-015의 시작 실패 처리와 동일). 준비 대기는 **취소 가능**(진행 알림 취소 버튼 → `CancellationToken` → `AbortSignal`을 sequencer/probe까지 전달)하다.

## 상태
`Accepted`

## 날짜
2026-08-17

---

## ADR 필요성 판단

- 제약·확장성: ADR-015가 명시적으로 후속 마이너로 분리한 준비 신호(프로세스 시작 → 헬스체크)를 확정한다. 그룹 전진 조건이라는 **핵심 실행 의미**를 바꾸므로 장기적으로 규정한다.
- 운영 영향: 새 I/O 경로(TCP/HTTP 프로브)·멤버별 준비 설정 UI·취소 경로가 코어에 추가된다. 타임아웃 실패 처리(abort vs 관대)가 사용자 경험을 가른다.
- 두 축 이상(준비 판정·실패 처리·취소)이 얽히고 계약(RunGroupMember)을 확장 → ADR로 남긴다.

---

## Context (맥락)

ADR-015는 Run Group의 준비 신호를 **프로세스 시작**(`onDidStartTaskProcess`)으로 정하고, **포트/헬스체크 기반 준비 감지는 후속 마이너(TASK-039)로 분리**했다. MS-018은 그 후속으로, v1.0.0 로드맵(D-21)의 마지막 기능이다.

프로세스 시작 ≠ 서비스 준비 완료다. 부팅이 느린 서비스(DB 마이그레이션·인덱스 로딩·컴파일 서버 등)는 프로세스가 떴어도 아직 요청을 받지 못한다. 이때 종속 멤버(예: `api`에 의존하는 `web`)가 먼저 시작되면 초기 연결이 실패한다. docker-compose의 `depends_on: { condition: service_healthy }`가 해결하는 문제와 동일하다.

따라서 멤버가 **실제로 준비되었는지**를 판정할 신호가 필요하다: (a) 포트가 열렸는지(TCP connect 성공) 또는 (b) HTTP 엔드포인트가 기대 상태코드를 반환하는지. 이 신호는 멤버마다 다르므로(포트/URL/타임아웃) 멤버별 설정이 필요하다.

---

## Decision Drivers (결정 요인)

- **하위호환·additive(ADR-001·ADR-015)** — `readiness`는 optional 필드. 기존 그룹(필드 부재)은 프로세스 시작 준비를 그대로 유지한다. 마이그레이션 불요.
- **순수/I/O 분리(coding_convention)** — 폴링 루프(언제 재시도·언제 포기)는 순수 함수로 단위테스트하고, 실제 소켓/HTTP는 얇은 I/O 계층에 격리한다(브리지 패턴 동형).
- **어댑터/UI 무지(INV-2·BR-003)** — 준비 감지는 순수 오케스트레이션 계층에 있다. 어댑터는 준비 조건을 모르고, UI는 `readiness` 스키마(kind/port/url/timeout)만 편집한다.
- **실패 시 안전(ADR-015 일관)** — 준비 실패는 시작 실패와 같은 의미(종속 서비스 부재)이므로 동일하게 abort+teardown한다. 헬스체크가 "힌트"로만 작동하면 종속 정확성이 무너진다.
- **응답성** — 준비 대기는 수 초~수십 초가 될 수 있으므로 취소 가능해야 한다(멈춘 그룹 시작을 사용자가 중단).
- **의존 최소화(ADR-009)** — Node 내장 `net`/`http`/`https`만 사용. 외부 포트 스캐너·HTTP 클라이언트 의존 없음.

---

## Options Considered (검토한 옵션)

### 준비 판정 신호

- **Option A — 포트 open + HTTP 상태코드(채택)**: 멤버별로 `port`(TCP connect) 또는 `http`(GET → 기대 상태코드) 게이트. 미설정 시 프로세스 시작. 정확하고 대다수 로컬 서비스 시나리오를 커버.
- **Option B — 고정 지연(stagger)**: 시작 후 N초 대기. 부정확(느린 서비스 놓침·빠른 서비스 과대기). ADR-015에서 이미 기각.
- **Option C — 로그 라인 매칭**: 서비스 stdout에서 "listening on…" 패턴 대기. 강력하나 언어/프레임워크별 패턴 지식 필요(INV-2 위반)·Task 출력 캡처 복잡. 범위 밖.

### HTTP 준비 판정 기준

- **Option A — 지정 상태코드(기본 200) 일치(채택)**: 멤버별 `expectStatus`(기본 200). 대부분의 `/health` 200 엔드포인트에 정확하고, 로드맵 명세("HTTP 200")에 부합. 필요 시 멤버가 다른 코드 지정.
- **Option B — 2xx 아무거나**: 201/204도 수용. 살짝 관대하나 특정 코드 검증 불가.
- **Option C — 응답만 오면 준비**: 404/500도 "서버 살아있음"으로 판정. 준비 엔드포인트가 없는 서버에 유용하나, 앱이 아직 라우트를 못 붙인 상태도 준비로 오판. → 정확성 우선으로 A 채택.

### 타임아웃 시 처리

- **Option A — 그룹 중단 + teardown(채택)**: 준비 실패 = 종속 서비스 부재. ADR-015의 시작 실패 처리(역순 terminate)와 동일. 종속 정확성 보장.
- **Option B — 경고 후 계속**: 멤버는 실행 유지, 종속도 시작. 관대하나 종속 체인이 무너져 "준비 게이트"의 의미가 사라짐.

### 취소

- **Option A — 취소 가능(채택)**: `withProgress`를 cancellable로. `CancellationToken` → `AbortSignal`을 `sequenceGroup`·`pollUntilReady`·프로브까지 전달. 취소 시 대기 중단·시작된 멤버 teardown.
- **Option B — 취소 불가**: 단순하나 준비가 안 오면 타임아웃(최대 수십 초)까지 사용자가 손 못 씀.

---

## Decision (결정)

**준비=Option A(포트+HTTP) · HTTP=Option A(지정 코드 기본 200) · 타임아웃=Option A(abort+teardown) · 취소=Option A(취소 가능)**. 세부:

- **모델(순수·additive)**: `RunGroupMember.readiness?: ReadinessProbe`.
  ```ts
  type ReadinessProbe =
    | { kind: 'port'; port: number; timeoutMs: number }
    | { kind: 'http'; url: string; expectStatus?: number; timeoutMs: number };
  // 필드 부재 = 프로세스 시작 준비(ADR-015 기본값)
  ```
  포트 프로브 호스트는 `127.0.0.1` 고정(로컬 개발), HTTP는 URL에 호스트 포함.
- **순수 폴링(`core/readiness.ts`)**: `pollUntilReady(attempt, { timeoutMs, intervalMs, now, sleep, signal })` — 즉시 1회 시도 후 `intervalMs`(기본 500ms) 간격으로 데드라인까지 재시도. `attempt()` true → `{ready:true}`, 데드라인 초과/`signal.aborted` → `{ready:false}`. now/sleep/signal 주입 → vscode·타이머 무의존 단위테스트.
- **I/O 프로브(`core/readinessProbe.ts`·vscode-free)**: `probePort`(`net.connect`, connect=성공·error/타임아웃=미준비)·`probeHttp`(`http`/`https`.get, `statusCode===expectStatus`)·`waitForReadiness(probe, signal)`(실제 `Date.now`/`setTimeout`으로 `pollUntilReady` 구동). 각 시도는 짧은 소켓 타임아웃으로 블랙홀 호스트 방지.
- **검증(순수)**: `validateGroup`에 준비 조건 검사 추가 — 포트 1..65535 정수, http url은 `http(s)://`, `timeoutMs > 0`.
- **편집(순수)**: `withMemberReadiness(group, projectId, readiness | undefined)` — undefined면 필드 제거(프로세스 준비로 복귀).
- **실행 배선(`GroupOrchestrator.startMember`)**: 프로세스 spawn(`startedTask.ready`) 후 멤버에 `readiness`가 있으면 `waitForReadiness`로 게이트. 결과가 미준비면 `{started:false}` → `sequenceGroup`이 abort+역순 teardown. `runGroup`은 `withProgress({cancellable:true})`로 열고 `CancellationToken`→`AbortController`→`AbortSignal`을 `sequenceGroup`·게이트에 전달.
- **UI(Run Groups 탭)**: 멤버 행에 준비 조건 편집기(kind: process/port/http 드롭다운 + 조건부 port/url/status/timeout 입력). `GroupView.members`에 `readiness` 노출, `setMemberReadiness` 메시지 추가. UI는 스키마만 다루고 프로브 구현을 모른다(INV-2).
- **버전**: v0.8.0(MINOR, vsix+태그). v1.0.0 로드맵(D-21)의 마지막 기능 — 이후 MS-014 최종점검+게시.

## Consequences (결과)

### 긍정적
- 부팅이 느린 서비스도 종속 멤버가 실제 준비 후 시작 → ADR-015의 핵심 trade-off(프로세스 시작 ≠ 준비 완료) 해소.
- additive·optional이라 기존 그룹·저장 상태 무변경으로 호환. 준비 미설정 멤버는 기존 동작 유지.
- 순수/I/O 분리로 폴링 로직 단위테스트, 실 프로브는 F5 스모크. 어댑터/UI 무변경(INV-2 재확인).
- 취소 가능·abort+teardown으로 멈춘/실패한 그룹 시작을 안전하게 정리.

### 부정적 / Trade-off
- 준비 대기가 그룹 시작 시간을 늘린다(최대 멤버 타임아웃 합). 취소 버튼·합리적 기본 타임아웃으로 완화.
- TCP/HTTP 프로브라는 I/O 경로가 코어에 추가 — 각 시도 소켓 타임아웃·리소스 정리(소켓/요청 destroy)를 명확히 유지해야 한다.
- HTTP=지정 코드 정확 일치라, 리다이렉트(3xx)나 준비 엔드포인트가 없는 서버는 사용자가 코드/URL을 맞춰야 한다(응답-만-오면 준비는 미채택).
- 준비 조건은 export 미포함(그룹 자체가 export 밖, ADR-015) — v1 의도적 범위.

---

## 관련 문서

| 항목 | 참조 |
|------|------|
| 관련 Intent | INT-001 |
| 관련 Milestone | MS-018 (TASK-051~053) |
| 관련 ADR | ADR-015(Run Group 실행 모델·준비=프로세스 시작), ADR-001(workspaceState 저장), ADR-009(의존 온디맨드), ADR-013(파일 무편집), ADR-003(어댑터 무지 UI) |
| 관련 타입 | `src/core/types.ts`(ReadinessProbe·RunGroupMember.readiness), `src/core/readiness.ts`(순수 폴링), `src/core/readinessProbe.ts`(I/O 프로브), `src/core/runGroupPlan.ts`(검증·편집) |
| 관련 결정 | D-21(v1.0.0 로드맵·MS-018=마지막 기능), 세션 #014 Human 결정(타임아웃=abort·HTTP=지정코드·취소 가능) |
| 출처 | 세션 #014 논의 (2026-08-17), Human 승인(3개 설계 결정) |
