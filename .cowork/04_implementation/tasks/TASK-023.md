# TASK-023 — dotnet / cmake / python createProjectTask

> MS-008 (F20). 나머지 3개 어댑터의 프로젝트 생성 실구현 — 전 언어 v1 실동작 달성.

---

## 개요

| 항목 | 내용 |
|------|------|
| Task ID | TASK-023 |
| 관련 Milestone | MS-008 |
| 관련 US | US-011 · ADR-010 |
| 담당 | AI · 상태 Planned |
| 의존 | TASK-022 (마법사 코어·배선 재사용) |

## 목적

DotnetAdapter·CMakeAdapter·PythonAdapter의 `createProjectTask`를 실구현해, 마법사에서 4개 언어 모두 실제로 생성되게 한다.

## 작업 항목

1. **Dotnet** — `dotnet new console -o <name>`(서브폴더 생성) ProcessExecution.
2. **CMake** — 네이티브 `new` 명령 없음 → **ShellExecution으로 파일 작성**(D-13): `<name>/CMakeLists.txt`(최소 프로젝트) + `<name>/main.cpp`.
3. **Python** — 동일하게 ShellExecution으로 `<name>/pyproject.toml`(기본 메타) 생성.
4. **네이티브 도구 부재** — dotnet/cmake/python 미설치 시 Task 실패 → orchestrator가 이미 "Run Doctor" 안내(F19 재사용). 필요 시 각 어댑터 `collectDiagnostics`에 도구 프로브 추가 검토.
5. 마법사 QuickPick에서 스텁 "아직 지원 안 함" 경로 제거(전 언어 실동작).

## 결정 반영

- **D-13** — CMake/Python은 네이티브 스캐폴더가 없어 ShellExecution이 템플릿 파일을 작성한다(NFR-002a 셸 예외, buildEvents와 동일 패턴). ADR-010 "확장은 직접 파일을 쓰지 않는다"를 "셸(네이티브)이 쓴다"로 해석.

## DoD

- 4개 언어 각각 F5: New Project→언어→이름 → 매니페스트 생성 → 스위처 자동 등장. 도구 부재 시 Doctor 안내.
