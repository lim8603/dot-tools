# Verification Evidence

> 검증 근거 인덱스 — 테스트, 리뷰, NFR, 릴리즈 readiness 근거를 한곳에서 요약하고 연결한다

---

## 목적

이 문서는 Verify 단계에서 생성되는 근거를 **게이트 판정용 canonical 인덱스**로 정리한다.

- 세션 로그나 개별 Task 문서에 흩어진 검증 근거를 빠르게 복원한다
- Gate 4, Gate 5 판정 시 "무엇이 검증되었고 어디에 근거가 있는가"를 한 번에 보여 준다
- 원본 로그, 스크린샷, 외부 리포트를 이 문서에 복제하지 않고 **요약 + 위치 링크**만 유지한다
- TDD처럼 테스트량이 누적되는 프로젝트에서도, 이 문서는 로그 저장소가 아니라 **신뢰 가능한 증거 인덱스**로 유지한다

---

## 문서 정보

| 항목 | 내용 |
|------|------|
| 관련 Intent | 활성 Intent 또는 관련 `INT-*` 참조 |
| 관련 Milestone | 검증 근거가 연결되는 `MS-*` (해당 시) |
| 관련 Test Strategy | `test_strategy.md` |
| 관련 Test Case | `test_case.md` |
| 버전 | 프로젝트 기준 |

---

## 운영 원칙

- 이 문서는 Verify/Release 판정의 **증거 요약 인덱스**다.
- 상세 절차와 기대 결과는 `test_strategy.md`, `test_case.md`, `review_checklist.md`, 관련 `TASK-*` 문서에서 관리한다.
- 원본 실행 로그, 외부 리포트, 측정 결과 원문은 원래 위치에 두고, 이 문서에는 무엇을 입증하는지와 위치만 적는다.
- 가능하면 Gate 4, Gate 5 항목은 `EV-*` ID로 추적한다.
- 근거가 아직 부족하면 삭제하지 말고 `Open Evidence Gaps`에 남긴다.

---

## 근거 영역 요약

| 영역 | 최근 상태 | 주요 근거 문서 | 마지막 갱신일 | 비고 |
|------|----------|----------------|--------------|------|
| Review Evidence | Not Started / In Progress / Ready | `04_implementation/review_checklist.md`, 관련 `TASK-*` | | |
| Test Execution Evidence | Not Started / In Progress / Ready | `test_case.md`, 관련 실행 로그/리포트 | | |
| NFR Evidence | Not Started / In Progress / Ready | `test_strategy.md`, 관련 측정 결과 | | |
| Release Readiness Evidence | Not Started / In Progress / Ready | `quality_gate.md`, `project_state.md`, 관련 release source | | |

---

## Evidence Index

| EV ID | 유형 | 검증 대상 / 범위 | 판정 | 관련 Gate | 원본 근거 위치 | 마지막 갱신일 | 비고 |
|-------|------|------------------|------|-----------|----------------|--------------|------|
| EV-001 | Review / Unit / Integration / E2E / NFR / Release | | Pass / Fail / Partial / Deferred | Gate 4 / Gate 5 | | YYYY-MM-DD | |

---

## Gate 판정 메모

| Gate | 판정 상태 | 핵심 EV ID | 요약 | 비고 |
|------|-----------|------------|------|------|
| Gate 4 | Ready / Blocked / Partial | `EV-*` | | |
| Gate 5 | Ready / Blocked / Partial | `EV-*` | | |

---

## Open Evidence Gaps

| ID | 항목 | 부족한 근거 | 다음 액션 | 상태 |
|----|------|------------|----------|------|
| GAP-001 | | | | Open / Resolved / Deferred |
