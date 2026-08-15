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

## 0. 설정의 3계층 (ADR-011)

설정은 소유·목적이 다른 세 계층으로 분리한다. 혼동 방지를 위해 저장 위치와 스코프를 명시한다.

| 계층 | 무엇 | 저장 위치 | 스코프 | 수동 CLI에도 적용 |
|------|------|----------|--------|------------------|
| ① 확장 설정 | 확장 동작(`scan.exclude`·`statusBar.abbreviate`) | `settings.json` | 확장/워크스페이스 전역 | — |
| ② 프로필 정의 (SSOT) | `opt-level`·`lto`·features·bin 이름 = "프로젝트의 진실" | 캐노니컬 파일(`Cargo.toml` 등) | (프로젝트 × 구성) | ✅ cargo가 직접 읽음 |
| ③ 호출 구성 오버레이 | RUSTFLAGS·출력경로·링커·env·runArgs·전후명령 | `workspaceState` | (프로젝트 × 구성) | ❌ DevSwitcher 호출 시에만 |

- ①↔③은 완전 별개(저장소·목적·스코프 상이). ②↔③은 `(프로젝트 × 구성)` 키를 공유해 설정 페이지에서 함께 표시하되, ②는 읽기·③은 편집이다.
- **v1은 ②를 읽기만** 하고, ③ 오버레이 주입으로 VS식 속성을 제공한다. ②의 파일 편집(구 §8.7)은 v2로 이월한다.

---

## 1. 저장소 구성

| 데이터 | 저장 위치 | 근거 |
|--------|----------|------|
| 선택 상태(프로파일·아키텍처·features·타깃) | `context.workspaceState` (키 `devSwitcher.state.v1`) | ADR-001 |
| **호출 구성 오버레이 (계층 ③)** | `context.workspaceState` — `(projectId × profile)`별 | ADR-011 |
| 프로파일·features 등 **값의 정의 (계층 ②)** | 각 언어 캐노니컬 파일(`Cargo.toml` 등) | ADR-007 (SSOT) |
| 동작 설정(`scan.exclude`·`statusBar.abbreviate`) (계층 ①) | `settings.json` (`contributes.configuration`, default 보유) | §14 |
| 옵션 카탈로그(설명·예제·허용값) | **확장 번들 데이터**(어댑터별, 읽기 전용) | ADR-012 |
| 공유 스냅샷 | `devswitcher.profile.json` (export/import, 선택) | §6.3 |
| 감지된 프로젝트 목록 | **저장 안 함** — 매 활성화 시 재스캔이 원천 | §6.1 |

---

## 2. 스키마

### `workspaceState` — 키 `devSwitcher.state.v1`

```ts
interface PersistedState {
  activeProjectId?: string;
  selections: Record<string, Record<string, ChipValue>>;   // projectId → (chipId → 값). profile 칩 포함
  // 계층 ③ 호출 구성 오버레이 — (projectId × profile)별 (ADR-011). runArgs는 여기로 승격(F16 일반화)
  invocation: Record<string, Record<string, InvocationConfig>>;  // projectId → profile명 → 오버레이
}
```

- **값이 아니라 선택 + 호출 오버레이만 저장**(ADR-007 보완). 프로필 정의(opt-level 등)는 캐노니컬 파일에만.
- **구성(profile) 차원 도입**: `invocation`은 `(projectId × profile)`로 키잉되어 Debug/Release/커스텀별 다른 옵션·env·runArgs·전후명령을 담는다. profile명은 `selections[projectId]['profile']`에서 온다.
- `runArgs`(구 `Record<projectId, string[]>`)는 `InvocationConfig.runArgs`로 승격 — 이제 구성별로 다르게 저장된다.
- 프로젝트·구성별 독립 유지 — 전환해도 각자 마지막 상태 복원(INV-5).
- **코드 미착수(greenfield)이므로 `invocation`을 초기 `.v1` 스키마에 포함** — 배포된 v1이 없어 마이그레이션 불필요.
- `InvocationConfig` 타입 정의는 `interface_contract.md` §7 참조.

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
