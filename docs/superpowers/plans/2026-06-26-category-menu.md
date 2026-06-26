# 카테고리 메뉴(섹션 랜딩) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 사이트맵 노드를 "카테고리"로 토글하면 자체 콘텐츠 대신 첫 하위 콘텐츠 페이지로 보내는(섹션 랜딩) 기능을 더한다.

**Architecture:** `SitemapNode.isCategory?` 플래그 + 순수 헬퍼 `resolveTargetPageId`(카테고리면 전위 탐색으로 첫 비-카테고리 하위 pageId)로 분리해 TDD. store `setNodeCategory`로 토글하고, `SitemapTree`에 (하위 있는 노드 한정) 카테고리 토글 버튼/배지를 더하고 카테고리 제목 클릭은 `resolveTargetPageId`로 라우팅한다.

**Tech Stack:** React, Zustand, vitest + @testing-library/react, Playwright(헤드리스 검증).

## Global Constraints

- 모든 단계 TDD(red→green), 자주 커밋.
- 테스트: 단일 파일 `npx vitest run <path>`, 전체 `npx vitest run`. 타입 `npx tsc --noEmit`. 린트 `npm run lint`. 빌드 `npm run build`.
- **1:1 불변식 유지**: 카테고리 노드도 페이지를 그대로 가짐. `isCategory`는 optional이라 옛 데이터엔 없을 수 있음 → `=== true`로만 판단.
- 카테고리 토글 버튼은 **하위가 있는 노드에만** 노출. 하위가 없으면 `resolveTargetPageId`가 자기 pageId로 폴백.
- 새 id 생성은 store만. 비보안 컨텍스트 전용 API 금지. Korean 주석이 repo 관례.
- store 헬퍼(그대로 사용): `updateNode(nodes, id, patch: Partial<SitemapNode>)` 불변 트리 패치.

---

### Task 1: 모델 `isCategory?` + 순수 `resolveTargetPageId`

**Files:**
- Modify: `src/lib/types.ts` (`SitemapNode`에 `isCategory?`)
- Modify: `src/lib/sitemap.ts` (`resolveTargetPageId` + 내부 헬퍼)
- Test: `src/lib/sitemap.test.ts` (describe 추가)

**Interfaces:**
- Consumes: `SitemapNode`(`{ id, title, slug, path, parentId?, order, children?, pageId, isHome?, isCategory? }`).
- Produces: `function resolveTargetPageId(sitemap: SitemapNode[], nodeId: string): string`.

- [ ] **Step 1: 실패 테스트 작성** — `src/lib/sitemap.test.ts` 끝에 추가(없으면 새 describe). 파일 상단 import에 `resolveTargetPageId` 포함.

```ts
import { resolveTargetPageId } from "./sitemap";
import type { SitemapNode } from "./types";

function n(
  id: string,
  opts: { category?: boolean; children?: SitemapNode[] } = {},
): SitemapNode {
  return {
    id, title: id, slug: id, path: "/" + id, order: 0,
    visibleInHeader: true, visibleInFooter: false, pageId: "p-" + id,
    isCategory: opts.category, children: opts.children,
  };
}

describe("resolveTargetPageId", () => {
  it("비-카테고리 노드는 자기 pageId", () => {
    const tree = [n("a"), n("b")];
    expect(resolveTargetPageId(tree, "a")).toBe("p-a");
  });

  it("카테고리는 첫 비-카테고리 하위의 pageId", () => {
    const tree = [n("svc", { category: true, children: [n("intro"), n("qna")] })];
    expect(resolveTargetPageId(tree, "svc")).toBe("p-intro");
  });

  it("카테고리 체인은 더 내려가 첫 콘텐츠 페이지", () => {
    const tree = [
      n("c1", { category: true, children: [
        n("c2", { category: true, children: [n("leaf")] }),
      ] }),
    ];
    expect(resolveTargetPageId(tree, "c1")).toBe("p-leaf");
  });

  it("비-카테고리 하위가 없는 카테고리는 자기 pageId로 폴백", () => {
    const tree = [n("empty", { category: true, children: [n("onlycat", { category: true })] })];
    expect(resolveTargetPageId(tree, "empty")).toBe("p-empty");
    const tree2 = [n("lonecat", { category: true })];
    expect(resolveTargetPageId(tree2, "lonecat")).toBe("p-lonecat");
  });

  it("없는 nodeId는 입력을 반환", () => {
    expect(resolveTargetPageId([n("a")], "zzz")).toBe("zzz");
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run src/lib/sitemap.test.ts`
Expected: FAIL — `resolveTargetPageId` 없음.

