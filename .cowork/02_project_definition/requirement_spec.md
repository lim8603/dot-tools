# Requirement Specification

> 기능적 · 비기능적 요구사항 명세 — Intent를 구체적 요구사항으로 분해

---

## 문서 정보

| 항목 | 내용 |
|------|------|
| 관련 Intent | INT-001 |
| 버전 | v1 (설계서 v1.1 반입) |
| 상태 | Approved |

---

## 1. 기능적 요구사항 (Functional Requirements)

> 상세 동작은 `functional_spec.md`(F1~F19)를 기준으로 한다. 여기서는 요구 수준으로만 정리한다.

| ID | 요구사항 | 우선순위 | 수락 기준 | 관련 기능 |
|----|---------|---------|----------|-----------|
| FR-001 | 워크스페이스의 언어 프로젝트를 자동 감지하고 어댑터를 바인딩한다 | Must | 단일/워크스페이스/멀티루트에서 프로젝트 정확 열거 | F1 |
| FR-002 | 상태바에서 프로젝트를 전환하고 선택 상태를 프로젝트별로 유지한다 | Must | 전환 시 각 프로젝트의 마지막 선택 복원 | F2, F4 |
| FR-003 | 어댑터가 선언한 칩(프로파일·아키텍처·features·타깃·환경)을 상태바가 동적으로 렌더링한다 | Must | 어댑터 추가 시 상태바 코드 무변경, Python 리트머스 통과 | F3 |
| FR-004 | 설정값은 각 언어의 캐노니컬 파일에만 두고 선택 상태는 workspaceState에 저장한다 | Must | 값 이중화 없음, `.vscode/` 커밋 오염 없음 | F4 |
| FR-005 | 빌드/실행을 Task API로 실행하고 종료 코드·진단을 감지한다 | Must | 컴파일 에러가 Problems에 표시, 종료 코드 실패 감지 | F5, F8, F13 |
| FR-006 | 디버그를 "빌드 보장→경로 해석→디버거 기동" 순으로 자동 수행한다 | Must | 빌드 실패 시 중단, 성공 시 CodeLLDB 기동·brk 히트 | F5 |
| FR-007 | 매니페스트 변경 시 상태바를 자동 갱신한다 | Must | Cargo.toml 프로파일/타깃/features 추가 시 갱신 | F17 |
| FR-008 | 선택 상태를 파일로 export/import 한다 | Should | 라운드트립·타 클론 import 동작 | F12 |
| FR-009 | 원격 환경(WSL/컨테이너/SSH)에서 전 기능이 동작한다 | Must | WSL에서 FR-001~007 동일 동작 | F18 |
| FR-010 | 환경 진단(Doctor)으로 툴체인·확장·target 상태를 보고하고 복구 액션을 제공한다 | Must | 1단계 즉시 설치, 2·3단계 안내 | F19, F14 |
| FR-011 | Cargo features와 실행 인자(run args)를 칩/설정으로 제어한다 | Should | features→cargo 인자 변환, runArgs `--` 전달 | F15, F16 |
| FR-012 | (정의만) 스크립트 언어의 환경(venv/conda) 선택 축을 칩 프레임워크로 표현한다 | Could | 칩 선언 표현 가능(구현은 PythonAdapter 시점) | F11 |
| FR-013 | 매니페스트 없는 폴더에서 명령으로 새 프로젝트를 시작한다(전 언어, 수동 호출, 기본 템플릿, 네이티브 도구 위임) | Must | 빈 폴더→언어 선택→매니페스트 생성→스위처 자동 등장. 4개 언어 실동작 | F20 (ADR-010) |
| FR-014 | 컴파일 옵션·출력·링커·환경변수·빌드 전후 이벤트를 파일 편집 없이 (프로젝트×구성)별로 저장했다가 빌드/실행 호출 시 주입하고, 설정 페이지의 옵션 카탈로그(설명·예제·타입)로 편집한다 | Should | Debug/Release별 다른 옵션 저장·주입, 미리보기=실행 명령 일치, 캐노니컬 파일 무편집(v1) | F21 (ADR-011·012) |

---

## 2. 비기능적 요구사항 (Non-Functional Requirements)

