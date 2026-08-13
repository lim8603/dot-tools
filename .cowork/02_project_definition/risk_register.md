# Risk Register

> 식별된 리스크와 대응 전략 — 선제적 리스크 관리

---

## 목적

프로젝트 수행 중 예상되는 리스크를 **사전에 식별하고 대응 전략**을 수립한다.
AI는 기술적 리스크를, Human은 비즈니스/조직적 리스크를 주로 식별한다.

> 출처: 상세설계서 §17 (R1~R11). ID는 `RSK-0NN`으로 반입하고 설계 R번호를 병기한다.

---

## Risk Register

| ID | 리스크 | 카테고리 | 발생 확률 | 영향도 | 등급 | 대응 전략 | 담당 | 상태 |
|----|--------|---------|----------|--------|------|----------|------|------|
| RSK-001 (R1) | Cargo CLI 출력 형식 변경으로 파싱 실패 | 기술 | L | M | Low | 완화 — `--format-version=1` 고정, 실패 시 E2 완충 | AI | Open |
| RSK-002 (R2) | `dev`→`debug` 출력 폴더명 불일치 | 기술 | — | — | — | 해소 — DD-05로 cargo가 경로 직접 통보 | AI | Closed |
| RSK-003 (R3) | 커스텀 프로파일 출력 폴더 경로 | 기술 | — | — | — | 해소 — DD-05 | AI | Closed |
| RSK-004 (R4) | CodeLLDB 미설치로 디버그 불가 | 외부 | M | M | Medium | 완화 — 온디맨드 자동 설치(DD-09) + E7 안내 | AI | Open |
| RSK-005 (R5) | 어댑터 확장 시 인터페이스 변경 재작업 | 기술 | M | M | Medium | 완화 — M1에서 4개 어댑터 칩 선언 스텁 후 타입 확정(Python 리트머스), DD-03 | AI | Open |
| RSK-006 (R6) | 언어 혼재 워크스페이스에서 칩 표시/숨김 UX 혼란 | 기술/UX | M | L | Low | 관찰 — 칩 위치 고정, M6 실사용 후 재검토 | Joint | Open |
| RSK-007 (R7) | 대형 워크스페이스에서 `cargo metadata` 지연 | 기술(성능) | M | L | Low | 완화 — 캐시(§8.1), 칩 클릭은 캐시 응답 | AI | Open |
| RSK-008 (R8) | TOML 국소 편집의 주석 보존 한계 | 기술 | M | L | Low | 완화 — 편집을 스칼라 치환·블록 append로 한정(§8.7) | AI | Open |
| RSK-009 (R9) | 자체 problem matcher의 rustc 포맷 추종 실패 | 기술 | L | M | Low | 완화 — `$rustc` 우선, 자체 정의 폴백(§7.2) | AI | Open |
| RSK-010 (R10) | 원격 환경별 도구 부재·경로 차이(WSL/컨테이너/SSH) | 외부 | M | M | Medium | 완화 — §12.2 안전 규칙 + 환경별 Doctor 재진단 | AI | Open |
| RSK-011 (R11) | 컨테이너 내 디버깅 ptrace 제약 | 외부 | M | M | Medium | 완화 — `SYS_PTRACE`·seccomp 설정 명시(§12.3), Doctor 감지 시 안내 | AI | Open |

---

## 리스크 등급 기준

| 영향도 \ 확률 | High | Medium | Low |
|--------------|------|--------|-----|
| **High** | Critical | High | Medium |
| **Medium** | High | Medium | Low |
| **Low** | Medium | Low | Low |

---

## 비고

- R2·R3(RSK-002·003)은 설계 단계에서 DD-05로 이미 **해소(Closed)** — 구현 시 경로 조합 로직을 두지 않는다.
- Medium 등급(RSK-004·005·010·011)은 구현 중 우선 관찰 대상. 실현 시 `project_state.md`의 주요 리스크로 승격한다.
