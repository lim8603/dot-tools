# ADR-005 (DD-05) — 디버그 실행 파일 경로를 cargo JSON 메시지로 해석

## ADR ID
`ADR-005`

## 제목
디버그 대상 실행 파일 경로를 `cargo build --message-format=json`의 `executable` 필드 파싱으로 해석한다.

## 상태
`Accepted`

## 날짜
2026-08-13

---

## Context (맥락)
디버그 시 실행 파일 경로를 구해야 한다. 개념설계 원안은 `target/<triple>/<profile-폴더>/<bin>` 경로를 직접 조합했다.

## Decision (결정)
`cargo build --message-format=json`의 `compiler-artifact` 메시지 `executable` 필드를 파싱해 경로를 얻는다. 기각: 경로 조합.

## 근거 / Consequences
- 경로 조합 방식은 ①`dev`→`debug` 폴더명 불일치 ②커스텀 프로파일 출력 폴더 ③`CARGO_TARGET_DIR`/`.cargo/config.toml`로 target 디렉토리 변경 시 전부 깨진다.
- cargo가 직접 알려주는 경로를 쓰면 세 문제가 설계에서 **소멸** — 개념설계 §10 리스크 2건(R2·R3) 해소.
- 원격 파일시스템·경로 변형에도 무관(DD-08 원격 안전에 기여).
- 사용자 대면 빌드는 Task(문제 매처), 경로 해석은 캡처 실행으로 역할 분리.

## 관련 문서
| 항목 | 참조 |
|------|------|
| 관련 Intent | INT-001 |
| 관련 Requirement | FR-006 |
| 관련 ADR | ADR-002(Task API), ADR-008(원격) |
| 관련 리스크 | RSK-002·003 해소 |
| 출처 | 상세설계서 §2 DD-05, §8.5 |
