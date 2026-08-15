# TASK-019 — pre/postBuild 실행 배선 + buildEvent 편집

> MS-007 (M6). 이월 C-5 해소 — 현재 InvocationConfig에 저장만 되고 주입 안 됨.

---

## 개요

| 항목 | 내용 |
|------|------|
| Task ID | TASK-019 |
| 관련 Milestone | MS-007 (M6 품질·배포) |
| 관련 기능 | F21 (호출 구성 오버레이 — 빌드 전후 명령), C-5 |
| 담당 | AI · 상태 Planned |
| 의존 | 없음 (MS-006 위에서 독립 진행) |
| 근거 | 세션 #004 TASK-012, ADR-011, 설정 페이지 buildEvent 탭(현재 "planned" 표시) |

## 목적

`InvocationConfig.preBuild`/`postBuild`(현재 저장만)를 빌드/실행 **전후에 실제 실행**하고, 설정 페이지에서 편집 가능하게 한다.

## 작업 항목

1. **실행 배선** — orchestrator build()/run() 플로우에서:
   - preBuild 명령들을 본 Task **이전에** 순차 실행(하나라도 실패 시 중단 + Problems/토스트).
   - postBuild 명령들을 본 Task **성공 후** 순차 실행.
   - 실행 수단 결정: TaskRunner 재사용 vs 별도 ShellExecution. **NFR-002 셸 정책** 확인 — preBuild는 임의 명령이라 ShellExecution 불가피할 수 있음(§NFR-002a 셸 예외 근거 확인 후 확정).
2. **설정 페이지 buildEvent 에디터** — 현재 "Pre/post-build commands — planned." 자리에 preBuild/postBuild 목록 편집 UI(runArgs 에디터 패턴 재사용). Command preview에 전/후 단계 반영 여부 결정.
3. 단위 테스트: 전후 명령 시퀀싱/중단 로직(순수 분리 가능분).

## 열린 결정 (착수 시)

- preBuild 실행 실패 시 빌드 진행 여부(기본: 중단).
- 셸 사용 범위 — 임의 명령 실행은 ShellExecution 필요. NFR-002/002a와 정합화.

## DoD

- F5: preBuild에 `echo`/파일생성류 → 빌드 전에 실행 확인, postBuild 성공 후 실행 확인.
- check-types/lint/esbuild OK.
