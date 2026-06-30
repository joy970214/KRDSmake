# Step 6 — 테마 + 디바이스 프리뷰 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 에디터에서 KRDS 테마(기본/선명하게/시스템)와 디바이스(PC/태블릿/모바일)로 현재 페이지를 고충실 미리보기한다.

**Architecture:** `light+pc`에서만 인라인 편집 캔버스를 쓰고, 테마≠light 또는 디바이스≠pc면 읽기전용 `<iframe>` 프리뷰로 전환한다. iframe은 자체 `<html>`에 `data-krds-mode`를 걸고 부모 스타일시트(output.css 등)를 복제·링크하며 폭을 디바이스별 px로 제약해, KRDS 원본 CSS의 테마·반응형을 무수정으로 재현한다.

**Tech Stack:** React 19 / Next.js 16(Turbopack) / zustand vanilla store / Vitest + Testing Library / jsdom.

설계 출처: `docs/superpowers/specs/2026-06-30-step6-theme-device-design.md`

## Global Constraints

- **이 Next.js는 학습데이터와 다름** — API 작성 전 `node_modules/next/dist/docs/` 관련 가이드 확인(AGENTS.md). 본 계획은 새 Next API를 쓰지 않음(클라이언트 컴포넌트·DOM API만).
- **COMPONENT-FIDELITY**: KRDS 출력 마크업/스타일은 KRDS 키트 출처만. 단, **에디터 크롬(PreviewControls 등)은 출력물이 아니므로 충실도 대상 아님**(평범한 에디터 UI).
- **Insecure-context 배포**(HTTP+외부IP): secure-context 전용 브라우저 API 금지(폴백 필수). 본 계획의 iframe은 `src` 없는 same-origin blank iframe + 일반 DOM 조작만 사용(특수 권한 불필요).
- **테마=비영속 미리보기 상태**(`previewMode`), `Site.theme.mode`(영속)와 별개. 익스포트 반영은 범위 밖(Step 7).
- 타입 `ThemeMode = "light" | "high-contrast" | "system"`, `Device = "pc" | "tablet" | "mobile"` 는 `src/lib/types.ts:4-5`에 **이미 존재**(새로 만들지 말 것).
- 검증: 각 task 후 `npx vitest run <해당 파일>`; 전체 마무리 시 `npx vitest run && npx tsc --noEmit && npm run lint && npm run build`.

---

## File Structure

- `src/lib/krds-mode.ts` (신규) — `krdsModeAttr(mode)` 순수 헬퍼
- `src/lib/krds-mode.test.ts` (신규)
- `src/lib/device.ts` (신규) — `DEVICE_WIDTH` 폭 상수
- `src/lib/device.test.ts` (신규)
- `src/store/editor-store.ts` (수정) — `previewMode`/`previewDevice` + setter
- `src/store/editor-store.test.ts` (수정) — 상태·setter 테스트
- `src/components/PreviewControls.tsx` (신규) — 상단바 토글 UI
- `src/components/PreviewControls.test.tsx` (신규)
- `src/components/AppShell.tsx` (수정) — 토밥에 PreviewControls 배치
- `src/components/PreviewDocument.tsx` (신규) — 읽기전용 KRDS 페이지 렌더
- `src/components/PreviewDocument.test.tsx` (신규)
- `src/components/DevicePreview.tsx` (신규) — iframe 호스트
- `src/components/DevicePreview.test.tsx` (신규)
- `src/components/Canvas.tsx` (수정) — ctx에 store 값 반영 + 분기, `LnbItem` export
- `src/components/Canvas.test.tsx` (수정) — 분기 테스트
- `src/app/editor.css` (수정) — PreviewControls/DevicePreview 스타일

---

### Task 1: store에 previewMode/previewDevice 상태 + setter

**Files:**
- Modify: `src/store/editor-store.ts` (import 추가 line 6 / `EditorState` 타입 line 200-240 / 초기값 line 246-249 / 액션 추가)
- Test: `src/store/editor-store.test.ts`

**Interfaces:**
- Produces: `EditorState.previewMode: ThemeMode`(기본 `"light"`), `EditorState.previewDevice: Device`(기본 `"pc"`), `setPreviewMode(mode: ThemeMode): void`, `setPreviewDevice(device: Device): void`.

- [ ] **Step 1: 실패 테스트 작성** — `src/store/editor-store.test.ts` 끝에 추가

