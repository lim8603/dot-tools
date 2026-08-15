# TASK-020 — 통합 테스트 하네스 + 수동 체크리스트

> MS-007 (M6). @vscode/test-electron 셋업 + §15.2 13항목 체크리스트. F18(WSL) 흡수.

---

## 개요

| 항목 | 내용 |
|------|------|
| Task ID | TASK-020 |
| 관련 Milestone | MS-007 (M6 품질·배포) |
| 관련 기능 | 품질 (§15.2), F18 (원격 WSL 스모크) |
| 담당 | AI · 상태 Planned |
| 의존 | TASK-016~019 (검증 대상 기능) |
| 근거 | 상세설계서 §15.1·§15.2, §12(WSL), 05_verification/* |

## 목적

VSCode 호스트 통합 테스트 하네스를 마련하고(자동화 가능분), 자동화가 어려운 항목은 **수동 체크리스트**로 문서화해 릴리즈 게이트 근거를 남긴다.

## 작업 항목

1. **하네스 셋업** — `@vscode/test-electron` 도입(devDep), `src/test/integration/` 러너, npm script(`test:integration`). 단위 테스트(mocha)와 분리.
2. **자동화 가능분** — 확장 activate·명령 등록·상태바 렌더·설정 페이지 open 등 호스트 무관하게 자동화되는 스모크.
3. **수동 체크리스트 문서화** — `05_verification/test_case.md`(§15.2의 13항목: 칩·workspace·멀티루트·빌드/디버그·프로파일·watcher·**export/import**·재시작·**E1→Doctor**·**WSL 동일동작(F18)**·CodeLLDB 온디맨드·**Python 스텁 회귀(DoD 6)**).
4. **증적** — `05_verification/verification_evidence.md`에 실행 결과/스크린샷 근거 링크 슬롯 마련.
5. `test_strategy.md` — 단위/통합/수동 3계층 전략 요약(있으면 갱신, 없으면 생성).

## 범위 밖

- 원격 디버그·컨테이너 ptrace(§16 백로그·R11). CI 파이프라인 구축은 후속(있으면 훅만).

## DoD

- `test:integration` 실행 가능(자동화분 그린).
- `test_case.md` 13항목 체크리스트 존재, WSL/Python 스텁 회귀 포함.
- 수동 항목 실행 후 verification_evidence에 결과 기록.
