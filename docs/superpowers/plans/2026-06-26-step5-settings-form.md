# Step 5 우측 설정 자동 폼 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 선택된 컴포넌트의 `editableProps` 스키마로 우측 폼을 자동 생성해 편집→캔버스 실시간 반영하고, 선택이 없으면 현재 페이지 설정 폼을 보여준다.

**Architecture:** 스키마 기반 범용 렌더러. `Field`가 `EditablePropType`별 위젯(KRDS 폼 마크업)을 그리고, `ComponentForm`이 `editableProps`로 Field들을 조합해 `updateComponentProps`로 쓴다. `RightPanel`이 selection 유무로 ComponentForm/PageSettingsForm을 분기. store에 `updateComponentProps` 재귀화 + `findInstance` + `updatePageMeta` 추가.

**Tech Stack:** React, Zustand, vitest + @testing-library/react, Playwright. **새 의존성 없음**(RHF/Zod 미사용).

## Global Constraints

- 모든 단계 TDD(red→green), 자주 커밋. 테스트: 단일 `npx vitest run <path>`, 전체 `npx vitest run`. 타입 `npx tsc --noEmit`. 린트 `npm run lint`. 빌드 `npm run build`.
- **위젯 = KRDS 공식 폼 마크업**: `.form-group > .form-tit>label[for] + .form-conts>입력 + .form-hint`(help 있을 때만). 입력: text/url/number/date=`input.krds-input`, textarea=`.textarea-wrap>textarea.krds-input`, select=`select.krds-form-select`, radio/checkbox=`.krds-check-area>.krds-form-check>input+label[for]`. color=네이티브 `input[type=color]`, image=`input.krds-input`(URL)+미리보기. repeater/table/color/image는 빌더 내부 편집 컨트롤(커스텀 최소 스타일). CSS는 벤더 output.css가 KRDS 입력을 담당.
- `EditablePropSchema = { key, label, type, required?, options?, help? }`(`src/registry/types.ts`). `EditablePropType` 12종.
- 새 id 생성은 store만(`newId`). 비보안 컨텍스트 전용 API 금지. Korean 주석이 repo 관례.
- **image는 URL 입력만**(파일 업로드=후속). **전역요소 편집=후속**(이번 범위 아님).

---

### Task 1: store — updateComponentProps 재귀화 + findInstance + updatePageMeta

**Files:**
- Modify: `src/store/editor-store.ts`
- Test: `src/store/editor-store.test.ts`

**Interfaces:**
- Consumes: 기존 `updatePageComponents`, `renumber`, `ComponentInstance`, `Page`.
- Produces:
  - `findInstance(components: ComponentInstance[], id: string): ComponentInstance | undefined` (export)
  - `updateComponentProps(pageId, instanceId, patch)` — 칼럼 자식까지 재귀 patch
  - `updatePageMeta(pageId: string, patch: Partial<Pick<Page, "showSidebar"|"showBreadcrumb"|"showInPageNavigation"|"seoTitle"|"seoDescription">>): void`

- [ ] **Step 1: 실패 테스트 작성** — `src/store/editor-store.test.ts` 끝에 추가. 상단 import에 `findInstance` 추가(`createEditorStore` 옆).

```ts
import { findInstance } from "./editor-store";

describe("findInstance", () => {
  it("최상위와 칼럼 안 자식을 모두 찾는다", () => {
    const pageId = store.getState().site!.pages[0].id;
    const top = store.getState().addComponent(pageId, "button");
    const layoutId = store.getState().addComponent(pageId, "layout");
    const child = store.getState().addComponentToColumn(pageId, layoutId, 0, "table");
    const comps = store.getState().site!.pages.find((p) => p.id === pageId)!.components;
    expect(findInstance(comps, top)!.componentDefinitionId).toBe("button");
    expect(findInstance(comps, child)!.componentDefinitionId).toBe("table");
    expect(findInstance(comps, "nope")).toBeUndefined();
  });
});

describe("updateComponentProps — 칼럼 자식 재귀", () => {
  it("칼럼 안 자식의 props도 갱신한다", () => {
    const pageId = store.getState().site!.pages[0].id;
    const layoutId = store.getState().addComponent(pageId, "layout");
    const child = store.getState().addComponentToColumn(pageId, layoutId, 0, "button");
    store.getState().updateComponentProps(pageId, child, { label: "확인" });
    const comps = store.getState().site!.pages.find((p) => p.id === pageId)!.components;
    expect(findInstance(comps, child)!.props.label).toBe("확인");
  });
});

describe("updatePageMeta", () => {
  it("페이지 설정 필드를 병합 갱신한다", () => {
    const pageId = store.getState().site!.pages[0].id;
    store.getState().updatePageMeta(pageId, { seoTitle: "소개", showBreadcrumb: true });
    const page = store.getState().site!.pages.find((p) => p.id === pageId)!;
    expect(page.seoTitle).toBe("소개");
    expect(page.showBreadcrumb).toBe(true);
  });
});
```

- [ ] **Step 2: 실패 확인** — Run: `npx vitest run src/store/editor-store.test.ts` → FAIL(`findInstance`/`updatePageMeta` 없음, 칼럼 자식 갱신 안 됨).