```tsx
describe("미리보기 상태(previewMode/previewDevice)", () => {
  it("기본값은 light/pc 다", () => {
    const s = store.getState();
    expect(s.previewMode).toBe("light");
    expect(s.previewDevice).toBe("pc");
  });

  it("setPreviewMode가 모드를 바꾼다", () => {
    store.getState().setPreviewMode("high-contrast");
    expect(store.getState().previewMode).toBe("high-contrast");
  });

  it("setPreviewDevice가 디바이스를 바꾼다", () => {
    store.getState().setPreviewDevice("mobile");
    expect(store.getState().previewDevice).toBe("mobile");
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run src/store/editor-store.test.ts`
Expected: FAIL — `previewMode`/`setPreviewMode` undefined

- [ ] **Step 3: 구현** — 세 곳 수정

`src/store/editor-store.ts` line 6, import에 `ThemeMode`·`Device` 추가:

```ts
import type { ComponentInstance, Device, Page, Site, SitemapNode, ThemeMode } from "../lib/types";
```

`EditorState` 타입(line 203 `selection: ...` 다음 줄)에 상태·액션 시그니처 추가:

```ts
  previewMode: ThemeMode;
  previewDevice: Device;
```

그리고 같은 타입의 액션 목록(`clearSelection: () => void;` 위)에 추가:

```ts
  setPreviewMode: (mode: ThemeMode) => void;
  setPreviewDevice: (device: Device) => void;
```

초기 상태(line 246-249, `selection: null,` 다음 줄)에 추가:

```ts
    previewMode: "light",
    previewDevice: "pc",
```

액션 구현(`setActivePage(pageId) { ... },` 부근, 같은 들여쓰기로 추가):

```ts
    setPreviewMode(mode) {
      set({ previewMode: mode });
    },
    setPreviewDevice(device) {
      set({ previewDevice: device });
    },
```

- [ ] **Step 4: 통과 확인**

Run: `npx vitest run src/store/editor-store.test.ts`
Expected: PASS (기존 테스트 포함 전부)

- [ ] **Step 5: 커밋**

```bash
git add src/store/editor-store.ts src/store/editor-store.test.ts
git commit -m "feat: store에 previewMode/previewDevice 미리보기 상태 + setter"
```

---

### Task 2: krdsModeAttr 헬퍼

**Files:**
- Create: `src/lib/krds-mode.ts`
- Test: `src/lib/krds-mode.test.ts`

**Interfaces:**
- Produces: `krdsModeAttr(mode: ThemeMode): "high-contrast" | "theme" | undefined`. light→`undefined`(속성 없음), high-contrast→`"high-contrast"`, system→`"theme"`.

- [ ] **Step 1: 실패 테스트 작성** — `src/lib/krds-mode.test.ts`

```ts
import { describe, expect, it } from "vitest";
import { krdsModeAttr } from "./krds-mode";

describe("krdsModeAttr", () => {
  it("light는 속성 없음(undefined)", () => {
    expect(krdsModeAttr("light")).toBeUndefined();
  });
  it("high-contrast는 'high-contrast'", () => {
    expect(krdsModeAttr("high-contrast")).toBe("high-contrast");
  });
  it("system은 'theme'", () => {
    expect(krdsModeAttr("system")).toBe("theme");
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run src/lib/krds-mode.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: 구현** — `src/lib/krds-mode.ts`

```ts
import type { ThemeMode } from "./types";

// KRDS 테마 훅(data-krds-mode) 값 매핑. <html>에 적용해야 배경·루트 토큰까지 전환됨.
// light=속성 없음, high-contrast(선명)='high-contrast', system='theme'(+prefers-color-scheme).
export function krdsModeAttr(mode: ThemeMode): "high-contrast" | "theme" | undefined {
  if (mode === "high-contrast") return "high-contrast";
  if (mode === "system") return "theme";
  return undefined;
}
```

- [ ] **Step 4: 통과 확인**

Run: `npx vitest run src/lib/krds-mode.test.ts`
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add src/lib/krds-mode.ts src/lib/krds-mode.test.ts
git commit -m "feat: krdsModeAttr — ThemeMode→data-krds-mode 값 매핑 헬퍼"
```

---

### Task 3: DEVICE_WIDTH 폭 상수

