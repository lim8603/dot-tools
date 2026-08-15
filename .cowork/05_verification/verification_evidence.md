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
| 관련 Intent | INT-001 |
| 관련 Milestone | MS-001~006 (구현) · MS-007 (검증·배포) |
| 관련 Test Strategy | `test_strategy.md` |
| 관련 Test Case | `test_case.md` |
| 마지막 갱신일 | 2026-08-15 (TASK-020) |

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
| Review Evidence | In Progress | 세션 로그 #004·#005, 커밋 이력 | 2026-08-15 | 각 Task F5 통과 후 병합 |
| Test Execution Evidence | In Progress | `test_case.md`(Auto 3 + Manual 13) | 2026-08-15 | Unit 92·Integration 3 Pass, Manual 7 Pass/2 Partial/4 Not Run |
| NFR Evidence | Partial | `test_strategy.md` §3 | 2026-08-15 | NFR-002/002a 설계 준수. 성능 NFR 별도 측정 없음 |
| Release Readiness Evidence | Blocked | `quality_gate.md`, TASK-021 | 2026-08-15 | README·VSIX(021) + TC-11(WSL) 미완 |

---

## Evidence Index

| EV ID | 유형 | 검증 대상 / 범위 | 판정 | 관련 Gate | 원본 근거 위치 | 마지막 갱신일 | 비고 |
|-------|------|------------------|------|-----------|----------------|--------------|------|
| EV-001 | Unit | 순수 코어 92 케이스(파서·reconcile·오버레이·export·진단·argsLine) | Pass | Gate 4 | `out/test/unit`, `npm run test:unit` | 2026-08-15 | CI 가능 |
| EV-002 | Integration | 확장 활성화·9 커맨드 기여·설정 페이지 오픈 | Pass | Gate 4 | `src/test/integration/extension.test.ts`, `npm run test:integration` (3 passing) | 2026-08-15 | VSCode 호스트 실행 |
| EV-003 | E2E(Manual) | TC-01·04·05·07·08·12·13 (칩·빌드·디버그·watcher·export/import·target add·Doctor) | Pass | Gate 4 | 세션 로그 #004·#005 F5 | 2026-08-15 | 7 케이스 |
| EV-004 | E2E(Manual) | TC-06(디버그×오버레이)·TC-10(E1 칩) | Partial | Gate 4 | 세션 #005 | 2026-08-15 | 코어 검증됨, 결합 재확인 권장 |
| EV-005 | E2E(Manual) | TC-11(WSL/F18)·TC-09(재시작)·TC-02/03(workspace·멀티루트) | Not Run | Gate 5 | — | 2026-08-15 | 릴리즈 전 보강 대상 |

---

## Gate 판정 메모

| Gate | 판정 상태 | 핵심 EV ID | 요약 | 비고 |
|------|-----------|------------|------|------|
| Gate 4 | Partial | EV-001·002·003 | Unit·Integration·핵심 Manual Pass. TC-06·10 Partial | MS-007 진행 중 |
| Gate 5 | Blocked | EV-005 | README·VSIX(TASK-021) + WSL(TC-11) 미완 | 릴리즈 게이트 |

---

## Open Evidence Gaps

| ID | 항목 | 부족한 근거 | 다음 액션 | 상태 |
|----|------|------------|----------|------|
| GAP-001 | F18 원격(WSL) 동일 동작 | TC-11 미실행 | WSL 창에서 시나리오 1~7 수동 스모크 | Open (TASK-021 전) |
| GAP-002 | 재시작 후 workspaceState 복원 | TC-09 미실행 | VSCode 재시작 후 선택 복원 확인 | Open |
| GAP-003 | workspace(멀티멤버)·멀티루트+Python 스텁 회귀 | TC-02·03, 픽스처 부재 | 멀티멤버 픽스처 추가 또는 수동 확인 | Open |
| GAP-004 | 성능 NFR 측정 | 측정치 없음 | v0.1은 규모 작아 정성 판단, 필요 시 측정 | Deferred |
