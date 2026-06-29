# 컴포넌트 설정 풀세트 + 페이지 설정 개편 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 배치 가능 6종 컴포넌트의 설정을 KRDS 변형 풀세트까지 확장하고, 페이지 설정의 브레드크럼·인페이지 내비를 실제 캔버스에 렌더하며 토글을 KRDS 스위치로 교체한다.

**Architecture:** (A) 각 컴포넌트의 단일 `variant` 클래스 매핑을 "여러 prop → 클래스 배열 조립" 순수 함수로 리팩터링하고 `editableProps`를 확장한다. (B) 브레드크럼·인페이지 내비는 LNB(`buildLnb`)와 동일한 "사이트맵/페이지에서 자동 파생 → Canvas 읽기전용 렌더" 패턴으로 신규 순수 모듈(`lib/breadcrumb.ts`, `lib/in-page-nav.ts`)을 만들어 Canvas가 소비한다. 페이지 설정 폼은 네이티브 체크박스를 KRDS 토글 스위치로 교체하고 제목/slug 편집을 추가한다.

**Tech Stack:** Next.js(정적 export), React, Zustand, TypeScript, Vitest + @testing-library/react.

## Global Constraints

- **TDD 필수**: 모든 변경은 먼저 실패 테스트 → 최소 구현 → 통과 → 커밋.
- **KRDS 충실도**(COMPONENT-FIDELITY.md): 추가하는 모든 변형은 `vendor/krds/html/code/*.html`에 **실제 존재하는 클래스만** 사용. 비표준 컴포넌트(카드/제목영역/이미지 정렬)의 자체 표현은 임의 KRDS 클래스 위조 금지 — 인라인 스타일로 처리.
- **비보안 컨텍스트**: id는 `src/lib/ids.ts`의 `newId()`만 사용(이 계획은 신규 id 생성 없음).
- **스냅샷**: 컴포넌트 마크업 변경 시 `src/registry/html-snapshots.test.ts`가 깨진다. 의도된 변경이므로 해당 태스크에서 `npx vitest run -u`로 갱신 + diff 검토 후 커밋.
- **기존 동작 보존**: 기존 테스트(190개) 그린 유지. 페이지 설정 토글의 접근성 이름("사이드바 표시"/"브레드크럼 표시"/"인페이지 내비게이션")은 그대로 유지(RightPanel 기존 테스트 의존).
- **테스트 하니스**: 컴포넌트 def 테스트는 `makePreviewCtx`/`makeExportCtx`(`src/registry/test-utils`), UI 테스트는 `createEditorStore` + `EditorStoreProvider`(기존 `Canvas.test.tsx`/`RightPanel.test.tsx` 패턴) 사용.

---

## A. 컴포넌트 설정 풀세트

### Task 1: 버튼 — KRDS 변형 풀세트 (본보기)

근거 마크업: `button_hierarchy.html`·`button_size.html`·`button_text.html`·`button_with_icon.html`(`<i class="svg-icon ico-sch">`).

**Files:**
- Modify: `src/registry/components/button.tsx` (전체 교체)
- Test: `src/registry/components/button.test.tsx` (테스트 추가)
- Snapshot: `src/registry/__snapshots__/html-snapshots.test.ts.snap` (`-u`로 갱신)

**Interfaces:**
- Produces: `buttonDefinition` (기존 export 유지). 새 props 키: `size`("xsmall"|"small"|"medium"|"large"|"xlarge"), `textStyle`(boolean), `icon`("none"|"with"|"only"), `disabled`(boolean), `asLink`(boolean), `href`(string).

- [ ] **Step 1: 실패 테스트 추가** — `button.test.tsx`의 `describe("html 익스포트", …)` 안에 추가:

```tsx
it("크기/텍스트형 클래스를 조합한다", () => {
  const html = def.exportTemplates.html(
    { label: "검색", variant: "primary", size: "large", textStyle: true },
    makeExportCtx(),
  );
  expect(html).toContain('class="krds-btn primary large text"');
});

it("비활성이면 disabled를 단다", () => {
  const html = def.exportTemplates.html({ label: "확인", disabled: true }, makeExportCtx());
  expect(html).toContain("disabled");
});

it("아이콘만이면 icon 클래스 + svg-icon을 렌더하고 aria-label을 단다", () => {
  const html = def.exportTemplates.html({ label: "검색", icon: "only" }, makeExportCtx());
  expect(html).toContain("krds-btn");
  expect(html).toContain("icon");
  expect(html).toContain('class="svg-icon ico-sch"');
  expect(html).toContain('aria-label="검색"');
});

it("링크처럼 동작이면 a 태그 + href로 렌더한다", () => {
  const html = def.exportTemplates.html(
    { label: "이동", asLink: true, href: "/go" },
    makeExportCtx(),
  );
  expect(html).toContain("<a ");
  expect(html).toContain('href="/go"');
  expect(html).not.toContain("<button");
});
```

- [ ] **Step 2: 실패 확인** — Run: `npx vitest run src/registry/components/button.test.tsx`
  Expected: FAIL (새 테스트들이 클래스/태그 불일치로 실패)

- [ ] **Step 3: 구현** — `button.tsx` 전체를 아래로 교체:

