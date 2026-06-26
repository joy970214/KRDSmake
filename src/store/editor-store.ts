import { createStore, type StoreApi } from "zustand/vanilla";
import { newId } from "../lib/ids";
import { recomputePaths } from "../lib/sitemap";
import { createSite as makeSite } from "../lib/site-factory";
import { getComponent } from "../registry";
import type { ComponentInstance, Page, Site, SitemapNode } from "../lib/types";

// ---- 순수 트리 헬퍼 (store 액션 내부에서만 사용) ----

function flatten(nodes: SitemapNode[]): SitemapNode[] {
  return nodes.flatMap((n) => [n, ...(n.children ? flatten(n.children) : [])]);
}

function insertChild(
  nodes: SitemapNode[],
  parentId: string | undefined,
  child: SitemapNode,
): SitemapNode[] {
  if (!parentId) return [...nodes, child];
  return nodes.map((n) =>
    n.id === parentId
      ? { ...n, children: [...(n.children ?? []), child] }
      : n.children
        ? { ...n, children: insertChild(n.children, parentId, child) }
        : n,
  );
}

function findNode(nodes: SitemapNode[], id: string): SitemapNode | undefined {
  for (const n of nodes) {
    if (n.id === id) return n;
    if (n.children) {
      const f = findNode(n.children, id);
      if (f) return f;
    }
  }
  return undefined;
}

// 부모(없으면 루트)의 children 배열 index 위치에 child 삽입
function insertAt(
  nodes: SitemapNode[],
  parentId: string | undefined,
  child: SitemapNode,
  index: number,
): SitemapNode[] {
  if (!parentId) {
    const copy = [...nodes];
    copy.splice(index, 0, child);
    return copy;
  }
  return nodes.map((n) => {
    if (n.id === parentId) {
      const children = [...(n.children ?? [])];
      children.splice(index, 0, child);
      return { ...n, children };
    }
    return n.children ? { ...n, children: insertAt(n.children, parentId, child, index) } : n;
  });
}

function updateNode(
  nodes: SitemapNode[],
  id: string,
  patch: Partial<SitemapNode>,
): SitemapNode[] {
  return nodes.map((n) =>
    n.id === id
      ? { ...n, ...patch }
      : n.children
        ? { ...n, children: updateNode(n.children, id, patch) }
        : n,
  );
}

// id 노드(및 그 하위 트리)를 제거하고, 제거된 서브트리를 함께 반환
function removeSubtree(
  nodes: SitemapNode[],
  id: string,
): { nodes: SitemapNode[]; removed?: SitemapNode } {
  let removed: SitemapNode | undefined;
  const next: SitemapNode[] = [];
  for (const n of nodes) {
    if (n.id === id) {
      removed = n;
      continue;
    }
    if (n.children) {
      const r = removeSubtree(n.children, id);
      if (r.removed) removed = r.removed;
      next.push({ ...n, children: r.nodes });
    } else {
      next.push(n);
    }
  }
  return { nodes: next, removed };
}

// path 재계산 + 페이지 path 동기화(불변식 2). 모든 구조 변경 뒤 호출.
function syncSite(site: Site, sitemap: SitemapNode[]): Site {
  const recomputed = recomputePaths(sitemap);
  const byNodeId = new Map(flatten(recomputed).map((n) => [n.id, n]));
  const pages = site.pages.map((p) => {
    const node = byNodeId.get(p.sitemapNodeId);
    return node ? { ...p, path: node.path } : p;
  });
  return { ...site, sitemap: recomputed, pages };
}

// ---- 컴포넌트 인스턴스 헬퍼 ----

// 정의 id로 새 인스턴스 생성(defaultProps 깊은복사 + 컨테이너면 빈 칼럼 초기화).
function buildInstance(componentDefinitionId: string): ComponentInstance {
  const def = getComponent(componentDefinitionId);
  if (!def) throw new Error(`알 수 없는 컴포넌트: ${componentDefinitionId}`);
  const instance: ComponentInstance = {
    id: newId(),
    componentDefinitionId,
    props: structuredClone(def.defaultProps),
    order: 0, // renumber가 확정
  };
  if (def.container) {
    const count = Number(def.defaultProps[def.container.columnCountProp]) || 2;
    instance.columns = Array.from({ length: count }, () => []);
  }
  return instance;
}

// order를 배열 index와 동기화. 모든 components 변경 뒤 호출.
function renumber(components: ComponentInstance[]): ComponentInstance[] {
  return components.map((c, i) => (c.order === i ? c : { ...c, order: i }));
}

// id에 해당하는 인스턴스를 목록에서 제거(레이아웃 칼럼 안 자식까지 재귀).
// 같은 레벨에서 제거되면 renumber, 아니면 칼럼 안으로 내려가 탐색.
function removeFromList(
  components: ComponentInstance[],
  instanceId: string,
): ComponentInstance[] {
  if (components.some((c) => c.id === instanceId)) {
    return renumber(components.filter((c) => c.id !== instanceId));
  }
  return components.map((c) =>
    c.columns
      ? { ...c, columns: c.columns.map((col) => removeFromList(col, instanceId)) }
      : c,
  );
}

