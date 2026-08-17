# INT-001 — 다언어 통합 상태바 UX VSCode 확장 (DevSwitcher Tools)

> 프로젝트 또는 기능의 고수준 목적 선언 — "무엇을 왜 만드는가"

---

## Intent ID
`INT-001`

## 상태
`Approved` (2026-08-13 Human 승인)

## 관계
없음 (프로젝트 루트 Intent)

## 제목
Rust·C++·C#·Python을 **동일한 상태바 UX**로 다루는 VSCode 확장을 만든다 — 언어 차이는 어댑터가 흡수한다.

## 배경 (Why)

Visual Studio 계열이 제공하는 "상단에서 프로파일·아키텍처·시작 프로젝트를 고르고 빌드/디버그/실행" 하는 통합 UX를 VSCode의 여러 언어/빌드시스템에서 동일하게 쓰고 싶다. 그러나 Rust(Cargo)·C++(CMake)·C#(.NET)·Python은 각각 툴체인과 개념(프로파일·아키텍처·환경·타깃)이 다르고, VSCode에는 이를 하나의 상태바 패턴으로 묶어주는 확장이 없다.

언어마다 별도 확장의 UX를 따로 익히는 대신, **프로젝트·프로파일·아키텍처·타깃 칩 + 빌드/디버그/실행 버튼**이라는 한 가지 패턴으로 전 언어를 다루는 것이 목표다. 핵심 통찰은 "환경 축을 언어로 바꿔도 대응된다" — 즉 언어별 차이를 `LanguageAdapter` 인터페이스와 선언적 칩(`ChipDescriptor[]`) 뒤로 숨기면, 상태바·오케스트레이터·설정 UI는 특정 언어를 몰라도 동작한다.

## 목표 (What)

1. 워크스페이스를 열면 매니페스트(`Cargo.toml`/`CMakeLists.txt`/`*.csproj`/`pyproject.toml`)를 스캔해 언어 프로젝트를 자동 감지하고 해당 어댑터를 바인딩한다. (F1·F2)
2. 상태바를 언어 무관하게 동일 패턴으로 구성한다: 프로젝트 칩 + 어댑터가 선언한 칩(프로파일·아키텍처·features·환경·타깃) + 빌드/디버그/실행 버튼. (F3·F5~F10·F15)
3. 언어별 차이를 `LanguageAdapter` + `ChipDescriptor[]`(DD-03)가 흡수한다 — 어댑터 추가 시 상태바/오케스트레이터/설정 UI 코드는 수정하지 않는다.
4. 설정값은 각 언어의 캐노니컬 파일에만 두고(SSOT 파사드, DD-07), 확장은 포인터와 선택 상태(workspaceState, DD-01)만 소유한다.
5. 빌드/실행은 VSCode Task API(DD-02)로 실행해 종료 코드·problem matcher를 일원화하고, 디버그는 cargo가 알려주는 실행 파일 경로(DD-05)로 CodeLLDB를 기동한다.
6. 원격 개발 환경(WSL·Dev Containers·Remote-SSH)에서 전 기능이 동작한다. (F18·DD-08)
7. 환경 진단·의존성 처리(Doctor, 온디맨드 설치)로 없는 도구가 있어도 우아하게 성능 저하한다. (F19·DD-09)
8. 매니페스트가 없는 빈 폴더에서 명령으로 새 프로젝트를 시작한다 — 언어 선택 후 네이티브 도구로 기본 템플릿 생성. 파일 부재도 도구 부재처럼 능동 복구된다. (F20·ADR-010)

**v1 실구현 범위**: CargoAdapter(Rust)를 실사용 가능한 수준까지 구현하고, CMake/Dotnet/Python 어댑터는 칩 선언만 있는 스텁으로 둔다. **단, 시작 마법사(F20)는 예외로 4개 언어 모두 v1 실동작**한다(네이티브 init 위임이 단순해 전체 어댑터 실구현이 불필요).