```tsx
import { attr, escapeHtml, pending2x, thumb } from "../helpers";
import type { ComponentDefinition, Props } from "../types";

// curated 단일 아이콘(검색). 다종 아이콘 선택은 후속(백로그).
const ICON = "ico-sch";

// 여러 prop을 KRDS 버튼 클래스 배열로 조립.
function buttonClass(p: Props): string {
  const c = ["krds-btn"];
  if (p.variant) c.push(String(p.variant));
  if (p.size) c.push(String(p.size));
  if (p.textStyle) c.push("text");
  if (p.icon === "only") c.push("icon");
  return c.join(" ");
}

export const buttonDefinition: ComponentDefinition = {
  id: "button",
  name: "버튼",
  nameEn: "Button",
  category: "액션",
  thumbnail: thumb(26),
  description: "사용자가 액션을 실행하는 버튼.",
  isKrdsStandard: true,
  variants: [
    { id: "primary", name: "기본" },
    { id: "secondary", name: "보조" },
    { id: "tertiary", name: "3차" },
  ],
  defaultProps: {
    label: "버튼",
    variant: "primary",
    size: "medium",
    textStyle: false,
    icon: "none",
    disabled: false,
    asLink: false,
    href: "",
  },
  editableProps: [
    { key: "label", label: "버튼 글자", type: "text", required: true },
    {
      key: "variant",
      label: "버튼 종류",
      type: "select",
      options: [
        { label: "기본", value: "primary" },
        { label: "보조", value: "secondary" },
        { label: "3차", value: "tertiary" },
      ],
    },
    {
      key: "size",
      label: "크기",
      type: "select",
      options: [
        { label: "아주 작게", value: "xsmall" },
        { label: "작게", value: "small" },
        { label: "보통", value: "medium" },
        { label: "크게", value: "large" },
        { label: "아주 크게", value: "xlarge" },
      ],
    },
    { key: "textStyle", label: "텍스트형 버튼", type: "checkbox" },
    {
      key: "icon",
      label: "아이콘",
      type: "select",
      options: [
        { label: "없음", value: "none" },
        { label: "글자+아이콘", value: "with" },
        { label: "아이콘만", value: "only" },
      ],
    },
    { key: "disabled", label: "비활성", type: "checkbox" },
    { key: "asLink", label: "링크처럼 동작", type: "checkbox" },
    { key: "href", label: "링크 주소", type: "url", help: "'링크처럼 동작'을 켰을 때 사용" },
  ],

  Preview({ props }: { props: Props }) {
    const cls = buttonClass(props);
    const label = String(props.label ?? "");
    const onlyIcon = props.icon === "only";
    const icon =
      props.icon && props.icon !== "none" ? (
        <i className={`svg-icon ${ICON}`} aria-hidden="true" />
      ) : null;
    const children = onlyIcon ? icon : (
      <>
        {label}
        {icon}
      </>
    );
    if (props.asLink) {
      return (
        <a
          className={cls}
          href={String(props.href || "#")}
          aria-disabled={props.disabled ? true : undefined}
          aria-label={onlyIcon ? label : undefined}
        >
          {children}
        </a>
      );
    }
    return (
      <button
        type="button"
        className={cls}
        disabled={!!props.disabled}
        aria-label={onlyIcon ? label : undefined}
      >
        {children}
      </button>
    );
  },

  exportTemplates: {
    html(props) {
      const cls = buttonClass(props);
      const onlyIcon = props.icon === "only";
      const icon =
        props.icon && props.icon !== "none" ? `<i class="svg-icon ${ICON}"></i>` : "";
      const inner = onlyIcon ? icon : `${escapeHtml(props.label)}${icon}`;
      const al = onlyIcon ? ` aria-label="${attr(props.label)}"` : "";
      if (props.asLink) {
        const dis = props.disabled ? ` aria-disabled="true"` : "";
        return `<a class="${cls}" href="${attr(props.href || "#")}"${dis}${al}>${inner}</a>`;
      }
      const dis = props.disabled ? " disabled" : "";
      return `<button type="button" class="${cls}"${dis}${al}>${inner}</button>`;
    },
    vue: () => pending2x("vue"),
    react: () => pending2x("react"),
  },
};
```

- [ ] **Step 4: 단위 테스트 통과 확인** — Run: `npx vitest run src/registry/components/button.test.tsx`
  Expected: PASS (기존 테스트 — `{label}`→`krds-btn`, `{label,variant:primary}`→`krds-btn primary` — 도 그대로 통과)

- [ ] **Step 5: 스냅샷 갱신** — Run: `npx vitest run src/registry/html-snapshots.test.ts -u`
  버튼 스냅샷이 `krds-btn primary medium`으로 바뀐 diff 확인(의도된 변경).

- [ ] **Step 6: 커밋**

```bash
git add src/registry/components/button.tsx src/registry/components/button.test.tsx src/registry/__snapshots__/html-snapshots.test.ts.snap
git commit -m "feat: 버튼 KRDS 변형 풀세트(크기/텍스트형/아이콘/비활성/링크형) 설정"
```

---

### Task 2: 입력폼 — 크기/상태/필수/입력타입

근거: `text_input_size.html`(`krds-input large|medium|small`), `text_input_state.html`(`form-conts is-error`/`is-success`, disabled).

**Files:**
- Modify: `src/registry/components/input-form.tsx`
- Test: `src/registry/components/input-form.test.tsx`
- Snapshot: `-u` 갱신

**Interfaces:**
- Produces: `inputFormDefinition`. 새 props: `size`("small"|"medium"|"large"), `state`("default"|"error"|"success"|"disabled"), `required`(boolean), `inputType`("text"|"email"|"tel"|"number"|"password"|"date").

- [ ] **Step 1: 실패 테스트 추가** — `input-form.test.tsx`에 (없으면 생성, 기존 있으면 추가):

```tsx
import { describe, expect, it } from "vitest";
import { makeExportCtx } from "../test-utils";
import { inputFormDefinition as def } from "./input-form";

describe("입력폼 변형", () => {
  it("크기 클래스를 input에 단다", () => {
    const html = def.exportTemplates.html(
      { label: "이름", fieldId: "name", size: "large" },
      makeExportCtx(),
    );
    expect(html).toContain('class="krds-input large"');
  });

  it("오류 상태면 form-conts에 is-error를 단다", () => {
    const html = def.exportTemplates.html(
      { label: "이름", fieldId: "name", state: "error" },
      makeExportCtx(),
    );
    expect(html).toContain('class="form-conts is-error"');
  });

  it("비활성 상태면 input에 disabled를 단다", () => {
    const html = def.exportTemplates.html(
      { label: "이름", fieldId: "name", state: "disabled" },
      makeExportCtx(),
    );
    expect(html).toContain("disabled");
  });

  it("입력 타입을 반영한다", () => {
    const html = def.exportTemplates.html(
      { label: "메일", fieldId: "email", inputType: "email" },
      makeExportCtx(),
    );
    expect(html).toContain('type="email"');
  });
});
```

- [ ] **Step 2: 실패 확인** — Run: `npx vitest run src/registry/components/input-form.test.tsx`
  Expected: FAIL

- [ ] **Step 3: 구현** — `input-form.tsx`의 `defaultProps`/`editableProps`/`Preview`/`html`를 교체:

`defaultProps`에 추가:
```tsx
  defaultProps: {
    label: "레이블",
    placeholder: "플레이스홀더",
    hint: "도움말",
    fieldId: "field1",
    size: "medium",
    state: "default",
    required: false,
    inputType: "text",
  },
```

`editableProps`에 추가(기존 4개 뒤에):
```tsx
    {
      key: "size",
      label: "크기",
      type: "select",
      options: [
        { label: "작게", value: "small" },
        { label: "보통", value: "medium" },
        { label: "크게", value: "large" },
      ],
    },
    {
      key: "state",
      label: "상태",
      type: "select",
      options: [
        { label: "기본", value: "default" },
        { label: "오류", value: "error" },
        { label: "성공", value: "success" },
        { label: "비활성", value: "disabled" },
      ],
    },
    { key: "required", label: "필수 입력", type: "checkbox" },
    {
      key: "inputType",
      label: "입력 종류",
      type: "select",
      options: [
        { label: "텍스트", value: "text" },
        { label: "이메일", value: "email" },
        { label: "전화", value: "tel" },
        { label: "숫자", value: "number" },
        { label: "비밀번호", value: "password" },
        { label: "날짜", value: "date" },
      ],
    },
