# TASK-022 — 시작 마법사 코어 + Cargo createProjectTask

> MS-008 (F20) 첫 Task. 마법사 흐름 + Rust end-to-end 생성.

---

## 개요

| 항목 | 내용 |
|------|------|
| Task ID | TASK-022 |
| 관련 Milestone | MS-008 (F20 시작 마법사) |
| 관련 US | US-011 |
| 관련 ADR | ADR-010 |
| 담당 | AI · 상태 Review (F5 대기) |
| 의존 | 없음 (MS-002·MS-005 완료 전제) |
| 근거 | functional_spec F20, interface_contract §5, 상세설계서 §14 |

## 목적

`DevSwitcher: New Project…` 마법사(폴더→언어→이름)를 만들고, CargoAdapter가 `cargo new`로 실제 프로젝트를 생성해 스위처에 자동 등장·전환(OQ-001)시킨다.

## 작업 항목 (구현 완료)

1. **`core/projectName.ts`** — `validateProjectName`(순수: 비어있음/경로구분자/공백/허용문자 검증). mocha 4.
2. **`ui/newProjectWizard.ts`** — `runNewProjectWizard(adapters)`: 워크스페이스 폴더 확인(단일=자동·복수=QuickPick) → 언어 QuickPick → 이름 InputBox(validateInput). 취소 시 undefined.
3. **`core/types.ts`** — `NEW_PROJECT_TASK_TYPE = 'devswitcher-newproject'` 상수(전 어댑터 공유).
4. **`cargoAdapter.createProjectTask`** — `makeCargoNewTask`: `cargo new <name>` ProcessExecution(셸無, cwd=folderUri). 스텁 제거.
5. **`adapterRegistry`** — `adapter(id)`·`creatableAdapters()`(canCreateProject 필터) 추가.
6. **`orchestrator.newProject()`** — 마법사→createProjectTask→TaskRunner(synthetic lock)→성공 시 refresh+`findCreatedProject`(생성 폴더 하위 매니페스트)→setActiveProject+renderActive(자동 전환). 실패 시 "Run Doctor" 안내. 스텁 어댑터 throw는 catch("아직 지원 안 함").
7. **`extension.ts`·`package.json`** — `devSwitcher.newProject` 커맨드 + `devswitcher-newproject` taskDefinition 등록.
8. **테스트** — `test/unit/projectName.test.ts` 4 (총 96).

## 결정 반영

- **OQ-001 = 자동 활성 전환**(생성 성공 후 새 projectId 활성화).
- 타 어댑터(dotnet/cmake/python)는 아직 `notImplemented` — 마법사에서 선택 시 "아직 지원 안 함" 안내. TASK-023에서 실구현.

## 범위 밖

- dotnet/cmake/python 생성(TASK-023). 통합 테스트(TASK-024). 빈 폴더 자동 감지(수동 호출만, F20 특이사항).

## DoD

- check-types·lint·unit 96 통과(달성). **F5: 빈/기존 워크스페이스 폴더에서 New Project→Rust→이름 → `cargo new` 실행 → 새 프로젝트 상태바 자동 등장·전환 확인.**
