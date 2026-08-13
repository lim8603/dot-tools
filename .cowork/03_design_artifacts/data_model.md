# Data Model

> 데이터 구조 명세 — 이 확장은 DB를 쓰지 않는다. 선택 상태는 workspaceState(Memento), 값은 각 언어의 캐노니컬 파일(SSOT).

---

## 문서 정보

| 항목 | 내용 |
|------|------|
| 관련 Intent | INT-001 |
| 저장소 유형 | In-Memory / VSCode `workspaceState`(Memento) — **DB 없음** |
| 기술 스택 | TypeScript (JSON 직렬화) |
| 버전 | v1 (상세설계서 §6 반입) |

---

## 1. 저장소 구성

| 데이터 | 저장 위치 | 근거 |
|--------|----------|------|
| 선택 상태(프로파일·아키텍처·features·타깃·runArgs) | `context.workspaceState` (키 `devSwitcher.state.v1`) | ADR-001 |
| 프로파일·features 등 **값의 정의** | 각 언어 캐노니컬 파일(`Cargo.toml` 등) | ADR-007 (SSOT) |
| 동작 설정(`scan.exclude`·`statusBar.abbreviate`) | `settings.json` (`contributes.configuration`, default 보유) | §14 |
| 공유 스냅샷 | `devswitcher.profile.json` (export/import, 선택) | §6.3 |
| 감지된 프로젝트 목록 | **저장 안 함** — 매 활성화 시 재스캔이 원천 | §6.1 |

---

## 2. 스키마

### `workspaceState` — 키 `devSwitcher.state.v1`

```ts
interface PersistedState {
  activeProjectId?: string;
  selections: Record<string, Record<string, ChipValue>>;   // projectId → (chipId → 값)
  runArgs: Record<string, string[]>;                        // projectId → 실행 인자 (F16)
}
```

- **값이 아니라 선택만 저장**(ADR-007). 빌드 플래그·프로파일 정의는 캐노니컬 파일에만.
- 프로젝트별 독립 유지 — 전환해도 각자 마지막 선택 복원(INV-5).
- 키에 스키마 버전(`.v1`) 포함 — 마이그레이션 대비.

### export 파일 `devswitcher.profile.json` (F12)

```jsonc
{
  "version": 1,
  "exportedAt": "2026-08-13T12:00:00Z",
  "selections": {
    "cargo:crates/my-app/Cargo.toml": {
      "values": { "profile": "release", "architecture": "x86_64-pc-windows-msvc",
                  "features": ["gui", "metrics"], "target": "main" },
      "runArgs": ["--config", "dev.toml"]
    }
  }
}
```

- projectId(`adapterId:상대경로`)는 기계 독립 — 팀/클론 간 그대로 공유 가능.

---

## 3. 재검증 (reconcile) — §6.2

활성화·재스캔 시:

| 상황 | 처리 |
|------|------|
| 저장된 projectId가 스캔 결과에 없음 | 항목 유지하되 비활성(브랜치 전환 대비). **30일 초과 미사용 시 정리** |
| 칩 값이 `listItems` 결과에 없음(프로파일 삭제 등) | 해당 값만 삭제 + 미선택 표시(E10) |

---

## 4. 마이그레이션 전략

| 버전 | 변경 | 호환성 |
|------|------|--------|
| v1 | 초기 스키마 (`devSwitcher.state.v1`) | — |
| 향후 | 스키마 변경 시 새 키(`.v2`) + v1 읽어 이관 | Backward (v1 읽기 유지) |

---

## 5. 가정 (Assumptions)

| ID | 가정 | 영향 |
|----|------|------|
| ASM-001 | 선택 상태 규모가 작다(프로젝트 수 × 칩 수) | Memento(JSON) 저장으로 충분, DB 불필요 |

---

## 6. 미확정 사항 (Open Questions)

| ID | 항목 | 질문 | 상태 |
|----|------|------|------|
| OQ-001 | 미사용 항목 정리 주기 | 30일이 적절한지 | Deferred |

---

## 7. 관련 근거 / 출처

| ID | 근거 | 출처 | 비고 |
|----|------|------|------|
| SRC-001 | PersistedState·export 스키마·reconcile | 상세설계서 §6 | 원문 |
| SRC-002 | 저장 위치 결정 | ADR-001, ADR-007 | 반입 |