## 비목표 (What Not)

- **CMake/Dotnet/Python 어댑터 실구현** — 인터페이스·칩 선언 스텁으로 시작, 이후 실구현(C-7, MS-010~012 완료 → v0.3.0 번들).
- **새 디버거 어댑터 자체 구현** — 각 언어의 기존 디버거 확장(CodeLLDB, cppdbg, netcoredbg, debugpy)에 위임.
- **원격 배포 / 임베디드 타깃 관리** — 이 확장의 범위 밖.
- **멀티 워크스페이스 간 프로젝트 의존성 그래프.**
- **한 창에서 실행 환경 전환**(Windows MSVC ↔ WSL gcc) — "한 창 = 한 환경" 원칙, v2 백로그.
- **환경(venv/conda) 선택 실동작(F11)** — v1에서는 칩 프레임워크 상 정의만, PythonAdapter 구현 시 활성화.
- **시작 마법사의 자동 제안·고급 템플릿** — F20은 수동 호출 + 기본 템플릿까지만. 빈 폴더 자동 감지 후 제안, 템플릿 갤러리/옵션은 비목표(후속).

## 성공 기준

상세설계서 §1.3 완료 기준(Definition of Done)을 승계한다.

- [ ] Rust 워크스페이스(단일·cargo workspace·멀티루트)에서 프로젝트/프로파일/아키텍처/features/타깃 칩이 동작한다.
- [ ] 빌드/실행이 Task API로 실행되고 종료 코드가 감지되며, problem matcher로 진단이 Problems 패널에 표시된다.
- [ ] 디버그 버튼이 "최신 빌드 보장 → 실행 파일 경로 해석 → CodeLLDB 기동"을 자동 수행한다.
- [ ] Cargo.toml 수정(프로파일/타깃/features) 시 상태바가 자동 갱신된다.
- [ ] 선택 상태가 workspaceState에 프로젝트별로 유지되고 export/import로 공유 가능하다.
- [ ] PythonAdapter 스텁 활성화 시 칩 구성이 선언대로 바뀌는 회귀 테스트를 통과한다 (리트머스 시험).
- [ ] WSL(또는 Dev Container)에서 폴더를 열었을 때 위 항목이 동일하게 동작한다.
- [ ] `DevSwitcher: 환경 진단(Doctor)`이 툴체인·확장·target 상태를 정확히 보고하고 1단계 항목을 즉시 설치한다.

## 제약 조건

- **구현 언어/번들러**: TypeScript / esbuild.
- **대상 IDE**: VSCode 데스크톱, `engines.vscode ^1.90.0`, `extensionKind: ["workspace"]`(원격 실행 보장).
- **배포**: 초기 개인용 VSIX 직접 설치 → 완성도 상승 시 Open VSX/Marketplace 공개 검토.
- **팀 규모**: 1인(solo, Master).
- **러닝커브**: 작성자는 VSCode 확장 개발 경험이 없음 — 셋업·API·패키징을 상세히 따라가야 함.
- **일정 감각**: 상세설계서 로드맵 기준 개인용 v0.1 약 9.5일(M0~M6). M4까지 완료 시 실사용 가능.

## 관련 문서

- `.cowork/06_evolution/imported_context/DevSwitcher-Tools_Concept-Design.md` — 개념설계서(원천)
- `.cowork/06_evolution/imported_context/DevSwitcher-Tools_Detailed-Design.md` — 상세설계서 v1.2 (현행 아키텍처 스냅샷, 개념설계와 충돌 시 우선; 운영 SSOT는 .cowork registry/canonical)
- `.cowork/02_project_definition/deliverable_plan.md` — 산출물 계획
- 반입 완료: `functional_spec.md`(F1~F20), `risk_register.md`(R1~R11), `adr_registry.md`(ADR-001~010)
- 향후: `domain_model.md`, `interface_contract.md`, `data_model.md`, `tech_stack.md`, `milestone_registry.md`(M0~M6 + F20)
