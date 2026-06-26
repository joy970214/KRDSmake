# 사이트맵 트리 UI/UX 개편 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 사이트맵 트리에 드래그앤드롭 재배치(뎁스 변경 포함) + 현재 페이지 강조 + 호버 액션 정돈 + 추가 즉시 인라인 편집(slug 자동)을 더한다.

**Architecture:** 트리 DnD 로직을 순수 함수(`lib/tree-dnd.ts`: 평탄화 + 수평이동 뎁스투영 + slugify)로 분리해 TDD한다. `SitemapTree.tsx`를 평탄 리스트 기반으로 재작성하고, 트리 전용 `DndContext`+`SortableContext`로 드래그하면 투영 결과를 store `moveNode(id, parentId, index)`로 실행한다.

**Tech Stack:** React, Zustand, @dnd-kit/core·sortable·utilities(설치됨), vitest + @testing-library/react, Playwright(헤드리스 검증).

## Global Constraints

- 모든 단계 TDD(red→green), 자주 커밋.
- 테스트: 단일 파일 `npx vitest run <path>`, 전체 `npx vitest run`. 타입 `npx tsc --noEmit`. 린트 `npm run lint`. 빌드 `npm run build`.
- store 액션 시그니처(그대로 사용): `addSitemapNode({title,slug,parentId?}): string`(새 노드 id 반환), `renameNode(id,{title?,slug?})`, `moveNode(id, targetParentId: string|undefined, index)`(subtree 제거 후 targetParentId children에 index 삽입; 자기/자손 아래 이동 시 throw), `setHome(id)`, `deleteNode(id)`, `setActivePage(pageId)`.
- 비보안 컨텍스트 배포: secure-context 전용 API 금지. 새 id는 store(`newId`)가 생성 — 컴포넌트에서 직접 만들지 말 것.
- Korean 주석이 repo 관례. 기존 KRDS 토큰 변수(`--krds-color-*`) 사용.
- DnD 범위 = 재배치(부모변경)까지. 접근성: `KeyboardSensor` 추가(키보드 세로 재정렬 유지). 키보드 뎁스 변경은 후속.

---

### Task 1: `lib/tree-dnd.ts` — flattenTree + slugify

**Files:**
- Create: `src/lib/tree-dnd.ts`
- Test: `src/lib/tree-dnd.test.ts`

**Interfaces:**
- Consumes: `SitemapNode`(`src/lib/types.ts`: `{ id, title, slug, path, parentId?, order, children?, pageId, isHome? }`).
- Produces:
  - `type FlatNode = { id: string; parentId: string | undefined; depth: number; node: SitemapNode }`
  - `function flattenTree(nodes: SitemapNode[], parentId?: string, depth?: number): FlatNode[]`
  - `function slugify(title: string): string`

- [ ] **Step 1: 실패 테스트 작성** — `src/lib/tree-dnd.test.ts`

```ts
import { describe, expect, it } from "vitest";
import { flattenTree, slugify } from "./tree-dnd";
import type { SitemapNode } from "./types";

function node(id: string, children: SitemapNode[] = []): SitemapNode {
  return {
    id, title: id, slug: id, path: "/" + id, order: 0,
    visibleInHeader: true, visibleInFooter: false, pageId: "p-" + id,
    children: children.length ? children : undefined,
  };
}

describe("flattenTree", () => {
  it("표시 순서대로 id/parentId/depth를 평탄화한다", () => {
    // A, B(>B1,B2), C
    const tree = [node("A"), node("B", [node("B1"), node("B2")]), node("C")];
    const flat = flattenTree(tree);
    expect(flat.map((f) => [f.id, f.parentId, f.depth])).toEqual([
      ["A", undefined, 0],
      ["B", undefined, 0],
      ["B1", "B", 1],
      ["B2", "B", 1],
      ["C", undefined, 0],
    ]);
  });
});

describe("slugify", () => {
  it("영문/공백/대문자/특수문자를 정리한다", () => {
    expect(slugify("Hello World")).toBe("hello-world");
    expect(slugify("  Foo__Bar!! ")).toBe("foobar");
    expect(slugify("A - B")).toBe("a-b");
  });
  it("변환 불가(한글 등)면 빈 문자열", () => {
    expect(slugify("회사 소개")).toBe("");
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run src/lib/tree-dnd.test.ts`
Expected: FAIL — `./tree-dnd` 모듈 없음.

- [ ] **Step 3: 구현** — `src/lib/tree-dnd.ts`

