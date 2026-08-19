# DevSwitcher Tools — 공식 산출물 (Official Deliverables)

> DevSwitcher Tools **v1.2.0** (2026-08-19) 공식 문서 모음. (본문 스냅샷은 v1.0.0 기준, 이후 변경은 각 문서 주석과 릴리즈 노트에 반영)
> 이 폴더의 문서는 `.cowork/` 기준 문서(AI-Human Cowork 프레임워크)에서 `export_spec.md` 규칙으로 생성된 공식 납품 산출물이다.

| 항목 | 내용 |
|------|------|
| 프로젝트 | DevSwitcher Tools (`lim8603.devswitcher-tools`) — VSCode 확장 |
| 버전 | v1.2.0 |
| 생성일 | 2026-08-17 |
| 작성 | AI (Claude Code) · 승인: Human |
| 문서 언어 | 한국어 (코드·식별자·명령은 영문) |
| 산출물 범위 | `deliverable_plan.md` 확정 — 필수 5 + 권장 8 (12 운영서는 해당없음) |

제품 소개·설치·사용법의 영문 랜딩 문서는 저장소 루트 [README.md](../README.md)를 본다.

---

## 문서 목록

| # | 문서 | 설명 |
|---|------|------|
| 01 | [요구사항 명세서](01_요구사항명세서.md) | FR/NFR·제약·의존성·가정·미해결 질문 |
| 02 | [도메인 정의서](02_도메인정의서.md) | 용어·약어·도메인 규칙 (LanguageAdapter·칩·SSOT 등) |
| 03 | [기능 명세서](03_기능명세서.md) | F1~F21 기능 명세 — 구현 기준 문서 |
| 04 | [화면설계서](04_화면설계서.md) | 상태바 UX + Webview 설정 페이지 (구현 반영) |
| 05 | [WBS](05_WBS.md) | Milestone(MS-001~020)·Task 구조와 버전 사다리 |
| 06 | [시스템 아키텍처 설계서](06_시스템아키텍처설계서.md) | 어댑터 계층 구조·기술 스택·ADR-001~018 결정 |
| 07 | [API 명세서](07_API명세서.md) | `LanguageAdapter`·`ChipDescriptor`·`InvocationConfig` 어댑터 계약 |
| 08 | [DB 설계서](08_DB설계서.md) | DB 미사용 — `workspaceState` 상태 저장·`ProfileExport` 스키마 |
| 09 | [테스트 시나리오](09_테스트시나리오.md) | 3계층 테스트 전략(단위 268·통합 3·수동 24) |
| 10 | [테스트 케이스](10_테스트케이스.md) | TC-01~24 결과 (21 Pass·2 Partial·1 Known Issue) |
| 11 | [릴리즈 노트](11_릴리즈노트.md) | v0.1.0 → v1.2.0 릴리즈 이력 |
| 12 | (운영서) | **해당없음** — 서버/클라우드 운영이 없는 로컬 확장. 설치·사용은 README와 사용자 메뉴얼로 충분 (2026-08-13 Human 확정) |
| 13 | [사용자 메뉴얼](13_사용자메뉴얼.md) | 최종 사용자용 — 설치·상태바·설정 페이지·Run Group·단축키·트러블슈팅 |
| 14 | [README](../README.md) | 제품 랜딩 문서 (저장소 루트, 영문) |

---

## Known Issue (v1.0.0)

- **TC-11 (WSL 수동 검증)** — 확장은 원격 안전(remote-safe)하게 설계되었으나(`workspace.fs`, `extensionKind: ["workspace"]`), WSL 환경 수동 검증은 이번 릴리즈에서 수행하지 않고 Known Issue로 공지한다 (Human 결정 D-23, 릴리즈 비차단). 상세: [10_테스트케이스.md](10_테스트케이스.md).

## 추적성 (Traceability)

각 문서 상단 헤더 표의 `기준 문서` 행이 해당 산출물의 `.cowork/` 소스 문서를 가리킨다.
생성 규칙·해석 우선순위는 `.cowork/07_delivery/export_spec.md`, 산출물 범위 확정은 `.cowork/02_project_definition/deliverable_plan.md`를 따른다.