**Files:**
- Create: `src/lib/device.ts`
- Test: `src/lib/device.test.ts`

**Interfaces:**
- Produces: `DEVICE_WIDTH: Record<Device, number | null>` — `pc: null`(가변), `tablet: 768`, `mobile: 360`.

- [ ] **Step 1: 실패 테스트 작성** — `src/lib/device.test.ts`

```ts
import { describe, expect, it } from "vitest";
import { DEVICE_WIDTH } from "./device";

describe("DEVICE_WIDTH", () => {
  it("pc는 가변(null)", () => {
    expect(DEVICE_WIDTH.pc).toBeNull();
  });
  it("tablet=768, mobile=360 (KRDS 브레이크포인트)", () => {
    expect(DEVICE_WIDTH.tablet).toBe(768);
    expect(DEVICE_WIDTH.mobile).toBe(360);
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run src/lib/device.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: 구현** — `src/lib/device.ts`

```ts
import type { Device } from "./types";

// iframe 미리보기 폭(px). pc=null=가변(CSS max-width:1200px).
// KRDS 브레이크포인트: small 360~ / medium 768~ / large 1024~.
export const DEVICE_WIDTH: Record<Device, number | null> = {
  pc: null,
  tablet: 768,
  mobile: 360,
};
```

- [ ] **Step 4: 통과 확인**

Run: `npx vitest run src/lib/device.test.ts`
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add src/lib/device.ts src/lib/device.test.ts
git commit -m "feat: DEVICE_WIDTH — 디바이스별 iframe 폭 상수"
```

---

### Task 4: PreviewControls 토글 UI + 상단바 배치 + 스타일

**Files:**
- Create: `src/components/PreviewControls.tsx`
- Modify: `src/components/AppShell.tsx` (import + `.topbar` 내부 line 65-70)
- Modify: `src/app/editor.css` (끝에 스타일 추가)
- Test: `src/components/PreviewControls.test.tsx`

**Interfaces:**
- Consumes: `EditorState.previewMode/previewDevice`, `setPreviewMode/setPreviewDevice` (Task 1).
- Produces: `<PreviewControls />` (props 없음). 테마 라벨 **"기본/선명하게/시스템"**(공식 KRDS 라벨), 디바이스 라벨 **"PC/태블릿/모바일"**, 각 버튼 `aria-pressed`로 현재값 표시.

- [ ] **Step 1: 실패 테스트 작성** — `src/components/PreviewControls.test.tsx`

```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { createEditorStore, type EditorStore } from "../store/editor-store";
import { EditorStoreProvider } from "../store/context";
import { PreviewControls } from "./PreviewControls";

let store: EditorStore;
beforeEach(() => {
  store = createEditorStore();
  store.getState().createSite("테스트");
});
function renderControls() {
  return render(
    <EditorStoreProvider store={store}>
      <PreviewControls />
    </EditorStoreProvider>,
  );
}

describe("PreviewControls", () => {
  it("테마/디바이스 세그먼트 6개를 렌더한다(공식 KRDS 라벨)", () => {
    renderControls();
    ["기본", "선명하게", "시스템", "PC", "태블릿", "모바일"].forEach((label) =>
      expect(screen.getByRole("button", { name: label })).toBeInTheDocument(),
    );
  });

  it("테마 버튼 클릭이 setPreviewMode를 호출한다", () => {
    renderControls();
    fireEvent.click(screen.getByRole("button", { name: "선명하게" }));
    expect(store.getState().previewMode).toBe("high-contrast");
  });

  it("디바이스 버튼 클릭이 setPreviewDevice를 호출한다", () => {
    renderControls();
    fireEvent.click(screen.getByRole("button", { name: "모바일" }));
    expect(store.getState().previewDevice).toBe("mobile");
  });

  it("현재값 버튼에 aria-pressed=true가 붙는다", () => {
    renderControls();
    expect(screen.getByRole("button", { name: "기본" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "PC" })).toHaveAttribute("aria-pressed", "true");
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run src/components/PreviewControls.test.tsx`
Expected: FAIL — module not found

- [ ] **Step 3: 구현** — `src/components/PreviewControls.tsx`