- [ ] **Step 3a: 타입 필드 추가** — `src/lib/types.ts`의 `SitemapNode`에서 `isHome?: boolean;` 줄 바로 다음에 추가

```ts
  isCategory?: boolean; // true면 자체 콘텐츠 없이 첫 하위 콘텐츠 페이지로 보냄(섹션 랜딩)
```

- [ ] **Step 3b: 헬퍼 구현** — `src/lib/sitemap.ts` 끝에 추가

```ts
// id로 노드 찾기(트리 재귀).
function findNode(list: SitemapNode[], id: string): SitemapNode | undefined {
  for (const node of list) {
    if (node.id === id) return node;
    const found = node.children ? findNode(node.children, id) : undefined;
    if (found) return found;
  }
  return undefined;
}

// 전위(pre-order) 탐색으로 첫 '비-카테고리' 노드의 pageId. 없으면 undefined.
function firstContentDescendant(list: SitemapNode[]): string | undefined {
  for (const node of list) {
    if (!node.isCategory) return node.pageId;
    const deeper = firstContentDescendant(node.children ?? []);
    if (deeper) return deeper;
  }
  return undefined;
}

// 카테고리 노드가 실제로 보여줄 페이지 id. 카테고리가 아니면 자기 페이지,
// 카테고리면 첫 비-카테고리 하위, 그것도 없으면 자기 페이지로 폴백. 노드 없으면 입력 반환.
export function resolveTargetPageId(sitemap: SitemapNode[], nodeId: string): string {
  const node = findNode(sitemap, nodeId);
  if (!node) return nodeId;
  if (!node.isCategory) return node.pageId;
  return firstContentDescendant(node.children ?? []) ?? node.pageId;
}
```

- [ ] **Step 4: 통과 확인**

Run: `npx vitest run src/lib/sitemap.test.ts`
Expected: PASS (신규 5 + 기존 통과).

- [ ] **Step 5: 커밋**

```bash
git add src/lib/types.ts src/lib/sitemap.ts src/lib/sitemap.test.ts
git commit -m "feat: SitemapNode.isCategory + resolveTargetPageId (카테고리 TDD 1)"
```

---

### Task 2: store `setNodeCategory`

**Files:**
- Modify: `src/store/editor-store.ts` (EditorState 타입 + 액션)
- Modify: `src/store/editor-store.test.ts` (describe 추가)

**Interfaces:**
- Consumes: `updateNode(nodes, id, patch)`(기존 store 내부 헬퍼), `createSite`, `addSitemapNode`.
- Produces: `setNodeCategory(id: string, isCategory: boolean): void`.

- [ ] **Step 1: 실패 테스트 작성** — `src/store/editor-store.test.ts` 마지막 describe 뒤에 추가

```ts
describe("setNodeCategory", () => {
  it("노드의 isCategory를 켜고 끈다", () => {
    const id = store.getState().addSitemapNode({ title: "서비스", slug: "service" });
    store.getState().setNodeCategory(id, true);
    expect(store.getState().site!.sitemap.find((nn) => nn.id === id)!.isCategory).toBe(true);
    store.getState().setNodeCategory(id, false);
    expect(store.getState().site!.sitemap.find((nn) => nn.id === id)!.isCategory).toBe(false);
  });

  it("다른 노드에는 영향을 주지 않는다", () => {
    const homeId = store.getState().site!.sitemap[0].id;
    const id = store.getState().addSitemapNode({ title: "서비스", slug: "service" });
    store.getState().setNodeCategory(id, true);
    expect(store.getState().site!.sitemap.find((nn) => nn.id === homeId)!.isCategory).toBeUndefined();
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run src/store/editor-store.test.ts`
Expected: FAIL — `setNodeCategory` is not a function.

