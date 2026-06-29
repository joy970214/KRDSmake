# 설계: 컴포넌트 설정 풍부화 + 페이지 설정 개편

- 작성일: 2026-06-29
- 빌드 순서상 위치: Step 5(우측 설정 자동 폼)의 **품질 보강** — Step 6 이전.
- 배경: 자동 폼 엔진(Field 위젯 12종)·2모드 RightPanel은 완성됐으나, 각 컴포넌트가 선언한
  `editableProps`가 빈약(버튼=글자/위계 2개뿐)하고, 페이지 설정의 브레드크럼·인페이지 내비
  토글이 **켜도 캔버스에 렌더되지 않으며**, 토글 컨트롤(네이티브 체크박스)이 켜짐/꺼짐을
  시각적으로 드러내지 못한다.

## 목표

A. **컴포넌트 설정 풍부화** — 배치 가능 6종(버튼·입력폼·표·이미지·카드·제목영역)의
   `editableProps`를 **KRDS 키트에 실제 존재하는 변형 풀세트**까지 확장하고, 그 변형들이
   여러 클래스를 조합하도록 Preview/export를 고친다.

B. **페이지 설정 개편** — (B-1) 브레드크럼·인페이지 내비를 사이드바(LNB)와 동일한
   **자동 파생 + 캔버스 렌더** 방식으로 실제 렌더하고, (B-2) 우측 패널 토글을 KRDS
   **토글 스위치**로 교체해 상태를 즉시 보이게 하며, (B-3) 페이지 기본정보(제목·slug) 편집을 추가한다.

## 비목표(이번 범위 밖, 백로그)

- **페이지네이션**(KRDS 03_06): 페이지 토글이 아닌 콘텐츠 컴포넌트 → 별도 컴포넌트로 후속 추가.
- **전역요소(헤더/푸터/마스트헤드) 편집** — 기존 백로그 유지.
- **파일 업로드(image 자산)** — image는 URL 입력 유지.
- **인페이지 내비 anchor 스크롤 실동작 / 브레드크럼·인페이지 내비 익스포트 주입** — Step 7 소관.
  에디터 미리보기에서는 LNB와 동일하게 **읽기 전용**(링크 `preventDefault`, 목록 표시만).
- **버튼 아이콘 세트 확장** — 이번엔 curated 소수 아이콘만(아래). 전체 아이콘 피커는 후속.

---

## A. 컴포넌트 설정 풍부화

### A-0. 공통: 클래스 조합 리팩터링

현재 버튼/입력은 단일 `variant` → 단일 클래스 매핑. KRDS 변형은 **여러 클래스 조합**
(예: `krds-btn primary large text`)이라 각 컴포넌트의 클래스 생성 함수를 **여러 prop을 읽어
클래스 배열을 조립**하도록 바꾼다. 순수 함수로 분리해 먼저 단위 테스트(TDD)한다.

원칙(COMPONENT-FIDELITY.md 준수): **추가하는 모든 변형은 `vendor/krds/html/code/*.html`에
실제 존재하는 클래스만 사용.** 대응 없는 임의 변형 금지.

### A-1. 버튼 (본보기 — 풀세트)

근거: `button_hierarchy.html`·`button_size.html`·`button_text.html`·`button_icon.html`·
`button_with_icon.html`.

| key | label | 위젯 | 값 → 클래스/동작 | 비고 |
|---|---|---|---|---|
| label | 버튼 글자 | text(required) | 텍스트 | 기존 |
| variant | 위계 | select | primary/secondary/tertiary | 기존 |
| size | 크기 | select | xsmall/small/medium/large/xlarge | ✨ 기본 medium |
| textStyle | 텍스트형 | checkbox | true→`text` | ✨ |
| icon | 아이콘 | select | 없음 / 아이콘+글자 / 아이콘만(`icon`) | ✨ curated 아이콘 1종 고정(예: 화살표). 다종 선택은 후속 |
| disabled | 비활성 | checkbox | true→`disabled` 속성 | ✨ |
| asLink | 링크처럼 동작 | checkbox | true→`<a>`로 렌더 | ✨ |
| href | 링크 주소 | url | asLink일 때 href | ✨ (asLink=false면 무시) |

- **클래스 조립**: `krds-btn` + [variant] + [size] + [textStyle?`text`] + [icon만?`icon`].
- **렌더 분기**: `asLink` true면 `<a class="krds-btn …" href>`(disabled면 `aria-disabled`),
  아니면 `<button type="button" … disabled?>`.
- 폼 엔진은 `editableProps`를 **무조건 순서대로** 렌더(조건부 표시 없음). `href`는 항상 보이되
  `help: "‘링크처럼 동작’ 켰을 때 사용"`. (조건부 표시는 YAGNI — 후속.)

### A-2. 입력폼 (text input)

근거: `text_input_size.html`(small/medium/large), `text_input_state.html`(`is-error`/`is-success`/disabled).

추가 prop: `size`(select small/medium/large, 기본 medium → `krds-input {size}`),
`state`(select 기본/오류/성공/비활성 → `.form-conts` `is-error`/`is-success` + 입력 `disabled`),
`required`(checkbox → `.form-tit`에 필수 표기), `inputType`(select 텍스트/이메일/전화/숫자/비밀번호/날짜
→ `<input type>`). 기존 label/placeholder/hint/fieldId 유지.

### A-3. 표 (table)

