# Tech Stack Registry

> 기술스택 등록부 — 이 프로젝트에서 사용하는 기술의 확정 목록과 선정 근거

---

## 목적

프로젝트에서 사용하는 언어, 프레임워크, 라이브러리, 도구를 한 곳에 등록하고 각 선택의 근거 ADR을 연결한다.

- 출처: `.cowork/06_evolution/imported_context/DevSwitcher-Tools_Detailed-Design.md` §3.2, §8, §14~§15.
- `coding_convention.md`는 이 문서 기준으로 구성한다.

---

## 확정 기술스택

| 영역 | 기술 | 버전/사양 | 선정 ADR | 비고 |
|------|------|----------|---------|------|
| 주 언어 | TypeScript | — | — | 확장 구현 언어 |
| 런타임 | Node.js | LTS 18+ | — | 확장 개발/빌드 |
| 대상 플랫폼 | VSCode Extension API | `engines.vscode ^1.90.0` | ADR-002·ADR-008 | `extensionKind: ["workspace"]`(원격) |
| 번들러 | esbuild | — | — | `yo code` 기본 번들러 |
| 패키지 매니저 | npm | — | — | |
| 스캐폴드 | Yeoman + `generator-code` | — | — | `yo code` (M0) |
| 실행 방식 | VSCode Task API (`ProcessExecution`) | — | ADR-002 | 종료 코드·problem matcher |
| 상태 저장 | `workspaceState`(Memento) | 키 `devSwitcher.state.v1` | ADR-001 | DB 미사용 |
| TOML 파서 | `smol-toml`(읽기) + 라인 치환(쓰기) | — | ADR-007 | Cargo.toml 국소 편집(§8.7) |
| JSONC 파서 | `jsonc-parser` | — | ADR-007 | C++ 프리셋 등(향후) |
| XML 파서 | `fast-xml-parser` | — | ADR-007 | .csproj(향후) |
| 디버거(위임) | CodeLLDB (`vadimcn.vscode-lldb`) | 온디맨드 | ADR-009 | Rust 디버깅, 하드의존 아님 |
| 테스트 (단위) | 순수 함수 (VSCode 무의존) | — | — | `cargoBridge` 등(§15.1) |
| 테스트 (통합) | `@vscode/test-electron` + `@vscode/test-cli` | — | — | §15.2 |
| 배포 | `@vscode/vsce` → VSIX | — | — | 개인용 → Open VSX/Marketplace 검토 |
| 외부 CLI 의존 | cargo / rustup | — | ADR-009 | Doctor 재진단, 온디맨드 |

> `선정 ADR`이 비어 있는 항목은 단일 자명 선택(스캐폴드 기본값 등)으로 별도 ADR 불요.

---

## F20 관련 네이티브 도구 (프로젝트 생성 위임)

| 언어 | 생성 도구/방식 | 근거 |
|------|---------------|------|
| Rust | `cargo new` / `cargo init` | ADR-010 |
| C# | `dotnet new console` | ADR-010 |
| C++ | cmake 최소 템플릿(`CMakeLists.txt` + `main`) | ADR-010 |
| Python | 기본 `pyproject.toml` 생성 | ADR-010 |

---

## 검토했으나 채택하지 않은 기술

| 기술 | 검토 사유 | 미채택 사유 | 관련 ADR |
|------|----------|-----------|---------|
| `settings.json` 선택 상태 저장 | 개념설계 원안 | `.vscode/` 커밋 시 개인 선택 충돌·diff 오염 | ADR-001 |
| 터미널 명령 전송(`runInTerminal`) | 개념설계 원안 | 종료 코드 못 받음 → ensureBuilt 불가 | ADR-002 |
| `target/<triple>/<profile>/<bin>` 경로 조합 | 개념설계 원안 | dev→debug 폴더명·커스텀 프로파일·CARGO_TARGET_DIR에 깨짐 | ADR-005 |
| `extensionDependencies`(CodeLLDB 하드의존) | v1.0 원안 | 다언어 확장에 디버거 강제 설치 부적절 | ADR-009 |
| boolean 5개 고정 Capabilities | 개념설계 원안 | 새 칩 추가 시 인터페이스 깨짐 | ADR-003 |