```

`Preview` 교체:
```tsx
  Preview({ props }: { props: Props }) {
    const id = String(props.fieldId || "field1");
    const hint = String(props.hint ?? "");
    const size = props.size ? ` ${props.size}` : "";
    const state = props.state;
    const contsCls =
      state === "error"
        ? "form-conts is-error"
        : state === "success"
        ? "form-conts is-success"
        : "form-conts";
    return (
      <div className="form-group">
        <div className="form-tit">
          <label htmlFor={id}>
            {String(props.label ?? "")}
            {props.required ? <span className="required" aria-hidden="true"> *</span> : null}
          </label>
        </div>
        <div className={contsCls}>
          <input
            type={String(props.inputType || "text")}
            id={id}
            className={`krds-input${size}`}
            placeholder={String(props.placeholder ?? "")}
            disabled={state === "disabled"}
            required={!!props.required}
          />
        </div>
        {hint ? <p className="form-hint">{hint}</p> : null}
      </div>
    );
  },
```

`html` 교체:
```tsx
    html(props) {
      const id = String(props.fieldId || "field1");
      const hint = String(props.hint ?? "");
      const hintHtml = hint ? `\n\t<p class="form-hint">${escapeHtml(hint)}</p>` : "";
      const size = props.size ? ` ${props.size}` : "";
      const state = props.state;
      const contsCls =
        state === "error"
          ? "form-conts is-error"
          : state === "success"
          ? "form-conts is-success"
          : "form-conts";
      const dis = state === "disabled" ? " disabled" : "";
      const req = props.required ? " required" : "";
      const star = props.required ? ` <span class="required" aria-hidden="true">*</span>` : "";
      return [
        `<div class="form-group">`,
        `\t<div class="form-tit">`,
        `\t\t<label for="${attr(id)}">${escapeHtml(props.label)}${star}</label>`,
        `\t</div>`,
        `\t<div class="${contsCls}">`,
        `\t\t<input type="${attr(props.inputType || "text")}" id="${attr(id)}" class="krds-input${size}" placeholder="${attr(props.placeholder)}"${dis}${req}>`,
        `\t</div>${hintHtml}`,
        `</div>`,
      ].join("\n");
    },
```

- [ ] **Step 4: 통과 확인** — Run: `npx vitest run src/registry/components/input-form.test.tsx`
  Expected: PASS

- [ ] **Step 5: 스냅샷 갱신** — Run: `npx vitest run src/registry/html-snapshots.test.ts -u` (input-form 스냅샷에 `medium`/`form-conts`/`type="text"` 반영 — diff 검토)

- [ ] **Step 6: 커밋**

```bash
git add src/registry/components/input-form.tsx src/registry/components/input-form.test.tsx src/registry/__snapshots__/html-snapshots.test.ts.snap
git commit -m "feat: 입력폼 크기/상태/필수/입력타입 설정"
```

---

### Task 3: 표 — 헤더 위치/캡션 표시

근거: `table.html`(`tbl col data`). 행형은 `tbl row`.

**Files:**
- Modify: `src/registry/components/table.tsx`
- Test: `src/registry/components/table.test.tsx`
- Snapshot: `-u` 갱신

**Interfaces:**
- Produces: `tableDefinition`. 새 props: `headerType`("col"|"row"), `showCaption`(boolean).

- [ ] **Step 1: 실패 테스트 추가** — `table.test.tsx`에 추가:

```tsx
it("행형 헤더면 tbl row 클래스를 쓴다", () => {
  const html = def.exportTemplates.html(
    { caption: "표", columns: ["a"], rows: [["1"]], headerType: "row" },
    makeExportCtx(),
  );
  expect(html).toContain('class="tbl row data"');
});

it("캡션 숨김이면 caption에 sr-only를 단다", () => {
  const html = def.exportTemplates.html(
    { caption: "표", columns: ["a"], rows: [["1"]], showCaption: false },
    makeExportCtx(),
  );
  expect(html).toContain('class="sr-only"');
});
```

(테스트 파일 상단 import에 `makeExportCtx`가 없으면 추가: `import { makeExportCtx } from "../test-utils";`)

- [ ] **Step 2: 실패 확인** — Run: `npx vitest run src/registry/components/table.test.tsx`
  Expected: FAIL

- [ ] **Step 3: 구현** — `table.tsx`:

`defaultProps`에 추가: `headerType: "col", showCaption: true,`

`editableProps`에 추가(기존 뒤):
```tsx
    {
      key: "headerType",
      label: "머리글 위치",
      type: "select",
      options: [
        { label: "열 머리글(위)", value: "col" },
        { label: "행 머리글(왼쪽)", value: "row" },
      ],
    },
    { key: "showCaption", label: "표 제목 보이기", type: "checkbox" },
