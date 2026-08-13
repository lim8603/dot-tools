# 문서 변경 영향 매트릭스 (Document Change Impact Matrix)

> 어떤 파일을 수정했을 때 어떤 파일을 함께 검토해야 하는지 빠르게 확인하는 영향 매트릭스

---

## 핵심 사용법

- 수정하려는 파일 또는 변경 유형에 해당하는 행을 먼저 찾는다.
- `필수 확인`은 같은 작업 세션에서 반드시 함께 본다.
- `추가 확인`은 경로, 용어, 역할, 출력 결과, 자동화 문구가 바뀔 때만 넓힌다.
- 단순 프로젝트 데이터 누적은 영향 범위가 좁지만, 구조 / 역할 / gate / export / 자동화 변경은 이 문서를 먼저 확인한다.

---

## 영향 유형

| 유형 | 의미 |
|------|------|
| 내용 동기화 | 설명, 용어, 규칙 문장을 함께 맞춰야 함 |
| 구조 동기화 | 경로, 파일명, 역할 분류, 폴더 구조를 함께 맞춰야 함 |
| 자동화 동기화 | 진입점 자동화 문구, gate, export, script와 맞춰야 함 |
| 운영 동기화 | 실제 사용 방식, 로딩 순서, 승인 규칙을 함께 맞춰야 함 |

---

## 빠른 체크 규칙

- 구조 변경이면: `cowork.md` + `README.md` + `session_protocol.md` + `tooling_environment_guide.md` + `document_role_inventory.md` + 4개 진입점을 먼저 본다.
- Gate 변경이면: `quality_gate.md` + `cowork.md` + `README.md` + `session_protocol.md`를 같이 본다.
- export 변경이면: `export_spec.md` + `deliverable_plan.md` + `README.md` + `session_protocol.md`를 같이 본다.
- 새 기준 본문 추가면: `document_role_inventory.md` + `deliverable_plan.md` + `project_state.md`를 먼저 보고, 필요 시 `quality_gate.md` + `export_spec.md`까지 확인한다.
- 목록 문서/템플릿 변경이면: 대응 목록 문서와 템플릿, `project_state.md`, `session_protocol.md`, `quality_gate.md`를 같이 본다.
- 진입점 한 개를 고쳤다면: 나머지 3개 진입점도 반드시 같이 본다.
- 경로/파일명 변경이면: 문서뿐 아니라 `upgrade_manifest.md`와 4개 진입점까지 같이 본다.

---

## 영향 매트릭스

