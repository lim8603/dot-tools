# TASK-016 — Doctor 진단 모델 (순수 코어) + 어댑터 진단 계약

> MS-007 (M6) 첫 Task. Doctor(F19)의 판정 로직을 vscode 무의존으로 분리.

---

## 개요

| 항목 | 내용 |
|------|------|
| Task ID | TASK-016 |
| 관련 Milestone | MS-007 (M6 품질·배포) |
| 관련 기능 | F19 (환경 진단·의존성 처리, Doctor) |
| 담당 | AI · 상태 Planned |
| 의존 | 없음 |
| 근거 | 상세설계서 §13.1~13.5, §4(LanguageAdapter) |

## 목적

Doctor가 활성 어댑터의 전제조건을 일괄 점검하는데, **판정 로직(항목·상태·해결 단계)을 어댑터 무지의 순수 코어**로 만들어 단위 테스트한다. Doctor 자체는 어댑터가 선언한 checks만 소비한다(§13.5).

## 설계 (초안)

- `core/diagnostics.ts` (vscode-free):
  - `DiagnosticStatus = 'ok' | 'warn' | 'error' | 'info'` (✅/⚠️/❌/ℹ️)
  - `DiagnosticTier = 1 | 2 | 3` (완전자동 / 반자동 / 안내만, §13.2)
  - `DiagnosticItem { id; label; status; detail?; tier; resolveActionId? }`
  - 순수 헬퍼: 어댑터 원천 신호(설치 여부·버전·target 목록)를 받아 `DiagnosticItem[]`로 판정/정렬(❌·⚠️ 우선, ℹ️ 후순위).
- **어댑터 진단 계약** (types.ts `LanguageAdapter` 확장, 최소 침습):
  - `collectDiagnostics(): Promise<DiagnosticSignal[]>` 또는 기존 `requiredExtensions` + `checkToolchain` 재사용을 조합하는 얇은 어댑터 메서드. (구체 시그니처는 착수 시 확정 — cargo가 `checkToolchain`·`listInstalledTargets` 재사용)
- 재사용: `cargoBridge.checkToolchain`(TASK-005) 결과를 신호로 매핑.

## 작업 항목

1. `core/diagnostics.ts` 타입 + 판정/정렬 순수 함수.
2. `LanguageAdapter`에 진단 신호 선언 계약 추가 (types.ts).
3. cargo 어댑터가 checkToolchain/requiredExtensions를 진단 신호로 노출.
4. `test/unit/diagnostics.test.ts` — 상태 판정·정렬·단계 분류 케이스.

## 범위 밖

- QuickPick/칩/커맨드 등 vscode 배선은 TASK-017. rustup target 열거·설치는 TASK-018.

## DoD

- mocha 그린(신규 테스트 포함) · check-types/lint/esbuild OK.
- 어댑터 계약이 UI/orchestrator를 건드리지 않고 확장 가능(INV-2).
