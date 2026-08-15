# TASK-017 — Doctor UI + E1 툴체인 경고 칩

> MS-007 (M6). TASK-016 진단 모델을 vscode에 배선. MS-004 이월 E1 해소.

---

## 개요

| 항목 | 내용 |
|------|------|
| Task ID | TASK-017 |
| 관련 Milestone | MS-007 (M6 품질·배포) |
| 관련 기능 | F19 (Doctor), E1 (툴체인 미설치 경고 칩) |
| 담당 | AI · 상태 Planned |
| 의존 | TASK-016 |
| 근거 | 상세설계서 §13.5, §5.4, E1(§오류표), §13.3 |

## 목적

Doctor 명령을 QuickPick으로 노출하고, 툴체인 미설치를 상태바 경고 칩으로 알린 뒤 Doctor로 유도한다.

## 작업 항목

1. **`devSwitcher.doctor` 커맨드** — TASK-016 진단 항목을 QuickPick 목록으로 렌더(✅/⚠️/❌/ℹ️ + 항목별 라벨/detail). 선택 시 해결 액션 실행:
   - 1단계: 확장/target 즉시 설치(`ensureExtension` 재사용 · `rustup target add`는 TASK-018 연동)
   - 2단계: OS별 설치 명령을 확인 후 터미널 실행 + 공식 링크
   - 3단계: 안내(명령 복사 버튼 대용 + 공식 문서 링크)
2. **E1 경고 칩** — activate/refresh 시 `checkToolchain()`가 실패하면 상태바에 경고 칩 1개(§5.4), 관련 기능 비활성. 칩 클릭 → `devSwitcher.doctor`. 설치 후 새로고침으로 복구.
3. **진입점 배선** — 명령 팔레트 + E1 칩 + 온디맨드 설치 취소 시 Doctor 안내(§13.3의 [취소] 경로).
4. package.json: `devSwitcher.doctor` 커맨드 기여점.

## 재사용

- `checkToolchain`(TASK-005) · `ensureExtension`(TASK-011) · StatusBarController(TASK-008, 경고 배경 이미 지원).

## 범위 밖

- rustup target 열거/자동 설치(TASK-018). 2단계 OS별 명령의 완전 자동화는 안내+실행까지만(설치 성공 보장은 도구 몫).

## DoD

- F5: cargo PATH 제거 → E1 경고 칩 표시 → 클릭 → Doctor QuickPick → 항목 상태 정확.
- check-types/lint/esbuild OK.