```ts
import type { SitemapNode } from "./types";

export type FlatNode = {
  id: string;
  parentId: string | undefined;
  depth: number;
  node: SitemapNode;
};

// 트리를 표시 순서(깊이 우선)대로 평탄화. depth/parentId 부여.
export function flattenTree(
  nodes: SitemapNode[],
  parentId: string | undefined = undefined,
  depth = 0,
): FlatNode[] {
  return nodes.flatMap((node) => [
    { id: node.id, parentId, depth, node },
    ...flattenTree(node.children ?? [], node.id, depth + 1),
  ]);
}

// 제목 → URL slug(소문자·하이픈). 변환 불가(한글 등)면 "".
export function slugify(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}
```

- [ ] **Step 4: 통과 확인**

Run: `npx vitest run src/lib/tree-dnd.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: 커밋**

```bash
git add src/lib/tree-dnd.ts src/lib/tree-dnd.test.ts
git commit -m "feat: 트리 평탄화 + slugify 순수함수 (사이트맵UX TDD 1)"
```

---

### Task 2: `lib/tree-dnd.ts` — getProjectedDrop (드롭 위치 투영)

**Files:**
- Modify: `src/lib/tree-dnd.ts`
- Modify: `src/lib/tree-dnd.test.ts`

**Interfaces:**
- Consumes: `FlatNode`, `flattenTree`(Task 1).
- Produces:
  - `function getProjectedDrop(flat: FlatNode[], activeId: string, overId: string, offsetX: number, indentationWidth: number): { parentId: string | undefined; index: number } | null`
  - 반환 `index`는 `parentId`의 children 배열 내 삽입 위치(active 제거 후 기준) → 그대로 `moveNode(activeId, parentId, index)`에 전달.

- [ ] **Step 1: 실패 테스트 작성** — `src/lib/tree-dnd.test.ts` 끝에 추가

```ts
import { getProjectedDrop } from "./tree-dnd";