```

`Preview`의 `<table className="tbl col data">`를 클래스 변수로 바꾸고 caption 분기:
```tsx
  Preview({ props }: { props: Props }) {
    const columns = asColumns(props);
    const rows = asRows(props);
    const tblCls = `tbl ${props.headerType === "row" ? "row" : "col"} data`;
    const showCaption = props.showCaption !== false;
    return (
      <div className="krds-table-wrap">
        <table className={tblCls}>
          <caption className={showCaption ? undefined : "sr-only"}>
            {String(props.caption ?? "")}
          </caption>
          <colgroup>
            {columns.map((_, i) => (
              <col key={i} />
            ))}
          </colgroup>
          <thead>
            <tr>
              {columns.map((c, i) => (
                <th key={i} scope="col">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, ri) => (
              <tr key={ri}>
                {r.map((cell, ci) =>
                  ci === 0 ? (
                    <th key={ci} scope="row">
                      {cell}
                    </th>
                  ) : (
                    <td key={ci}>{cell}</td>
                  ),
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  },
```

`html`의 두 줄 교체:
```tsx
      const tblCls = `tbl ${props.headerType === "row" ? "row" : "col"} data`;
      const showCaption = props.showCaption !== false;
      const captionCls = showCaption ? "" : ` class="sr-only"`;
      // ... (headCells/bodyRows/colgroup 동일)
      return [
        `<div class="krds-table-wrap">`,
        `\t<table class="${tblCls}">`,
        `\t\t<caption${captionCls}>${escapeHtml(props.caption)}</caption>`,
        `\t\t${colgroup}`,
        `\t\t<thead><tr>${headCells}</tr></thead>`,
        `\t\t<tbody>`,
        bodyRows,
        `\t\t</tbody>`,
        `\t</table>`,
        `</div>`,
      ].join("\n");
```

- [ ] **Step 4: 통과 확인** — Run: `npx vitest run src/registry/components/table.test.tsx`
  Expected: PASS

- [ ] **Step 5: 스냅샷 갱신** — Run: `npx vitest run src/registry/html-snapshots.test.ts -u`

- [ ] **Step 6: 커밋**

```bash
git add src/registry/components/table.tsx src/registry/components/table.test.tsx src/registry/__snapshots__/html-snapshots.test.ts.snap
git commit -m "feat: 표 머리글 위치(열형/행형)/캡션 표시 설정"
```

---

### Task 4: 이미지 — 정렬/맞춤(인라인 스타일)

KRDS에 이미지 클래스 없음 → 정렬/맞춤은 인라인 스타일(위조 클래스 금지).

**Files:**
- Modify: `src/registry/components/image.tsx`
- Test: `src/registry/components/image.test.tsx`
- Snapshot: `-u` 갱신

**Interfaces:**
- Produces: `imageDefinition`. 새 props: `align`("left"|"center"|"right"), `fit`("auto"|"full").

- [ ] **Step 1: 실패 테스트 추가** — `image.test.tsx`에 추가(없으면 생성):

```tsx
import { describe, expect, it } from "vitest";
import { makeExportCtx } from "../test-utils";
import { imageDefinition as def } from "./image";

describe("이미지 변형", () => {
  it("가운데 정렬이면 래퍼에 text-align:center를 준다", () => {
    const html = def.exportTemplates.html(
      { src: "/a.png", alt: "그림", align: "center" },
      makeExportCtx(),
    );
    expect(html).toContain("text-align:center");
  });

  it("꽉참이면 img에 width:100%를 준다", () => {
    const html = def.exportTemplates.html(
      { src: "/a.png", alt: "그림", fit: "full" },
      makeExportCtx(),
    );
    expect(html).toContain("width:100%");
  });
});
```

- [ ] **Step 2: 실패 확인** — Run: `npx vitest run src/registry/components/image.test.tsx`
  Expected: FAIL

- [ ] **Step 3: 구현** — `image.tsx`:

`defaultProps`에 추가: `align: "left", fit: "auto",`

`editableProps`에 추가(기존 뒤):
```tsx
    {
      key: "align",
      label: "정렬",
      type: "select",
      options: [
        { label: "왼쪽", value: "left" },
        { label: "가운데", value: "center" },
        { label: "오른쪽", value: "right" },
      ],
    },
    {
      key: "fit",
      label: "이미지 폭",
      type: "select",
      options: [
        { label: "원본", value: "auto" },
        { label: "꽉 채움", value: "full" },
      ],
    },
```

`Preview` 교체:
```tsx
  Preview({ props }: { props: Props }) {
    const src = String(props.src || PLACEHOLDER);
    const alt = String(props.alt ?? "");
    const caption = String(props.caption ?? "");
    const align = String(props.align || "left");
    const width = props.fit === "full" ? "100%" : "auto";
    const img = <img src={src} alt={alt} style={{ width, maxWidth: "100%" }} />;
    const inner = caption ? (
      <figure>
        {img}
        <figcaption>{caption}</figcaption>
      </figure>
    ) : (
      img
    );
    return <div style={{ textAlign: align as "left" | "center" | "right" }}>{inner}</div>;
  },
```

`html` 교체:
```tsx
    html(props) {
      const align = String(props.align || "left");
      const width = props.fit === "full" ? "100%" : "auto";
      const img = `<img src="${attr(props.src)}" alt="${attr(props.alt)}" style="width:${width};max-width:100%">`;
      const caption = String(props.caption ?? "");
      const inner = caption
        ? `<figure>\n\t${img}\n\t<figcaption>${escapeHtml(caption)}</figcaption>\n</figure>`
        : img;
      return `<div style="text-align:${align}">${inner}</div>`;
    },
```

- [ ] **Step 4: 통과 확인** — Run: `npx vitest run src/registry/components/image.test.tsx`
  Expected: PASS

- [ ] **Step 5: 스냅샷 갱신** — Run: `npx vitest run src/registry/html-snapshots.test.ts -u`

- [ ] **Step 6: 커밋**

```bash
git add src/registry/components/image.tsx src/registry/components/image.test.tsx src/registry/__snapshots__/html-snapshots.test.ts.snap
git commit -m "feat: 이미지 정렬/폭 설정(인라인 스타일)"
```

---

### Task 5: 카드 — 썸네일/테두리

카드는 비표준(구조화 목록 기반). 테두리는 인라인 스타일.

**Files:**
- Modify: `src/registry/components/card.tsx`
- Test: `src/registry/components/card.test.tsx`
- Snapshot: `-u` 갱신

**Interfaces:**
- Produces: `cardDefinition`. 새 props: `thumbnail`(string URL), `bordered`(boolean).

- [ ] **Step 1: 실패 테스트 추가** — `card.test.tsx`에 추가:

```tsx
it("썸네일 URL이 있으면 img를 렌더한다", () => {
  const html = def.exportTemplates.html(
    { title: "카드", text: "설명", thumbnail: "/t.png" },
    makeExportCtx(),
  );
  expect(html).toContain('src="/t.png"');
});

it("테두리를 켜면 ul에 border 스타일을 준다", () => {
  const html = def.exportTemplates.html(
    { title: "카드", text: "설명", bordered: true },
    makeExportCtx(),
  );
  expect(html).toContain("border");
});
```

(상단 import에 `makeExportCtx` 없으면 추가)

- [ ] **Step 2: 실패 확인** — Run: `npx vitest run src/registry/components/card.test.tsx`
  Expected: FAIL

- [ ] **Step 3: 구현** — `card.tsx`:

`defaultProps`에 추가: `thumbnail: "", bordered: false,`

`editableProps`에 추가(기존 뒤):
```tsx
    { key: "thumbnail", label: "썸네일 이미지(선택)", type: "image" },
    { key: "bordered", label: "테두리", type: "checkbox" },
```

`Preview`에서 `<ul className="krds-structured-list type-full">`를 테두리 스타일 분기로, card-body 맨 위에 썸네일 추가:
```tsx
  Preview({ props }: { props: Props }) {
    const badge = String(props.badge ?? "");
    const linkLabel = String(props.linkLabel ?? "");
    const linkUrl = String(props.linkUrl || "#");
    const thumbnail = String(props.thumbnail ?? "");
    const ulStyle = props.bordered ? { border: "1px solid #ccc" } : undefined;
    return (
      <ul className="krds-structured-list type-full" style={ulStyle}>
        <li className="structured-item">
          <div className="in">
            {badge ? (
              <div className="card-top">
                <span className="krds-badge bg-light-primary">{badge}</span>
              </div>
            ) : null}
            <div className="card-body">
              {thumbnail ? (
                <img src={thumbnail} alt="" style={{ width: "100%", maxWidth: "100%" }} />
              ) : null}
              <a href={linkUrl} className="c-text">
                <p className="c-tit">
                  <span className="span">{String(props.title ?? "")}</span>
                </p>
                <p className="c-txt">{String(props.text ?? "")}</p>
              </a>
              {linkLabel ? (
                <div className="c-btn">
                  <a href={linkUrl} className="krds-btn secondary">
                    {linkLabel}
                  </a>
                </div>
              ) : null}
            </div>
          </div>
        </li>
      </ul>
    );
  },
```

`html`에서 ul 스타일 + 썸네일:
```tsx
    html(props) {
      const badge = String(props.badge ?? "");
      const linkLabel = String(props.linkLabel ?? "");
      const linkUrl = String(props.linkUrl || "#");
      const thumbnail = String(props.thumbnail ?? "");
      const ulStyle = props.bordered ? ` style="border:1px solid #ccc"` : "";
      const thumbHtml = thumbnail
        ? `\n\t\t\t\t<img src="${attr(thumbnail)}" alt="" style="width:100%;max-width:100%">`
        : "";
      const badgeHtml = badge
        ? `\n\t\t\t<div class="card-top"><span class="krds-badge bg-light-primary">${escapeHtml(badge)}</span></div>`
        : "";
      const btnHtml = linkLabel
        ? `\n\t\t\t\t<div class="c-btn"><a href="${attr(linkUrl)}" class="krds-btn secondary">${escapeHtml(linkLabel)}</a></div>`
        : "";
      return [
        `<ul class="krds-structured-list type-full"${ulStyle}>`,
        `\t<li class="structured-item">`,
        `\t\t<div class="in">${badgeHtml}`,
        `\t\t\t<div class="card-body">${thumbHtml}`,
        `\t\t\t\t<a href="${attr(linkUrl)}" class="c-text">`,
        `\t\t\t\t\t<p class="c-tit"><span class="span">${escapeHtml(props.title)}</span></p>`,
        `\t\t\t\t\t<p class="c-txt">${escapeHtml(props.text)}</p>`,
        `\t\t\t\t</a>${btnHtml}`,
        `\t\t\t</div>`,
        `\t\t</div>`,
        `\t</li>`,
        `</ul>`,
      ].join("\n");
    },
```

- [ ] **Step 4: 통과 확인** — Run: `npx vitest run src/registry/components/card.test.tsx`
  Expected: PASS

- [ ] **Step 5: 스냅샷 갱신** — Run: `npx vitest run src/registry/html-snapshots.test.ts -u`

- [ ] **Step 6: 커밋**

```bash
git add src/registry/components/card.tsx src/registry/components/card.test.tsx src/registry/__snapshots__/html-snapshots.test.ts.snap
git commit -m "feat: 카드 썸네일/테두리 설정"
```

---

### Task 6: 제목영역 — 정렬/크기(인라인 스타일)

비표준 컴포넌트. 정렬은 text-align, 크기는 h2 fontSize 인라인 매핑.

**Files:**
- Modify: `src/registry/components/page-title.tsx`
- Test: `src/registry/components/page-title.test.tsx`
- Snapshot: `-u` 갱신

**Interfaces:**
- Produces: `pageTitleDefinition`. 새 props: `align`("left"|"center"|"right"), `size`("small"|"medium"|"large").

- [ ] **Step 1: 실패 테스트 추가** — `page-title.test.tsx`에 추가:

```tsx
it("가운데 정렬이면 text-align:center를 준다", () => {
  const html = def.exportTemplates.html(
    { title: "제목", align: "center" },
    makeExportCtx(),
  );
  expect(html).toContain("text-align:center");
});

it("크게면 h2에 큰 font-size를 준다", () => {
  const html = def.exportTemplates.html({ title: "제목", size: "large" }, makeExportCtx());
  expect(html).toContain("font-size:2.4rem");
});
```

(상단 import에 `makeExportCtx` 없으면 추가)

- [ ] **Step 2: 실패 확인** — Run: `npx vitest run src/registry/components/page-title.test.tsx`
  Expected: FAIL

- [ ] **Step 3: 구현** — `page-title.tsx`:

`defaultProps`에 추가: `align: "left", size: "medium",`

`editableProps`에 추가(기존 뒤):
```tsx
    {
      key: "align",
      label: "정렬",
      type: "select",
      options: [
        { label: "왼쪽", value: "left" },
        { label: "가운데", value: "center" },
        { label: "오른쪽", value: "right" },
      ],
    },
    {
      key: "size",
      label: "크기",
      type: "select",
      options: [
        { label: "작게", value: "small" },
        { label: "보통", value: "medium" },
        { label: "크게", value: "large" },
      ],
    },
```

크기 매핑 헬퍼 + `Preview`/`html` 교체. 파일 상단(`import` 아래)에 추가:
```tsx
const SIZE_REM: Record<string, string> = { small: "1.6rem", medium: "2rem", large: "2.4rem" };
function titleFontSize(size: unknown): string {
  return SIZE_REM[String(size)] ?? SIZE_REM.medium;
}
```

`Preview` 교체:
```tsx
  Preview({ props }: { props: Props }) {
    const description = String(props.description ?? "");
    const align = String(props.align || "left");
    return (
      <div className="page-title-area" style={{ textAlign: align as "left" | "center" | "right" }}>
        <h2 style={{ fontSize: titleFontSize(props.size) }}>{String(props.title ?? "")}</h2>
        {description ? <p>{description}</p> : null}
      </div>
    );
  },
```

`html` 교체:
```tsx
    html(props) {
      const description = String(props.description ?? "");
      const align = String(props.align || "left");
      const desc = description ? `\n\t<p>${escapeHtml(description)}</p>` : "";
      return `<div class="page-title-area" style="text-align:${align}">\n\t<h2 style="font-size:${titleFontSize(props.size)}">${escapeHtml(props.title)}</h2>${desc}\n</div>`;
    },
```

- [ ] **Step 4: 통과 확인** — Run: `npx vitest run src/registry/components/page-title.test.tsx`
  Expected: PASS

- [ ] **Step 5: 스냅샷 갱신** — Run: `npx vitest run src/registry/html-snapshots.test.ts -u`

- [ ] **Step 6: 커밋**

```bash
git add src/registry/components/page-title.tsx src/registry/components/page-title.test.tsx src/registry/__snapshots__/html-snapshots.test.ts.snap
git commit -m "feat: 제목영역 정렬/크기 설정"
```

---

## B. 페이지 설정 개편

### Task 7: 브레드크럼 자동 파생 + 캔버스 렌더

근거: `breadcrumb.html`(`nav.krds-breadcrumb-wrap > ol.breadcrumb > li.home / li > a.txt`).

**Files:**
- Create: `src/lib/breadcrumb.ts`
- Test: `src/lib/breadcrumb.test.ts`
- Modify: `src/components/Canvas.tsx` (제목 위 렌더)
- Test: `src/components/Canvas.test.tsx` (렌더 단언 추가)

**Interfaces:**
- Produces: `type Crumb = { title: string; path: string; isHome: boolean }`;
  `buildBreadcrumb(sitemap: SitemapNode[], currentNodeId: string): Crumb[]` — 홈 + 현재 노드 조상 경로. 현재가 홈이거나 노드 없으면 `[]`.

- [ ] **Step 1: 순수 함수 실패 테스트** — `src/lib/breadcrumb.test.ts` 생성:

```ts
import { describe, expect, it } from "vitest";
import type { SitemapNode } from "./types";
import { buildBreadcrumb } from "./breadcrumb";

const sitemap: SitemapNode[] = [
  { id: "home", title: "홈", slug: "", path: "/", isHome: true, children: [] } as SitemapNode,
  {
    id: "svc",
    title: "서비스",
    slug: "service",
    path: "/service",
    children: [
      { id: "intro", title: "소개", slug: "intro", path: "/service/intro", children: [] } as SitemapNode,
    ],
  } as SitemapNode,
];

describe("buildBreadcrumb", () => {
  it("홈 + 조상 경로를 순서대로 반환한다", () => {
    const crumbs = buildBreadcrumb(sitemap, "intro");
    expect(crumbs.map((c) => c.title)).toEqual(["홈", "서비스", "소개"]);
    expect(crumbs[0].isHome).toBe(true);
  });

  it("현재가 홈이면 빈 배열", () => {
    expect(buildBreadcrumb(sitemap, "home")).toEqual([]);
  });

  it("없는 노드면 빈 배열", () => {
    expect(buildBreadcrumb(sitemap, "nope")).toEqual([]);
  });
});
```

- [ ] **Step 2: 실패 확인** — Run: `npx vitest run src/lib/breadcrumb.test.ts`
  Expected: FAIL ("buildBreadcrumb is not a function")

- [ ] **Step 3: 구현** — `src/lib/breadcrumb.ts` 생성:

```ts
import type { SitemapNode } from "./types";

export type Crumb = { title: string; path: string; isHome: boolean };

// 루트~대상 노드까지의 경로(조상 체인). 없으면 null. (lnb.ts와 동일 패턴)
function findPath(nodes: SitemapNode[], id: string): SitemapNode[] | null {
  for (const node of nodes) {
    if (node.id === id) return [node];
    if (node.children) {
      const sub = findPath(node.children, id);
      if (sub) return [node, ...sub];
    }
  }
  return null;
}

// 현재 페이지 노드의 브레드크럼 = 홈 + (루트 섹션~현재) 경로.
// 현재가 홈이거나 노드를 못 찾으면 빈 배열(렌더 안 함).
export function buildBreadcrumb(
  sitemap: SitemapNode[],
  currentNodeId: string,
): Crumb[] {
  const path = findPath(sitemap, currentNodeId);
  if (!path) return [];
  const current = path[path.length - 1];
  if (current.isHome) return [];
  const crumbs: Crumb[] = [];
  const home = sitemap.find((n) => n.isHome);
  if (home) crumbs.push({ title: home.title, path: home.path, isHome: true });
  for (const n of path) crumbs.push({ title: n.title, path: n.path, isHome: false });
  return crumbs;
}
```

- [ ] **Step 4: 통과 확인** — Run: `npx vitest run src/lib/breadcrumb.test.ts`
  Expected: PASS

- [ ] **Step 5: Canvas 렌더 실패 테스트** — `Canvas.test.tsx`의 `describe("페이지 사이드바(LNB)", …)` 아래에 새 describe 추가:

```tsx
describe("브레드크럼", () => {
  it("showBreadcrumb ON이면 비홈 페이지에 브레드크럼을 렌더한다", () => {
    const { introPageId } = addSectionWithChild();
    store.getState().setActivePage(introPageId);
    store.getState().updatePageMeta(introPageId, { showBreadcrumb: true });
    const { container } = renderCanvas();
    expect(container.querySelector("nav.krds-breadcrumb-wrap")).not.toBeNull();
    expect(container.querySelector(".breadcrumb .home")).not.toBeNull();
  });

  it("showBreadcrumb OFF이면 브레드크럼이 없다", () => {
    const { introPageId } = addSectionWithChild();
    store.getState().setActivePage(introPageId);
    store.getState().updatePageMeta(introPageId, { showBreadcrumb: false });
    const { container } = renderCanvas();
    expect(container.querySelector("nav.krds-breadcrumb-wrap")).toBeNull();
  });
});
```

- [ ] **Step 6: 실패 확인** — Run: `npx vitest run src/components/Canvas.test.tsx`
  Expected: FAIL

- [ ] **Step 7: Canvas 구현** — `Canvas.tsx`:

상단 import에 추가:
```tsx
import { buildBreadcrumb } from "../lib/breadcrumb";
```

`const lnb = buildLnb(...)` 아래에 추가:
```tsx
  const crumbs = page.showBreadcrumb ? buildBreadcrumb(site.sitemap, page.sitemapNodeId) : [];
```

`<main …>` 안의 `<h2 className="canvas-page-title">` **바로 위**에 추가:
```tsx
          {crumbs.length >= 2 ? (
            <nav className="krds-breadcrumb-wrap" aria-label="현재 경로">
              <ol className="breadcrumb">
                {crumbs.map((c, i) => (
                  <li key={i} className={c.isHome ? "home" : undefined}>
                    <a href={c.path} className="txt" onClick={(e) => e.preventDefault()}>
                      {c.title}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
          ) : null}
```

- [ ] **Step 8: 통과 확인** — Run: `npx vitest run src/components/Canvas.test.tsx`
  Expected: PASS

- [ ] **Step 9: 커밋**

```bash
git add src/lib/breadcrumb.ts src/lib/breadcrumb.test.ts src/components/Canvas.tsx src/components/Canvas.test.tsx
git commit -m "feat: 브레드크럼 자동 파생 + 캔버스 렌더(showBreadcrumb 소비)"
```

---

### Task 8: 인페이지 내비 자동 파생 + 우측 레일 렌더

근거: `in_page_navigation.html`(`krds-in-page-navigation-type > krds-in-page-navigation-area > in-page-navigation-header + nav.in-page-navigation-list > ul > li > a`).

**Files:**
- Create: `src/lib/in-page-nav.ts`
- Test: `src/lib/in-page-nav.test.ts`
- Modify: `src/components/Canvas.tsx` (우측 레일), `src/app/editor.css` (레일 폭)
- Test: `src/components/Canvas.test.tsx`

**Interfaces:**
- Produces: `buildInPageNav(page: Page): string[]` — 페이지 최상위·비숨김 `page-title` 컴포넌트들의 제목 목록(order 순).

- [ ] **Step 1: 순수 함수 실패 테스트** — `src/lib/in-page-nav.test.ts` 생성:

```ts
import { describe, expect, it } from "vitest";
import type { Page } from "./types";
import { buildInPageNav } from "./in-page-nav";

function page(components: Page["components"]): Page {
  return {
    id: "p1",
    sitemapNodeId: "n1",
    title: "페이지",
    components,
  } as Page;
}

describe("buildInPageNav", () => {
  it("제목영역 컴포넌트들의 제목을 order 순으로 모은다", () => {
    const p = page([
      { id: "b", componentDefinitionId: "button", order: 0, props: {} },
      { id: "t2", componentDefinitionId: "page-title", order: 2, props: { title: "둘째" } },
      { id: "t1", componentDefinitionId: "page-title", order: 1, props: { title: "첫째" } },
    ] as Page["components"]);
    expect(buildInPageNav(p)).toEqual(["첫째", "둘째"]);
  });

  it("숨김 제목영역은 제외한다", () => {
    const p = page([
      { id: "t1", componentDefinitionId: "page-title", order: 0, props: { title: "보임" } },
      { id: "t2", componentDefinitionId: "page-title", order: 1, props: { title: "숨김" }, hidden: true },
    ] as Page["components"]);
    expect(buildInPageNav(p)).toEqual(["보임"]);
  });
});
```

- [ ] **Step 2: 실패 확인** — Run: `npx vitest run src/lib/in-page-nav.test.ts`
  Expected: FAIL

- [ ] **Step 3: 구현** — `src/lib/in-page-nav.ts` 생성:

```ts
import type { Page } from "./types";

// 페이지 안 최상위·비숨김 제목영역(page-title) 컴포넌트들의 제목 목록(order 순).
// 콘텐츠 내 탐색(인페이지 내비)의 섹션 목록 소스.
export function buildInPageNav(page: Page): string[] {
  return page.components
    .filter((c) => !c.hidden && c.componentDefinitionId === "page-title")
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((c) => String(c.props.title ?? ""));
}
```

- [ ] **Step 4: 통과 확인** — Run: `npx vitest run src/lib/in-page-nav.test.ts`
  Expected: PASS

- [ ] **Step 5: Canvas 렌더 실패 테스트** — `Canvas.test.tsx`에 새 describe 추가:

```tsx
describe("인페이지 내비게이션", () => {
  it("showInPageNavigation ON이면 우측 레일을 렌더한다", () => {
    store.getState().updatePageMeta(pageId, { showInPageNavigation: true });
    const { container } = renderCanvas();
    expect(container.querySelector(".krds-in-page-navigation-type")).not.toBeNull();
  });

  it("제목영역이 있으면 그 제목을 목록으로 보여준다", () => {
    const id = store.getState().addComponent(pageId, "page-title");
    store.getState().updateComponentProps(pageId, id, { title: "개요" });
    store.getState().updatePageMeta(pageId, { showInPageNavigation: true });
    render(
      <EditorStoreProvider store={store}>
        <DndContext>
          <Canvas />
        </DndContext>
      </EditorStoreProvider>,
    );
    expect(
      screen.getByRole("link", { name: "개요" }),
    ).toBeInTheDocument();
  });

  it("showInPageNavigation OFF이면 레일이 없다", () => {
    const { container } = renderCanvas();
    expect(container.querySelector(".krds-in-page-navigation-type")).toBeNull();
  });
});
```

- [ ] **Step 6: 실패 확인** — Run: `npx vitest run src/components/Canvas.test.tsx`
  Expected: FAIL

- [ ] **Step 7: Canvas 구현** — `Canvas.tsx`:

상단 import에 추가:
```tsx
import { buildInPageNav } from "../lib/in-page-nav";
```

`const crumbs = …` 아래에 추가:
```tsx
  const showInPageNav = !!page.showInPageNavigation;
  const sections = buildInPageNav(page);
```

`</main>` **바로 뒤**(같은 `.page-frame` 안)에 추가:
```tsx
        {showInPageNav ? (
          <div className="krds-in-page-navigation-type">
            <div className="krds-in-page-navigation-area">
              <div className="in-page-navigation-header">
                <p className="quick-caption">이 페이지의 구성</p>
                <p className="quick-title">{page.title}</p>
              </div>
              {sections.length > 0 ? (
                <nav className="in-page-navigation-list" aria-label="콘텐츠 내 탐색">
                  <ul>
                    {sections.map((t, i) => (
                      <li key={i}>
                        <a
                          href="#"
                          className={i === 0 ? "active" : undefined}
                          onClick={(e) => e.preventDefault()}
                        >
                          {t}
                        </a>
                      </li>
                    ))}
                  </ul>
                </nav>
              ) : (
                <p className="in-page-empty">제목영역 컴포넌트를 추가하면 목록이 생깁니다.</p>
              )}
            </div>
          </div>
        ) : null}
```

- [ ] **Step 8: CSS — 우측 레일 폭** — `src/app/editor.css` 끝에 추가:

```css
/* 인페이지 내비(콘텐츠 내 탐색) 우측 레일 */
.page-frame .krds-in-page-navigation-type {
  flex: 0 0 240px;
}
.page-frame .in-page-empty {
  color: #666;
  font-size: 0.875rem;
}
```

- [ ] **Step 9: 통과 확인** — Run: `npx vitest run src/components/Canvas.test.tsx`
  Expected: PASS

- [ ] **Step 10: 커밋**

```bash
git add src/lib/in-page-nav.ts src/lib/in-page-nav.test.ts src/components/Canvas.tsx src/components/Canvas.test.tsx src/app/editor.css
git commit -m "feat: 인페이지 내비 자동 파생 + 우측 레일 렌더(showInPageNavigation 소비)"
```

---

### Task 9: 페이지 설정 폼 — KRDS 토글 스위치 + 제목/slug 편집

근거: `toggle_switch.html`(`div.krds-form-toggle-switch > input[checkbox] + label > span.switch-toggle>i + 텍스트`).

**Files:**
- Modify: `src/components/right/PageSettingsForm.tsx`
- Test: `src/components/right/RightPanel.test.tsx` (단언 추가)

**Interfaces:**
- Consumes: `renameNode(id, { title?, slug? })`(기존 store 액션), `updatePageMeta`(기존).

- [ ] **Step 1: 실패 테스트 추가** — `RightPanel.test.tsx`에 추가:

```tsx
it("토글이 KRDS 토글 스위치 마크업으로 렌더된다", () => {
  const { container } = renderPanel();
  expect(container.querySelectorAll(".krds-form-toggle-switch").length).toBeGreaterThanOrEqual(3);
});

it("페이지 제목을 바꾸면 renameNode로 반영된다", () => {
  renderPanel();
  const input = screen.getByRole("textbox", { name: "페이지 제목" });
  fireEvent.change(input, { target: { value: "새 제목" } });
  expect(store.getState().site!.pages.find((p) => p.id === pageId)!.title).toBe("새 제목");
});
```

(기존 테스트 `getByRole("checkbox", { name: "브레드크럼 표시" })`는 토글 스위치도 `input[type=checkbox]`라 그대로 통과해야 함 — 라벨 텍스트 유지가 핵심.)

- [ ] **Step 2: 실패 확인** — Run: `npx vitest run src/components/right/RightPanel.test.tsx`
  Expected: FAIL (`.krds-form-toggle-switch` 없음, "페이지 제목" textbox 없음)

- [ ] **Step 3: 구현** — `PageSettingsForm.tsx` 전체 교체:

```tsx
"use client";

import { useId } from "react";
import type { SitemapNode } from "../../lib/types";
import { useEditorState, useEditorStoreApi } from "../../store/context";

function findNode(nodes: SitemapNode[], id: string): SitemapNode | undefined {
  for (const n of nodes) {
    if (n.id === id) return n;
    const c = n.children ? findNode(n.children, id) : undefined;
    if (c) return c;
  }
  return undefined;
}

// KRDS 토글 스위치 — 켜짐/꺼짐이 시각적으로 드러난다(toggle_switch.html).
function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  const id = useId();
  return (
    <div className="krds-form-toggle-switch">
      <input type="checkbox" id={id} checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <label htmlFor={id}>
        <span className="switch-toggle">
          <i></i>
        </span>
        {label}
      </label>
    </div>
  );
}

// 선택이 없을 때: 현재 페이지의 설정(기본정보 + LNB·브레드크럼·인페이지내비·SEO).
export function PageSettingsForm({ pageId }: { pageId: string }) {
  const api = useEditorStoreApi();
  const page = useEditorState((s) => s.site?.pages.find((p) => p.id === pageId));
  const node = useEditorState((s) =>
    s.site ? findNode(s.site.sitemap, page?.sitemapNodeId ?? "") : undefined,
  );
  if (!page) return null;
  const set = (patch: Parameters<ReturnType<typeof api.getState>["updatePageMeta"]>[1]) =>
    api.getState().updatePageMeta(pageId, patch);
  const rename = (patch: { title?: string; slug?: string }) =>
    api.getState().renameNode(page.sitemapNodeId, patch);

  return (
    <div className="settings-form">
      <div className="panel-head">
        <strong>페이지 설정 — {page.title}</strong>
      </div>
      <div className="settings-body">
        <div className="form-group">
          <div className="form-tit">
            <label htmlFor="pg-title">페이지 제목</label>
          </div>
          <div className="form-conts">
            <input
              id="pg-title"
              className="krds-input"
              value={page.title}
              onChange={(e) => rename({ title: e.target.value })}
            />
          </div>
        </div>
        {node && !node.isHome ? (
          <div className="form-group">
            <div className="form-tit">
              <label htmlFor="pg-slug">URL 주소(slug)</label>
            </div>
            <div className="form-conts">
              <input
                id="pg-slug"
                className="krds-input"
                value={node.slug}
                onChange={(e) => rename({ slug: e.target.value })}
              />
            </div>
          </div>
        ) : null}

        <Toggle
          label="사이드바 표시"
          checked={page.showSidebar ?? true}
          onChange={(v) => set({ showSidebar: v })}
        />
        <Toggle
          label="브레드크럼 표시"
          checked={page.showBreadcrumb}
          onChange={(v) => set({ showBreadcrumb: v })}
        />
        <Toggle
          label="인페이지 내비게이션"
          checked={page.showInPageNavigation}
          onChange={(v) => set({ showInPageNavigation: v })}
        />

        <div className="form-group">
          <div className="form-tit">
            <label htmlFor="seo-title">SEO 제목</label>
          </div>
          <div className="form-conts">
            <input
              id="seo-title"
              className="krds-input"
              value={page.seoTitle ?? ""}
              onChange={(e) => set({ seoTitle: e.target.value })}
            />
          </div>
        </div>
        <div className="form-group">
          <div className="form-tit">
            <label htmlFor="seo-desc">SEO 설명</label>
          </div>
          <div className="form-conts">
            <div className="textarea-wrap">
              <textarea
                id="seo-desc"
                className="krds-input"
                value={page.seoDescription ?? ""}
                onChange={(e) => set({ seoDescription: e.target.value })}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: 통과 확인** — Run: `npx vitest run src/components/right/RightPanel.test.tsx`
  Expected: PASS (새 + 기존 모두)

- [ ] **Step 5: 커밋**

```bash
git add src/components/right/PageSettingsForm.tsx src/components/right/RightPanel.test.tsx
git commit -m "feat: 페이지 설정 KRDS 토글 스위치 + 제목/slug 편집"
```

---

### Task 10: 전체 회귀 + 빌드 검증

**Files:** 없음(검증만)

- [ ] **Step 1: 전체 테스트** — Run: `npx vitest run`
  Expected: 전부 PASS(기존 190 + 신규). 스냅샷 실패 시 해당 태스크의 의도된 변경인지 확인.

- [ ] **Step 2: 타입체크** — Run: `npx tsc --noEmit`
  Expected: 0 error

- [ ] **Step 3: 린트** — Run: `npm run lint`
  Expected: 0 error

- [ ] **Step 4: 정적 빌드** — Run: `npm run build`
  Expected: 성공(out/ 생성)

- [ ] **Step 5: 실브라우저 검증**(serve 재빌드 후 강력 새로고침):
  - 버튼 선택 → 우측 폼에 크기/텍스트형/아이콘/비활성/링크형 노출, 변경 시 캔버스 실시간 반영.
  - 비홈 페이지에서 브레드크럼 토글 ON → 제목 위 브레드크럼 렌더.
  - 인페이지 내비 토글 ON → 우측 레일 렌더(제목영역 있으면 목록).
  - 우측 패널 토글 스위치가 켜짐/꺼짐을 시각적으로 구분.

- [ ] **Step 6: 인수인계 갱신 커밋** — `docs/HANDOFF.md`에 이번 작업(컴포넌트 풀세트 + 페이지 설정 개편) 반영 후 커밋.

---

## 자가 검토 메모(스펙 대비)

- 스펙 A-1~A-6: Task 1~6이 각 컴포넌트 구현. ✅
- 스펙 A-0(클래스 조립 리팩터링): 버튼 `buttonClass`, 입력폼 인라인 조립으로 반영. ✅
- 스펙 B-1(브레드크럼·인페이지 내비 렌더): Task 7·8. ✅
- 스펙 B-2(토글 스위치): Task 9. ✅
- 스펙 B-3(제목/slug 편집): Task 9. ✅
- 스펙 A-7(스냅샷 갱신): 각 A-태스크 Step에 `-u` 포함. ✅
- 비목표(페이지네이션/전역요소/파일업로드/anchor 스크롤·익스포트 주입): 미포함 유지. ✅
- 타입 일관성: 새 props는 모두 기존 Field 위젯(select=문자열, checkbox=불리언)로 동작 — 신규 위젯 타입 불필요. `buildBreadcrumb`/`buildInPageNav` 시그니처는 Canvas 소비와 일치.
