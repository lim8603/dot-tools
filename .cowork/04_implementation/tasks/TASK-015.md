# TASK-015 — 프로파일 export/import (F12)

> MS-006 (M5) 마지막 Task. 완료 시 MS-006 Done.

---

## 개요

| 항목 | 내용 |
|------|------|
| Task ID | TASK-015 |
| 관련 Milestone | MS-006 (M5 설정 페이지·호출 구성) |
| 관련 Intent | INT-001 |
| 관련 기능 | F12 (프로파일 export/import) |
| 담당 | AI |
| 상태 | In Progress |
| 의존 | 없음 (MS-006 코어 병합 완료 위에서 진행) |
| 근거 | 상세설계서 §6.3, `data_model.md` §2, ADR-011(runArgs 승격) |

---

## 목적

칩 선택 + 호출 구성 오버레이를 `devswitcher.profile.json` 파일로 export/import 한다.
projectId(`adapterId:상대경로`)가 기계 독립적이라 팀/클론 간 공유 가능하다.

---

## C-4 결정 — export 포맷 확정 (승인 2026-08-15, 세션 #005)

설계서/`data_model.md`의 구 예시는 ADR-011 이전 형태(`runArgs`가 selection 레벨).
→ **export 포맷을 현재 `PersistedState`와 정렬**: 두 맵(`selections` + `invocation`)을 담고,
기계·세션 종속인 `activeProjectId`는 **제외**한다. `runArgs`는 승격된 위치
(`invocation[projectId][profile].runArgs`)에 그대로 실린다.

```jsonc
{
  "version": 1,
  "exportedAt": "2026-08-15T...Z",
  "selections": { "cargo:crates/my-app/Cargo.toml": { "profile": "release", "features": ["gui"], "target": "main" } },
  "invocation":  { "cargo:crates/my-app/Cargo.toml": { "release": { "runArgs": ["--config","dev.toml"] } } }
}
```

---

## 작업 항목

| # | 파일 | 내용 |
|---|------|------|
| 1 | `src/core/types.ts` | `ProfileExport` 타입 + `PROFILE_EXPORT_VERSION` 상수 (line 208 TODO 해소) |
| 2 | `src/core/profileExport.ts` (신규, vscode-free) | `buildProfileExport(state, now)` · `parseProfileExport(text)`(검증→`PROFILE_IMPORT_INVALID`) · `mergeImport(current, imported, knownIds)`→`{next, applied[], skipped[]}` |
| 3 | `src/core/stateStore.ts` | `getState()`(export용 복사) · `importState(next)`(selections·invocation 교체·persist, activeProjectId 유지) |
| 4 | `src/core/orchestrator.ts` | `exportProfile()`(save 다이얼로그+fs write) · `importProfile()`(open+read→parse→merge→importState→refresh→요약 토스트) |
| 5 | `src/extension.ts` + `package.json` | `devSwitcher.exportProfile` / `devSwitcher.importProfile` 커맨드 |
| 6 | `src/test/unit/profileExport.test.ts` (신규) | build/parse(정상·버전·형태)/merge(반영·skip)/라운드트립 |
| 7 | `data_model.md §2` | export 예시를 신규 2-맵 포맷으로 교체 (C-4 정합화) |

## Import 규칙 (§6.3)

- 파싱 실패·버전 불일치·형태 오류 → `DevSwitcherError('PROFILE_IMPORT_INVALID')` → 에러 토스트.
- 현재 스캔 결과에 **존재하는 projectId만** 반영, 나머지는 결과 요약에 표시(skipped).
- 반영 후 `refresh()`로 reconcile → 유효하지 않은 칩 값 정리(E10).

## 범위 밖 (이월 유지)

- 설정 페이지 export/import 버튼 (v1은 Command Palette). 30일 GC. pre/postBuild 실행(C-5).

## DoD

- mocha 단위 테스트 그린 + check-types/lint/esbuild OK.
- F5 스모크: export → `devswitcher.profile.json` 확인 → import 라운드트립.
