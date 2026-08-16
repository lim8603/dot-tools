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
| 관련 Milestone | MS-001~006 (구현) · MS-007 (검증·배포) · MS-008 (F20 마법사) |
| 관련 Test Strategy | `test_strategy.md` |
| 관련 Test Case | `test_case.md` |
| 마지막 갱신일 | 2026-08-16 (TASK-021, v0.1.0 릴리즈) |

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
| Test Execution Evidence | In Progress | `test_case.md`(Auto 3 + Manual 17) | 2026-08-16 | Unit 99·Integration 3 Pass, Manual 14 Pass/2 Partial/1 Deferred(TC-11 WSL). 세션 #006 수동검증 + 버그수정 2건 |
| NFR Evidence | Partial | `test_strategy.md` §3 | 2026-08-15 | NFR-002/002a 설계 준수. 성능 NFR 별도 측정 없음 |
| Release Readiness Evidence | Pass (조건부) | `quality_gate.md`, TASK-021, EV-006 | 2026-08-16 | README·VSIX(021) 완료·설치 스모크 통과 → v0.1.0 확정. 잔여 수동검증(TC-11 WSL·TC-09·TC-02/03)은 문서화된 잔여 리스크(개인용 v0.1 수용) |

---

## Evidence Index

| EV ID | 유형 | 검증 대상 / 범위 | 판정 | 관련 Gate | 원본 근거 위치 | 마지막 갱신일 | 비고 |
|-------|------|------------------|------|-----------|----------------|--------------|------|
| EV-001 | Unit | 순수 코어 98 케이스(파서·reconcile·오버레이·export·진단·argsLine·**이름검증·템플릿**) | Pass | Gate 4 | `out/test/unit`, `npm run test:unit` | 2026-08-16 | CI 가능 |
| EV-002 | Integration | 확장 활성화·**11 커맨드**(+newProject) 기여·설정 페이지 오픈. 퍼블리셔 `lim8603` | Pass | Gate 4 | `src/test/integration/extension.test.ts`, `npm run test:integration` (3 passing) | 2026-08-16 | VSCode 호스트 실행 |
| EV-003 | E2E(Manual) | TC-01·04·05·07·08·12·13 (칩·빌드·디버그·watcher·export/import·target add·Doctor) | Pass | Gate 4 | 세션 로그 #004·#005 F5 | 2026-08-15 | 7 케이스 |
| EV-004 | E2E(Manual) | TC-06(디버그×오버레이)·TC-10(E1 칩) | Partial | Gate 4 | 세션 #005 | 2026-08-15 | 코어 검증됨, 결합 재확인 권장 |
| EV-005 | E2E(Manual) | TC-09(재시작 복원)·TC-02(workspace 3멤버)·TC-03(멀티루트) | Pass | Gate 4/5 | 세션 #006 F5 (scratchpad/verify 픽스처) | 2026-08-16 | 검증 중 버그 2건 발견·수정(features e7b462b·untrusted eb8983a) |
| EV-008 | E2E(Manual) | TC-11(WSL/F18) | Deferred | Gate 5 | — | 2026-08-16 | WSL 내부 재클론 후 별도 진행. GAP-001 유지 |
| EV-006 | Packaging | `vsce package` → `devswitcher-tools-0.1.0.vsix`(9파일 34.68KB) + 격리 프로필 설치 스모크(`lim8603.devswitcher-tools@0.1.0` 인식) | Pass | Gate 5 | `npx @vscode/vsce package`, `code --install-extension`(격리 dir) | 2026-08-16 | TASK-021. README·LICENSE·CHANGELOG 포함 |
| EV-007 | E2E(Manual) | F20 시작 마법사 — 4개 언어 생성(TC-14~17): Rust(`cargo new`+자동전환)·C#(`dotnet new`)·C++/Python(workspace.fs 템플릿, `<iostream>` 온전) | Pass | Gate 4 | 세션 #006 F5 (생성 파일 내용 검증) | 2026-08-16 | TASK-022·023. cmake/python은 scope A로 스위처 미등장(생성만) |

---

## Gate 판정 메모

| Gate | 판정 상태 | 핵심 EV ID | 요약 | 비고 |
|------|-----------|------------|------|------|
| Gate 4 | Partial | EV-001·002·003 | Unit·Integration·핵심 Manual Pass. TC-06·10 Partial | MS-007 진행 중 |
| Gate 5 | Pass (조건부) | EV-006 | README·VSIX(TASK-021) 완료·설치 스모크 Pass → v0.1.0 확정. WSL(TC-11) 등 EV-005는 문서화된 잔여 리스크로 수용 | 릴리즈 게이트 |

---

## Open Evidence Gaps

| ID | 항목 | 부족한 근거 | 다음 액션 | 상태 |
|----|------|------------|----------|------|
| GAP-001 | F18 원격(WSL) 동일 동작 | TC-11 미실행 | WSL 내부 재클론 후 시나리오 1~7 수동 스모크 | Deferred (세션 #006, WSL 재클론 후) |
| ~~GAP-002~~ | **해소(2026-08-16, 세션 #006)** — TC-09 Pass(features-demo 재시작 복원). features 칩 버그 수정 e7b462b | (해소) | 재시작 복원 확인 |
| ~~GAP-003~~ | **해소(2026-08-16, 세션 #006)** — TC-02(cargo-workspace 3멤버)·TC-03(멀티루트) Pass. untrusted 무한스피너 수정 eb8983a | (해소) | verify 픽스처로 확인 |
| GAP-004 | 성능 NFR 측정 | 측정치 없음 | v0.1은 규모 작아 정성 판단, 필요 시 측정 | Deferred |