- [ ] **Step 3a: findInstance + 재귀 헬퍼** — `editor-store.ts`의 `removeFromList` 함수 바로 다음에 추가

```ts
// id로 인스턴스 찾기(최상위 + 칼럼 재귀).
export function findInstance(
  components: ComponentInstance[],
  id: string,
): ComponentInstance | undefined {
  for (const c of components) {
    if (c.id === id) return c;
    if (c.columns) {
      for (const col of c.columns) {
        const found = findInstance(col, id);
        if (found) return found;
      }
    }
  }
  return undefined;
}

// id 인스턴스의 props를 patch 병합(최상위 + 칼럼 재귀, 불변).
function patchProps(
  components: ComponentInstance[],
  id: string,
  patch: Record<string, unknown>,
): ComponentInstance[] {
  return components.map((c) => {
    if (c.id === id) return { ...c, props: { ...c.props, ...patch } };
    if (c.columns) {
      return { ...c, columns: c.columns.map((col) => patchProps(col, id, patch)) };
    }
    return c;
  });
}
```

- [ ] **Step 3b: updateComponentProps 재귀화** — 기존 `updateComponentProps` 구현을 다음으로 교체

```ts
    updateComponentProps(pageId, instanceId, patch) {
      const site = get().site;
      if (!site) return;
      set({
        site: updatePageComponents(site, pageId, (comps) =>
          patchProps(comps, instanceId, patch),
        ),
      });
    },
```

- [ ] **Step 3c: EditorState 타입 + updatePageMeta 액션** — `EditorState`의 `setActivePage` 시그니처 근처에 추가:

```ts
  updatePageMeta: (
    pageId: string,
    patch: Partial<
      Pick<Page, "showSidebar" | "showBreadcrumb" | "showInPageNavigation" | "seoTitle" | "seoDescription">
    >,
  ) => void;
```

그리고 `setActivePage` 액션 구현 다음에 추가:

```ts
    updatePageMeta(pageId, patch) {
      const site = get().site;
      if (!site) return;
      set({
        site: {
          ...site,
          pages: site.pages.map((p) => (p.id === pageId ? { ...p, ...patch } : p)),
        },
      });
    },
```

> 주의: `setPageSidebar`는 이 단계에서 **건드리지 않는다**(Canvas가 아직 사용 중 — Task 5에서 캔버스 토글과 함께 제거). `Page` 타입은 이미 `seoTitle?/seoDescription?/showBreadcrumb/showInPageNavigation/showSidebar?` 보유.

- [ ] **Step 4: 통과 확인** — `npx vitest run src/store/editor-store.test.ts` → PASS. `npx tsc --noEmit` → 0.

- [ ] **Step 5: 커밋**

```bash
git add src/store/editor-store.ts src/store/editor-store.test.ts
git commit -m "feat: store updateComponentProps 재귀 + findInstance + updatePageMeta (Step5 TDD 1)"
```

---

### Task 2: Field — 단일값 위젯(KRDS 폼 마크업)

**Files:**
- Create: `src/components/right/Field.tsx`
- Test: `src/components/right/Field.test.tsx`

**Interfaces:**
- Consumes: `EditablePropSchema`(`src/registry/types.ts`).
- Produces: `Field({ schema, value, onChange }: { schema: EditablePropSchema; value: unknown; onChange: (v: unknown) => void })` — repeater/table은 이 task에선 "미지원" 자리표시(Task 3에서 구현).

- [ ] **Step 1: 실패 테스트 작성** — `src/components/right/Field.test.tsx`

