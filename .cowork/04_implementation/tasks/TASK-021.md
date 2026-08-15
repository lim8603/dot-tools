# TASK-021 — README + VSIX 패키징

> MS-007 (M6) 마지막 Task. 완료 시 MS-007 Done → v0.1.0 배포 산출물.

---

## 개요

| 항목 | 내용 |
|------|------|
| Task ID | TASK-021 |
| 관련 Milestone | MS-007 (M6 품질·배포) |
| 관련 산출물 | README, `devswitcher-tools-0.1.0.vsix` |
| 담당 | AI · 상태 Planned |
| 의존 | TASK-016~020 (기능·검증 완료 후) |
| 근거 | 상세설계서 §16(M6), §14(contributes), deliverable_plan |

## 목적

사용자 문서(README)를 작성하고 확장을 VSIX로 패키징해 개인용 v0.1.0 배포 산출물을 만든다.

## 작업 항목

1. **README.md** — 소개(다언어 통합 상태바 UX), 지원 범위(v1=Rust 실구현 + 3개 스텁), 설치/사용법, 상태바·설정 페이지·Doctor·export-import 설명, 단축키(ctrl+alt+b/r/d), 요구사항(cargo/rustup·CodeLLDB), 알려진 한계(§12.4 한 창=한 환경 등).
2. **패키징 메타** — `package.json`: version `0.1.0`, publisher 확정, `categories`·`keywords`·`repository`·`icon`(있으면), `engines` 확인.
3. **`.vscodeignore`** — `src/`, `.cowork/`, 테스트, 소스맵 등 제외해 vsix 슬림화. `dist/`만 포함(esbuild 번들).
4. **LICENSE** — MIT 명시(package.json license와 정합), LICENSE 파일 확인/생성.
5. **패키징 실행** — `@vscode/vsce`로 `vsce package` → `devswitcher-tools-0.1.0.vsix` 생성 검증(설치·로드 스모크).
6. deliverable_plan의 활성 산출물과 대조(필수 문서 충족 확인).

## 범위 밖

- Marketplace 공개 게시(개인용 v0.1은 vsix 배포까지). CI 자동 릴리즈.

## DoD

- README 존재·정확. `devswitcher-tools-0.1.0.vsix` 생성 + 클린 VSCode에 설치→활성화 스모크 통과.
- **MS-007 Done** 조건 충족(quality_gate 대조).
