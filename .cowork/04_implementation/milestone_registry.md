# Milestone Registry

> 마일스톤 인덱스 — Intent와 Task 사이의 중간 완료 지점을 관리한다

---

## 목적

Milestone은 `Phase`와 다르다.
`Phase`가 프레임워크의 고정 라이프사이클이라면, Milestone은 프로젝트별 중간 완료 단위다.

- 어떤 묶음이 "의미 있게 끝났다"고 볼 수 있는지 정의한다
- Task를 묶는 중간 계층으로 사용한다
- 작은 프로젝트에서는 상세 파일 없이 이 문서만으로 경량 운영할 수 있다

---

## 기록 규칙

- registry에는 `MS-000` 같은 더미 ID를 남기지 않는다.
- 항목이 없을 때는 표에 예시 행을 넣지 않고 `현재 등록 Milestone 없음`만 남긴다.
- `문서 경로`는 상세 Milestone 문서를 만든 경우에만 채우고, 경량 운영이면 비워둘 수 있다.
- `관련 Task`에는 현재 진행을 대표하는 `TASK-*`만 짧게 적고, 연결된 Task가 없으면 `없음`으로 적거나 비운다.

---

## Milestone 목록

| Milestone ID | 제목 | 관련 Intent | 주 Phase | 상태 | 관련 Task | 문서 경로 | 비고 |
|--------------|------|-------------|----------|------|-----------|----------|------|
| MS-001 | M0 셋업 — 스캐폴드 + F5 Hello World | INT-001 | Build | Done | TASK-001 | | 스캐폴드 + F5 Hello World 검증 완료(2026-08-15). main 병합 |
| MS-002 | M1 코어 타입·칩 프레임워크 | INT-001 | Build | Done | TASK-002, TASK-003 | | `types.ts` + 4개 어댑터 칩 스텁(Python 리트머스) + F20 createProject 계약. 인터페이스 확정 검증(tsc) 완료, main 병합(2026-08-15) |
| MS-003 | M2 CargoBridge + CargoAdapter | INT-001 | Build | Done | TASK-004, TASK-005, TASK-006 | | 메타데이터/빌드 JSON 파싱·인자 조립·features·resolveExecutable + 단위테스트(34). TASK-004·005·006 Done — build/run/resolveExecutable/chips/listProjects 실동작. main 병합(FF, 2026-08-15). **디버그 구성=M4, cargo createProjectTask=MS-008(F20)로 이월** |
| MS-004 | M3 상태바·상태 저장·감시 | INT-001 | Build | Done | TASK-007, TASK-008, TASK-009 | | 칩 렌더링·QuickPick·StateStore·reconcile·ManifestWatcher. TASK-007·008·009 Done. **F5 end-to-end 검증 통과**, main 병합(FF, 2026-08-15). Rust 선택 UX 실사용 가능 |
| MS-005 | M4 실행·디버그 | INT-001 | Build | Done | TASK-010, TASK-011 | | TaskRunner·problem matcher·디버그 플로우·키바인딩. TASK-010·011 Done. **F5 검증 통과**(Build/Run + Debug 중단점), main 병합(FF, 2026-08-15). Rust 빌드·실행·디버그 실사용 가능. F19·Doctor 이월 |
| MS-006 | M5 설정 페이지 | INT-001 | Build | Done | TASK-012, TASK-013, TASK-014, TASK-015 | 2026-08-15 | 코어(012 주입·013 Webview 셸·014 호출구성 탭) + **015 export/import(F12)** 모두 **F5 통과·main 병합**. pre/postBuild 실행은 C-5로 MS-007 이월. **Cargo.toml 국소편집은 v2 이월** |
| MS-007 | M6 품질·배포 | INT-001 | Build | Done | TASK-016~021 | 2026-08-16 | 016 Doctor 모델·017 Doctor UI+E1칩·018 rustup target·019 pre/postBuild(C-5)·020 통합테스트+체크리스트(F18)·021 README+VSIX 전부 Done·병합. **v0.1.0 vsix 산출**(`devswitcher-tools-0.1.0.vsix`). Gate 5 = README·VSIX 해소, 잔여 수동검증(TC-11 WSL·TC-09·TC-02/03)은 문서화된 잔여 리스크로 v0.1 확정 |
| MS-008 | 시작 마법사 (F20) | INT-001 | Build | Done | TASK-022~024 | 2026-08-16 | 022 마법사 코어+Cargo·023 dotnet/cmake/python(계약 `createProject: task\|files`)·024 통합테스트+검증. **4개 언어 생성 F5 통과**(Rust/C#=네이티브 new, C++/Python=workspace.fs, D-13). OQ-001=자동 활성전환. scope A: v1 스위처 자동등장=Rust만. unit 98+통합 3 |

> 현재 등록 Milestone: MS-001~MS-008 (상세설계서 §16 로드맵 M0~M6 + F20 마법사)

- `주 Phase`: `Define` / `Design` / `Build` / `Verify` / `Evolve` / `Deliver`
- `상태`: `Planned` / `In Progress` / `Review` / `Done` / `Deferred`
- 상세 계획이 필요한 Milestone은 `milestones/MS-*.md`를 생성한다(현재는 registry 경량 운영).
- 의존 순서: MS-001 → … → MS-007 **Done(2026-08-16, v0.1.0)**, **MS-008(F20) Done(2026-08-16)**. **등록된 모든 Milestone(MS-001~008) 완료.** 이후는 v2 백로그(C-3 캐노니컬 편집·C-6 Run Group 등)로 새 Intent/Milestone 시 착수.

---

## 운영 규칙

- AI가 초안을 제안하고 Human이 승인하여 확정한다.
- 상세 계획이 필요한 경우 `milestones/MS-*.md`를 생성한다.
- 짧은 프로젝트에서는 이 문서의 행 단위로만 관리할 수 있다.