```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Field } from "./Field";
import type { EditablePropSchema } from "../../registry/types";

function renderField(schema: EditablePropSchema, value: unknown) {
  const onChange = vi.fn();
  const r = render(<Field schema={schema} value={value} onChange={onChange} />);
  return { ...r, onChange };
}

describe("Field — KRDS 폼 마크업", () => {
  it("text: form-group/form-tit/krds-input 구조 + 변경 콜백", () => {
    const { container, onChange } = renderField(
      { key: "label", label: "버튼 글자", type: "text" },
      "확인",
    );
    expect(container.querySelector(".form-group .form-tit label")?.textContent).toBe("버튼 글자");
    const input = container.querySelector("input.krds-input") as HTMLInputElement;
    expect(input.value).toBe("확인");
    fireEvent.change(input, { target: { value: "신청" } });
    expect(onChange).toHaveBeenCalledWith("신청");
  });

  it("help가 있으면 form-hint를 렌더한다", () => {
    const { container } = renderField(
      { key: "alt", label: "대체텍스트", type: "text", help: "이미지를 설명합니다" },
      "",
    );
    expect(container.querySelector(".form-hint")?.textContent).toBe("이미지를 설명합니다");
  });

  it("textarea: textarea-wrap > textarea.krds-input", () => {
    const { container, onChange } = renderField({ key: "t", label: "설명", type: "textarea" }, "x");
    const ta = container.querySelector(".textarea-wrap textarea.krds-input") as HTMLTextAreaElement;
    expect(ta.value).toBe("x");
    fireEvent.change(ta, { target: { value: "y" } });
    expect(onChange).toHaveBeenCalledWith("y");
  });

  it("number: 숫자로 콜백", () => {
    const { container, onChange } = renderField({ key: "n", label: "수", type: "number" }, 3);
    const input = container.querySelector('input[type="number"]') as HTMLInputElement;
    fireEvent.change(input, { target: { value: "5" } });
    expect(onChange).toHaveBeenCalledWith(5);
  });

  it("select: krds-form-select + options", () => {
    const { container, onChange } = renderField(
      { key: "v", label: "스타일", type: "select", options: [{ label: "기본", value: "primary" }, { label: "보조", value: "secondary" }] },
      "primary",
    );
    const sel = container.querySelector("select.krds-form-select") as HTMLSelectElement;
    expect(sel.value).toBe("primary");
    fireEvent.change(sel, { target: { value: "secondary" } });
    expect(onChange).toHaveBeenCalledWith("secondary");
  });

  it("radio: krds-check-area > krds-form-check, 선택 변경", () => {
    const { container, onChange } = renderField(
      { key: "v", label: "정렬", type: "radio", options: [{ label: "좌", value: "l" }, { label: "우", value: "r" }] },
      "l",
    );
    expect(container.querySelectorAll(".krds-check-area .krds-form-check")).toHaveLength(2);
    const radios = container.querySelectorAll('input[type="radio"]');
    fireEvent.click(radios[1]);
    expect(onChange).toHaveBeenCalledWith("r");
  });

  it("checkbox: 불리언 토글", () => {
    const { container, onChange } = renderField({ key: "b", label: "표시", type: "checkbox" }, false);
    const cb = container.querySelector('input[type="checkbox"]') as HTMLInputElement;
    fireEvent.click(cb);
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it("image: URL 입력 + 미리보기", () => {
    const { container, onChange } = renderField({ key: "src", label: "이미지", type: "image" }, "http://x/y.png");
    const input = container.querySelector("input.krds-input") as HTMLInputElement;
    expect(input.value).toBe("http://x/y.png");
    expect(container.querySelector("img")?.getAttribute("src")).toBe("http://x/y.png");
    fireEvent.change(input, { target: { value: "http://x/z.png" } });
    expect(onChange).toHaveBeenCalledWith("http://x/z.png");
  });
});
```

- [ ] **Step 2: 실패 확인** — `npx vitest run src/components/right/Field.test.tsx` → FAIL(모듈 없음).

- [ ] **Step 3: 구현** — `src/components/right/Field.tsx`

```tsx
"use client";

import { useId } from "react";
import type { EditablePropSchema } from "../../registry/types";

// editableProps 스키마 1건 → KRDS 폼 마크업 위젯. 값/콜백은 상위(폼)가 store와 연결.
export function Field({
  schema,
  value,
  onChange,
}: {
  schema: EditablePropSchema;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  const id = useId();
  const hint = schema.help ? <p className="form-hint">{schema.help}</p> : null;
  const str = value == null ? "" : String(value);
  const opts = schema.options ?? [];

  // 레이블이 입력 앞(form-tit)에 오는 일반형
  const titled = (input: React.ReactNode) => (
    <div className="form-group">
      <div className="form-tit">
        <label htmlFor={id}>
          {schema.label}
          {schema.required ? <span className="required" aria-hidden="true"> *</span> : null}
        </label>
      </div>
      <div className="form-conts">{input}</div>
      {hint}
    </div>
  );

  switch (schema.type) {
    case "textarea":
      return titled(
        <div className="textarea-wrap">
          <textarea id={id} className="krds-input" value={str} onChange={(e) => onChange(e.target.value)} />
        </div>,
      );
    case "number":
      return titled(
        <input
          id={id}
          type="number"
          className="krds-input"
          value={str}
          onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))}
        />,
      );
    case "select":
      return titled(
        <select id={id} className="krds-form-select" value={str} onChange={(e) => onChange(e.target.value)}>
          {opts.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>,
      );
    case "radio":
      return titled(
        <div className="krds-check-area">
          {opts.map((o, i) => (
            <div className="krds-form-check" key={o.value}>
              <input
                type="radio"
                name={id}
                id={`${id}-${i}`}
                checked={str === o.value}
                onChange={() => onChange(o.value)}
              />
              <label htmlFor={`${id}-${i}`}>{o.label}</label>
            </div>
          ))}
        </div>,
      );
    case "checkbox":
      // 불리언 — 라벨을 체크박스 옆에(form-tit 없이)
      return (
        <div className="form-group">
          <div className="form-conts">
            <div className="krds-check-area">
              <div className="krds-form-check">
                <input
                  type="checkbox"
                  id={id}
                  checked={!!value}
                  onChange={(e) => onChange(e.target.checked)}
                />
                <label htmlFor={id}>{schema.label}</label>
              </div>
            </div>
          </div>
          {hint}
        </div>
      );
    case "color":
      return titled(
        <input id={id} type="color" value={str || "#000000"} onChange={(e) => onChange(e.target.value)} />,
      );
    case "date":
      return titled(
        <input id={id} type="date" className="krds-input" value={str} onChange={(e) => onChange(e.target.value)} />,
      );
    case "image":
      return titled(
        <>
          <input
            id={id}
            type="text"
            className="krds-input"
            placeholder="이미지 주소(URL)"
            value={str}
            onChange={(e) => onChange(e.target.value)}
          />
          {str ? <img className="field-img-preview" src={str} alt="" /> : null}
        </>,
      );
    case "repeater":
    case "table":
      // Task 3에서 구현
      return titled(<p className="field-pending">복합 위젯(Task 3)</p>);
    default:
      // text / url
      return titled(
        <input
          id={id}
          type={schema.type === "url" ? "url" : "text"}
          className="krds-input"
          value={str}
          onChange={(e) => onChange(e.target.value)}
        />,
      );
  }
}
```

