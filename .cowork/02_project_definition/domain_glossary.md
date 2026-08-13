# Domain Glossary

> 도메인 용어집 — 프로젝트의 공통 언어를 정의한다

---

## 문서 정보

| 항목 | 내용 |
| --- | --- |
| 관련 Intent | INT-001 |
| 버전 | v1 (설계서 v1.1 반입) |

---

## 용어 정의

| 용어(영문) | 용어(한글) | 정의 | 비고 |
| --- | --- | --- | --- |
| LanguageAdapter | 언어 어댑터 | 언어별 빌드/디버그/실행 로직을 캡슐화한 인터페이스. 이 설계의 핵심 — 언어 차이를 이 뒤로 숨긴다 | 상세 §4 |
| ChipDescriptor | 칩 디스크립터 | 어댑터가 상태바 칩 하나를 선언하는 구조(id·icon·label·listItems·format 등). 개념설계의 Capabilities를 대체 | DD-03 |
| Capabilities | 능력(구 구조) | 개념설계에서 어댑터가 지원 칩을 boolean으로 선언하던 구조. 상세설계에서 `ChipDescriptor[]`로 교체됨 | 폐기(→ChipDescriptor) |
| ChipItem | 칩 항목 | QuickPick에 나열되는 선택지 하나(id·label·description·detail) | |
| Selection | 선택 상태 | 프로젝트별 칩 선택값(`values`)과 실행 인자(`runArgs`) | 상세 §4 |
| SSOT 파사드 | 단일 진실 파사드 | 값은 각 언어의 캐노니컬 파일에만 두고, 확장은 포인터·선택 상태만 소유하는 원칙 | DD-07 |
| workspaceState | 워크스페이스 상태 | VSCode Memento API — 워크스페이스별·기계 로컬 키-값 저장소. 선택 상태 저장 위치 | DD-01 |
| Task API | 태스크 API | `vscode.tasks.*` — 종료 코드 감지와 problem matcher를 제공하는 작업 실행 API | DD-02 |
| ProcessExecution | 프로세스 실행 | Task 실행 방식. 인자 배열을 그대로 전달해 셸 이스케이프 문제를 원천 차단 | 상세 §7.1 |
| reconcile | 재검증 | 저장된 선택 상태를 현재 스캔 결과와 대조해 무효 항목을 정리하는 절차 | 상세 §6.2 |
| compiler-artifact | 컴파일 산출물 메시지 | `cargo build --message-format=json` 출력에서 실행 파일 경로를 알리는 메시지 | DD-05 |
| Adapter Registry | 어댑터 레지스트리 | 설치된 어댑터 관리·워크스페이스 스캔·어댑터 매칭 담당 | 상세 §3.1 |
| Orchestrator | 오케스트레이터 | 활성 컨텍스트 관리·명령 처리·어댑터 위임 담당 | 상세 §3.1 |
| ManifestWatcher | 매니페스트 감시자 | 매니페스트 변경 감지 후 디바운스 재스캔 | F17 |
| Doctor | 진단 | 활성 어댑터의 전제조건을 일괄 점검하고 등급별 해결 액션을 제공하는 진단 명령 | F19 |
| Profile | 프로파일 | 빌드 변형(dev/release/커스텀). 컴파일 언어만 해당 | F7 |
| Architecture | 아키텍처 | target triple/RID 등 대상 아키텍처. 컴파일 언어만 해당 | F10 |
| Features | 피처 | Cargo features 조합(`--features`/`--no-default-features`). multiSelect 칩 | F15 |
| Target | 타깃 | 실행/빌드 대상(bin/example, 시작 프로젝트, 진입 스크립트). required 칩 | F9 |
| Environment | 환경 | venv/conda 등 인터프리터 환경. 스크립트 언어만 해당(v1 정의만) | F11 |
| Extension Development Host | 확장 개발 호스트 | F5로 뜨는, 개발 중 확장이 로드된 별도 VSCode 창 | |
| QuickPick | 퀵픽 | 명령 팔레트식 드롭다운(= 칩의 "콤보박스") | |
| StatusBarItem | 상태바 항목 | 하단 상태바의 클릭 가능한 칩/버튼 | |
| VSIX | 확장 패키지 | VSCode 확장 배포 패키지 파일 | |
| extensionKind | 확장 종류 | 확장이 UI 측/워크스페이스(원격) 측 어디서 실행될지 선언하는 매니페스트 필드 | DD-08 |
| 온디맨드 설치 | on-demand install | 필요 확장을 최초 사용 시점에 확인·자동 설치하는 방식. `extensionDependencies` 하드 의존을 대체 | DD-09 |
| 시작 마법사 | Project Init Wizard | 매니페스트 없는 폴더에서 언어를 골라 네이티브 도구로 새 프로젝트를 생성하는 수동 명령. 파일 부재의 능동 복구 경로 | F20, ADR-010 |

---

## 약어 정의

| 약어 | 풀네임 | 설명 |
| --- | --- | --- |
| SSOT | Single Source of Truth | 값의 단일 진실 원천 = 캐노니컬 파일 |
| RID | Runtime Identifier | .NET 런타임 식별자(win-x64 등) — C# 아키텍처 축 |
| CSP | Content Security Policy | Webview 보안 정책(외부 리소스 차단) |
| DoD | Definition of Done | 완료 기준 (상세 §1.3) |
| DD | Design Decision | 설계 결정 (DD-01~09, 상세 §2) |
| WBS | Work Breakdown Structure | 작업 분해 구조 (milestone/task) |

---

## 도메인 규칙 (Business Rules)

| ID | 규칙 | 근거 |
| --- | --- | --- |
| BR-001 | 값은 각 언어의 캐노니컬 파일에만 존재하고 확장은 복제하지 않는다 | DD-07 (SSOT) |
| BR-002 | 선택 상태는 workspaceState에 프로젝트별로 독립 저장한다 | DD-01 |
| BR-003 | 상태바·오케스트레이터·설정 UI는 `LanguageAdapter`/`ChipDescriptor[]`만 알고 특정 언어를 모른다 | DD-03 |
| BR-004 | 산출물 경로는 조합하지 않고 cargo가 알려주는 값을 쓴다 | DD-05 |
| BR-005 | 한 VSCode 창은 하나의 실행 환경에만 연결된다 (한 창 = 한 환경) | 상세 §12.4 |
| BR-006 | 의존성은 하드 강제하지 않고 최초 사용 시점에 온디맨드 처리한다 | DD-09 |
