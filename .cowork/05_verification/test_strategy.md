# Test Strategy

> 테스트 전략 — 무엇을, 어떻게, 어느 수준까지 검증할 것인가

---

## 문서 정보

| 항목 | 내용 |
|------|------|
| 관련 Intent | 활성 Intent 또는 관련 `INT-*` 참조 |
| 관련 Milestone | 검증 전략이 연결되는 `MS-*` (해당 시) |
| 관련 Requirement Spec | `02_project_definition/requirement_spec.md` |
| 관련 Verification Evidence | `verification_evidence.md` |
| 버전 | 프로젝트 기준 |

---

## 1. 테스트 피라미드

| 계층 | 범위 | 담당 | 도구 |
|------|------|------|------|
| Unit Test | 함수/모듈 단위 | AI 작성, Human 리뷰 | |
| Integration Test | 모듈 간 연동 | AI 작성, Joint 리뷰 | |
| E2E Test | 시나리오 기반 | Joint 설계, AI 작성 | |
| Performance Test | NFR 검증 | Joint | |

---

## 2. 테스트 커버리지 목표

| 영역 | 목표 커버리지 | 비고 |
|------|-------------|------|
| 핵심 도메인 로직 | | |
| API/인터페이스 | | |
| 에러 핸들링 | | |
| 전체 | | |

---

## 3. 테스트 시나리오

| ID | 시나리오 | 관련 Milestone | 유형 | 우선순위 | 상태 |
|----|---------|----------------|------|---------|------|
| TS-001 | | `MS-*` (해당 시) | Unit / Integration / E2E / Performance | P1 / P2 / P3 | Planned / Detailed / Covered / Deprecated |

---

## 4. 요구사항 추적 표

> 최소 적용 원칙: 전체 요구사항을 한 번에 채우려 하지 말고, 현재 Gate 판정에 필요한 핵심 `FR-*` / `NFR-*`부터 우선 연결한다.

| 요구사항 ID | 요구사항 요약 | 관련 테스트 시나리오 | 관련 테스트 케이스 | 최신 결과 / 근거 | 검증 상태 | 비고 |
|------------|-------------|----------------------|-------------------|------------------|----------|------|
| `FR-*` | | `TS-*` | `TC-*` | `EV-*`, Pass / Fail / Partial / Not Run | Covered / Partial / Planned / Gap | |
| `NFR-*` | | `TS-*` | `TC-*` | `EV-*`, Pass / Fail / Partial / Not Run | Covered / Partial / Planned / Gap | |

---

## 5. 테스트 환경

| 환경 | 구성 | 용도 |
|------|------|------|
| Local | | 개발 중 빠른 검증 |
| CI | | PR 병합 전 자동 검증 |
| Staging | | 통합 검증 |

---

## 6. 가정 (Assumptions)

| ID | 가정 | 영향 |
|----|------|------|
| ASM-001 | | |

---

## 7. 미확정 검증 항목 (Open Questions)

| ID | 항목 | 질문 | 상태 |
|----|------|------|------|
| OQ-001 | | | Open / Resolved / Deferred |

---

## 8. 관련 근거 / 출처 (Evidence & Sources)

> Gate 판정용 요약 근거와 링크 인덱스는 `verification_evidence.md`에 함께 유지한다.

| ID | 근거 | 출처 문서/대화 | 비고 |
|----|------|---------------|------|
| SRC-001 | | | |