```tsx
"use client";

import { useEditorState, useEditorStoreApi } from "../store/context";
import type { Device, ThemeMode } from "../lib/types";

// 상단바 미리보기 토글 — 에디터 크롬(KRDS 출력 아님). 라벨은 공식 KRDS("기본/선명하게/시스템").
const MODES: { value: ThemeMode; label: string }[] = [
  { value: "light", label: "기본" },
  { value: "high-contrast", label: "선명하게" },
  { value: "system", label: "시스템" },
];
const DEVICES: { value: Device; label: string }[] = [
  { value: "pc", label: "PC" },
  { value: "tablet", label: "태블릿" },
  { value: "mobile", label: "모바일" },
];

export function PreviewControls() {
  const mode = useEditorState((s) => s.previewMode);
  const device = useEditorState((s) => s.previewDevice);
  const api = useEditorStoreApi();
  return (
    <div className="preview-controls">
      <div className="seg" role="group" aria-label="화면 모드">
        {MODES.map((m) => (
          <button
            key={m.value}
            type="button"
            className="seg-btn"
            aria-pressed={mode === m.value}
            onClick={() => api.getState().setPreviewMode(m.value)}
          >
            {m.label}
          </button>
        ))}
      </div>
      <div className="seg" role="group" aria-label="디바이스">
        {DEVICES.map((d) => (
          <button
            key={d.value}
            type="button"
            className="seg-btn"
            aria-pressed={device === d.value}
            onClick={() => api.getState().setPreviewDevice(d.value)}
          >
            {d.label}
          </button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: 통과 확인**

Run: `npx vitest run src/components/PreviewControls.test.tsx`
Expected: PASS

- [ ] **Step 5: 상단바 배치 + 스타일(테스트 없는 마감)**

`src/components/AppShell.tsx` — import 추가(line 13 `RightPanel` import 다음):

```tsx
import { PreviewControls } from "./PreviewControls";
```

`.topbar`(line 65-70)를 다음으로 교체(가운데 배치):

```tsx
        <header className="topbar">
          <strong className="app-name">KRDS 웹사이트 빌더</strong>
          <span className="topbar-sitename">{siteName}</span>
          <span className="topbar-spacer" />
          <PreviewControls />
          <span className="topbar-spacer" />
          <span className="topbar-hint">자동 저장됨</span>
        </header>
