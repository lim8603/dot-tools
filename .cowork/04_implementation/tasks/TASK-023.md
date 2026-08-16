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

## 작업 항목 (구현 완료)

1. **계약 일반화** — `createProjectTask(target): vscode.Task` → **`createProject(target): ProjectCreation`**(`{kind:'task'} | {kind:'files'}`). `ProjectFile`·`ProjectCreation` 타입 추가(types.ts). cargo도 `{kind:'task'}`로 전환.
2. **Dotnet** — `dotnet new console -o <name>` ProcessExecution(셸無) → `{kind:'task'}`.
3. **CMake** — `cmakeTemplate.cmakeProjectFiles(name)`(순수): `CMakeLists.txt`+`main.cpp` → `{kind:'files'}`.
4. **Python** — `pythonTemplate.pythonProjectFiles(name)`(순수): `pyproject.toml`+`main.py` → `{kind:'files'}`.
5. **orchestrator** — `newProject`가 kind 분기: task=TaskRunner, files=`writeProjectFiles`(workspace.fs createDirectory+writeFile). 스텁 "아직 지원 안 함" 경로 제거.
6. **테스트** — `test/unit/projectTemplates.test.ts` 2(총 98).

## 결정 반영 (D-13 개정)

- 최초 "ShellExecution 파일작성"이었으나 구현 중 **셸 종류 미제어(cmd/pwsh)·C++ `<>` 리다이렉션 충돌**을 발견 → **확장이 `workspace.fs`로 작성**으로 개정. ADR-010은 "네이티브 스캐폴더 있으면 위임(cargo/dotnet), 없으면 확장 작성(cmake/python)"으로 해석.
- **scope A**: cmake/dotnet/python은 `listProjects`가 v2 스텁이라 **파일은 생성되나 스위처 자동등장은 Rust만 v1**. 나머지는 v2 어댑터 구현 시 등장.

## DoD

- check-types·lint·unit 98·esbuild OK(달성). **F5**: 각 언어 New Project→이름 → 파일 생성 확인(cargo/dotnet=Task, cmake/python=fs 작성; Rust만 스위처 자동등장·전환). dotnet 도구 부재 시 Doctor 안내.