| 수정 대상 | 필수 확인 | 추가 확인 | 영향 유형 |
|------|------|------|------|
| `cowork.md` | `README.md`, `01_cowork_protocol/session_protocol.md`, `01_cowork_protocol/tooling_environment_guide.md`, `01_cowork_protocol/document_role_inventory.md`, 4개 진입점 | `05_verification/quality_gate.md`, `07_delivery/export_spec.md`, `02_project_definition/deliverable_plan.md`, `upgrade_manifest.md` | 내용 동기화 / 구조 동기화 / 운영 동기화 |
| `README.md` | `cowork.md`, `01_cowork_protocol/session_protocol.md`, `01_cowork_protocol/tooling_environment_guide.md`, `01_cowork_protocol/document_role_inventory.md` | 4개 진입점, `05_verification/quality_gate.md`, `07_delivery/export_spec.md` | 내용 동기화 / 운영 동기화 |
| `01_cowork_protocol/session_protocol.md` | `cowork.md`, `README.md`, `01_cowork_protocol/decision_authority_matrix.md`, `01_cowork_protocol/document_role_inventory.md`, `06_evolution/project_state.md` | `01_cowork_protocol/tooling_environment_guide.md`, `05_verification/quality_gate.md`, `07_delivery/export_spec.md`, 4개 진입점, `members/team_board.md`, `02_project_definition/deliverable_plan.md` | 내용 동기화 / 운영 동기화 / 자동화 동기화 |
| `01_cowork_protocol/tooling_environment_guide.md` | `01_cowork_protocol/session_protocol.md`, `01_cowork_protocol/document_role_inventory.md`, `upgrade_manifest.md` | `cowork.md`, `README.md`, 4개 진입점, `01_cowork_protocol/document_change_impact_matrix.md` | 내용 동기화 / 구조 동기화 / 자동화 동기화 |
| `01_cowork_protocol/document_role_inventory.md` | `cowork.md`, `README.md`, `01_cowork_protocol/session_protocol.md`, `01_cowork_protocol/tooling_environment_guide.md` | `06_evolution/project_state.md`, `05_verification/quality_gate.md`, `07_delivery/export_spec.md`, `02_project_definition/deliverable_plan.md`, 4개 진입점 | 구조 동기화 / 운영 동기화 |
| `01_cowork_protocol/document_change_impact_matrix.md` | `cowork.md`, `README.md`, `01_cowork_protocol/document_role_inventory.md` | 없음 | 운영 동기화 |
| 새 기준 본문 추가 (AI 제안 + Human 승인) | `01_cowork_protocol/document_role_inventory.md`, `02_project_definition/deliverable_plan.md`, `06_evolution/project_state.md`, `01_cowork_protocol/document_change_impact_matrix.md` | `05_verification/quality_gate.md`, `07_delivery/export_spec.md`, `cowork.md`, `README.md`, `upgrade_manifest.md` | 구조 동기화 / 운영 동기화 / 자동화 동기화 |
| `01_cowork_protocol/decision_authority_matrix.md` | `01_cowork_protocol/session_protocol.md`, `cowork.md` | 4개 진입점, `05_verification/quality_gate.md` | 내용 동기화 / 운영 동기화 |
| `01_cowork_protocol/communication_convention.md` | `cowork.md`, `README.md`, 4개 진입점 | `06_evolution/project_state.md` | 내용 동기화 / 운영 동기화 |
| `01_cowork_protocol/escalation_policy.md` | `01_cowork_protocol/session_protocol.md`, `cowork.md` | `01_cowork_protocol/communication_convention.md`, 4개 진입점 | 내용 동기화 / 운영 동기화 |
| `06_evolution/project_state.md` | `01_cowork_protocol/session_protocol.md`, `cowork.md`, `README.md`, `01_cowork_protocol/document_role_inventory.md` | 4개 진입점, `members/my_state_template.md`, `members/team_board.md` | 구조 동기화 / 운영 동기화 |
| `02_project_definition/deliverable_plan.md` | `07_delivery/export_spec.md`, `05_verification/quality_gate.md`, `README.md`, `01_cowork_protocol/session_protocol.md` | `cowork.md`, `06_evolution/project_state.md` | 내용 동기화 / 자동화 동기화 |
| `05_verification/quality_gate.md` | `cowork.md`, `README.md`, `01_cowork_protocol/session_protocol.md` | `07_delivery/export_spec.md`, 4개 진입점 | 내용 동기화 / 자동화 동기화 |
| `07_delivery/export_spec.md` | `02_project_definition/deliverable_plan.md`, `05_verification/quality_gate.md`, `README.md`, `01_cowork_protocol/session_protocol.md` | `cowork.md`, 4개 진입점 | 내용 동기화 / 자동화 동기화 |
| `02_project_definition/intent_registry.md` | `02_project_definition/templates/intent_template.md`, `06_evolution/project_state.md`, `01_cowork_protocol/session_protocol.md` | `02_project_definition/deliverable_plan.md`, `members/team_board.md`, `05_verification/quality_gate.md` | 구조 동기화 / 운영 동기화 |
| `02_project_definition/user_story_registry.md` | `02_project_definition/templates/user_story_template.md`, `01_cowork_protocol/session_protocol.md` | `05_verification/quality_gate.md`, `02_project_definition/deliverable_plan.md` | 구조 동기화 / 운영 동기화 |
| `03_design_artifacts/adr_registry.md` | `03_design_artifacts/templates/adr_template.md`, `03_design_artifacts/tech_stack.md`, `01_cowork_protocol/session_protocol.md` | `01_cowork_protocol/tooling_environment_guide.md`, 4개 진입점, `07_delivery/export_spec.md`, `02_project_definition/deliverable_plan.md` | 구조 동기화 / 운영 동기화 |
| `04_implementation/milestone_registry.md` | `04_implementation/templates/milestone_template.md`, `06_evolution/project_state.md`, `members/team_board.md`, `01_cowork_protocol/session_protocol.md` | `02_project_definition/deliverable_plan.md`, `05_verification/quality_gate.md` | 구조 동기화 / 운영 동기화 |
| `04_implementation/task_registry.md` | `04_implementation/templates/task_template.md`, `members/team_board.md`, `06_evolution/project_state.md`, `01_cowork_protocol/session_protocol.md` | `05_verification/quality_gate.md`, `02_project_definition/deliverable_plan.md`, `07_delivery/export_spec.md` | 구조 동기화 / 운영 동기화 |
| `02_project_definition/templates/intent_template.md` | `02_project_definition/intent_registry.md`, `05_verification/quality_gate.md` | `01_cowork_protocol/session_protocol.md`, `upgrade_manifest.md` | 구조 동기화 |
| `02_project_definition/templates/user_story_template.md` | `02_project_definition/user_story_registry.md`, `05_verification/quality_gate.md` | `01_cowork_protocol/session_protocol.md`, `upgrade_manifest.md` | 구조 동기화 |
| `03_design_artifacts/templates/adr_template.md` | `03_design_artifacts/adr_registry.md`, `03_design_artifacts/tech_stack.md`, `05_verification/quality_gate.md` | 4개 진입점, `upgrade_manifest.md` | 구조 동기화 |
| `04_implementation/templates/milestone_template.md` | `04_implementation/milestone_registry.md`, `05_verification/quality_gate.md` | `01_cowork_protocol/session_protocol.md`, `upgrade_manifest.md` | 구조 동기화 |
| `04_implementation/templates/task_template.md` | `04_implementation/task_registry.md`, `members/team_board.md`, `05_verification/quality_gate.md` | `01_cowork_protocol/session_protocol.md`, `upgrade_manifest.md` | 구조 동기화 |
| `06_evolution/templates/session_log_template.md` | `01_cowork_protocol/session_protocol.md`, `06_evolution/project_state.md`, `05_verification/quality_gate.md` | `upgrade_manifest.md` | 구조 동기화 / 운영 동기화 |
| `02_project_definition/requirement_spec.md`, `02_project_definition/functional_spec.md`, `02_project_definition/domain_glossary.md`, `02_project_definition/risk_register.md` | 보통 없음 | `02_project_definition/deliverable_plan.md`, `07_delivery/export_spec.md`, `05_verification/quality_gate.md`, `01_cowork_protocol/document_role_inventory.md`, `04_implementation/milestone_registry.md` | 내용 동기화 |
| `03_design_artifacts/domain_model.md`, `03_design_artifacts/interface_contract.md`, `03_design_artifacts/data_model.md`, `03_design_artifacts/tech_stack.md`, `03_design_artifacts/ui_spec.md` | 보통 없음 | `02_project_definition/deliverable_plan.md`, `07_delivery/export_spec.md`, `05_verification/quality_gate.md`, `03_design_artifacts/adr_registry.md`, `01_cowork_protocol/tooling_environment_guide.md`, 4개 진입점 | 내용 동기화 |
| `04_implementation/coding_convention.md`, `04_implementation/review_checklist.md` | `01_cowork_protocol/session_protocol.md` | `05_verification/quality_gate.md`, 4개 진입점 | 내용 동기화 / 운영 동기화 |
| `05_verification/test_strategy.md`, `05_verification/test_case.md` | `05_verification/quality_gate.md` | `07_delivery/export_spec.md`, `02_project_definition/deliverable_plan.md`, `04_implementation/milestone_registry.md`, `01_cowork_protocol/document_role_inventory.md` | 내용 동기화 / 운영 동기화 |
| `05_verification/verification_evidence.md` | `05_verification/quality_gate.md`, `05_verification/test_strategy.md`, `05_verification/test_case.md`, `01_cowork_protocol/document_role_inventory.md` | `04_implementation/review_checklist.md`, `04_implementation/task_registry.md`, `06_evolution/project_state.md`, `07_delivery/export_spec.md` | 내용 동기화 / 운영 동기화 |
| `06_evolution/knowledge_base.md`, `06_evolution/retrospective.md` | `01_cowork_protocol/session_protocol.md`, `README.md` | `01_cowork_protocol/document_role_inventory.md`, `06_evolution/project_state.md`, `04_implementation/milestone_registry.md` | 운영 동기화 |
| `07_delivery/release_note.md`, `07_delivery/operation_guide.md`, `07_delivery/user_manual.md` | `07_delivery/export_spec.md`, `02_project_definition/deliverable_plan.md` | `README.md`, `01_cowork_protocol/document_role_inventory.md` | 내용 동기화 |
| `members/my_state_template.md` | `01_cowork_protocol/session_protocol.md`, `06_evolution/project_state.md` | `members/team_board.md`, `01_cowork_protocol/document_role_inventory.md` | 구조 동기화 / 운영 동기화 |
| 진입점 4종 (`AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, `.github/copilot-instructions.md`) | 나머지 3개 진입점 | `cowork.md`, `README.md`, `01_cowork_protocol/session_protocol.md`, `01_cowork_protocol/tooling_environment_guide.md`, `01_cowork_protocol/document_role_inventory.md` | 내용 동기화 / 자동화 동기화 |
| `.cowork` 폴더 구조 또는 파일 경로 변경 | `cowork.md`, `README.md`, `01_cowork_protocol/session_protocol.md`, `01_cowork_protocol/tooling_environment_guide.md`, `01_cowork_protocol/document_role_inventory.md`, 4개 진입점, `upgrade_manifest.md` | `05_verification/quality_gate.md`, `07_delivery/export_spec.md` | 구조 동기화 / 자동화 동기화 |
| `upgrade_manifest.md` | `cowork.md`, `README.md`, `01_cowork_protocol/session_protocol.md`, `01_cowork_protocol/tooling_environment_guide.md` | `01_cowork_protocol/document_change_impact_matrix.md` | 구조 동기화 / 자동화 동기화 |

---

## 운용 메모

- 이 문서는 “무조건 같이 수정해야 하는 파일” 목록이 아니라, 먼저 확인해야 하는 영향 범위 지도다.
- 단순 프로젝트 내용 누적은 보통 해당 기준 본문 안에서 끝난다.
- 역할, 경로, 상태, gate, export, 자동화 문구 변경은 연쇄 영향이 크므로 이 문서를 우선 참조한다.