```

`src/app/editor.css` 끝에 추가:

```css
/* 상단바 미리보기 토글(테마/디바이스) — 에디터 크롬(비 KRDS) */
.preview-controls { display: flex; gap: 12px; align-items: center; }
.preview-controls .seg {
  display: inline-flex;
  border: 1px solid var(--krds-color-light-gray-30, #b1b8be);
  border-radius: 6px;
  overflow: hidden;
}
.preview-controls .seg-btn {
  padding: 4px 10px;
  font-size: 13px;
  background: #fff;
  border: none;
  border-left: 1px solid var(--krds-color-light-gray-20, #cdd1d5);
  cursor: pointer;
}
.preview-controls .seg-btn:first-child { border-left: none; }
.preview-controls .seg-btn[aria-pressed="true"] {
  background: var(--krds-color-light-primary-50, #246beb);
  color: #fff;
}
```

- [ ] **Step 6: 검증 + 커밋**

Run: `npx vitest run src/components/PreviewControls.test.tsx && npx tsc --noEmit`
Expected: PASS, tsc 0

```bash
git add src/components/PreviewControls.tsx src/components/PreviewControls.test.tsx src/components/AppShell.tsx src/app/editor.css
git commit -m "feat: PreviewControls 테마/디바이스 토글 + 상단바 배치(공식 KRDS 라벨)"
```

---

### Task 5: PreviewDocument 읽기전용 KRDS 페이지 렌더 + LnbItem export

**Files:**
- Modify: `src/components/Canvas.tsx` (line 367 `function LnbItem(` → `export function LnbItem(`)
- Create: `src/components/PreviewDocument.tsx`
- Test: `src/components/PreviewDocument.test.tsx`

**Interfaces:**
- Consumes: `LnbItem` (Canvas export), `getComponent`(registry), `buildLnb`/`buildBreadcrumb`/`buildInPageNav`(lib), `PreviewCtx`(registry/types).
- Produces: `<PreviewDocument site={Site} page={Page} ctx={PreviewCtx} />` — 편집 크롬(`ci-drag`/`ci-select`/`ci-toolbar`) 없이 KRDS 페이지 구조 렌더. 숨김(`hidden`) 컴포넌트는 제외. 다단 레이아웃(`inst.columns`)은 `.krds-grid`로 렌더.

- [ ] **Step 1: 실패 테스트 작성** — `src/components/PreviewDocument.test.tsx`

```tsx
import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { createEditorStore, type EditorStore } from "../store/editor-store";
import type { PreviewCtx } from "../registry/types";
import { PreviewDocument } from "./PreviewDocument";

let store: EditorStore;
beforeEach(() => {
  store = createEditorStore();
  store.getState().createSite("테스트");
});
function ctxFor(): PreviewCtx {
  const site = store.getState().site!;
  return { site, page: site.pages[0], resolveAsset: () => undefined, mode: "light", device: "pc" };
}

describe("PreviewDocument", () => {
  it("페이지 제목과 KRDS 구조를 편집 크롬 없이 렌더한다", () => {
    const site = store.getState().site!;
    const page = site.pages[0];
    const { container } = render(<PreviewDocument site={site} page={page} ctx={ctxFor()} />);
    expect(container.querySelector(".canvas-page-title")?.textContent).toBe(page.title);
    expect(container.querySelector(".krds-table-wrap, .page-frame")).not.toBeNull();
    // 편집 크롬 없음
    expect(container.querySelector(".ci-drag")).toBeNull();
    expect(container.querySelector(".ci-select")).toBeNull();
    expect(container.querySelector(".ci-toolbar")).toBeNull();
  });

  it("배치된 컴포넌트의 Preview를 렌더하고 숨김은 제외한다", () => {
    const pageId = store.getState().site!.pages[0].id;
    const visibleId = store.getState().addComponent(pageId, "button");
    const hiddenId = store.getState().addComponent(pageId, "button");
    store.getState().toggleHidden(pageId, hiddenId);
    const site = store.getState().site!;
    const page = site.pages.find((p) => p.id === pageId)!;
    const { container } = render(<PreviewDocument site={site} page={page} ctx={ctxFor()} />);
    // 보이는 1개만 krds-btn 렌더(숨김 제외)
    expect(container.querySelectorAll(".krds-btn").length).toBe(1);
    expect(visibleId).not.toBe(hiddenId);
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run src/components/PreviewDocument.test.tsx`
Expected: FAIL — module not found

- [ ] **Step 3a: LnbItem export** — `src/components/Canvas.tsx` line 367

`function LnbItem({` → `export function LnbItem({`

- [ ] **Step 3b: 구현** — `src/components/PreviewDocument.tsx`

```tsx
"use client";

import { getComponent } from "../registry";
import type { PreviewCtx } from "../registry/types";
import type { ComponentInstance, Page, Site } from "../lib/types";
import { buildLnb } from "../lib/lnb";
import { buildBreadcrumb } from "../lib/breadcrumb";
import { buildInPageNav } from "../lib/in-page-nav";
import { LnbItem } from "./Canvas";

// 읽기전용 KRDS 페이지 렌더(편집 크롬 없음). DevicePreview의 iframe 본문에 portal로 들어간다.
// Canvas의 인라인 렌더와 동일한 KRDS 구조를 쓰되, 드래그/선택/툴바를 제거한 형태.
export function PreviewDocument({
  site,
  page,
  ctx,
}: {
  site: Site;
  page: Page;
  ctx: PreviewCtx;
}) {
  const masthead = getComponent("masthead");
  const header = getComponent("header");
  const footer = getComponent("footer");

  const showSidebar = page.showSidebar ?? true;
  const lnb = buildLnb(site.sitemap, page.sitemapNodeId);
  const crumbs = page.showBreadcrumb ? buildBreadcrumb(site.sitemap, page.sitemapNodeId) : [];
  const showInPageNav = !!page.showInPageNavigation;
  const sections = buildInPageNav(page);
  const components = page.components
    .slice()
    .sort((a, b) => a.order - b.order)
    .filter((c) => !c.hidden);

  function renderInstance(inst: ComponentInstance) {
    if (inst.columns) {
      return (
        <div className="krds-grid" style={{ "--cols": inst.columns.length } as React.CSSProperties}>
          {inst.columns.map((children, i) => (
            <div key={i} className="krds-grid-col">
              {children
                .filter((c) => !c.hidden)
                .map((child) => {
                  const cdef = getComponent(child.componentDefinitionId);
                  return (
                    <div key={child.id} className="ci-preview">
                      {cdef ? cdef.Preview({ props: child.props, ctx }) : null}
                    </div>
                  );
                })}
            </div>
          ))}
        </div>
      );
    }
    const def = getComponent(inst.componentDefinitionId);
    return def ? def.Preview({ props: inst.props, ctx }) : null;
  }

  return (
    <div className="canvas-frame">
      {site.globalLayout.masthead.visible && masthead
        ? masthead.Preview({ props: site.globalLayout.masthead, ctx })
        : null}
      {header ? header.Preview({ props: site.globalLayout.header, ctx }) : null}

      <div className="page-frame">
        {showSidebar && lnb ? (
          <nav className="krds-side-navigation" aria-label="좌측 메뉴">
            <h2 className="lnb-tit">{lnb.sectionTitle}</h2>
            <ul className="lnb-list" role="menubar">
              {lnb.items.map((n) => (
                <LnbItem key={n.id} node={n} activeNodeId={lnb.activeNodeId} />
              ))}
            </ul>
          </nav>
        ) : null}

        <main className="canvas-page" aria-label="페이지 본문">
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
          <h2 className="canvas-page-title">{page.title}</h2>
          {components.map((inst) => (
            <div key={inst.id} className="ci-preview">
              {renderInstance(inst)}
            </div>
          ))}
        </main>

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
      </div>

      {footer ? footer.Preview({ props: site.globalLayout.footer, ctx }) : null}
    </div>
  );
}
```

- [ ] **Step 4: 통과 확인**

Run: `npx vitest run src/components/PreviewDocument.test.tsx`
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add src/components/PreviewDocument.tsx src/components/PreviewDocument.test.tsx src/components/Canvas.tsx
git commit -m "feat: PreviewDocument — 읽기전용 KRDS 페이지 렌더(편집 크롬 제거) + LnbItem export"
```

---

### Task 6: DevicePreview iframe 호스트 + 스타일

**Files:**
- Create: `src/components/DevicePreview.tsx`
- Modify: `src/app/editor.css` (끝에 스타일 추가)
- Test: `src/components/DevicePreview.test.tsx`

**Interfaces:**
- Consumes: `krdsModeAttr`(Task 2), `DEVICE_WIDTH`(Task 3), `PreviewDocument`(Task 5), `PreviewCtx`(registry/types).
- Produces: `<DevicePreview mode={ThemeMode} device={Device} site={Site} page={Page} />` — `<iframe title="디바이스 미리보기">` 호스트. mount 시 부모 스타일시트 복제 + `<html data-krds-mode>` 세팅 + 본문에 `PreviewDocument`를 portal. 폭 = `DEVICE_WIDTH[device]`(px) 또는 가변(pc).

- [ ] **Step 1: 실패 테스트 작성** — `src/components/DevicePreview.test.tsx`

```tsx
import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { createEditorStore, type EditorStore } from "../store/editor-store";
import { DevicePreview } from "./DevicePreview";

let store: EditorStore;
beforeEach(() => {
  store = createEditorStore();
  store.getState().createSite("테스트");
});

describe("DevicePreview", () => {
  it("iframe 호스트를 렌더한다", () => {
    const site = store.getState().site!;
    const { getByTitle } = render(
      <DevicePreview mode="high-contrast" device="pc" site={site} page={site.pages[0]} />,
    );
    expect(getByTitle("디바이스 미리보기").tagName).toBe("IFRAME");
  });

  it("모바일이면 iframe 폭을 360px로 제약한다", () => {
    const site = store.getState().site!;
    const { getByTitle } = render(
      <DevicePreview mode="light" device="mobile" site={site} page={site.pages[0]} />,
    );
    const iframe = getByTitle("디바이스 미리보기");
    expect(iframe).toHaveStyle({ width: "360px" });
    expect(iframe.getAttribute("data-device")).toBe("mobile");
  });

  it("PC면 폭을 인라인 고정하지 않는다(가변)", () => {
    const site = store.getState().site!;
    const { getByTitle } = render(
      <DevicePreview mode="high-contrast" device="pc" site={site} page={site.pages[0]} />,
    );
    expect(getByTitle("디바이스 미리보기").style.width).toBe("");
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run src/components/DevicePreview.test.tsx`
Expected: FAIL — module not found

- [ ] **Step 3: 구현** — `src/components/DevicePreview.tsx`

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Device, Page, Site, ThemeMode } from "../lib/types";
import type { PreviewCtx } from "../registry/types";
import { krdsModeAttr } from "../lib/krds-mode";
import { DEVICE_WIDTH } from "../lib/device";
import { PreviewDocument } from "./PreviewDocument";

// 읽기전용 디바이스/테마 미리보기. 자체 <html>을 가진 iframe이라 KRDS 뷰포트 미디어쿼리와
// data-krds-mode 테마가 무수정으로 발동한다. src 없는 same-origin blank iframe(특수 권한 불필요).
export function DevicePreview({
  mode,
  device,
  site,
  page,
}: {
  mode: ThemeMode;
  device: Device;
  site: Site;
  page: Page;
}) {
  const ref = useRef<HTMLIFrameElement>(null);
  const [body, setBody] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const doc = ref.current?.contentDocument;
    if (!doc) return;
    // 부모 head의 스타일시트(output.css·editor.css 등) 복제(1회). Next 번들 경로에 비의존.
    if (!doc.getElementById("krds-preview-styles")) {
      const marker = doc.createElement("meta");
      marker.id = "krds-preview-styles";
      doc.head.appendChild(marker);
      document.head
        .querySelectorAll('link[rel="stylesheet"], style')
        .forEach((n) => doc.head.appendChild(n.cloneNode(true)));
      doc.documentElement.lang = "ko";
    }
    // 테마 속성: <html data-krds-mode>
    const attr = krdsModeAttr(mode);
    if (attr) doc.documentElement.setAttribute("data-krds-mode", attr);
    else doc.documentElement.removeAttribute("data-krds-mode");
    setBody(doc.body);
  }, [mode]);

  const w = DEVICE_WIDTH[device];
  const ctx: PreviewCtx = { site, page, resolveAsset: () => undefined, mode, device };

  return (
    <div className="device-preview">
      <iframe
        ref={ref}
        title="디바이스 미리보기"
        className="device-preview-frame"
        data-device={device}
        style={w == null ? undefined : { width: `${w}px` }}
      />
      {body ? createPortal(<PreviewDocument site={site} page={page} ctx={ctx} />, body) : null}
    </div>
  );
}
```

- [ ] **Step 4: 통과 확인**

Run: `npx vitest run src/components/DevicePreview.test.tsx`
Expected: PASS

- [ ] **Step 5: 스타일(테스트 없는 마감)** — `src/app/editor.css` 끝에 추가

```css
/* 디바이스 읽기전용 미리보기(iframe 격리) */
.device-preview {
  display: flex;
  justify-content: center;
  align-items: flex-start;
  width: 100%;
  height: 100%;
  padding: 24px;
  background: #eef0f3;
  overflow: auto;
}
.device-preview-frame {
  width: 100%;
  max-width: 1200px;
  height: 100%;
  min-height: 600px;
  border: 1px solid var(--krds-color-light-gray-30, #b1b8be);
  background: #fff;
}
```

- [ ] **Step 6: 검증 + 커밋**

Run: `npx vitest run src/components/DevicePreview.test.tsx && npx tsc --noEmit`
Expected: PASS, tsc 0

```bash
git add src/components/DevicePreview.tsx src/components/DevicePreview.test.tsx src/app/editor.css
git commit -m "feat: DevicePreview — iframe 격리 읽기전용 테마/디바이스 미리보기"
```

---

### Task 7: Canvas 분기 + ctx에 store 값 반영

**Files:**
- Modify: `src/components/Canvas.tsx` (import / 선택자 추가 line 24-26 / ctx line 32-38 / 분기 추가)
- Test: `src/components/Canvas.test.tsx` (분기 테스트 추가)

**Interfaces:**
- Consumes: `EditorState.previewMode/previewDevice`(Task 1), `DevicePreview`(Task 6).
- Produces: `Canvas`가 `previewMode==="light" && previewDevice==="pc"`면 인라인 편집 캔버스, 아니면 `<DevicePreview>`를 렌더. ctx의 `mode`/`device`는 항상 store 값.

- [ ] **Step 1: 실패 테스트 작성** — `src/components/Canvas.test.tsx` 끝에 추가

```tsx
describe("미리보기 분기", () => {
  it("기본+PC면 인라인 편집 캔버스를 보여준다", () => {
    renderCanvas();
    expect(screen.getByLabelText("페이지 본문(컴포넌트 드롭 영역)")).toBeInTheDocument();
    expect(screen.queryByTitle("디바이스 미리보기")).toBeNull();
  });

  it("디바이스가 pc가 아니면 iframe 미리보기로 전환한다", () => {
    store.getState().setPreviewDevice("mobile");
    renderCanvas();
    expect(screen.getByTitle("디바이스 미리보기")).toBeInTheDocument();
    expect(screen.queryByLabelText("페이지 본문(컴포넌트 드롭 영역)")).toBeNull();
  });

  it("선명 모드면 PC 폭이어도 iframe 미리보기로 전환한다", () => {
    store.getState().setPreviewMode("high-contrast");
    renderCanvas();
    expect(screen.getByTitle("디바이스 미리보기")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run src/components/Canvas.test.tsx`
Expected: FAIL — 분기 미구현(iframe 안 나오거나 인라인이 계속 나옴)

- [ ] **Step 3: 구현** — `src/components/Canvas.tsx`

import 추가(line 17 `import type { ComponentInstance, SitemapNode }` 다음):

```tsx
import { DevicePreview } from "./DevicePreview";
```

선택자 추가(line 26 `const selection = useEditorState((s) => s.selection);` 다음):

```tsx
  const previewMode = useEditorState((s) => s.previewMode);
  const previewDevice = useEditorState((s) => s.previewDevice);
```

ctx(line 32-38)의 하드코딩을 store 값으로 교체하고, 바로 아래 분기 추가:

```tsx
  const ctx: PreviewCtx = {
    site,
    page,
    resolveAsset: () => undefined,
    mode: previewMode,
    device: previewDevice,
  };

  if (previewMode !== "light" || previewDevice !== "pc") {
    return (
      <DevicePreview mode={previewMode} device={previewDevice} site={site} page={page} />
    );
  }
```

- [ ] **Step 4: 통과 확인**

Run: `npx vitest run src/components/Canvas.test.tsx`
Expected: PASS (기존 + 신규 분기 테스트)

- [ ] **Step 5: 전체 검증**

Run: `npx vitest run && npx tsc --noEmit && npm run lint && npm run build`
Expected: 전체 PASS, tsc 0, lint 0, build OK

- [ ] **Step 6: 커밋**

```bash
git add src/components/Canvas.tsx src/components/Canvas.test.tsx
git commit -m "feat: Canvas 미리보기 분기 — light+pc 편집 / 그 외 DevicePreview + ctx store 반영"
```

---

## 최종 수동 검증 (실브라우저 — 설계 검증기준 "모드·폭 전환 시 캔버스 반응")

빌드 후 `http://172.213.188.161:17200`(또는 dev)에서:
1. 상단바 "선명하게" 클릭 → 캔버스가 iframe으로 바뀌고 **고대비(어두운 배경·고명도 대비) 적용** 확인.
2. "모바일" 클릭 → iframe 폭 360px + **모바일 1단 스택·LNB 접힘** 등 KRDS 반응형 실발동 확인.
3. "기본"+"PC"로 복귀 → 인라인 편집(DnD/선택) 정상 동작 확인.
4. "시스템" → 빌더 OS가 다크면 어둡게(아니면 라이트) — 한계 동작 확인.

> jsdom에서는 미디어쿼리 실발동·실제 색이 검증되지 않으므로 위 항목은 수동 필수.

---

## Self-Review (작성자 점검 완료)

- **스펙 커버리지**: §2 상태→T1, §4 테마헬퍼→T2, §5 디바이스폭→T3, §6.1 PreviewControls→T4, §6.2 PreviewDocument→T5, §6.3 DevicePreview→T6, §6.4 Canvas분기+ctx→T7, §9 테스트→각 task, editor.css→T4·T6. 누락 없음.
- **타입 일관성**: `previewMode`/`previewDevice`, `setPreviewMode`/`setPreviewDevice`, `krdsModeAttr`, `DEVICE_WIDTH`, `PreviewDocument(site,page,ctx)`, `DevicePreview(mode,device,site,page)` — task 간 시그니처 일치.
- **플레이스홀더**: 없음(모든 코드/명령 명시).
- **충실도**: KRDS 출력은 output.css 무수정 재현, 에디터 크롬만 자체 스타일.