- [ ] **Step 3a: EditorState 타입에 시그니처 추가** — `src/store/editor-store.ts`, 액션 타입 블록의 `setActivePage: (pageId: string) => void;` 바로 다음 줄에 추가

```ts
  setNodeCategory: (id: string, isCategory: boolean) => void;
```

- [ ] **Step 3b: 액션 구현** — `src/store/editor-store.ts`, `setActivePage(pageId) { ... },` 액션 구현 바로 다음에 추가

```ts
    setNodeCategory(id, isCategory) {
      const site = get().site;
      if (!site) return;
      set({ site: { ...site, sitemap: updateNode(site.sitemap, id, { isCategory }) } });
    },
```

- [ ] **Step 4: 통과 확인**

Run: `npx vitest run src/store/editor-store.test.ts`
Expected: PASS (기존 + 신규 2).

- [ ] **Step 5: 타입검사 + 커밋**

```bash
npx tsc --noEmit
git add src/store/editor-store.ts src/store/editor-store.test.ts
git commit -m "feat: store setNodeCategory 액션 (카테고리 TDD 2)"
```

---

### Task 3: SitemapTree — 카테고리 토글 버튼 + 배지 + 제목 클릭 라우팅

**Files:**
- Modify: `src/components/left/SitemapTree.tsx`
- Modify: `src/app/editor.css` (배지/토글 스타일)
- Modify: `src/components/left/SitemapTree.test.tsx` (describe 추가)

**Interfaces:**
- Consumes: `resolveTargetPageId`(Task 1), `setNodeCategory`(Task 2), 기존 `setActivePage`, `SitemapNode` 타입.
- Produces: UI(다른 task 의존 export 없음).

- [ ] **Step 1: 실패 테스트 작성** — `src/components/left/SitemapTree.test.tsx`의 `describe("SitemapTree", ...)` 안 끝에 추가

```ts
  it("하위가 있는 노드에만 카테고리 토글 버튼이 보인다", () => {
    const svc = store.getState().addSitemapNode({ title: "서비스", slug: "service" });
    store.getState().addSitemapNode({ title: "소개", slug: "intro", parentId: svc });
    renderTree();
    expect(screen.getByRole("button", { name: "서비스 카테고리 지정" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "소개 카테고리 지정" })).toBeNull();
  });

  it("카테고리 토글이 isCategory를 켠다", () => {
    const svc = store.getState().addSitemapNode({ title: "서비스", slug: "service" });
    store.getState().addSitemapNode({ title: "소개", slug: "intro", parentId: svc });
    renderTree();
    fireEvent.click(screen.getByRole("button", { name: "서비스 카테고리 지정" }));
    expect(store.getState().site!.sitemap.find((nn) => nn.id === svc)!.isCategory).toBe(true);
  });

  it("카테고리 노드 제목 클릭은 첫 하위 페이지를 활성화한다", () => {
    const svc = store.getState().addSitemapNode({ title: "서비스", slug: "service" });
    const intro = store.getState().addSitemapNode({ title: "소개", slug: "intro", parentId: svc });
    store.getState().setNodeCategory(svc, true);
    const introPageId = store.getState().site!.sitemap
      .find((nn) => nn.id === svc)!
      .children!.find((c) => c.id === intro)!.pageId;
    renderTree();
    fireEvent.click(screen.getByRole("button", { name: "서비스" }));
    expect(store.getState().activePageId).toBe(introPageId);
  });

  it("카테고리 노드에는 카테고리 배지가 보인다", () => {
    const svc = store.getState().addSitemapNode({ title: "서비스", slug: "service" });
    store.getState().addSitemapNode({ title: "소개", slug: "intro", parentId: svc });
    store.getState().setNodeCategory(svc, true);
    const { container } = renderTree();
    expect(container.querySelector(".node-cat-badge")).not.toBeNull();
  });
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run src/components/left/SitemapTree.test.tsx`
Expected: FAIL — 토글 버튼/배지 없음, 카테고리 제목 클릭이 자기 페이지로 감.