describe("getProjectedDrop", () => {
  // A, B(>B1,B2), C  (indentW=16)
  const tree = [node("A"), node("B", [node("B1"), node("B2")]), node("C")];
  const flat = flattenTree(tree);

  it("같은 레벨에서 A를 C 위로 끌면 루트 끝쪽으로 (parent=undefined)", () => {
    expect(getProjectedDrop(flat, "A", "C", 0, 16)).toEqual({ parentId: undefined, index: 2 });
  });

  it("A를 B 위로 한 칸 들여쓰면 B의 첫 자식이 된다", () => {
    expect(getProjectedDrop(flat, "A", "B", 16, 16)).toEqual({ parentId: "B", index: 0 });
  });

  it("B1을 B2 위로 한 칸 내어쓰면 루트로 빠진다(부모 변경)", () => {
    expect(getProjectedDrop(flat, "B1", "B2", -16, 16)).toEqual({ parentId: undefined, index: 2 });
  });

  it("자기 자손 위로는 드롭 불가(null)", () => {
    // B를 그 자식 B1 위로 → B1은 후보에서 제외되어 null
    expect(getProjectedDrop(flat, "B", "B1", 0, 16)).toBeNull();
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run src/lib/tree-dnd.test.ts`
Expected: FAIL — `getProjectedDrop` 없음.

- [ ] **Step 3: 구현** — `src/lib/tree-dnd.ts` 끝에 추가

```ts
function arrayMove<T>(arr: T[], from: number, to: number): T[] {
  const copy = arr.slice();
  const [item] = copy.splice(from, 1);
  copy.splice(to, 0, item);
  return copy;
}

// 활성 노드의 "자식"들을 후보에서 제거(자기 자손으로 드롭 못 하게). 활성 노드 자신은 남긴다.
function removeChildrenOf(flat: FlatNode[], ids: string[]): FlatNode[] {
  const exclude = new Set(ids);
  return flat.filter((item) => {
    if (item.parentId && exclude.has(item.parentId)) {
      if (item.node.children?.length) exclude.add(item.id);
      return false;
    }
    return true;
  });
}

// dnd-kit 트리 패턴: over 행 위치 + 수평 오프셋으로 들어갈 부모/뎁스/순서를 투영.
export function getProjectedDrop(
  flat: FlatNode[],
  activeId: string,
  overId: string,
  offsetX: number,
  indentationWidth: number,
): { parentId: string | undefined; index: number } | null {
  const items = removeChildrenOf(flat, [activeId]);
  const overIndex = items.findIndex((i) => i.id === overId);
  const activeIndex = items.findIndex((i) => i.id === activeId);
  if (overIndex < 0 || activeIndex < 0) return null;
  const activeItem = items[activeIndex];

  const newItems = arrayMove(items, activeIndex, overIndex);
  const previousItem = newItems[overIndex - 1];
  const nextItem = newItems[overIndex + 1];

  const dragDepth = Math.round(offsetX / indentationWidth);
  const projectedDepth = activeItem.depth + dragDepth;
  const maxDepth = previousItem ? previousItem.depth + 1 : 0;
  const minDepth = nextItem ? nextItem.depth : 0;
  let depth = projectedDepth;
  if (projectedDepth >= maxDepth) depth = maxDepth;
  else if (projectedDepth < minDepth) depth = minDepth;

  const parentId = getParentId();
  const index = newItems
    .slice(0, overIndex)
    .filter((i) => i.parentId === parentId).length;
  return { parentId, index };

  function getParentId(): string | undefined {
    if (depth === 0 || !previousItem) return undefined;
    if (depth === previousItem.depth) return previousItem.parentId;
    if (depth > previousItem.depth) return previousItem.id;
    const newParent = newItems
      .slice(0, overIndex)
      .reverse()
      .find((i) => i.depth === depth)?.parentId;
    return newParent ?? undefined;
  }
}
```

- [ ] **Step 4: 통과 확인**

Run: `npx vitest run src/lib/tree-dnd.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: 커밋**

```bash
git add src/lib/tree-dnd.ts src/lib/tree-dnd.test.ts
git commit -m "feat: 트리 드롭 위치 투영 getProjectedDrop (사이트맵UX TDD 2)"
```

---

### Task 3: `SitemapTree.tsx` 재작성 (비-DnD: 평탄렌더·활성강조·호버액션·추가즉시편집)

**Files:**
- Modify: `src/components/left/SitemapTree.tsx` (전면 재작성)
- Modify: `src/app/editor.css` (`.sitemap-tree`~`.node-edit` 블록 교체)
- Test: `src/components/left/SitemapTree.test.tsx` (신규)

**Interfaces:**
- Consumes: `flattenTree`, `slugify`(Task 1); store 액션; `useEditorState`/`useEditorStoreApi`.
- Produces: `SitemapTree` 컴포넌트(이 단계는 DnD 없음 — 평탄 리스트 렌더 + 행 동작). Task 4가 이 파일에 DnD를 덧붙인다.

- [ ] **Step 1: 실패 테스트 작성** — `src/components/left/SitemapTree.test.tsx`

```tsx
import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { createEditorStore, type EditorStore } from "../../store/editor-store";
import { EditorStoreProvider } from "../../store/context";
import { SitemapTree } from "./SitemapTree";

let store: EditorStore;
beforeEach(() => {
  store = createEditorStore();
  store.getState().createSite("테스트");
});

function renderTree() {
  return render(
    <EditorStoreProvider store={store}>
      <SitemapTree />
    </EditorStoreProvider>,
  );
}

describe("SitemapTree", () => {
  it("현재 활성 페이지 행에 is-active를 준다", () => {
    const { container } = renderTree();
    // 기본 활성=홈
    const homeId = store.getState().site!.pages[0].id;
    expect(store.getState().activePageId).toBe(homeId);
    expect(container.querySelector(".node-row.is-active")).not.toBeNull();
  });

  it("＋메뉴 추가하면 새 행이 즉시 편집모드(제목 input)로 뜬다", () => {
    renderTree();
    fireEvent.click(screen.getByRole("button", { name: "메뉴 추가" }));
    expect(screen.getByLabelText("제목")).toBeInTheDocument();
  });

  it("편집 중 제목을 입력하면 slug가 자동 생성된다", () => {
    renderTree();
    fireEvent.click(screen.getByRole("button", { name: "메뉴 추가" }));
    fireEvent.change(screen.getByLabelText("제목"), { target: { value: "About Us" } });
    expect((screen.getByLabelText("slug") as HTMLInputElement).value).toBe("about-us");
  });

  it("저장하면 renameNode가 반영된다", () => {
    renderTree();
    fireEvent.click(screen.getByRole("button", { name: "메뉴 추가" }));
    fireEvent.change(screen.getByLabelText("제목"), { target: { value: "About" } });
    fireEvent.click(screen.getByRole("button", { name: "저장" }));
    const titles = store.getState().site!.sitemap.map((n) => n.title);
    expect(titles).toContain("About");
  });

  it("제목 클릭은 그 페이지를 활성화한다", () => {
    const id = store.getState().addSitemapNode({ title: "서비스", slug: "service" });
    const pageId = store.getState().site!.sitemap.find((n) => n.id === id)!.pageId;
    renderTree();
    fireEvent.click(screen.getByRole("button", { name: "서비스" }));
    expect(store.getState().activePageId).toBe(pageId);
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run src/components/left/SitemapTree.test.tsx`
Expected: FAIL — 현재 구조엔 `.node-row.is-active` 없음 / 추가가 편집모드로 안 뜸 / slug 자동 없음.

- [ ] **Step 3: SitemapTree.tsx 재작성** — `src/components/left/SitemapTree.tsx` 전체를 다음으로 교체

```tsx
"use client";

import { useState } from "react";
import { flattenTree, slugify } from "../../lib/tree-dnd";
import { useEditorState, useEditorStoreApi } from "../../store/context";

export function SitemapTree() {
  const sitemap = useEditorState((s) => s.site?.sitemap ?? []);
  const activePageId = useEditorState((s) => s.activePageId);
  const api = useEditorStoreApi();
  // 방금 추가돼 편집모드로 열 노드 id
  const [editingId, setEditingId] = useState<string | null>(null);

  const flat = flattenTree(sitemap);

  // 새 노드 추가 후 즉시 편집모드. slug 기본은 menu-<전체노드수+1>.
  const addNew = (parentId?: string) => {
    const n = flattenTree(api.getState().site?.sitemap ?? []).length + 1;
    const id = api.getState().addSitemapNode({ title: "새 메뉴", slug: `menu-${n}`, parentId });
    setEditingId(id);
  };

  return (
    <div>
      <div className="panel-head">
        <strong>사이트맵</strong>
        <button type="button" onClick={() => addNew()} aria-label="메뉴 추가" className="krds-btn small">
          ＋ 메뉴 추가
        </button>
      </div>
      <ul className="sitemap-tree">
        {flat.map((f) => (
          <SitemapRow
            key={f.id}
            flat={f}
            active={f.node.pageId === activePageId}
            editing={editingId === f.id}
            startEdit={() => setEditingId(f.id)}
            stopEdit={() => setEditingId(null)}
            addChild={() => addNew(f.id)}
          />
        ))}
      </ul>
    </div>
  );
}

function SitemapRow({
  flat,
  active,
  editing,
  startEdit,
  stopEdit,
  addChild,
}: {
  flat: import("../../lib/tree-dnd").FlatNode;
  active: boolean;
  editing: boolean;
  startEdit: () => void;
  stopEdit: () => void;
  addChild: () => void;
}) {
  const api = useEditorStoreApi();
  const node = flat.node;
  const [title, setTitle] = useState(node.title);
  const [slug, setSlug] = useState(node.slug);
  const [slugDirty, setSlugDirty] = useState(false);

  const onTitle = (v: string) => {
    setTitle(v);
    if (!slugDirty) {
      const s = slugify(v);
      if (s) setSlug(s); // 변환 가능할 때만 자동(한글이면 기존 유지)
    }
  };
  const save = () => {
    api.getState().renameNode(node.id, { title, slug });
    stopEdit();
  };

  return (
    <li className="sitemap-row-li" style={{ paddingLeft: flat.depth * 14 }}>
      <div className={`node-row${active ? " is-active" : ""}`}>
        {editing ? (
          <span className="node-edit">
            <input
              aria-label="제목"
              autoFocus
              value={title}
              onChange={(e) => onTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") save();
                if (e.key === "Escape") stopEdit();
              }}
            />
            <input
              aria-label="slug"
              value={slug}
              disabled={node.isHome}
              placeholder="slug"
              onChange={(e) => {
                setSlugDirty(true);
                setSlug(e.target.value);
              }}
            />
            <button type="button" onClick={save} aria-label="저장">
              저장
            </button>
          </span>
        ) : (
          <span className="node-view">
            <span className="node-grip" aria-hidden="true">⠿</span>
            <button
              type="button"
              className="node-title"
              onClick={() => api.getState().setActivePage(node.pageId)}
            >
              {node.title}
            </button>
            {node.isHome ? <span className="node-home-badge">대표</span> : null}
            <code className="node-path">{node.path}</code>
            <span className="node-actions">
              <button type="button" onClick={addChild} aria-label={`${node.title} 하위 추가`}>
                ＋
              </button>
              <button
                type="button"
                onClick={() => {
                  setTitle(node.title);
                  setSlug(node.slug);
                  setSlugDirty(false);
                  startEdit();
                }}
                aria-label={`${node.title} 이름변경`}
              >
                ✎
              </button>
              {!node.isHome ? (
                <button
                  type="button"
                  onClick={() => api.getState().setHome(node.id)}
                  aria-label={`${node.title} 홈지정`}
                >
                  홈으로
                </button>
              ) : null}
              {!node.isHome ? (
                <button
                  type="button"
                  onClick={() => api.getState().deleteNode(node.id)}
                  aria-label={`${node.title} 삭제`}
                >
                  ✕
                </button>
              ) : null}
            </span>
          </span>
        )}
      </div>
    </li>
  );
}
```

- [ ] **Step 4: CSS 교체** — `src/app/editor.css`의 `/* 사이트맵 트리 */` 블록(`.sitemap-tree`부터 `.node-edit input`까지)을 다음으로 교체

```css
/* 사이트맵 트리 */
.sitemap-tree {
  list-style: none;
  margin: 0;
  padding: 0;
}
.sitemap-row-li {
  list-style: none;
}
.node-row {
  display: flex;
  align-items: center;
  padding: 4px 6px;
  border-radius: 4px;
  border-left: 2px solid transparent;
}
.node-row:hover {
  background: var(--krds-color-light-gray-10, #e6e8ea);
}
.node-row.is-active {
  background: var(--krds-color-light-primary-5, #eaf2fe);
  border-left-color: var(--krds-color-light-primary-50, #256ef4);
}
.node-view,
.node-edit {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
}
.node-grip {
  color: var(--krds-color-light-gray-40, #8a949e);
  cursor: grab;
  opacity: 0;
  font-size: 12px;
}
.node-row:hover .node-grip,
.node-row.is-active .node-grip {
  opacity: 1;
}
.node-title {
  border: 0;
  background: transparent;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  padding: 0;
  color: inherit;
}
.node-path {
  font-size: 11px;
  color: var(--krds-color-light-gray-50, #6d7882);
}
.node-home-badge {
  font-size: 10px;
  background: var(--krds-color-light-primary-50, #256ef4);
  color: #fff;
  border-radius: 3px;
  padding: 1px 4px;
}
/* 액션은 평소 숨김, 호버/선택 시 노출 */
.node-actions {
  margin-left: auto;
  display: flex;
  gap: 2px;
  opacity: 0;
  transition: opacity 0.12s;
}
.node-row:hover .node-actions,
.node-row.is-active .node-actions {
  opacity: 1;
}
.node-actions button {
  border: 1px solid var(--krds-color-light-gray-20, #cdd1d5);
  background: var(--krds-color-light-gray-0, #fff);
  border-radius: 4px;
  cursor: pointer;
  font-size: 11px;
  line-height: 1;
  padding: 3px 5px;
}
.node-edit input {
  border: 1px solid var(--krds-color-light-gray-30, #b1b8be);
  border-radius: 4px;
  padding: 3px 6px;
  font-size: 12px;
  width: 90px;
}
```

- [ ] **Step 5: 통과 + 검증**

```bash
npx vitest run src/components/left/SitemapTree.test.tsx
npx vitest run
npx tsc --noEmit
npm run lint
```
Expected: 신규 5 테스트 PASS, 전체 PASS, tsc 0, lint 0.

- [ ] **Step 6: 커밋**

```bash
git add src/components/left/SitemapTree.tsx src/components/left/SitemapTree.test.tsx src/app/editor.css
git commit -m "feat: 사이트맵 트리 재작성 — 활성강조/호버액션/추가즉시편집/slug자동 (사이트맵UX TDD 3)"
```

---

### Task 4: `SitemapTree.tsx` DnD 재배치 배선

**Files:**
- Modify: `src/components/left/SitemapTree.tsx` (DndContext/SortableContext/드래그핸들/투영/드롭인디케이터)
- Modify: `src/app/editor.css` (드롭 인디케이터/드래그 중 스타일 추가)

**Interfaces:**
- Consumes: `getProjectedDrop`, `flattenTree`(Task 1·2); store `moveNode`; dnd-kit.
- Produces: UI(다른 task 의존 export 없음).

- [ ] **Step 1: DnD 임포트 + 컨텍스트 배선** — `SitemapTree.tsx` 상단 import에 추가

```tsx
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragMoveEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { getProjectedDrop } from "../../lib/tree-dnd";
```

- [ ] **Step 2: SitemapTree 본문에 DnD 상태/핸들러 추가** — `SitemapTree` 컴포넌트의 `const flat = flattenTree(sitemap);` 아래에 추가

```tsx
  const INDENT = 14;
  const [activeId, setActiveId] = useState<string | null>(null);
  const [offsetX, setOffsetX] = useState(0);
  const [overId, setOverId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const projected =
    activeId && overId ? getProjectedDrop(flat, activeId, overId, offsetX, INDENT) : null;

  const onDragStart = (e: DragStartEvent) => {
    setActiveId(String(e.active.id));
    setOverId(String(e.active.id));
    setOffsetX(0);
  };
  const onDragMove = (e: DragMoveEvent) => {
    setOffsetX(e.delta.x);
    setOverId(e.over ? String(e.over.id) : null);
  };
  const onDragEnd = (e: DragEndEvent) => {
    const id = String(e.active.id);
    const over = e.over ? String(e.over.id) : null;
    const proj = over ? getProjectedDrop(flat, id, over, e.delta.x, INDENT) : null;
    setActiveId(null);
    setOverId(null);
    setOffsetX(0);
    if (proj) {
      try {
        api.getState().moveNode(id, proj.parentId, proj.index);
      } catch {
        /* 자기/자손 아래 이동 등은 무시 */
      }
    }
  };
```

- [ ] **Step 3: 렌더를 DndContext/SortableContext로 감싸기** — `SitemapTree`의 `return (...)` 안 `<ul className="sitemap-tree">...</ul>` 부분을 다음으로 교체

```tsx
      <DndContext
        sensors={sensors}
        onDragStart={onDragStart}
        onDragMove={onDragMove}
        onDragEnd={onDragEnd}
        onDragCancel={() => {
          setActiveId(null);
          setOverId(null);
        }}
      >
        <SortableContext items={flat.map((f) => f.id)} strategy={verticalListSortingStrategy}>
          <ul className="sitemap-tree">
            {flat.map((f) => (
              <SitemapRow
                key={f.id}
                flat={f}
                indent={INDENT}
                active={f.node.pageId === activePageId}
                editing={editingId === f.id}
                dropDepth={
                  activeId && projected && overId === f.id ? projected.parentId : undefined
                }
                showIndicator={!!activeId && overId === f.id && !!projected}
                indicatorDepth={projected ? indicatorDepthFor(flat, projected) : 0}
                startEdit={() => setEditingId(f.id)}
                stopEdit={() => setEditingId(null)}
                addChild={() => addNew(f.id)}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>
```

- [ ] **Step 4: 인디케이터 깊이 헬퍼 + SitemapRow에 useSortable/드래그핸들/인디케이터 추가**

`SitemapTree.tsx`에 헬퍼 추가(파일 내 아무 함수 밖, 예: SitemapTree 위):

```tsx
// 투영된 parentId의 깊이 = 들여쓰기 칸 수(루트=0). 인디케이터 위치용.
function indicatorDepthFor(
  flat: import("../../lib/tree-dnd").FlatNode[],
  proj: { parentId: string | undefined; index: number },
): number {
  if (!proj.parentId) return 0;
  const parent = flat.find((f) => f.id === proj.parentId);
  return parent ? parent.depth + 1 : 0;
}
```

`SitemapRow`의 시그니처에 props 추가하고 `useSortable`로 감싼다. `SitemapRow` 함수를 다음으로 교체:

```tsx
function SitemapRow({
  flat,
  indent,
  active,
  editing,
  showIndicator,
  indicatorDepth,
  startEdit,
  stopEdit,
  addChild,
}: {
  flat: import("../../lib/tree-dnd").FlatNode;
  indent: number;
  active: boolean;
  editing: boolean;
  dropDepth?: string | undefined;
  showIndicator: boolean;
  indicatorDepth: number;
  startEdit: () => void;
  stopEdit: () => void;
  addChild: () => void;
}) {
  const api = useEditorStoreApi();
  const node = flat.node;
  const [title, setTitle] = useState(node.title);
  const [slug, setSlug] = useState(node.slug);
  const [slugDirty, setSlugDirty] = useState(false);
  const { setNodeRef, setActivatorNodeRef, listeners, attributes, transform, transition, isDragging } =
    useSortable({ id: flat.id });

  const onTitle = (v: string) => {
    setTitle(v);
    if (!slugDirty) {
      const s = slugify(v);
      if (s) setSlug(s);
    }
  };
  const save = () => {
    api.getState().renameNode(node.id, { title, slug });
    stopEdit();
  };

  return (
    <li
      ref={setNodeRef}
      className="sitemap-row-li"
      style={{
        paddingLeft: flat.depth * indent,
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
      }}
    >
      {showIndicator ? (
        <div className="drop-indicator" style={{ marginLeft: indicatorDepth * indent }} />
      ) : null}
      <div className={`node-row${active ? " is-active" : ""}`}>
        {editing ? (
          <span className="node-edit">
            <input
              aria-label="제목"
              autoFocus
              value={title}
              onChange={(e) => onTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") save();
                if (e.key === "Escape") stopEdit();
              }}
            />
            <input
              aria-label="slug"
              value={slug}
              disabled={node.isHome}
              placeholder="slug"
              onChange={(e) => {
                setSlugDirty(true);
                setSlug(e.target.value);
              }}
            />
            <button type="button" onClick={save} aria-label="저장">
              저장
            </button>
          </span>
        ) : (
          <span className="node-view">
            <button
              type="button"
              ref={setActivatorNodeRef}
              className="node-grip"
              aria-label={`${node.title} 이동`}
              {...attributes}
              {...listeners}
            >
              ⠿
            </button>
            <button
              type="button"
              className="node-title"
              onClick={() => api.getState().setActivePage(node.pageId)}
            >
              {node.title}
            </button>
            {node.isHome ? <span className="node-home-badge">대표</span> : null}
            <code className="node-path">{node.path}</code>
            <span className="node-actions">
              <button type="button" onClick={addChild} aria-label={`${node.title} 하위 추가`}>
                ＋
              </button>
              <button
                type="button"
                onClick={() => {
                  setTitle(node.title);
                  setSlug(node.slug);
                  setSlugDirty(false);
                  startEdit();
                }}
                aria-label={`${node.title} 이름변경`}
              >
                ✎
              </button>
              {!node.isHome ? (
                <button
                  type="button"
                  onClick={() => api.getState().setHome(node.id)}
                  aria-label={`${node.title} 홈지정`}
                >
                  홈으로
                </button>
              ) : null}
              {!node.isHome ? (
                <button
                  type="button"
                  onClick={() => api.getState().deleteNode(node.id)}
                  aria-label={`${node.title} 삭제`}
                >
                  ✕
                </button>
              ) : null}
            </span>
          </span>
        )}
      </div>
    </li>
  );
}
```

주: `.node-grip`이 이제 `<span>`이 아니라 `<button>`(드래그 핸들). CSS의 `.node-grip` 규칙은 그대로 적용되며 버튼 기본 테두리/배경만 추가로 죽인다(아래 Step 5).

- [ ] **Step 5: 드롭 인디케이터 + 그립 버튼 CSS 추가** — `src/app/editor.css`의 `.node-edit input { ... }` 규칙 바로 뒤에 추가

```css
/* 드래그 핸들 버튼 기본 스타일 제거 */
button.node-grip {
  border: 0;
  background: transparent;
  padding: 0;
  line-height: 1;
}
/* 드롭 위치 인디케이터 선 */
.drop-indicator {
  height: 2px;
  background: var(--krds-color-light-primary-50, #256ef4);
  border-radius: 1px;
  margin: 0 0 2px;
}
```

- [ ] **Step 6: 통과 + 전체 검증**

```bash
npx vitest run src/components/left/SitemapTree.test.tsx
npx vitest run
npx tsc --noEmit
npm run lint
```
Expected: 기존 5 테스트 PASS(드래그 핸들 추가로 "제목" 클릭 동작 유지), 전체 PASS, tsc 0, lint 0.

- [ ] **Step 7: 빌드 + 헤드리스 실브라우저 검증(재배치)**

```bash
npm run build
```

`_verify-tree-dnd.mjs`(루트에 생성 후 실행·삭제):

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
// 루트 메뉴 2개 추가(각각 추가 후 편집모드 → 저장)
await page.getByRole("button", { name: "메뉴 추가" }).click();
await page.getByRole("button", { name: "저장" }).click();
await page.getByRole("button", { name: "메뉴 추가" }).click();
await page.getByRole("button", { name: "저장" }).click();
await page.waitForTimeout(150);
const grips = page.locator("button.node-grip");
const n0 = await grips.count();
// 두 번째 루트 그립을 첫 번째 루트 위로 + 우측으로(자식화) 드래그
const src = grips.nth(2); // [홈, 메뉴1, 메뉴2] → nth(2)=메뉴2
const dst = grips.nth(1); // 메뉴1
const sb = await src.boundingBox(), db = await dst.boundingBox();
await page.mouse.move(sb.x + sb.width / 2, sb.y + sb.height / 2);
await page.mouse.down();
await page.mouse.move(sb.x + 10, sb.y + 5, { steps: 3 });
await page.mouse.move(db.x + 40, db.y + db.height / 2, { steps: 10 }); // 우측으로 → 자식화
await page.mouse.move(db.x + 40, db.y + db.height / 2, { steps: 3 });
await page.mouse.up();
await page.waitForTimeout(250);
const depth1 = await page.locator(".sitemap-row-li").evaluateAll(
  (lis) => lis.map((li) => (li.style.paddingLeft || "0px")),
);
console.log("RESULT grips=", n0, "paddingLeft들=", JSON.stringify(depth1));
await page.screenshot({ path: `${OUT}/tree-dnd.png`, fullPage: true });
await b.close();
```

실행:

```bash
cp _verify-tree-dnd.mjs /mnt/data/project/jyj/KRDSmake/_verify-tree-dnd.mjs 2>/dev/null
node /mnt/data/project/jyj/KRDSmake/_verify-tree-dnd.mjs
rm -f /mnt/data/project/jyj/KRDSmake/_verify-tree-dnd.mjs
```
Expected: 드래그 후 한 행의 `paddingLeft`가 0이 아닌 값(들여쓰기=자식화됨). 스샷 Read로 육안 확인(메뉴2가 메뉴1 아래 자식으로 들여쓰기). 만약 자식화가 안 되면 드래그 수평 이동량/스텝을 키워 재시도.

- [ ] **Step 8: 커밋**

```bash
git add src/components/left/SitemapTree.tsx src/app/editor.css
git commit -m "feat: 사이트맵 트리 드래그앤드롭 재배치(뎁스 변경 포함) (사이트맵UX TDD 4)"
```

---

### Task 5: 인수인계/메모리 갱신

**Files:**
- Modify: `docs/HANDOFF.md`
- Modify: 메모리 `krds-builder-progress.md` / `MEMORY.md`

- [ ] **Step 1: HANDOFF.md 갱신** — 사이트맵 트리 개편(4-4) 완료 섹션 추가: DnD 재배치(`lib/tree-dnd.ts` 투영) + 활성강조 + 호버액션 + 추가즉시편집. 후속: 키보드 뎁스변경, 노드 접기.
- [ ] **Step 2: 메모리 갱신** — 진행상황에 사이트맵 트리 개편 반영, 테스트 수 갱신.
- [ ] **Step 3: 커밋**

```bash
git add docs/HANDOFF.md
git commit -m "docs: 인수인계 갱신 — 사이트맵 트리 UX 개편 완료"
```

---

## Self-Review

**Spec coverage:**
- ① DnD 재배치(뎁스 변경) → Task 2(`getProjectedDrop`) + Task 4(배선·헤드리스 검증) ✅
- ② 현재 페이지 강조 → Task 3(`.is-active` = `pageId===activePageId`) ✅
- ③ 시각적 정돈(호버 액션·드래그핸들·경로 흐리게) → Task 3(CSS opacity 전환) + Task 4(그립) ✅
- ④ 추가 즉시 인라인 편집 + slug 자동 → Task 3(`editingId`·autoFocus·`slugify`·`slugDirty`) ✅
- ↑↓ 제거 + KeyboardSensor → Task 3(버튼 제거) + Task 4(`KeyboardSensor`) ✅
- 순수 로직 분리 → Task 1·2(`lib/tree-dnd.ts`) ✅

**Placeholder scan:** 없음(모든 코드/명령 구체값). 더미 `countNodes`는 제거 완료(slug 번호는 `flattenTree(...).length`로 매김).

**Type consistency:** `FlatNode{id,parentId,depth,node}` — Task1 정의, Task3·4 사용 일치. `getProjectedDrop(...) → {parentId,index}|null` — Task2 정의, Task4가 `moveNode(id, proj.parentId, proj.index)`로 사용 일치. `slugify`/`flattenTree` 시그니처 일치.