// pageId 페이지의 components를 fn으로 갱신(renumber까지)한 새 Site 반환
function updatePageComponents(
  site: Site,
  pageId: string,
  fn: (components: ComponentInstance[]) => ComponentInstance[],
): Site {
  return {
    ...site,
    pages: site.pages.map((p) =>
      p.id === pageId ? { ...p, components: renumber(fn(p.components)) } : p,
    ),
  };
}

// ---- store ----

export type Selection = { kind: "component"; pageId: string; instanceId: string };

export type EditorState = {
  site: Site | null;
  activePageId: string | null;
  selection: Selection | null;

  createSite: (name: string) => void;
  addSitemapNode: (input: { title: string; slug: string; parentId?: string }) => string;
  renameNode: (id: string, patch: { title?: string; slug?: string }) => void;
  deleteNode: (id: string) => void;
  setHome: (id: string) => void;
  moveNode: (id: string, targetParentId: string | undefined, index: number) => void;
  setActivePage: (pageId: string) => void;

  addComponent: (pageId: string, componentDefinitionId: string, index?: number) => string;
  addComponentToColumn: (
    pageId: string,
    layoutInstanceId: string,
    columnIndex: number,
    componentDefinitionId: string,
    index?: number,
  ) => string;
  setLayoutColumns: (pageId: string, layoutInstanceId: string, count: number) => void;
  reorderComponent: (pageId: string, instanceId: string, index: number) => void;
  duplicateComponent: (pageId: string, instanceId: string) => string;
  removeComponent: (pageId: string, instanceId: string) => void;
  toggleHidden: (pageId: string, instanceId: string) => void;
  updateComponentProps: (
    pageId: string,
    instanceId: string,
    patch: Record<string, unknown>,
  ) => void;
  selectComponent: (pageId: string, instanceId: string) => void;
  clearSelection: () => void;
};

export type EditorStore = StoreApi<EditorState>;

