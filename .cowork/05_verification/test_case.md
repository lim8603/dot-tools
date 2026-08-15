# Test Case

> 테스트 케이스 — 개별 검증 항목의 입력, 절차, 기대 결과를 정의한다

---

## 문서 정보

| 항목 | 내용 |
| --- | --- |
| 관련 Intent | INT-001 |
| 관련 Milestone | MS-007 (M6 품질·배포), 검증 대상은 MS-001~006 전체 |
| 관련 Test Strategy | `test_strategy.md` |
| 관련 Verification Evidence | `verification_evidence.md` |
| 출처 | 상세설계서 §15.2 (통합 테스트 + 수동 체크리스트) |

---

## 1. 자동 통합 스모크 (@vscode/test-electron)

`npm run test:integration` — 실제 VSCode 호스트에서 cargo 픽스처를 워크스페이스로 열고 실행.
파일: `src/test/integration/extension.test.ts`. 설정: `.vscode-test.mjs`.

| TC | 항목 | 기대 결과 | 결과 | 실행일 |
| --- | --- | --- | --- | --- |
| TC-A1 | 확장 활성화 | `seunghyun.devswitcher-tools` present + activate | ✅ Pass | 2026-08-15 |
| TC-A2 | 커맨드 기여 | 9개 커맨드(switchProject·pickChip·build·run·debug·openSettings·export/importProfile·doctor) 등록 | ✅ Pass | 2026-08-15 |
| TC-A3 | 설정 페이지 오픈 | `devSwitcher.openSettings` 예외 없이 실행 | ✅ Pass | 2026-08-15 |

> 단위 테스트(mocha 92, `out/test/unit`)는 순수 코어 전담 — `test_strategy.md` §1 참조.

---

## 2. 수동 체크리스트 (상세설계서 §15.2 — 13항목)

> 유형: Auto=통합 자동, Manual=수동(F5). 근거는 세션 로그 / MS.

| TC | 시나리오 | 유형 | 결과 | 근거 (세션/MS) |
| --- | --- | --- | --- | --- |
| TC-01 | 단일 Rust 패키지 → 칩 4종 표시, 기본값(profile=dev, bin 1개면 target 자동) | Manual | ✅ Pass | MS-004 F5 (세션 #004) |
| TC-02 | cargo workspace(멤버 3) → 스위처 3개, 전환 시 선택 상태 독립 유지 | Manual | ⬜ Not Run | 픽스처는 단일 패키지 — 멀티멤버 픽스처 필요 |
| TC-03 | 멀티루트(Rust+Python) → 활성 프로젝트별 칩 변화, **Python 스텁 칩 회귀** | Manual | ⬜ Not Run | 멀티루트 수동 |
| TC-04 | 빌드 버튼 → Task 실행, 고의 컴파일 에러 → Problems(matcher), 종료코드 실패 감지 | Manual | ✅ Pass | MS-005 F5 (세션 #004) |
| TC-05 | 디버그 버튼 → 빌드 실패 시 중단(E5)/성공 시 CodeLLDB 중단점, runArgs 전달 | Manual | ✅ Pass | MS-005 F5 (중단점 정지 확인) |
| TC-06 | 커스텀 프로파일 + `CARGO_TARGET_DIR` 변경 상태 디버그 → 실행 파일 경로 해석 (DD-05) | Manual | 🟡 Partial | 오버레이 주입·preview 검증(MS-006). 디버그 결합은 재확인 권장 |
| TC-07 | Cargo.toml 프로파일/feature 추가 저장 → 상태바 자동 갱신(F17), 삭제 → E10 | Manual | ✅ Pass | MS-004 watcher F5 |
| TC-08 | export → import 라운드트립, 다른 클론에서 import(경로 독립성) | Manual | ✅ Pass | TASK-015 F5 (세션 #005). 다른 클론 import는 미확인 |
| TC-09 | VSCode 재시작 → workspaceState 복원 (DD-01) | Manual | ⬜ Not Run | 재시작 후 선택 복원 수동 확인 |
| TC-10 | cargo 미설치(PATH 제거) → E1 경고 칩 → Doctor 유도 | Manual | 🟡 Partial | Doctor QuickPick 검증(TASK-017). E1 칩은 PATH 조작 필요(worstStatus 단위테스트 커버) |
| TC-11 | WSL에서 동일 레포 → 시나리오 1~7 동일, Windows 창과 선택 독립 (F18·DD-01) | Manual | ⬜ Not Run | **F18 WSL 스모크 — v0.1 릴리즈 전 수동 권장** |
| TC-12 | CodeLLDB 온디맨드 설치 → 디버그 이어짐(E7) / 미설치 target 선택 → `rustup target add` (§13.4) | Manual | ✅ Pass | CodeLLDB=MS-005 F5, target add=TASK-018 F5 |
| TC-13 | Doctor 실행 → 항목별 상태 정확, 1단계 즉시 설치, 2·3단계 안내 (F19) | Manual | ✅ Pass | TASK-017 F5 (cargo/rustup/CodeLLDB ✅+버전) |

**요약**: Auto 3/3 Pass · Manual 7 Pass · 2 Partial(TC-06·TC-10) · 4 Not Run(TC-02·03·09·11).
릴리즈(TASK-021) 전 권장 보강: **TC-11(WSL/F18)**, TC-09(재시작 복원), TC-02/03(workspace·멀티루트).

---

## 3. 분할 승격 판단

- 실질 케이스 16개(A1~A3 + 01~13)로 12개 초과 — 다만 대부분 §15.2 원본 1:1 매핑이라 **현 단일 문서 유지**가 추적에 유리. Milestone별 반복 참조가 생기면 `test_cases/` 승격 검토(§분할 기준).
