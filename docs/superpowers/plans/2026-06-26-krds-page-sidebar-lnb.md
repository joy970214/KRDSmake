# 페이지 레벨 좌측 사이드바(LNB) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 사이트맵에서 자동 파생되는 KRDS 좌측 탐색 메뉴(LNB)를 페이지에 `[사이드바 | 본문]` 2칼럼으로 추가한다.

**Architecture:** 순수 함수 `buildLnb`가 사이트맵 + 현재 노드 id로 LNB 모델을 파생한다. `Page.showSidebar?`(미설정=켜짐) 플래그를 store 액션으로 토글한다. Canvas가 헤더/푸터 사이에 `.page-frame`(1200px 제약 담당)을 두고 그 안에 `<aside.lnb>`(조건부) + 기존 `<main.canvas-page>`를 배치한다. 기존 `.krds-grid`의 1200px 제약은 `.page-frame`으로 옮긴다.

**Tech Stack:** Next.js(정적 export), React, Zustand, dnd-kit(기존), vitest + @testing-library/react, Playwright(헤드리스 검증).

## Global Constraints

- 비보안 컨텍스트 배포(HTTP+외부IP): secure-context 전용 API 금지. id는 `src/lib/ids.ts`의 `newId()` 사용. (이 작업은 신규 id 생성 없음)
- 모든 단계 TDD(red→green), 자주 커밋.
- 테스트 실행: 단일 파일 `npx vitest run <path>`, 전체 `npx vitest run`. 타입검사 `npx tsc --noEmit`. 린트 `npm run lint`. 빌드 `npm run build`.
- LNB는 `ComponentInstance`가 아님 — 선택/드롭/익스포트 대상 아님(익스포트 주입은 Step 7).
- 표시 최종 판정식: `(page.showSidebar ?? true) && buildLnb(...) !== null`. 홈은 `buildLnb`가 `null`이라 자동 미표시.

---

### Task 1: LNB 파생 순수 함수 `lib/lnb.ts`

**Files:**
- Create: `src/lib/lnb.ts`
- Test: `src/lib/lnb.test.ts`

**Interfaces:**
- Consumes: `SitemapNode`(`src/lib/types.ts` — `{ id, title, slug, path, parentId?, order, visibleInHeader, visibleInFooter, children?, pageId, isHome? }`).
- Produces:
  - `type LnbModel = { sectionTitle: string; items: SitemapNode[]; activeNodeId: string }`
  - `function buildLnb(sitemap: SitemapNode[], currentNodeId: string): LnbModel | null`

- [ ] **Step 1: 실패 테스트 작성** — `src/lib/lnb.test.ts`

```ts
import { describe, expect, it } from "vitest";
import { buildLnb } from "./lnb";
import type { SitemapNode } from "./types";

// 사이트맵 루트: [홈], [서비스 > (소개, 문의)]
const sitemap: SitemapNode[] = [
  { id: "home", title: "홈", slug: "", path: "/", order: 0, visibleInHeader: true, visibleInFooter: false, pageId: "p-home", isHome: true },
  {
    id: "svc", title: "서비스", slug: "service", path: "/service", order: 1, visibleInHeader: true, visibleInFooter: false, pageId: "p-svc",
    children: [
      { id: "intro", title: "소개", slug: "intro", path: "/service/intro", order: 0, visibleInHeader: true, visibleInFooter: false, pageId: "p-intro", parentId: "svc" },
      { id: "qna", title: "문의", slug: "qna", path: "/service/qna", order: 1, visibleInHeader: true, visibleInFooter: false, pageId: "p-qna", parentId: "svc" },
    ],
  },
];

describe("buildLnb", () => {
  it("하위 페이지에서 속한 섹션의 하위 트리를 반환하고 현재 페이지를 강조한다", () => {
    const lnb = buildLnb(sitemap, "intro");
    expect(lnb).not.toBeNull();
    expect(lnb!.sectionTitle).toBe("서비스");
    expect(lnb!.items.map((n) => n.id)).toEqual(["intro", "qna"]);
    expect(lnb!.activeNodeId).toBe("intro");
  });

  it("섹션 랜딩(자식 있는 최상위 노드)에서는 자기 자식들을 반환한다", () => {
    const lnb = buildLnb(sitemap, "svc");
    expect(lnb!.items.map((n) => n.id)).toEqual(["intro", "qna"]);
    expect(lnb!.activeNodeId).toBe("svc");
  });

  it("홈에서는 null(LNB 없음)", () => {
    expect(buildLnb(sitemap, "home")).toBeNull();
  });

  it("자식이 없는 단독 섹션에서는 null", () => {
    const flat: SitemapNode[] = [
      { id: "home", title: "홈", slug: "", path: "/", order: 0, visibleInHeader: true, visibleInFooter: false, pageId: "p-home", isHome: true },
      { id: "lone", title: "단독", slug: "lone", path: "/lone", order: 1, visibleInHeader: true, visibleInFooter: false, pageId: "p-lone" },
    ];
    expect(buildLnb(flat, "lone")).toBeNull();
  });

  it("없는 노드 id면 null", () => {
    expect(buildLnb(sitemap, "nope")).toBeNull();
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run src/lib/lnb.test.ts`
Expected: FAIL — `buildLnb`/`./lnb` 모듈 없음.