- [ ] **Step 4: 통과 + 검증** — `npx vitest run src/components/right/Field.test.tsx` → PASS. `npx tsc --noEmit` → 0. `npm run lint` → 0.

> lint 주의: 레지스트리 외 `<img>`는 `no-img-element` 규칙 대상일 수 있음. Field의 미리보기 `<img>`에 `{/* eslint-disable-next-line @next/next/no-img-element */}`를 붙이거나, 기존 eslintrc의 off 범위 확인(레지스트리만 off라면 이 줄 비활성 주석 추가).

- [ ] **Step 5: 커밋**

```bash
git add src/components/right/Field.tsx src/components/right/Field.test.tsx
git commit -m "feat: Field 단일값 위젯 10종 — KRDS 폼 마크업 (Step5 TDD 2)"
```

---

### Task 3: Field — repeater + table(배열 편집기)

**Files:**
- Modify: `src/components/right/Field.tsx` (repeater/table 케이스 구현)
- Modify: `src/components/right/Field.test.tsx` (테스트 추가)

**Interfaces:**
- Consumes: Task 2의 `Field`.
- Produces: repeater(`string[]`) / table(`string[][]`) 편집 위젯.

- [ ] **Step 1: 실패 테스트 작성** — `Field.test.tsx`에 추가

```tsx
describe("Field — repeater/table", () => {
  it("repeater: 문자열 항목 편집 + 추가/삭제", () => {
    const onChange = vi.fn();
    const { container } = render(
      <Field schema={{ key: "columns", label: "열", type: "repeater" }} value={["가", "나"]} onChange={onChange} />,
    );
    const inputs = container.querySelectorAll(".repeater-row input");
    expect(inputs).toHaveLength(2);
    fireEvent.change(inputs[0], { target: { value: "다" } });
    expect(onChange).toHaveBeenCalledWith(["다", "나"]);
    fireEvent.click(screen.getByRole("button", { name: "항목 추가" }));
    expect(onChange).toHaveBeenLastCalledWith(["가", "나", ""]);
  });

  it("table: 셀 편집", () => {
    const onChange = vi.fn();
    const { container } = render(
      <Field schema={{ key: "rows", label: "표", type: "table" }} value={[["a", "b"], ["c", "d"]]} onChange={onChange} />,
    );
    const cells = container.querySelectorAll(".table-editor input");
    expect(cells).toHaveLength(4);
    fireEvent.change(cells[3], { target: { value: "z" } });
    expect(onChange).toHaveBeenCalledWith([["a", "b"], ["c", "z"]]);
  });
});
```

- [ ] **Step 2: 실패 확인** — `npx vitest run src/components/right/Field.test.tsx` → FAIL(repeater/table 자리표시).

- [ ] **Step 3: 구현** — `Field.tsx`의 `case "repeater": case "table":` 자리표시를 다음으로 교체

```tsx
    case "repeater": {
      const arr = Array.isArray(value) ? (value as string[]) : [];
      const setAt = (i: number, v: string) => onChange(arr.map((x, j) => (j === i ? v : x)));
      const add = () => onChange([...arr, ""]);
      const removeAt = (i: number) => onChange(arr.filter((_, j) => j !== i));
      return titled(
        <div className="repeater">
          {arr.map((v, i) => (
            <div className="repeater-row" key={i}>
              <input className="krds-input" value={v} onChange={(e) => setAt(i, e.target.value)} />
              <button type="button" aria-label={`${i + 1}번 항목 삭제`} onClick={() => removeAt(i)}>✕</button>
            </div>
          ))}
          <button type="button" onClick={add}>＋ 항목 추가</button>
        </div>,
      );
    }
    case "table": {
      const rows = Array.isArray(value) ? (value as string[][]) : [];
      const cols = rows[0]?.length ?? 0;
      const setCell = (r: number, c: number, v: string) =>
        onChange(rows.map((row, ri) => (ri === r ? row.map((x, ci) => (ci === c ? v : x)) : row)));
      const addRow = () => onChange([...rows, Array.from({ length: cols || 1 }, () => "")]);
      const addCol = () => onChange(rows.map((row) => [...row, ""]));
      const removeRow = (r: number) => onChange(rows.filter((_, ri) => ri !== r));
      return titled(
        <div className="table-editor">
          {rows.map((row, ri) => (
            <div className="table-row" key={ri}>
              {row.map((cell, ci) => (
                <input className="krds-input" key={ci} value={cell} onChange={(e) => setCell(ri, ci, e.target.value)} />
              ))}
              <button type="button" aria-label={`${ri + 1}행 삭제`} onClick={() => removeRow(ri)}>✕</button>
            </div>
          ))}
          <div className="table-editor-actions">
            <button type="button" onClick={addRow}>＋ 행</button>
            <button type="button" onClick={addCol}>＋ 열</button>
          </div>
        </div>,
      );
    }
```