| ID | 카테고리 | 요구사항 | 측정 기준 | 목표값 |
|----|---------|---------|----------|-------|
| NFR-001 | 성능(응답성) | 칩 클릭은 메타데이터 캐시로 즉시 반응 | `cargo metadata` 지연과 무관한 칩 응답 | 캐시 히트 시 체감 지연 없음 |
| NFR-002 | 보안 | Webview는 외부 리소스 금지, 프로세스 인자는 셸 이스케이프 차단 | CSP `default-src 'none'`, `ProcessExecution`(배열 인자) | 외부 fetch 0, 셸 인젝션 불가 |
| NFR-002a | 보안(예외) | 빌드 전/후 이벤트(F21)는 사용자 자유 명령이라 `ShellExecution` 허용 — NFR-002의 문서화된 예외 | 사용자 본인 워크스페이스 명령에 한정, 외부 입력 미주입 | 명시적 사용자 설정만 실행 |
| NFR-002b | 보안(예외) | Node/TS(MS-016) build/run/debug는 패키지 매니저가 Windows에서 `.cmd` 심이라 **배열형 `ShellExecution`** 허용 — NFR-002의 문서화된 예외(ADR-016) | 인자를 배열로 개별 전달해 VSCode가 인용 → 셸 인젝션 차단(NFR-002 보안 목표 유지). raw 명령줄 문자열 금지 | 인젝션 불가(배열 인용). Node 24 셸-less `.cmd` spawn=EINVAL 실측 |
| NFR-003 | 견고성 | 없는 도구가 있어도 확장이 죽지 않고 해당 기능만 비활성화 | Graceful Degradation(F19) | 툴체인 부재 시 경고 칩+복구 경로 |
| NFR-004 | 이식성 | 로컬/원격(WSL·컨테이너·SSH) 무관하게 동작 | Uri 기반 경로, cargo가 산출물 경로 해석 | OS 경로 가정 0 |
| NFR-005 | 확장성 | 새 언어 어댑터 추가 시 UI/오케스트레이터 코드 무변경 | 칩 배열 순회 구조(DD-03) | 어댑터 = 디스크립터+메서드 추가만 |
| NFR-006 | 유지보수성 | cargo 경계층 파싱/인자 조립은 VSCode 무의존 순수 함수 | `cargoBridge.ts` 단위 테스트 가능 | 순수 함수 커버(§15.1) |

---

## 3. 제약 사항 (Constraints)

| ID | 제약 사항 | 근거 |
|----|---------|------|
| CON-001 | 구현 언어 TypeScript, 번들러 esbuild | 설계 확정, `yo code` 스캐폴드 |
| CON-002 | `engines.vscode ^1.90.0`, `extensionKind: ["workspace"]` | Task API·원격 실행 보장 |
| CON-003 | v1 실구현은 CargoAdapter(Rust) 단독, 3개 어댑터는 스텁 | 범위 관리, 인터페이스 선확정 |
| CON-004 | 초기 배포는 개인용 VSIX 직접 설치 | 개인 사용 목적, 추후 공개 검토 |
| CON-005 | 1인(solo) 개발, VSCode 확장 개발 경험 없음 | 러닝커브 고려한 문서/셋업 필요 |

---

## 4. 의존성 (Dependencies)

| ID | 의존 대상 | 영향 | 상태 |
|----|---------|------|------|
| DEP-001 | cargo / rustup 툴체인 | 없으면 기능 비활성(E1) | 온디맨드 2단계 처리 |
| DEP-002 | CodeLLDB(`vadimcn.vscode-lldb`) | Rust 디버깅 필수 | 온디맨드 1단계 설치(DD-09) |
| DEP-003 | Rust 언어 확장(`$rustc` matcher) | 진단 표시 | 없으면 자체 matcher 폴백 |
| DEP-004 | 원격 확장(WSL/Dev Containers/Remote-SSH) | 원격 시나리오 | 사용자 환경 전제 |
| DEP-005 | TOML/JSONC/XML 파서 라이브러리 | 캐노니컬 파일 국소 편집 | `smol-toml` 등 선정 예정 |

---

## 5. 용어 정의 (Glossary)

> 전체 용어는 `domain_glossary.md`를 기준으로 한다.

| 용어 | 정의 |
|------|------|
| LanguageAdapter | 언어별 빌드/디버그/실행 로직을 캡슐화한 인터페이스 (설계 핵심) |
| ChipDescriptor | 어댑터가 상태바 칩 하나를 선언하는 구조 (DD-03) |
| SSOT 파사드 | 값은 캐노니컬 파일에만, 확장은 포인터·선택 상태만 소유 (DD-07) |

---

## 6. 가정 (Assumptions)

| ID | 가정 | 영향 | 검증 필요 여부 |
|----|------|------|---------------|
| ASM-001 | v1 실사용 대상은 Rust 프로젝트 | 우선순위·테스트 범위 | No (확정) |
| ASM-002 | 사용자는 로컬 또는 지원 원격 환경에 rust 툴체인을 보유 | Doctor로 재진단 | No |
| ASM-003 | `cargo metadata --format-version=1`은 안정 인터페이스 | 파싱 안정성 | No (버전 고정으로 완충) |

---

## 7. 미확정 사항 (Open Questions)

| ID | 항목 | 질문 | 담당 | 상태 |
|----|------|------|------|------|
| OQ-001 | 혼재 워크스페이스 칩 전환 UX | 칩이 나타났다 사라지는 것이 혼란스러운가(R6) | Joint | Deferred (M6 실사용 후) |
| OQ-002 | publisher/버전 정책 | Marketplace 공개 시 publisher·버전 규칙 | Human | Deferred (공개 검토 시) |

---

## 8. 근거 / 출처 (Evidence & Sources)

| ID | 근거 | 출처 문서/대화 | 비고 |
|----|------|---------------|------|
| SRC-001 | 개념설계(기능·아키텍처 원안) | `.cowork/06_evolution/imported_context/DevSwitcher-Tools_Concept-Design.md` | 원천 |
| SRC-002 | 상세설계(DD-01~12, F15~F21, 원격·Doctor·마법사·호출구성) | `.cowork/06_evolution/imported_context/DevSwitcher-Tools_Detailed-Design.md` | 충돌 시 우선 |