- [ ] **Step 3: 구현** — `src/lib/lnb.ts`

```ts
import type { SitemapNode } from "./types";

export type LnbModel = {
  sectionTitle: string;
  items: SitemapNode[];
  activeNodeId: string;
};

// 루트~대상 노드까지의 경로(조상 체인). 없으면 null.
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

// 현재 페이지의 사이트맵 노드 기준 LNB(좌측 메뉴) 모델.
// 최상위(depth-0) 섹션의 하위 트리를 메뉴로, 현재 노드를 강조. 표시할 게 없으면 null.
export function buildLnb(
  sitemap: SitemapNode[],
  currentNodeId: string,
): LnbModel | null {
  const path = findPath(sitemap, currentNodeId);
  if (!path) return null;
  const current = path[path.length - 1];
  if (current.isHome) return null;
  const section = path[0];
  const items = section.children ?? [];
  if (items.length === 0) return null;
  return { sectionTitle: section.title, items, activeNodeId: currentNodeId };
}
```

- [ ] **Step 4: 통과 확인**

Run: `npx vitest run src/lib/lnb.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: 커밋**

```bash
git add src/lib/lnb.ts src/lib/lnb.test.ts
git commit -m "feat: LNB 파생 순수함수 buildLnb (사이드바 TDD 1)"
```

---

### Task 2: `Page.showSidebar?` 모델 + store `setPageSidebar`

**Files:**
- Modify: `src/lib/types.ts` (Page 타입에 `showSidebar?` 추가)
- Modify: `src/store/editor-store.ts` (EditorState 타입 + 액션)
- Test: `src/store/editor-store.test.ts` (describe 추가)

**Interfaces:**
- Consumes: 기존 store `createSite`, `addSitemapNode({title,slug,parentId?}): string`, `site.pages`.
- Produces: `setPageSidebar(pageId: string, show: boolean): void` — 해당 페이지의 `showSidebar` 설정.

- [ ] **Step 1: 실패 테스트 작성** — `src/store/editor-store.test.ts` 의 마지막 describe 뒤에 추가

```ts
describe("setPageSidebar", () => {
  it("페이지의 showSidebar를 설정한다", () => {
    const pageId = store.getState().site!.pages[0].id;
    store.getState().setPageSidebar(pageId, false);
    expect(store.getState().site!.pages.find((p) => p.id === pageId)!.showSidebar).toBe(false);
    store.getState().setPageSidebar(pageId, true);
    expect(store.getState().site!.pages.find((p) => p.id === pageId)!.showSidebar).toBe(true);
  });

  it("다른 페이지에는 영향을 주지 않는다(기본은 미설정=undefined)", () => {
    const homeId = store.getState().site!.pages[0].id;
    const nodeId = store.getState().addSitemapNode({ title: "서비스", slug: "service" });
    const otherPage = store.getState().site!.pages.find((p) => p.sitemapNodeId === nodeId)!;
    store.getState().setPageSidebar(otherPage.id, false);
    expect(store.getState().site!.pages.find((p) => p.id === homeId)!.showSidebar).toBeUndefined();
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run src/store/editor-store.test.ts`
Expected: FAIL — `setPageSidebar` is not a function.

- [ ] **Step 3a: Page 타입에 필드 추가** — `src/lib/types.ts`, `Page` 타입의 `showInPageNavigation: boolean;` 바로 다음 줄에 추가

```ts
  showSidebar?: boolean; // 좌측 LNB 표시. 미설정=켜짐(홈은 buildLnb가 null이라 자동 미표시)
```

- [ ] **Step 3b: EditorState 타입에 액션 시그니처 추가** — `src/store/editor-store.ts`, `selectComponent`/`clearSelection` 선언 부근(액션 타입 블록)에 추가

```ts
  setPageSidebar: (pageId: string, show: boolean) => void;
```

- [ ] **Step 3c: 액션 구현** — `src/store/editor-store.ts`, `clearSelection` 액션 구현 바로 앞(또는 페이지 관련 액션 근처)에 추가

```ts
    setPageSidebar(pageId, show) {
      const site = get().site;
      if (!site) return;
      set({
        site: {
          ...site,
          pages: site.pages.map((p) =>
            p.id === pageId ? { ...p, showSidebar: show } : p,
          ),
        },
      });
    },
```

- [ ] **Step 4: 통과 확인**

Run: `npx vitest run src/store/editor-store.test.ts`
Expected: PASS (기존 + 신규 2 tests).

- [ ] **Step 5: 타입검사 + 커밋**

```bash
npx tsc --noEmit
git add src/lib/types.ts src/store/editor-store.ts src/store/editor-store.test.ts
git commit -m "feat: Page.showSidebar + setPageSidebar 액션 (사이드바 TDD 2)"
```

---

### Task 3: Canvas LNB 렌더 + 토글 + 그리드 CSS 이동

**Files:**
- Modify: `src/components/Canvas.tsx` (import, Canvas 본문 구조, LnbList 컴포넌트 추가)
- Modify: `src/app/editor.css` (`.krds-grid` 1200px 제약 제거, `.page-frame`/`.lnb` 등 추가)
- Test: `src/components/Canvas.test.tsx` (describe 추가)

**Interfaces:**
- Consumes: `buildLnb`, `LnbModel`(Task 1), `setPageSidebar`(Task 2), 기존 `useEditorStoreApi`, `setActivePage`.
- Produces: UI만(다른 task가 의존하는 export 없음).

- [ ] **Step 1: 실패 테스트 작성** — `src/components/Canvas.test.tsx` 맨 끝에 추가

```ts
// 헬퍼: 홈 외 섹션 + 하위 페이지 생성 → 하위 페이지 id 반환
function addSectionWithChild() {
  const svc = store.getState().addSitemapNode({ title: "서비스", slug: "service" });
  const intro = store.getState().addSitemapNode({ title: "소개", slug: "intro", parentId: svc });
  const introPage = store.getState().site!.pages.find((p) => p.sitemapNodeId === intro)!;
  return { introPageId: introPage.id };
}

describe("페이지 사이드바(LNB)", () => {
  it("비홈 하위 페이지는 기본(미설정)으로 사이드바가 보이고 섹션 제목/활성항목을 표시한다", () => {
    const { introPageId } = addSectionWithChild();
    store.getState().setActivePage(introPageId);
    const { container } = renderCanvas();
    expect(container.querySelector(".lnb")).not.toBeNull();
    expect(container.querySelector(".lnb-title")?.textContent).toBe("서비스");
    expect(container.querySelector(".lnb-link.is-active")?.textContent).toBe("소개");
  });

  it("showSidebar=false면 사이드바가 사라진다", () => {
    const { introPageId } = addSectionWithChild();
    store.getState().setActivePage(introPageId);
    store.getState().setPageSidebar(introPageId, false);
    const { container } = renderCanvas();
    expect(container.querySelector(".lnb")).toBeNull();
  });

  it("홈에서는 기본 켜짐이어도 사이드바가 없다", () => {
    addSectionWithChild();
    // 활성 페이지 미설정 → Canvas는 pages[0](홈)로 폴백
    const { container } = renderCanvas();
    expect(container.querySelector(".lnb")).toBeNull();
  });

  it("토글 체크박스가 store.showSidebar를 끈다", () => {
    const { introPageId } = addSectionWithChild();
    store.getState().setActivePage(introPageId);
    renderCanvas();
    fireEvent.click(screen.getByRole("checkbox", { name: "사이드바 표시" }));
    expect(store.getState().site!.pages.find((p) => p.id === introPageId)!.showSidebar).toBe(false);
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run src/components/Canvas.test.tsx`
Expected: FAIL — `.lnb` 없음 / 체크박스 없음.

- [ ] **Step 3a: Canvas import 추가** — `src/components/Canvas.tsx` 상단 import 구역

`CANVAS_DROPPABLE_ID, columnDroppableId` import 줄을 다음으로 교체:

```ts
import { CANVAS_DROPPABLE_ID, columnDroppableId } from "../lib/dnd-plan";
import { buildLnb } from "../lib/lnb";
```

그리고 types import 줄을 다음으로 교체(SitemapNode 추가):

```ts
import type { ComponentInstance, SitemapNode } from "../lib/types";
```

- [ ] **Step 3b: Canvas 함수에 api + lnb 계산 추가** — `Canvas()` 안, `const components = ...`/`const selectedId = ...` 계산부 근처에 추가

```ts
  const api = useEditorStoreApi();
  const showSidebar = (page.showSidebar ?? true);
  const lnb = buildLnb(site.sitemap, page.sitemapNodeId);
```

- [ ] **Step 3c: 본문 구조를 page-frame으로 감싸기** — `src/components/Canvas.tsx`

기존 블록:

```tsx
        {header ? header.Preview({ props: site.globalLayout.header, ctx }) : null}

        <main
          ref={setNodeRef}
          className={`canvas-page${isOver ? " is-drop-over" : ""}`}
          aria-label="페이지 본문(컴포넌트 드롭 영역)"
        >
          <h2 className="canvas-page-title">{page.title}</h2>
          {components.length === 0 ? (
```

를 다음으로 교체:

```tsx
        {header ? header.Preview({ props: site.globalLayout.header, ctx }) : null}

        <div className="page-frame">
        {showSidebar && lnb ? (
          <aside className="lnb" aria-label="좌측 메뉴">
            <p className="lnb-title">{lnb.sectionTitle}</p>
            <LnbList items={lnb.items} activeNodeId={lnb.activeNodeId} />
          </aside>
        ) : null}

        <main
          ref={setNodeRef}
          className={`canvas-page${isOver ? " is-drop-over" : ""}`}
          aria-label="페이지 본문(컴포넌트 드롭 영역)"
        >
          <div className="canvas-page-head">
            <h2 className="canvas-page-title">{page.title}</h2>
            <label className="sidebar-toggle">
              <input
                type="checkbox"
                checked={showSidebar}
                onChange={(e) => api.getState().setPageSidebar(page.id, e.target.checked)}
              />
              사이드바 표시
            </label>
          </div>
          {components.length === 0 ? (
```

- [ ] **Step 3d: `</main>` 닫은 뒤 page-frame 닫기** — 같은 파일에서 기존:

```tsx
        </main>

        {footer ? footer.Preview({ props: site.globalLayout.footer, ctx }) : null}
```

를 다음으로 교체:

```tsx
        </main>
        </div>

        {footer ? footer.Preview({ props: site.globalLayout.footer, ctx }) : null}
```

- [ ] **Step 3e: LnbList 컴포넌트 추가** — `src/components/Canvas.tsx` 파일 맨 끝에 추가

```tsx
// LNB(좌측 메뉴) 항목을 중첩 ul로 렌더. 에디터에선 비탐색(읽기 전용).
function LnbList({
  items,
  activeNodeId,
}: {
  items: SitemapNode[];
  activeNodeId: string;
}) {
  return (
    <ul className="lnb-list">
      {items.map((n) => (
        <li key={n.id}>
          <a
            className={`lnb-link${n.id === activeNodeId ? " is-active" : ""}`}
            href={n.path}
            aria-current={n.id === activeNodeId ? "page" : undefined}
            onClick={(e) => e.preventDefault()}
          >
            {n.title}
          </a>
          {n.children && n.children.length > 0 ? (
            <LnbList items={n.children} activeNodeId={activeNodeId} />
          ) : null}
        </li>
      ))}
    </ul>
  );
}
```

- [ ] **Step 4a: CSS — `.krds-grid` 1200px 제약 제거** — `src/app/editor.css`

기존:

```css
.krds-grid {
  display: grid;
  grid-template-columns: repeat(var(--cols, 2), 1fr);
  gap: 24px;
  max-width: 1200px;
  margin: 0 auto;
}
```

를 다음으로 교체(1200px·centering 제거, 본문폭 100%):

```css
.krds-grid {
  display: grid;
  grid-template-columns: repeat(var(--cols, 2), 1fr);
  gap: 24px;
  width: 100%;
}
```

- [ ] **Step 4b: CSS — page-frame/LNB 스타일 추가** — `src/app/editor.css` 맨 끝에 추가

```css
/* 페이지 프레임: 1200px·거터 책임을 블록이 아닌 여기로 (KRDS style_05) */
.page-frame {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  gap: 24px;
  align-items: flex-start;
}
.page-frame > .canvas-page {
  flex: 1 1 auto;
  min-width: 0; /* 그리드 자식이 넘치지 않도록 */
}
.canvas-page-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.sidebar-toggle {
  font-size: 13px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  white-space: nowrap;
  color: var(--krds-color-light-gray-70, #464c53);
}
/* 좌측 LNB */
.lnb {
  flex: 0 0 240px;
  border: 1px solid var(--krds-color-light-gray-30, #b1b8be);
  border-radius: 8px;
  padding: 16px;
}
.lnb-title {
  margin: 0 0 12px;
  font-weight: 700;
}
.lnb-list {
  list-style: none;
  margin: 0;
  padding: 0;
}
.lnb-list .lnb-list {
  padding-left: 12px;
}
.lnb-link {
  display: block;
  padding: 6px 8px;
  color: var(--krds-color-light-gray-90, #1e2124);
  text-decoration: none;
  border-radius: 4px;
}
.lnb-link:hover {
  background: var(--krds-color-light-gray-5, #f4f5f6);
}
.lnb-link.is-active {
  color: var(--krds-color-light-primary-50, #256ef4);
  font-weight: 700;
  background: var(--krds-color-light-primary-5, #eaf2fe);
}
/* 모바일: 사이드바가 본문 위로 1단 스택 */
@media (max-width: 767px) {
  .page-frame {
    flex-direction: column;
  }
  .lnb {
    flex-basis: auto;
    width: 100%;
  }
}
```

- [ ] **Step 5: 통과 확인 + 전체 검증**

```bash
npx vitest run src/components/Canvas.test.tsx
npx vitest run
npx tsc --noEmit
npm run lint
```
Expected: Canvas 테스트 PASS(기존 + 신규 4), 전체 PASS, tsc 0, lint 0.

- [ ] **Step 6: 정적 빌드 + 헤드리스 실브라우저 검증**

```bash
npm run build
```

검증 스크립트를 프로젝트 루트에 임시로 만들어 실행(scratchpad의 ESM은 playwright resolve 안 되므로 루트에서 실행 후 삭제):

`_verify-lnb.mjs` (루트):

```js
import { chromium } from "playwright";
const exe = process.env.HOME + "/.cache/ms-playwright/chromium-1223/chrome-linux64/chrome";
const OUT = "/tmp/claude-1000/-mnt-data-project-jyj-KRDSmake/f65ad225-853f-4a4a-beee-38e9fa74fa36/scratchpad";
const browser = await chromium.launch({ executablePath: exe });
const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
const page = await ctx.newPage();
await page.addInitScript(() => { delete Crypto.prototype.randomUUID; });
page.on("pageerror", (e) => console.log("[pageerror]", e.message));
await page.goto("http://localhost:17200", { waitUntil: "networkidle" });

// 사이트맵 탭에서 섹션 + 하위 페이지 생성
await page.getByRole("tab", { name: /사이트맵/ }).click().catch(() => {});
await page.getByRole("button", { name: "메뉴 추가" }).click();            // 루트 "새 메뉴"
await page.waitForTimeout(150);
await page.getByRole("button", { name: "새 메뉴 하위 추가" }).click();    // 하위 "새 메뉴"
await page.waitForTimeout(150);

// 하위 페이지로 이동(트리의 두 번째 "새 메뉴" 제목 버튼 = 자식)
const titleButtons = page.locator(".node-view > button");
await titleButtons.nth(1).click();
await page.waitForTimeout(200);

const hasLnb = await page.locator(".lnb").count();
const frameCols = await page.evaluate(() => {
  const f = document.querySelector(".page-frame");
  if (!f) return null;
  const aside = f.querySelector(".lnb");
  const main = f.querySelector(".canvas-page");
  if (!aside || !main) return null;
  const a = aside.getBoundingClientRect(), m = main.getBoundingClientRect();
  return { sideBySide: a.right <= m.left + 1, asideW: Math.round(a.width), mainW: Math.round(m.width) };
});
console.log("RESULT lnb count =", hasLnb, "(기대 1)");
console.log("RESULT 좌우배치 =", JSON.stringify(frameCols));

await page.screenshot({ path: `${OUT}/lnb-desktop.png`, fullPage: true });
await page.setViewportSize({ width: 390, height: 800 });
await page.waitForTimeout(150);
await page.screenshot({ path: `${OUT}/lnb-mobile.png`, fullPage: true });
console.log("screenshots saved");
await browser.close();
```

실행:

```bash
cp _verify-lnb.mjs /mnt/data/project/jyj/KRDSmake/_verify-lnb.mjs 2>/dev/null
node /mnt/data/project/jyj/KRDSmake/_verify-lnb.mjs
rm -f /mnt/data/project/jyj/KRDSmake/_verify-lnb.mjs
```
Expected: `lnb count = 1`, `sideBySide=true`(데스크톱에서 LNB가 본문 왼쪽). desktop 스샷=2칼럼, mobile 스샷=세로 스택. 스샷 Read로 육안 확인.

- [ ] **Step 7: 커밋**

```bash
git add src/components/Canvas.tsx src/components/Canvas.test.tsx src/app/editor.css
git commit -m "feat: Canvas 좌측 LNB 렌더 + 토글 + 그리드 1200px 제약 이전 (사이드바 TDD 3)"
```

---

### Task 4: 인수인계/메모리 갱신

**Files:**
- Modify: `docs/HANDOFF.md`
- Modify: `/home/axops/.claude/projects/-mnt-data-project-jyj-KRDSmake/memory/krds-builder-progress.md` 및 `MEMORY.md`

- [ ] **Step 1: HANDOFF.md 갱신**
  - 사이드바(LNB) 완료 항목 추가, 테스트 수 갱신.
  - **⚠️ Step 5 후속**: 캔버스 상단 "사이드바 표시" 토글을 **Step 5 우측 자동 폼으로 이전**(현재 `Page.showSidebar`를 폼 필드로). + 기존 메모(`updateComponentProps` 등 칼럼 자식 미탐색)도 유지.
  - 익스포트 LNB 주입은 Step 7 백로그로 기록.

- [ ] **Step 2: 메모리 갱신** — `krds-builder-progress.md`에 사이드바 완료 반영, `MEMORY.md` 한 줄 갱신.

- [ ] **Step 3: 커밋**

```bash
git add docs/HANDOFF.md
git commit -m "docs: 인수인계 갱신 — 좌측 LNB 완료, 토글의 Step5 이전 메모"
```

---

## Self-Review

**Spec coverage:**
- 콘텐츠=사이트맵 자동 파생 → Task 1 `buildLnb` ✅
- 노출=페이지별 토글 + 섹션 트리 → Task 2 `showSidebar`/`setPageSidebar`, Task 1 섹션 트리 ✅
- 기본 "홈 외 켜짐"(`?? true`) + 홈 자동 null → Task 1(home guard) + Task 3(`page.showSidebar ?? true`) + 테스트 ✅
- 토글 진입점=캔버스 상단 → Task 3 `.sidebar-toggle` ✅
- 레이아웃/CSS + `.krds-grid` 1200px 이전 → Task 3 Step 4a/4b ✅
- 모바일 1단 스택 → Task 3 Step 4b 미디어쿼리 ✅
- LNB 읽기 전용(비탐색) → Task 3 `onClick preventDefault` ✅
- 우측 메뉴 손대지 않음 / 익스포트 Step7 / 토글 Step5 이전 → Task 4 기록 ✅

**Placeholder scan:** 없음(모든 코드/명령 구체값).

**Type consistency:** `LnbModel{sectionTitle,items,activeNodeId}` — Task1 정의, Task3 사용 일치. `setPageSidebar(pageId,show)` — Task2 정의, Task3 호출 일치. `buildLnb(sitemap, page.sitemapNodeId)` — currentNodeId=string, Page.sitemapNodeId=string 일치.