(자리표시였던 `case "repeater": case "table": return titled(<p className="field-pending">…)` 줄은 삭제.)

- [ ] **Step 4: 통과 + 검증** — `npx vitest run src/components/right/Field.test.tsx` → PASS. `npx tsc --noEmit` → 0. `npm run lint` → 0.

- [ ] **Step 5: 커밋**

```bash
git add src/components/right/Field.tsx src/components/right/Field.test.tsx
git commit -m "feat: Field repeater/table 배열 편집기 (Step5 TDD 3)"
```

---

### Task 4: ComponentForm — editableProps로 Field 조합 + store 연결

**Files:**
- Create: `src/components/right/ComponentForm.tsx`
- Test: `src/components/right/ComponentForm.test.tsx`

**Interfaces:**
- Consumes: `Field`(Task 2/3), store `findInstance`(Task 1)·`updateComponentProps`, `getComponent`(`../../registry`), `useEditorState`/`useEditorStoreApi`.
- Produces: `ComponentForm({ pageId, instanceId }: { pageId: string; instanceId: string })`.

- [ ] **Step 1: 실패 테스트 작성** — `src/components/right/ComponentForm.test.tsx`

```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { createEditorStore, type EditorStore, findInstance } from "../../store/editor-store";
import { EditorStoreProvider } from "../../store/context";
import { ComponentForm } from "./ComponentForm";

let store: EditorStore;
let pageId: string;
beforeEach(() => {
  store = createEditorStore();
  store.getState().createSite("테스트");
  pageId = store.getState().site!.pages[0].id;
});

function renderForm(instanceId: string) {
  return render(
    <EditorStoreProvider store={store}>
      <ComponentForm pageId={pageId} instanceId={instanceId} />
    </EditorStoreProvider>,
  );
}

describe("ComponentForm", () => {
  it("선택 컴포넌트의 editableProps로 필드를 그리고 편집이 store에 반영된다", () => {
    const id = store.getState().addComponent(pageId, "button");
    renderForm(id);
    const input = screen.getByLabelText(/버튼 글자/) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "신청하기" } });
    const comps = store.getState().site!.pages.find((p) => p.id === pageId)!.components;
    expect(findInstance(comps, id)!.props.label).toBe("신청하기");
  });

  it("칼럼 안 자식도 편집된다", () => {
    const layoutId = store.getState().addComponent(pageId, "layout");
    const child = store.getState().addComponentToColumn(pageId, layoutId, 0, "button");
    renderForm(child);
    fireEvent.change(screen.getByLabelText(/버튼 글자/), { target: { value: "확인" } });
    const comps = store.getState().site!.pages.find((p) => p.id === pageId)!.components;
    expect(findInstance(comps, child)!.props.label).toBe("확인");
  });
});
```

- [ ] **Step 2: 실패 확인** — `npx vitest run src/components/right/ComponentForm.test.tsx` → FAIL(모듈 없음).

- [ ] **Step 3: 구현** — `src/components/right/ComponentForm.tsx`

```tsx
"use client";

import { getComponent } from "../../registry";
import { findInstance } from "../../store/editor-store";
import { useEditorState, useEditorStoreApi } from "../../store/context";
import { Field } from "./Field";

// 선택된 인스턴스의 editableProps로 자동 폼. 입력 시 updateComponentProps로 즉시 반영.
export function ComponentForm({ pageId, instanceId }: { pageId: string; instanceId: string }) {
  const api = useEditorStoreApi();
  const inst = useEditorState((s) => {
    const page = s.site?.pages.find((p) => p.id === pageId);
    return page ? findInstance(page.components, instanceId) : undefined;
  });
  if (!inst) return null;
  const def = getComponent(inst.componentDefinitionId);
  if (!def) return null;

  return (
    <div className="settings-form">
      <div className="panel-head">
        <strong>{def.name} 설정</strong>
      </div>
      <div className="settings-body">
        {def.editableProps.map((schema) => (
          <Field
            key={schema.key}
            schema={schema}
            value={inst.props[schema.key]}
            onChange={(v) => api.getState().updateComponentProps(pageId, instanceId, { [schema.key]: v })}
          />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: 통과 + 검증** — `npx vitest run src/components/right/ComponentForm.test.tsx`, `npx vitest run`, `npx tsc --noEmit`, `npm run lint` → 전부 통과/0.

- [ ] **Step 5: 커밋**

```bash
git add src/components/right/ComponentForm.tsx src/components/right/ComponentForm.test.tsx
git commit -m "feat: ComponentForm — editableProps 자동 폼 + 실시간 반영 (Step5 TDD 4)"
```

---

### Task 5: PageSettingsForm + RightPanel + AppShell 배선 + 캔버스 토글 제거 + setPageSidebar 제거

**Files:**
- Create: `src/components/right/PageSettingsForm.tsx`, `src/components/right/RightPanel.tsx`
- Test: `src/components/right/RightPanel.test.tsx`
- Modify: `src/components/AppShell.tsx`(우측 패널 자리 교체), `src/components/Canvas.tsx`(사이드바 토글 제거), `src/components/Canvas.test.tsx`(토글 테스트 제거), `src/store/editor-store.ts`(`setPageSidebar` 제거), `src/store/editor-store.test.ts`(setPageSidebar 테스트 제거), `src/app/editor.css`(폼 스타일)

**Interfaces:**
- Consumes: `ComponentForm`(Task 4), store `updatePageMeta`(Task 1), `useEditorState`/`useEditorStoreApi`.
- Produces: `PageSettingsForm({ pageId })`, `RightPanel()`(모드 분기).

- [ ] **Step 1: 실패 테스트 작성** — `src/components/right/RightPanel.test.tsx`

```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { createEditorStore, type EditorStore } from "../../store/editor-store";
import { EditorStoreProvider } from "../../store/context";
import { RightPanel } from "./RightPanel";