export function createEditorStore(): EditorStore {
  return createStore<EditorState>((set, get) => ({
    site: null,
    activePageId: null,
    selection: null,

    createSite(name) {
      const site = makeSite(name);
      set({ site, activePageId: site.pages[0].id });
    },

    addSitemapNode({ title, slug, parentId }) {
      const site = get().site;
      if (!site) throw new Error("사이트가 없습니다");

      const nodeId = newId();
      const pageId = newId();
      const siblingCount = parentId
        ? (flatten(site.sitemap).find((n) => n.id === parentId)?.children?.length ?? 0)
        : site.sitemap.length;

      const node: SitemapNode = {
        id: nodeId,
        title,
        slug,
        path: "",
        order: siblingCount,
        visibleInHeader: true,
        visibleInFooter: false,
        parentId,
        pageId,
      };
      const page: Page = {
        id: pageId,
        sitemapNodeId: nodeId,
        title,
        path: "",
        showBreadcrumb: false,
        showInPageNavigation: false,
        components: [],
      };

      const withNode: Site = {
        ...site,
        sitemap: insertChild(site.sitemap, parentId, node),
        pages: [...site.pages, page],
      };
      set({ site: syncSite(withNode, withNode.sitemap) });
      return nodeId;
    },

    renameNode(id, patch) {
      const site = get().site;
      if (!site) return;
      const sitemap = updateNode(site.sitemap, id, patch);
      // 제목 변경은 페이지 제목에도 반영
      const pages =
        patch.title !== undefined
          ? site.pages.map((p) =>
              p.sitemapNodeId === id ? { ...p, title: patch.title! } : p,
            )
          : site.pages;
      set({ site: syncSite({ ...site, pages }, sitemap) });
    },

    deleteNode(id) {
      const site = get().site;
      if (!site) return;
      const target = flatten(site.sitemap).find((n) => n.id === id);
      if (!target) return;
      if (target.isHome) throw new Error("홈 노드는 삭제할 수 없습니다");

      const { nodes, removed } = removeSubtree(site.sitemap, id);
      const removedPageIds = new Set(
        removed ? flatten([removed]).map((n) => n.pageId) : [],
      );
      const pages = site.pages.filter((p) => !removedPageIds.has(p.id));
      set({ site: syncSite({ ...site, pages }, nodes) });
    },

    setHome(id) {
      const site = get().site;
      if (!site) return;
      const prevHome = flatten(site.sitemap).find((n) => n.isHome);
      let sitemap = site.sitemap;
      if (prevHome && prevHome.id !== id) {
        // 이전 홈은 비-홈으로. slug가 비어있으면 충돌 방지용 slug 부여.
        sitemap = updateNode(sitemap, prevHome.id, {
          isHome: false,
          slug: prevHome.slug || "home",
        });
      }
      sitemap = updateNode(sitemap, id, { isHome: true, slug: "" });
      set({ site: syncSite(site, sitemap) });
    },

    moveNode(id, targetParentId, index) {
      const site = get().site;
      if (!site) return;
      const moving = findNode(site.sitemap, id);
      if (!moving) return;

      // 순환 방지: 대상 부모가 자기 자신/자손이면 불가
      const movingIds = new Set(flatten([moving]).map((n) => n.id));
      if (targetParentId && movingIds.has(targetParentId)) {
        throw new Error("자기 자신 또는 자손 아래로는 이동할 수 없습니다");
      }

      const { nodes, removed } = removeSubtree(site.sitemap, id);
      if (!removed) return;
      const moved: SitemapNode = { ...removed, parentId: targetParentId };
      const inserted = insertAt(nodes, targetParentId, moved, index);
      set({ site: syncSite(site, inserted) });
    },

    setActivePage(pageId) {
      set({ activePageId: pageId });
    },

    addComponent(pageId, componentDefinitionId, index) {
      const site = get().site;
      if (!site) throw new Error("사이트가 없습니다");

      const instance = buildInstance(componentDefinitionId);
      const next = updatePageComponents(site, pageId, (comps) => {
        const copy = [...comps];
        copy.splice(index ?? copy.length, 0, instance);
        return copy;
      });
      set({ site: next });
      return instance.id;
    },

    addComponentToColumn(pageId, layoutInstanceId, columnIndex, componentDefinitionId, index) {
      const site = get().site;
      if (!site) throw new Error("사이트가 없습니다");

      const child = buildInstance(componentDefinitionId);
      const next = updatePageComponents(site, pageId, (comps) =>
        comps.map((c) => {
          if (c.id !== layoutInstanceId || !c.columns) return c;
          const columns = c.columns.map((col, i) => {
            if (i !== columnIndex) return col;
            const copy = [...col];
            copy.splice(index ?? copy.length, 0, child);
            return renumber(copy);
          });
          return { ...c, columns };
        }),
      );
      set({ site: next });
      return child.id;
    },

    setLayoutColumns(pageId, layoutInstanceId, count) {
      if (count < 2 || count > 4) return; // KRDS 2~4단만 허용
      const site = get().site;
      if (!site) throw new Error("사이트가 없습니다");

      const next = updatePageComponents(site, pageId, (comps) =>
        comps.map((c) => {
          if (c.id !== layoutInstanceId || !c.columns) return c;
          const current = c.columns;
          if (count === current.length) return c;

          let columns: ComponentInstance[][];
          if (count > current.length) {
            // 확장: 빈 칼럼 추가
            const extra = Array.from({ length: count - current.length }, () => []);
            columns = [...current.map((col) => [...col]), ...extra];
          } else {
            // 축소: 넘치는 칼럼의 자식을 마지막 남는 칼럼으로 이동(보존)
            columns = current.slice(0, count).map((col) => [...col]);
            const overflow = current.slice(count).flat();
            columns[count - 1] = renumber([...columns[count - 1], ...overflow]);
          }
          return { ...c, columns, props: { ...c.props, columns: count } };
        }),
      );
      set({ site: next });
    },

    reorderComponent(pageId, instanceId, index) {
      const site = get().site;
      if (!site) return;
      set({
        site: updatePageComponents(site, pageId, (comps) => {
          const from = comps.findIndex((c) => c.id === instanceId);
          if (from === -1) return comps;
          const copy = [...comps];
          const [moved] = copy.splice(from, 1);
          copy.splice(index, 0, moved);
          return copy;
        }),
      });
    },

    duplicateComponent(pageId, instanceId) {
      const site = get().site;
      if (!site) throw new Error("사이트가 없습니다");
      const newInstId = newId();
      set({
        site: updatePageComponents(site, pageId, (comps) => {
          const i = comps.findIndex((c) => c.id === instanceId);
          if (i === -1) return comps;
          const src = comps[i];
          const clone: ComponentInstance = {
            ...src,
            id: newInstId,
            props: structuredClone(src.props),
          };
          const copy = [...comps];
          copy.splice(i + 1, 0, clone);
          return copy;
        }),
      });
      return newInstId;
    },

    removeComponent(pageId, instanceId) {
      const site = get().site;
      if (!site) return;
      const next = updatePageComponents(site, pageId, (comps) =>
        removeFromList(comps, instanceId),
      );
      const sel = get().selection;
      const clearSel = sel?.kind === "component" && sel.instanceId === instanceId;
      set({ site: next, ...(clearSel ? { selection: null } : {}) });
    },

    toggleHidden(pageId, instanceId) {
      const site = get().site;
      if (!site) return;
      set({
        site: updatePageComponents(site, pageId, (comps) =>
          comps.map((c) => (c.id === instanceId ? { ...c, hidden: !c.hidden } : c)),
        ),
      });
    },

    updateComponentProps(pageId, instanceId, patch) {
      const site = get().site;
      if (!site) return;
      set({
        site: updatePageComponents(site, pageId, (comps) =>
          comps.map((c) =>
            c.id === instanceId ? { ...c, props: { ...c.props, ...patch } } : c,
          ),
        ),
      });
    },

    selectComponent(pageId, instanceId) {
      set({ selection: { kind: "component", pageId, instanceId } });
    },

    clearSelection() {
      set({ selection: null });
    },
  }));
}
