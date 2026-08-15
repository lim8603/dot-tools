# TASK-018 — rustup target 자동 설치

> MS-007 (M6). 아키텍처 칩에서 미설치 target을 1단계 자동 설치(F19 §13.4).

---

## 개요

| 항목 | 내용 |
|------|------|
| Task ID | TASK-018 |
| 관련 Milestone | MS-007 (M6 품질·배포) |
| 관련 기능 | F19 (Doctor 1단계), 아키텍처 칩 (§8.3) |
| 담당 | AI · 상태 Planned |
| 의존 | TASK-017 |
| 근거 | 상세설계서 §13.4, §13.2(1단계), §8.3 |

## 목적

아키텍처 칩이 **설치된 + 설치 안 된 target을 함께** 열거하고, 미설치 항목을 고르면 `rustup target add`로 확인 후 자동 설치한다(관리자 권한 불필요·안전, 1단계).

## 작업 항목

1. `cargoBridge`에 **전체 target 열거** 추가 — `rustup target list`(또는 `--installed`와 병합) 파싱: `{ triple, installed }[]`. 기존 `listInstalledTargets`(TASK-005) 확장/보완.
2. 아키텍처 칩 `listItems`가 미설치 항목에 `(미설치)` 표기(ChipItem.description/detail).
3. 미설치 target 선택 시 `rustup target add <triple>` 확인 프롬프트 → 실행(TaskRunner 또는 execCapture, 셸無) → 성공 시 선택 완료 + 캐시 무효화.
4. 실패 처리 — 설치 실패 시 토스트 + Doctor 안내.
5. 단위 테스트: `rustup target list` 파서(설치/미설치 마킹) 순수 함수.

## 재사용

- `execCapture`(TASK-005) · 캐시 무효화(invalidateCache) · Doctor 1단계 경로(TASK-017).

## 범위 밖

- cross 기반 도커 크로스컴파일(§16 백로그). 비-rustup 툴체인.

## DoD

- F5: 미설치 triple 선택 → 확인 → `rustup target add` 실행 → 칩에 설치됨으로 반영.
- 파서 단위테스트 그린 · check-types/lint/esbuild OK.