let store: EditorStore;
let pageId: string;
beforeEach(() => {
  store = createEditorStore();
  store.getState().createSite("테스트");
  pageId = store.getState().site!.pages[0].id;
});
function renderPanel() {
  return render(
    <EditorStoreProvider store={store}>
      <RightPanel />
    </EditorStoreProvider>,
  );
}

describe("RightPanel", () => {
  it("선택이 없으면 페이지 설정 폼을 보여준다", () => {
    renderPanel();
    expect(screen.getByText("페이지 설정", { exact: false })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "브레드크럼 표시" })).toBeInTheDocument();
  });

  it("페이지 설정 편집이 updatePageMeta로 반영된다", () => {
    renderPanel();
    fireEvent.click(screen.getByRole("checkbox", { name: "브레드크럼 표시" }));
    expect(store.getState().site!.pages.find((p) => p.id === pageId)!.showBreadcrumb).toBe(true);
  });

  it("컴포넌트를 선택하면 그 컴포넌트 폼을 보여준다", () => {
    const id = store.getState().addComponent(pageId, "button");
    store.getState().selectComponent(pageId, id);
    renderPanel();
    expect(screen.getByText("버튼 설정")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 실패 확인** — `npx vitest run src/components/right/RightPanel.test.tsx` → FAIL.

- [ ] **Step 3a: PageSettingsForm** — `src/components/right/PageSettingsForm.tsx`

```tsx
"use client";

import { useEditorState, useEditorStoreApi } from "../../store/context";

// 선택이 없을 때: 현재 페이지의 설정(LNB·브레드크럼·인페이지내비·SEO).
export function PageSettingsForm({ pageId }: { pageId: string }) {
  const api = useEditorStoreApi();
  const page = useEditorState((s) => s.site?.pages.find((p) => p.id === pageId));
  if (!page) return null;
  const set = (patch: Parameters<ReturnType<typeof api.getState>["updatePageMeta"]>[1]) =>
    api.getState().updatePageMeta(pageId, patch);

  return (
    <div className="settings-form">
      <div className="panel-head">
        <strong>페이지 설정 — {page.title}</strong>
      </div>
      <div className="settings-body">
        <label className="krds-form-check inline">
          <input
            type="checkbox"
            checked={page.showSidebar ?? true}
            onChange={(e) => set({ showSidebar: e.target.checked })}
          />
          <span>사이드바 표시</span>
        </label>
        <label className="krds-form-check inline">
          <input
            type="checkbox"
            checked={page.showBreadcrumb}
            onChange={(e) => set({ showBreadcrumb: e.target.checked })}
          />
          <span>브레드크럼 표시</span>
        </label>
        <label className="krds-form-check inline">
          <input
            type="checkbox"
            checked={page.showInPageNavigation}
            onChange={(e) => set({ showInPageNavigation: e.target.checked })}
          />
          <span>인페이지 내비게이션</span>
        </label>
        <div className="form-group">
          <div className="form-tit"><label htmlFor="seo-title">SEO 제목</label></div>
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
          <div className="form-tit"><label htmlFor="seo-desc">SEO 설명</label></div>
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

> `aria-label` 매칭: 체크박스의 접근명은 옆 `<span>` 텍스트로 잡힌다(label로 감쌌으므로). 테스트의 `name: "브레드크럼 표시"`가 맞음.

- [ ] **Step 3b: RightPanel** — `src/components/right/RightPanel.tsx`

```tsx
"use client";

import { useEditorState } from "../../store/context";
import { ComponentForm } from "./ComponentForm";
import { PageSettingsForm } from "./PageSettingsForm";

// 선택 유무로 컴포넌트 폼 / 페이지 설정 폼 분기.
export function RightPanel() {
  const selection = useEditorState((s) => s.selection);
  const activePageId = useEditorState((s) => s.activePageId);
  const fallbackPageId = useEditorState((s) => s.site?.pages[0]?.id);
  const pageId = activePageId ?? fallbackPageId;

  if (selection?.kind === "component") {
    return <ComponentForm pageId={selection.pageId} instanceId={selection.instanceId} />;
  }
  if (!pageId) return null;
  return <PageSettingsForm pageId={pageId} />;
}
```

- [ ] **Step 3c: AppShell 우측 패널 교체** — `src/components/AppShell.tsx`의 `.panel-right` 내용을 RightPanel로 교체

기존:
```tsx
          <aside className="panel panel-right">
            <div className="panel-head">
              <strong>설정</strong>
            </div>
            <p className="panel-placeholder">
              캔버스에서 대상을 선택하면 설정이 표시됩니다. (Step 5)
            </p>
          </aside>
```
를 다음으로 교체(상단 import에 `import { RightPanel } from "./right/RightPanel";` 추가):
```tsx
          <aside className="panel panel-right">
            <RightPanel />
          </aside>
```

- [ ] **Step 3d: 캔버스 사이드바 토글 제거** — `src/components/Canvas.tsx`에서 `.canvas-page-head`의 토글 라벨 제거. 기존:
```tsx
          <div className="canvas-page-head">
            <h2 className="canvas-page-title">{page.title}</h2>
            {lnb ? (
              <label className="sidebar-toggle">
                <input
                  type="checkbox"
                  checked={showSidebar}
                  onChange={(e) => api.getState().setPageSidebar(page.id, e.target.checked)}
                />
                사이드바 표시
              </label>
            ) : null}
          </div>
```
를 다음으로:
```tsx
          <h2 className="canvas-page-title">{page.title}</h2>
```
그리고 Canvas에서 더 이상 쓰지 않는 `const api = useEditorStoreApi();`(Canvas 본문 전용이었다면)·`showSidebar` 계산이 남아 unused가 되면 제거. (`showSidebar`는 `showSidebar && lnb` 렌더 조건에서 계속 쓰이므로 유지. `api`가 Canvas 본문에서 토글에만 쓰였다면 제거 — 단 CanvasInstance 등 다른 곳에서 쓰면 유지. 컴파일/lint로 확인.)

- [ ] **Step 3e: setPageSidebar 제거** — `editor-store.ts`에서 `setPageSidebar` 타입 시그니처 + 액션 구현 삭제. `editor-store.test.ts`의 `describe("setPageSidebar", …)` 블록 삭제(updatePageMeta 테스트가 대체).

- [ ] **Step 3f: Canvas 토글 테스트 제거** — `src/components/Canvas.test.tsx`에서 사이드바 토글 관련 테스트 3개 삭제: "표시할 LNB가 없는 페이지(홈)에서는 '사이드바 표시' 토글을 숨긴다", "하위 페이지가 없는 단독 최상위 메뉴에서도 토글을 숨긴다", "토글 체크박스가 store.showSidebar를 끈다", "LNB가 있는(끈 상태여도) 페이지에서는 토글이 보여 다시 켤 수 있다". (LNB 렌더 자체 테스트 "비홈 하위 페이지는 …사이드바가 보이고…"는 유지.)

- [ ] **Step 4: CSS** — `src/app/editor.css` 끝에 추가

```css
/* 우측 설정 폼 */
.settings-form .panel-head { border-bottom: 1px solid var(--krds-color-light-gray-20, #cdd1d5); }
.settings-body { padding: 12px; display: flex; flex-direction: column; gap: 14px; }
.settings-body .form-group { display: flex; flex-direction: column; gap: 4px; }
.settings-body .form-tit label { font-size: 13px; font-weight: 600; }
.settings-body .required { color: var(--krds-color-light-point-50, #f04438); }
.krds-form-check.inline { display: flex; align-items: center; gap: 6px; font-size: 13px; }
.field-img-preview { max-width: 100%; margin-top: 6px; border: 1px solid var(--krds-color-light-gray-20, #cdd1d5); border-radius: 4px; }
.repeater-row, .table-row { display: flex; gap: 4px; margin-bottom: 4px; }
.repeater-row input, .table-row input { flex: 1; min-width: 0; }
.table-editor-actions { display: flex; gap: 6px; margin-top: 4px; }
```

- [ ] **Step 5: 통과 + 전체 검증** — `npx vitest run src/components/right/RightPanel.test.tsx`, `npx vitest run`, `npx tsc --noEmit`, `npm run lint` → 전부 통과/0.

- [ ] **Step 6: 커밋**

```bash
git add -A
git commit -m "feat: RightPanel(2모드) + PageSettingsForm + AppShell 배선, 캔버스 토글→페이지설정 이전 (Step5 TDD 5)"
```

---

### Task 6: 헤드리스 검증 + 인수인계

**Files:**
- Modify: `docs/HANDOFF.md`, 메모리

- [ ] **Step 1: 빌드 + 헤드리스 검증**

```bash
npm run build
```
`_verify-step5.mjs`(루트 생성·실행·삭제): 컴포넌트 탭 → 버튼을 캔버스에 드롭 → 우측 폼에서 "버튼 글자" 변경 → 캔버스 버튼 텍스트가 바뀌는지 확인. 그리고 빈 영역 클릭(선택 해제) → 우측에 "페이지 설정" 폼 + 사이드바/브레드크럼 체크박스 노출 확인. 스크린샷 저장.

```js
import { chromium } from "playwright";
const exe = process.env.HOME + "/.cache/ms-playwright/chromium-1223/chrome-linux64/chrome";
const OUT = "/tmp/claude-1000/-mnt-data-project-jyj-KRDSmake/f65ad225-853f-4a4a-beee-38e9fa74fa36/scratchpad";
const b = await chromium.launch({ executablePath: exe });
const ctx = await b.newContext({ viewport: { width: 1400, height: 900 } });
const page = await ctx.newPage();
await page.addInitScript(() => { delete Crypto.prototype.randomUUID; });
await page.goto("http://localhost:17200", { waitUntil: "networkidle" });
await page.getByRole("tab", { name: /컴포넌트/ }).click().catch(() => {});
const card = page.locator('.palette-card[data-component-id="button"]').first();
const cb = await card.boundingBox();
const drop = page.locator(".canvas-page");
const db = await drop.boundingBox();
await page.mouse.move(cb.x + cb.width / 2, cb.y + cb.height / 2);
await page.mouse.down();
await page.mouse.move(cb.x + 20, cb.y + 20, { steps: 5 });
await page.mouse.move(db.x + db.width / 2, db.y + 80, { steps: 10 });
await page.mouse.up();
await page.waitForTimeout(300);
// 우측 폼에서 버튼 글자 변경
const labelInput = page.getByLabel(/버튼 글자/);
await labelInput.fill("신청하기");
await page.waitForTimeout(200);
const canvasBtnText = await page.locator(".canvas-page .krds-btn").first().textContent();
console.log("RESULT 캔버스 버튼 텍스트 =", JSON.stringify(canvasBtnText), "(기대 신청하기)");
await page.screenshot({ path: `${OUT}/step5-component.png`, fullPage: true });
// 선택 해제 → 페이지 설정
await page.mouse.click(db.x + db.width - 20, db.y + db.height - 20);
await page.waitForTimeout(200);
const hasPageSettings = await page.getByText("페이지 설정", { exact: false }).count();
console.log("RESULT 페이지설정 폼 =", hasPageSettings);
await page.screenshot({ path: `${OUT}/step5-page.png`, fullPage: true });
await b.close();
```
실행: `cp _verify-step5.mjs ./_verify-step5.mjs && node ./_verify-step5.mjs; rm -f ./_verify-step5.mjs`
Expected: `캔버스 버튼 텍스트 = "신청하기"`, `페이지설정 폼 = 1`. 스샷 Read로 육안 확인.

> 주: 선택 해제는 빈 캔버스 영역 클릭으로 트리거되는데, 현재 `clearSelection` 진입점이 없으면(캔버스 빈 영역 클릭이 선택 해제를 호출하지 않으면) 이 검증의 페이지설정 전환이 안 될 수 있음 — 그 경우 구현자는 "캔버스 빈 영역 클릭 시 `clearSelection`" 한 줄을 Canvas에 추가(작은 보강)하거나, 검증을 "처음 로드 시(선택 없음) 페이지설정 표시"로 대체.

- [ ] **Step 2: HANDOFF/메모리 갱신** — Step 5 완료(우측 자동 폼, 2모드, KRDS 폼 마크업, 재귀화). 후속: 전역요소 편집, 파일 업로드, 폼 입력 컴포넌트 확충. 테스트 수 갱신.

- [ ] **Step 3: 커밋**

```bash
git add docs/HANDOFF.md
git commit -m "docs: 인수인계 — Step 5 우측 설정 자동 폼 완료"
```

---

## Self-Review

**Spec coverage:**
- 2모드(컴포넌트/페이지) → Task 4·5(RightPanel 분기) ✅
- KRDS 폼 마크업 위젯 12종 → Task 2(10) + Task 3(repeater/table) ✅
- image=URL → Task 2(image 케이스) ✅
- updateComponentProps 재귀 + findInstance + updatePageMeta → Task 1 ✅
- 페이지 설정(LNB 토글 이전, 브레드크럼/인페이지/SEO) + 캔버스 토글 제거 + setPageSidebar 제거 → Task 5 ✅
- RHF/Zod 미사용(제어 컴포넌트) → 전 task ✅
- 전역요소/파일업로드 후속 → Task 6 기록 ✅

**Placeholder scan:** 없음(모든 코드/명령 구체값). Task 2의 repeater/table 자리표시는 Task 3에서 실제 코드로 교체(명시).

**Type consistency:** `findInstance(components, id)` — Task1 정의, Task4/테스트 사용 일치. `updatePageMeta(pageId, patch)` — Task1 정의, Task5(PageSettingsForm) 사용 일치. `Field({schema,value,onChange})` — Task2 정의, Task3 확장, Task4 사용 일치. `updateComponentProps(pageId, instanceId, patch)` 시그니처 불변(재귀만). `EditablePropSchema`/`EditablePropType` 출처 일치.
