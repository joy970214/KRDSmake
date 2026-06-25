import { beforeEach, describe, expect, it } from "vitest";
import { createEditorStore, type EditorStore } from "./editor-store";

let store: EditorStore;
beforeEach(() => {
  store = createEditorStore();
  store.getState().createSite("테스트 사이트");
});

describe("createSite", () => {
  it("사이트를 만들고 홈을 활성 페이지로 둔다", () => {
    const s = store.getState();
    expect(s.site?.name).toBe("테스트 사이트");
    expect(s.activePageId).toBe(s.site?.pages[0].id);
  });
});

describe("addSitemapNode", () => {
  it("노드와 1:1 페이지를 함께 만든다", () => {
    const id = store.getState().addSitemapNode({ title: "서비스", slug: "service" });
    const s = store.getState();
    const node = s.site!.sitemap.find((n) => n.id === id)!;
    expect(node.path).toBe("/service");
    const page = s.site!.pages.find((p) => p.id === node.pageId)!;
    expect(page.sitemapNodeId).toBe(node.id);
    expect(s.site!.pages).toHaveLength(2); // 홈 + 서비스
  });

  it("부모 아래 중첩 노드의 path를 조상 slug로 계산한다", () => {
    const parentId = store.getState().addSitemapNode({ title: "서비스", slug: "service" });
    const childId = store
      .getState()
      .addSitemapNode({ title: "소개", slug: "intro", parentId });
    const s = store.getState();
    const child = findInTree(s.site!.sitemap, childId)!;
    expect(child.path).toBe("/service/intro");
  });
});

describe("renameNode", () => {
  it("slug 변경 시 자손 path와 페이지 path가 함께 갱신된다", () => {
    const parentId = store.getState().addSitemapNode({ title: "서비스", slug: "service" });
    const childId = store
      .getState()
      .addSitemapNode({ title: "소개", slug: "intro", parentId });

    store.getState().renameNode(parentId, { slug: "biz" });

    const s = store.getState();
    const child = findInTree(s.site!.sitemap, childId)!;
    expect(child.path).toBe("/biz/intro");
    const childPage = s.site!.pages.find((p) => p.id === child.pageId)!;
    expect(childPage.path).toBe("/biz/intro"); // 페이지 path 동기화
  });
});

describe("deleteNode", () => {
  it("노드와 그 페이지를 함께 제거한다", () => {
    const id = store.getState().addSitemapNode({ title: "서비스", slug: "service" });
    const pageId = store.getState().site!.sitemap.find((n) => n.id === id)!.pageId;

    store.getState().deleteNode(id);

    const s = store.getState();
    expect(s.site!.sitemap.find((n) => n.id === id)).toBeUndefined();
    expect(s.site!.pages.find((p) => p.id === pageId)).toBeUndefined();
  });

  it("자손까지 연쇄 삭제한다", () => {
    const parentId = store.getState().addSitemapNode({ title: "서비스", slug: "service" });
    const childId = store
      .getState()
      .addSitemapNode({ title: "소개", slug: "intro", parentId });

    store.getState().deleteNode(parentId);

    const s = store.getState();
    expect(findInTree(s.site!.sitemap, childId)).toBeUndefined();
    expect(s.site!.pages).toHaveLength(1); // 홈만 남음
  });

  it("홈 노드는 삭제할 수 없다", () => {
    const homeId = store.getState().site!.sitemap[0].id;
    expect(() => store.getState().deleteNode(homeId)).toThrow();
  });
});

describe("setHome", () => {
  it("홈을 다른 노드로 바꾸면 새 홈 path가 '/', 이전 홈은 비-홈이 된다", () => {
    const oldHomeId = store.getState().site!.sitemap[0].id;
    const id = store.getState().addSitemapNode({ title: "메인", slug: "main" });

    store.getState().setHome(id);

    const s = store.getState();
    const newHome = s.site!.sitemap.find((n) => n.id === id)!;
    const oldHome = s.site!.sitemap.find((n) => n.id === oldHomeId)!;
    expect(newHome.isHome).toBe(true);
    expect(newHome.path).toBe("/");
    expect(oldHome.isHome).toBeFalsy();
    expect(oldHome.path).not.toBe("/");
  });
});

// 트리에서 id로 노드 찾기 (테스트 헬퍼)
function findInTree(
  nodes: import("../lib/types").SitemapNode[],
  id: string,
): import("../lib/types").SitemapNode | undefined {
  for (const n of nodes) {
    if (n.id === id) return n;
    if (n.children) {
      const f = findInTree(n.children, id);
      if (f) return f;
    }
  }
  return undefined;
}