- [ ] **Step 3a: import 추가** — `src/components/left/SitemapTree.tsx` 상단 import 구역에 추가

```ts
import { resolveTargetPageId } from "../../lib/sitemap";
import type { SitemapNode } from "../../lib/types";
```

- [ ] **Step 3b: SitemapTree가 SitemapRow에 sitemap 전달** — `<SitemapRow` 호출의 props에 추가(`flat={f}` 근처)

```tsx
                sitemap={sitemap}
```

- [ ] **Step 3c: SitemapRow props에 sitemap 추가** — `SitemapRow` 함수의 props 객체와 타입에 추가

props 구조분해에 `sitemap,` 추가, 타입에 다음 추가:

```ts
  sitemap: SitemapNode[];
```

- [ ] **Step 3d: 제목 클릭 라우팅 + 배지 + 토글 버튼** — `SitemapRow`의 `node-view` 마크업 수정

(1) 제목 버튼 onClick을 다음으로 교체:

```tsx
            <button
              type="button"
              className="node-title"
              onClick={() =>
                api.getState().setActivePage(
                  node.isCategory ? resolveTargetPageId(sitemap, node.id) : node.pageId,
                )
              }
            >
              {node.title}
            </button>
```

(2) `{node.isHome ? <span className="node-home-badge">대표</span> : null}` 바로 다음 줄에 카테고리 배지 추가:

```tsx
            {node.isCategory ? <span className="node-cat-badge">카테고리</span> : null}
```

(3) `<span className="node-actions">` 안 맨 앞(＋ 버튼 앞)에 카테고리 토글 버튼 추가(하위 있을 때만):

```tsx
              {node.children && node.children.length > 0 ? (
                <button
                  type="button"
                  className={`node-cat-toggle${node.isCategory ? " is-on" : ""}`}
                  aria-pressed={!!node.isCategory}
                  aria-label={`${node.title} 카테고리 ${node.isCategory ? "해제" : "지정"}`}
                  onClick={() => api.getState().setNodeCategory(node.id, !node.isCategory)}
                >
                  🗂
                </button>
              ) : null}
```

- [ ] **Step 4: CSS 추가** — `src/app/editor.css`의 `.node-home-badge { ... }` 규칙 바로 다음에 추가

```css
.node-cat-badge {
  font-size: 10px;
  background: var(--krds-color-light-gray-60, #58616a);
  color: #fff;
  border-radius: 3px;
  padding: 1px 4px;
}
.node-cat-toggle.is-on {
  background: var(--krds-color-light-primary-5, #eaf2fe);
  border-color: var(--krds-color-light-primary-50, #256ef4);
}
```

- [ ] **Step 5: 통과 + 전체 검증**

```bash
npx vitest run src/components/left/SitemapTree.test.tsx
npx vitest run
npx tsc --noEmit
npm run lint
```
Expected: 신규 4 + 기존 SitemapTree 테스트 PASS, 전체 PASS, tsc 0, lint 0.

- [ ] **Step 6: 빌드 + 헤드리스 시각 확인**

```bash
npm run build
```

`_verify-category.mjs`(루트에 생성·실행·삭제):

