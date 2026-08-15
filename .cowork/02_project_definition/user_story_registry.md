# User Story Registry

> User Story 인덱스 — 요구사항 흐름과 구현 추적의 연결 지점을 관리한다

---

## 목적

- User Story의 상태와 우선순위를 짧게 관리한다
- Story 상세는 `user_stories/US-*.md`에서 관리한다
- Intent, Milestone, Task를 연결하는 추적 인덱스로 사용한다

---

## 기록 규칙

- registry에는 `US-000` 같은 더미 ID를 남기지 않는다.
- 항목이 없을 때는 표에 예시 행을 넣지 않고 `현재 등록 User Story 없음`만 남긴다.
- `관련 Intent`, `관련 Milestone`은 실제 연결된 ID만 기록하고, 미연결 항목은 `없음`으로 적거나 비운다.
- `문서 경로`는 상세 Story 문서를 만들었을 때만 채운다.

---

## User Story 목록

| User Story ID | 제목 | 관련 Intent | 관련 Milestone | 우선순위 | 상태 | 문서 경로 | 비고 |
|---------------|------|-------------|----------------|----------|------|----------|------|
| US-001 | 워크스페이스를 열면 언어 프로젝트가 자동 감지되어 상태바에 나타난다 | INT-001 | 없음 | Must | Draft | | F1 |
| US-002 | 상태바에서 여러 프로젝트를 전환하고 각자의 마지막 선택이 유지된다 | INT-001 | 없음 | Must | Draft | | F2·F4 |
| US-003 | 프로파일·아키텍처·features·타깃을 상태바 칩으로 골라 빌드 방식을 바꾼다 | INT-001 | 없음 | Must | Draft | | F7·F9·F10·F15 |
| US-004 | 빌드/실행/디버그를 상태바 버튼으로 실행하고 오류가 Problems에 표시된다 | INT-001 | 없음 | Must | Draft | | F5·F8·F13 |
| US-005 | 디버그 버튼이 최신 빌드를 보장하고 디버거를 자동 기동한다 | INT-001 | 없음 | Must | Draft | | F5 |
| US-006 | Cargo.toml을 수정하면 상태바가 자동 갱신된다 | INT-001 | 없음 | Should | Draft | | F17 |
| US-007 | 선택 상태를 파일로 내보내고 다른 클론/동료와 공유한다 | INT-001 | 없음 | Should | Draft | | F12 |
| US-008 | WSL/컨테이너/SSH 원격에서도 로컬과 동일하게 동작한다 | INT-001 | 없음 | Must | Draft | | F18 |
| US-009 | 툴체인/확장이 없으면 Doctor가 진단하고 필요한 것을 설치해준다 | INT-001 | 없음 | Must | Draft | | F19·F14 |
| US-010 | 설정 페이지(Webview)에서 프로파일·실행 인자·features·호출 구성을 GUI로 편집하고 export/import 한다 | INT-001 | MS-006 | Should | Draft | | F4·F16·F12·F21·§10 |
| US-011 | 빈 폴더에서 명령으로 언어를 골라 새 프로젝트를 시작한다(매니페스트 자동 생성) | INT-001 | 없음 | Must | Draft | | F20·ADR-010 |
| US-012 | 컴파일러 옵션을 잘 몰라도 설명·예제와 함께 목록에서 골라 (프로젝트×구성)별로 빌드 옵션을 설정하고 적용 명령을 미리 확인한다 | INT-001 | MS-006 | Should | Draft | | F21·ADR-011·012 |

- `우선순위`: `Must` / `Should` / `Could` / `Won't`
- `상태`: `Draft` / `Approved` / `Implemented` / `Deferred`
- 경량 운영: 상세 `user_stories/US-*.md`는 해당 Story가 활성 Build 대상이 될 때 생성한다. 현재는 registry 인덱스만 유지.
- 상태는 Draft — Gate 1에서 확정한다. 근거는 승인된 `INT-001` + `functional_spec.md`(F1~F19).

---

## 운영 규칙

- Story가 생기면 `user_stories/US-*.md`를 생성하고 여기에 등록한다.
- Story 상태는 구현 진행과 함께 갱신한다.
- 상세 Acceptance Criteria는 개별 Story 문서에 기록한다.