근거: `table.html`(`tbl col data` = 열형). 추가 prop: `headerType`(select 열형/행형
→ `tbl col`/`tbl row`), `showCaption`(checkbox, off면 `caption`에 `sr-only`). 기존 caption/columns/rows 유지.

### A-4. 이미지

추가 prop: `align`(select 좌/중/우 → 래퍼 정렬 클래스), `fit`(select 원본/꽉참 → width 100%).
기존 src/alt/caption 유지. (KRDS 표준 이미지 컴포넌트 없음 → 래퍼 정렬은 우리 클래스, `isKrdsStandard:false` 유지.)

### A-5. 카드 (비표준)

추가 prop: `thumbnail`(image URL), `bordered`(checkbox 테두리). 기존 title/text/badge/link 유지.

### A-6. 제목영역 (비표준)

추가 prop: `align`(select 좌/중/우), `size`(select 큼/보통/작음). 기존 title/description 유지.

### A-7. 테스트 영향

컴포넌트 마크업 변경 → `src/registry/html-snapshots.test.ts`(toMatchSnapshot) 깨짐.
**의도된 변경**이므로 각 컴포넌트 구현 후 `npx vitest run -u`로 스냅샷 갱신 + diff 검토.
각 변형은 먼저 실패 테스트(클래스 조립 단위 + Preview 클래스 단언)로 TDD.

---

## B. 페이지 설정 개편

### B-1. 브레드크럼·인페이지 내비 자동 파생 + 캔버스 렌더

LNB(`lib/lnb.ts buildLnb` + Canvas)와 **동일 패턴**. 둘 다 **읽기 전용**(링크 `preventDefault`).

- **브레드크럼**: `lib/breadcrumb.ts` → `buildBreadcrumb(sitemap, nodeId)` = 홈→…→현재
  조상 경로 `[{title, path, isHome}]`(순수, 재귀 탐색, 카테고리 노드 포함). 없는 노드/홈만이면 빈 배열.
  Canvas에서 `showBreadcrumb` ON이고 항목≥2일 때 **페이지 제목 위**에 KRDS 마크업 렌더:
  `<nav class="krds-breadcrumb-wrap"><ol class="breadcrumb"><li class="home">…</li>…</ol></nav>`.
- **인페이지 내비**: `lib/in-page-nav.ts` → `buildInPageNav(page)` = 페이지 최상위·비숨김
  `page-title` 컴포넌트들의 `{title}` 목록(순수). Canvas에서 `showInPageNavigation` ON이고
  항목≥1일 때 **우측 레일**에 KRDS 마크업 렌더:
  `<div class="krds-in-page-navigation-type"><div class="krds-in-page-navigation-area">…
  <nav class="in-page-navigation-list"><ul><li><a>{title}</a></li>…</ul></nav></div></div>`
  (헤더 caption "이 페이지의 구성"). 제목영역이 없으면 안내 문구("제목영역 컴포넌트를 추가하면
  목록이 생깁니다"). 첫 항목 `active`.
- **레이아웃**: `.page-frame`(현 [LNB | main], max 1200px flex)에 우측 레일 추가 →
  최대 [LNB 260 | main | inpage 240]. 토글 조합에 따라 1~3칼럼. 브레드크럼은 `main` 안
  제목 위. CSS는 `app/editor.css`에 보강(우측 레일 폭/간격, 모바일 스택은 후속).

### B-2. 토글 = KRDS 토글 스위치

근거: `toggle_switch.html`. `PageSettingsForm`의 네이티브 체크박스 3개(사이드바/브레드크럼/
인페이지)를 KRDS 토글 스위치 마크업으로 교체 → 켜짐/꺼짐이 판에서 즉시 구분.
(폼 엔진 `Field`에 `toggle` 위젯을 추가하지 않고 PageSettingsForm 내부에서 직접 마크업 —
페이지 설정 전용. 컴포넌트 폼 checkbox와 구분.) 동작은 기존 `updatePageMeta` 그대로.

### B-3. 페이지 기본정보 편집

`PageSettingsForm` 상단에 페이지 **제목(메뉴명)** text + **URL slug** text 추가.
변경 → 기존 `renameNode(page.sitemapNodeId, {title, slug})`(경로 재계산 포함) 호출.
(홈 노드는 slug 빈 값 불변식 — 홈이면 slug 입력 비활성/숨김.)

---

## 테스트 전략

- **TDD**: 모든 순수 로직(클래스 조립·`buildBreadcrumb`·`buildInPageNav`) 먼저 실패 테스트.
  컴포넌트 Preview는 클래스/렌더 분기 단언. PageSettingsForm/Canvas는 토글 ON/OFF 렌더 단언.
- **스냅샷**: A 단계 후 `vitest run -u`로 `html-snapshots` 갱신 + diff 검토.
- **회귀**: 전체 `npx vitest run` 그린 + `tsc`/`lint` 0 + `npm run build` 성공 유지.
- **실브라우저 검증**: 버튼 변형 조합 반영 / 브레드크럼·인페이지 내비 토글→렌더 / 토글 스위치 시각.

## 코드 위치 요약

```
lib/breadcrumb.ts        (신규) buildBreadcrumb
lib/in-page-nav.ts       (신규) buildInPageNav
registry/components/*.tsx 6종 editableProps + 클래스 조립 + Preview/export 보강
components/Canvas.tsx     브레드크럼(제목 위) + 인페이지 내비(우측 레일) 렌더
components/right/PageSettingsForm.tsx  토글 스위치 + 페이지 기본정보(제목/slug)
app/editor.css           우측 레일/토글 스위치 보강(필요 시)
```
