# 컴포넌트 마크업 충실도 원칙 (KRDS 키트 = 단일 출처)

이 빌더가 만들어내는 사이트는 **KRDS 공식 마크업을 그대로 따른다.** 임의 마크업/클래스를 발명하지 않는다.

## 원칙

1. **출처는 벤더 키트**: 모든 컴포넌트(Preview + export html)와 우측 폼 위젯, 향후 패턴의 마크업은
   `vendor/krds/html/code/*.html`(KRDS HTML Component Kit v1.1.0)에서 가져온다. CSS는
   `vendor/krds/.../output.css`(앱이 이미 로드)가 담당 — 커스텀 CSS는 KRDS에 없는 것만 최소한으로.
2. **대응이 없으면 가장 가까운 KRDS 패턴**을 쓰고, 컴포넌트 정의에 `isKrdsStandard: false`로 정직하게 표기,
   주석에 근거(어느 KRDS 패턴 기반인지)를 남긴다. (예: 카드=구조화목록, 제목영역=시맨틱 헤딩+타이포)
3. **각 컴포넌트 파일 상단 주석에 KRDS 출처를 명시**한다(현재 관례 — 어느 키트 스니펫/`#krds-*` 골격 기반인지).
4. **임의 `.col-*` 등 클래스 금지**(다단 그리드처럼 KRDS에 재사용 클래스가 없는 경우만 `display:grid` 등으로 자체 구현하되 KRDS 수치를 따른다).
5. **폼 위젯**(Step 5 우측 패널)도 KRDS 폼 마크업 사용: `.form-group > .form-tit>label + .form-conts>input.krds-input`(또는 `.krds-form-select` 등) `+ .form-hint`. `editableProps`의 `label`→`.form-tit`, `help`→`.form-hint`, `required`→필수표시로 매핑.

## 키트 스니펫 ↔ 컴포넌트 매핑(현재 11종)

| 컴포넌트 | KRDS 키트 출처 | std |
|---|---|---|
| button | `button.html`(`krds-btn`) | ✅ |
| table | `table.html`/`structured_list_table.html`(`krds-table-wrap > table.tbl`) | ✅ |
| input-form | `text_input.html`(`form-group` 구조) | ✅ |
| masthead | `masthead.html`(`#krds-masthead`) | ✅ |
| header | `header.html`(`#krds-header`) — **MVP 단순화** | ✅(축약) |
| footer | `footer.html`(`#krds-footer`) — **MVP 단순화** | ✅(축약) |
| skip-link | `skip_link.html`(`#krds-skip-link`) | ✅ |
| image | 시맨틱 `img`(+선택 `figure/figcaption`) — KRDS 전용 클래스 없음 | ✅ |
| card | KRDS "카드" 없음 → 구조화목록 근접 | ⛔ false |
| page-title | KRDS 비표준 → 시맨틱 헤딩+타이포 | ⛔ false |
| layout | KRDS 범용 그리드 없음 → `display:grid`(style_05 수치) | ⛔ false |

## audit(충실도 점검)

기존 11종을 키트와 1:1 대조해 어긋난 곳을 잡는다. 발견은 3분류:
- **error**: KRDS와 실제로 어긋남(잘못된 클래스/구조/누락) → 고친다(TDD).
- **intentional**: 의도적 단순화(header/footer MVP) → 유지하되 "추후 충실화" 백로그로 기록.
- **ok**: 키트와 일치.

audit 결과/이력은 이 문서 하단 또는 HANDOFF에 누적.

---

## audit 결과 (2026-06-26, 병렬 점검 A/B/C — 전문은 `.superpowers/sdd/audit-{A,B,C}.md`)

### 🔴 error — ✅ 4건 전부 수정 완료 (2026-06-26, TDD)
| # | 컴포넌트 | 내용 | 상태 |
|---|---|---|---|
| E1 | button | primary가 `krds-btn`만 → `krds-btn primary` | ✅ 커밋 `a248676` |
| E2 | table | `<colgroup><col>` 누락 → columns 수만큼 추가 | ✅ 커밋 `a248676`(스냅샷 `419ab0d`) |
| E3 | header | `nav.krds-main-menu>ul.gnb-menu`, `header-actions`, `btn-navi sch/login/join/all`, 메뉴=`gnb-main-trigger is-link` | ✅ 커밋 `e3b803d` |
| E4 | footer | `info-addr`, 연락처 `<ul class="info-cs">`, 정책링크 `f-menu` | ✅ 커밋 `69c8c9e` |

> 교훈: 컴포넌트 마크업을 바꾸면 `src/registry/html-snapshots.test.ts`(`toMatchSnapshot`)가 깨진다 — 의도된 변경이면 `npx vitest run -u`로 갱신하고 diff를 검토할 것.

### 🟡 intentional / 백로그 (의도적 단순화·미구현 — 유지하되 추후)
- button: 크기 variant(xsmall~xlarge) 미구현(주석 없음 → 주석 추가 권장).
- header: **2depth+ GNB 플라이아웃 전체 미구현**(gnb-main-trigger/gnb-toggle-wrap/gnb-sub-list).
- footer: **SNS(link-sns)·인증마크(krds-identifier)·관련사이트(foot-quick) 전체 미구현.**
- 폼 컴포넌트 미구현: **select / radio / checkbox / textarea / date** (KRDS 폼 입력 종류) — 컴포넌트 확충 백로그.

### 🟢 ok
- skip-link, image, masthead: 키트와 일치. input-form(텍스트)·card(구조화목록 기반)·table(colgroup 제외)·button(secondary/tertiary) 구조 일치.