```js
import { chromium } from "playwright";
const exe = process.env.HOME + "/.cache/ms-playwright/chromium-1223/chrome-linux64/chrome";
const OUT = "/tmp/claude-1000/-mnt-data-project-jyj-KRDSmake/f65ad225-853f-4a4a-beee-38e9fa74fa36/scratchpad";
const b = await chromium.launch({ executablePath: exe });
const ctx = await b.newContext({ viewport: { width: 1400, height: 900 } });
const page = await ctx.newPage();
await page.addInitScript(() => { delete Crypto.prototype.randomUUID; });
await page.goto("http://localhost:17200", { waitUntil: "networkidle" });
await page.getByRole("tab", { name: /사이트맵/ }).click().catch(() => {});
// 루트 메뉴 + 하위 추가(편집모드는 저장으로 종료)
await page.getByRole("button", { name: "메뉴 추가" }).click();
await page.getByRole("button", { name: "저장" }).click();
// 하위 추가(호버 숨김 버튼도 opacity:0이라 playwright 클릭 가능)
await page.locator('button[aria-label="새 메뉴 하위 추가"]').first().click();
await page.getByRole("button", { name: "저장" }).click().catch(() => {});
await page.waitForTimeout(150);
// 카테고리 토글 클릭
const catBtn = page.locator('button[aria-label="새 메뉴 카테고리 지정"]').first();
const has = await catBtn.count();
if (has) await catBtn.click();
await page.waitForTimeout(150);
const badge = await page.locator(".node-cat-badge").count();
console.log("RESULT 카테고리토글버튼=", has, " 배지=", badge);
await page.screenshot({ path: `${OUT}/category.png`, fullPage: true });
await b.close();
```

실행:

```bash
cp _verify-category.mjs /mnt/data/project/jyj/KRDSmake/_verify-category.mjs 2>/dev/null
node /mnt/data/project/jyj/KRDSmake/_verify-category.mjs
rm -f /mnt/data/project/jyj/KRDSmake/_verify-category.mjs
```
Expected: `카테고리토글버튼= 1 배지= 1`. 스샷 Read로 새 메뉴 행에 🗂 토글 + "카테고리" 배지 육안 확인. (토글 버튼은 호버 시 노출되므로 클릭으로 활성화된 상태면 배지가 보임.)

- [ ] **Step 7: 커밋**

```bash
git add src/components/left/SitemapTree.tsx src/app/editor.css src/components/left/SitemapTree.test.tsx
git commit -m "feat: 사이트맵 카테고리 토글/배지 + 카테고리 제목클릭→첫하위 라우팅 (카테고리 TDD 3)"
```

---

### Task 4: 인수인계/메모리 갱신

**Files:**
- Modify: `docs/HANDOFF.md`
- Modify: 메모리 `krds-builder-progress.md` / `MEMORY.md`

- [ ] **Step 1: HANDOFF.md 갱신** — 카테고리 메뉴(4-5) 완료 섹션 추가: `isCategory` + `resolveTargetPageId` + 트리 토글/배지 + 제목클릭 첫하위 라우팅. 테스트 수 갱신. 후속: 익스포트 리다이렉트(Step 7), 브레드크럼/캔버스 카테고리 표현.
- [ ] **Step 2: 메모리 갱신** — 진행상황에 카테고리 메뉴 반영.
- [ ] **Step 3: 커밋**

```bash
git add docs/HANDOFF.md
git commit -m "docs: 인수인계 갱신 — 카테고리 메뉴 완료"
```

---

## Self-Review

**Spec coverage:**
- 모델 `isCategory?`(1:1 유지) → Task 1 ✅
- `resolveTargetPageId`(카테고리→첫 비카테고리 하위/체인 관통/폴백/없는노드) → Task 1 + 테스트 ✅
- store `setNodeCategory` → Task 2 ✅
- 토글 버튼(하위 있는 노드만) + aria-pressed + 배지 → Task 3 ✅
- 카테고리 제목 클릭 → 첫 하위 라우팅 → Task 3(onClick `resolveTargetPageId`) ✅
- 익스포트/브레드크럼은 범위 밖 → Task 4에 후속 기록 ✅

**Placeholder scan:** 없음(모든 코드/명령 구체값).

**Type consistency:** `resolveTargetPageId(sitemap, nodeId): string` — Task1 정의, Task3 사용 일치. `setNodeCategory(id, isCategory)` — Task2 정의, Task3 호출 일치. `SitemapNode.isCategory?` — Task1 추가, Task1·2·3에서 사용 일치.
