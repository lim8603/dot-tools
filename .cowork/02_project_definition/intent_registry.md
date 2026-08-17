# Intent Registry

> 프로젝트 Intent 인덱스 — 어떤 Intent가 활성인지, 우선순위와 상태가 무엇인지 관리한다

---

## 목적

- 세션 시작 시 우선 로드한다
- 활성 Intent와 우선순위를 빠르게 확인한다
- 상세 내용은 `intents/INT-*.md`에서 관리한다

---

## 기록 규칙

- registry는 **실제 활성/이력 데이터 인덱스**이며, `INT-000` 같은 더미 ID를 기록하지 않는다.
- 항목이 없을 때는 표에 예시 행을 넣지 않고 `현재 등록 Intent 없음`만 남긴다.
- `문서 경로`는 상세 문서가 있을 때만 채우며, 상세 문서를 만들지 않은 경량 운영에서는 비워둘 수 있다.
- `관련 Milestone`에는 실제 연결된 `MS-*`만 적고, 연결이 없으면 `없음`으로 적는다.

---

## Intent 목록

| Intent ID | 제목 | 상태 | 우선순위 | 현재 초점 Phase | 관련 Milestone | 문서 경로 | 비고 |
|-----------|------|------|----------|-----------------|----------------|----------|------|
| INT-001 | 다언어 통합 상태바 UX VSCode 확장 (DevSwitcher Tools) | **Closed (완주)** | Must | Deliver | MS-001~018·MS-014 전부 Done | `intents/INT-001_다언어_통합_상태바_UX_VSCode_확장.md` | 2026-08-13 Human 승인 → **2026-08-17 v1.0.0 완주(D-23, 세션 #015)**: Marketplace 게시(`lim8603.devswitcher-tools`)·GitHub Release·repo public·docs 13종 |
| INT-002 | 원격·크로스 개발 환경 확장 (Remote & Cross-Environment) | Draft | Should | Define | MS-019, MS-020 | `intents/INT-002_원격_크로스_개발_환경_확장.md` | 2026-08-17 세션 #012 신설(D-22). **v1.0.0 이후 착수.** §16 v2+ 백로그(원격 디버그·크로스 컴파일·호스트 칩) |

- `상태`: `Draft` / `Approved` / `Superseded` / `Split` / `Closed`
- `우선순위`: `Must` / `Should` / `Could`
- `현재 초점 Phase`: `Define` / `Design` / `Build` / `Verify` / `Evolve` / `Deliver`

---

## 활성 Intent 요약

- 현재 활성 Intent: **없음** — INT-001은 v1.0.0 완주로 Closed(2026-08-17, 세션 #015)
- 다음 승인 대상: INT-002 (Draft — v1.0.0 완주 완료, 착수 여부는 Human 결정)
- Human 확인 필요 사항: INT-002 착수 여부

---

## 운영 규칙

- 새 Intent가 필요하면 `intents/INT-*.md`를 생성하고 이 문서에 등록한다.
- 활성 상태 변경 시 `project_state.md`와 함께 갱신한다.
- 종료된 Intent도 삭제하지 않고 상태만 갱신한다.
