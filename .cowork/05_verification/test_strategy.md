# Test Strategy

> 테스트 전략 — 무엇을, 어떻게, 어느 수준까지 검증할 것인가

---

## 문서 정보

| 항목 | 내용 |
|------|------|
| 관련 Intent | INT-001 |
| 관련 Milestone | MS-007 (M6 품질·배포) |
| 관련 Requirement Spec | `02_project_definition/requirement_spec.md` |
| 관련 Verification Evidence | `verification_evidence.md` |
| 출처 | 상세설계서 §15.1(단위)·§15.2(통합) |

---

## 1. 테스트 피라미드 (3계층)

| 계층 | 범위 | 도구 | 실행 | 현황 |
|------|------|------|------|------|
| **Unit** | vscode 무의존 순수 코어(파서·상태 판정·오버레이·진단·export) | mocha (`out/test/unit`) | `npm run test:unit` (CI 가능) | **92 passing** |
| **Integration (auto)** | 확장 활성화·커맨드 기여·설정 페이지 오픈 | `@vscode/test-electron` + `@vscode/test-cli` (`.vscode-test.mjs`) | `npm run test:integration` (VSCode 호스트) | **3 passing** (스모크) |
| **Manual (E2E)** | 칩 선택·빌드/실행/디버그·watcher·export/import·Doctor·WSL | 사람 F5 | `test_case.md §2` 체크리스트 | 7 Pass · 2 Partial · 4 Not Run |

- 순수 함수 분리(coding_convention)로 로직 대부분이 **Unit에서 빠르게** 검증된다. vscode API 결합부는 Integration 스모크 + Manual로 커버.
- 단위/통합 스펙 분리: `.mocharc.json`은 `out/test/unit/**`만, 통합은 `.vscode-test.mjs`가 `out/test/integration/**`.

---

## 2. 테스트 커버리지 목표

| 영역 | 목표 | 현황 |
|------|------|------|
| 핵심 도메인 로직(순수 코어) | 주요 분기 단위 테스트 | cargoBridge 파서·reconcile·invocationConfig·profileExport·diagnostics·argsLine 등 92 케이스 |
| API/인터페이스(vscode 결합) | 활성화·커맨드·주요 플로우 스모크 | 통합 3 + Manual 체크리스트 |
| 에러 핸들링 | E1·E6·E9·E10·PROFILE_IMPORT_INVALID 등 코드 경로 | 단위(오류 매핑) + Manual(E1·E5·E7) |

---

## 3. 요구사항 추적 (핵심)

| 요구사항 | 요약 | 테스트 | 결과/근거 | 상태 |
|----------|------|--------|-----------|------|
| FR(F1·F17) | 감지·상태바·watcher 자동 갱신 | TC-01·07 | MS-004 F5 | Covered |
| FR(F5·F16) | 빌드/실행 + runArgs 주입 | TC-04, unit assembleCargoArgs | MS-005 F5 | Covered |
| FR(F11 디버그) | CodeLLDB 온디맨드·중단점 | TC-05·12 | MS-005 F5 | Covered |
| FR(F12) | 프로파일 export/import | TC-08, unit profileExport | TASK-015 F5 | Covered |
| FR(F19) | Doctor·E1·rustup target | TC-10·12·13, unit diagnostics | TASK-017·018 F5 | Covered(칩 E1 Partial) |
| FR-014(F21) | 호출 오버레이·pre/postBuild 주입 | TC-06, unit invocationConfig | MS-006·TASK-019 F5 | Covered(디버그 결합 Partial) |
| NFR-002/002a | ProcessExecution(셸無)·buildEvent만 Shell 예외 | 코드 리뷰 + unit | 설계 준수 | Covered |
| F18 | 원격 WSL 동일 동작 | TC-11 | — | **Gap(Not Run)** |

---

## 4. 테스트 환경

| 환경 | 구성 | 용도 |
|------|------|------|
| Local | Windows 11 · cargo 1.96 · rustup 1.29 · CodeLLDB 1.12 | 개발 중 F5·단위·통합 |
| CI(후속) | headless — `test:unit`만 안정. `test:integration`은 디스플레이 필요 | 병합 전 단위 자동화 |
| WSL(수동) | 동일 레포 WSL 창 | F18 스모크(TC-11) |

---

## 5. 가정 / 미확정

| ID | 항목 | 상태 |
|----|------|------|
| ASM-001 | 통합 스모크는 로컬 호스트에서 실행(전체 CI 자동화는 후속) | Open |
| OQ-001 | TC-11(WSL/F18)·TC-09(재시작)·TC-02/03(workspace·멀티루트) 릴리즈 전 수동 보강 여부 | Open — TASK-021 게이트에서 판정 |

---

## 6. 관련 근거 / 출처

| ID | 근거 | 출처 |
|----|------|------|
| SRC-001 | 단위/통합 테스트 목록 | 상세설계서 §15.1·§15.2 |
| SRC-002 | F5 검증 서사 | 세션 로그 #004·#005 |
