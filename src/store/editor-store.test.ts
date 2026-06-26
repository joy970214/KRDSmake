import { beforeEach, describe, expect, it } from "vitest";
import { createEditorStore, type EditorStore } from "./editor-store";
import { getComponent } from "../registry";

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

describe("setActivePage", () => {
  it("활성 페이지를 바꾼다", () => {
    const id = store.getState().addSitemapNode({ title: "A", slug: "a" });
    const pageId = store.getState().site!.sitemap.find((n) => n.id === id)!.pageId;
    store.getState().setActivePage(pageId);
    expect(store.getState().activePageId).toBe(pageId);
  });
});

describe("moveNode", () => {
  it("다른 부모 아래로 옮기면 path가 재계산된다", () => {
    const aId = store.getState().addSitemapNode({ title: "A", slug: "a" });
    const bId = store.getState().addSitemapNode({ title: "B", slug: "b" });

    store.getState().moveNode(bId, aId, 0); // b를 a의 자식으로

    const b = findInTree(store.getState().site!.sitemap, bId)!;
    expect(b.path).toBe("/a/b");
    expect(b.parentId).toBe(aId);
  });

  it("같은 부모 내에서 순서를 바꾼다", () => {
    const aId = store.getState().addSitemapNode({ title: "A", slug: "a" });
    const bId = store.getState().addSitemapNode({ title: "B", slug: "b" });
    // 루트 순서: home(0), a(1), b(2). b를 index 1로 → a 앞으로
    store.getState().moveNode(bId, undefined, 1);

    const ids = store.getState().site!.sitemap.map((n) => n.id);
    expect(ids.indexOf(bId)).toBeLessThan(ids.indexOf(aId));
  });

  it("자기 자손 아래로는 옮길 수 없다(순환 방지)", () => {
    const aId = store.getState().addSitemapNode({ title: "A", slug: "a" });
    const cId = store.getState().addSitemapNode({ title: "C", slug: "c", parentId: aId });
    expect(() => store.getState().moveNode(aId, cId, 0)).toThrow();
  });
});

describe("addComponent", () => {
  it("defaultProps 복사본으로 인스턴스를 만들어 페이지에 추가한다", () => {
    const pageId = store.getState().site!.pages[0].id;
    const instId = store.getState().addComponent(pageId, "button");

    const page = store.getState().site!.pages.find((p) => p.id === pageId)!;
    expect(page.components).toHaveLength(1);
    const inst = page.components[0];
    expect(inst.id).toBe(instId);
    expect(inst.componentDefinitionId).toBe("button");
    expect(inst.order).toBe(0);
    // defaultProps와 동등하되 동일 참조가 아니어야 한다(깊은 복사)
    const def = getComponent("button")!;
    expect(inst.props).toEqual(def.defaultProps);
    expect(inst.props).not.toBe(def.defaultProps);
  });

  it("끝에 추가하면 order가 증가한다", () => {
    const pageId = store.getState().site!.pages[0].id;
    store.getState().addComponent(pageId, "button");
    store.getState().addComponent(pageId, "page-title");

    const comps = store.getState().site!.pages.find((p) => p.id === pageId)!.components;
    expect(comps.map((c) => c.componentDefinitionId)).toEqual(["button", "page-title"]);
    expect(comps.map((c) => c.order)).toEqual([0, 1]);
  });

  it("index를 지정하면 그 위치에 삽입하고 order를 재부여한다", () => {
    const pageId = store.getState().site!.pages[0].id;
    store.getState().addComponent(pageId, "button"); // 0
    store.getState().addComponent(pageId, "table"); // 1
    store.getState().addComponent(pageId, "image", 1); // button, image, table

    const comps = store.getState().site!.pages.find((p) => p.id === pageId)!.components;
    expect(comps.map((c) => c.componentDefinitionId)).toEqual(["button", "image", "table"]);
    expect(comps.map((c) => c.order)).toEqual([0, 1, 2]);
  });

  it("두 인스턴스의 props는 서로 독립적이다", () => {
    const pageId = store.getState().site!.pages[0].id;
    const a = store.getState().addComponent(pageId, "button");
    const b = store.getState().addComponent(pageId, "button");
    const page = store.getState().site!.pages.find((p) => p.id === pageId)!;
    const ia = page.components.find((c) => c.id === a)!;
    const ib = page.components.find((c) => c.id === b)!;
    expect(ia.props).not.toBe(ib.props);
  });
});

describe("addComponent — 컨테이너(다단 레이아웃)", () => {
  it("container 정의를 추가하면 단 수만큼 빈 칼럼 배열로 초기화한다", () => {
    const pageId = store.getState().site!.pages[0].id;
    const id = store.getState().addComponent(pageId, "layout");

    const inst = store.getState().site!.pages.find((p) => p.id === pageId)!.components[0];
    expect(inst.id).toBe(id);
    expect(inst.columns).toEqual([[], []]); // 기본 2단
  });

  it("일반 컴포넌트는 columns를 갖지 않는다", () => {
    const pageId = store.getState().site!.pages[0].id;
    store.getState().addComponent(pageId, "button");
    const inst = store.getState().site!.pages.find((p) => p.id === pageId)!.components[0];
    expect(inst.columns).toBeUndefined();
  });
});

describe("addComponentToColumn", () => {
  it("레이아웃의 지정 칼럼에 자식을 추가하고 자식 id를 반환한다", () => {
    const pageId = store.getState().site!.pages[0].id;
    const layoutId = store.getState().addComponent(pageId, "layout");

    const childId = store.getState().addComponentToColumn(pageId, layoutId, 0, "button");

    const layout = store.getState().site!.pages.find((p) => p.id === pageId)!.components[0];
    expect(layout.columns![0]).toHaveLength(1);
    expect(layout.columns![1]).toHaveLength(0);
    const child = layout.columns![0][0];
    expect(child.id).toBe(childId);
    expect(child.componentDefinitionId).toBe("button");
    // defaultProps 깊은 복사
    expect(child.props).toEqual(getComponent("button")!.defaultProps);
    expect(child.props).not.toBe(getComponent("button")!.defaultProps);
  });

  it("같은 칼럼에 여러 자식을 순서대로 쌓고 index로 삽입한다", () => {
    const pageId = store.getState().site!.pages[0].id;
    const layoutId = store.getState().addComponent(pageId, "layout");
    store.getState().addComponentToColumn(pageId, layoutId, 0, "button"); // [button]
    store.getState().addComponentToColumn(pageId, layoutId, 0, "table"); // [button, table]
    store.getState().addComponentToColumn(pageId, layoutId, 0, "image", 1); // [button, image, table]

    const col = store.getState().site!.pages.find((p) => p.id === pageId)!.components[0]
      .columns![0];
    expect(col.map((c) => c.componentDefinitionId)).toEqual(["button", "image", "table"]);
  });
});

describe("setLayoutColumns", () => {
  const layoutOf = (pageId: string) =>
    store.getState().site!.pages.find((p) => p.id === pageId)!.components[0];

  it("단 수를 늘리면 빈 칼럼을 추가하고 props.columns도 동기화한다", () => {
    const pageId = store.getState().site!.pages[0].id;
    const layoutId = store.getState().addComponent(pageId, "layout");

    store.getState().setLayoutColumns(pageId, layoutId, 4);

    const layout = layoutOf(pageId);
    expect(layout.columns).toHaveLength(4);
    expect(layout.columns).toEqual([[], [], [], []]);
    expect(layout.props.columns).toBe(4);
  });

  it("단 수를 줄이면 넘치는 칼럼의 자식을 마지막 남는 칼럼으로 이동해 보존한다", () => {
    const pageId = store.getState().site!.pages[0].id;
    const layoutId = store.getState().addComponent(pageId, "layout");
    store.getState().setLayoutColumns(pageId, layoutId, 3); // 3단
    store.getState().addComponentToColumn(pageId, layoutId, 0, "button"); // col0
    store.getState().addComponentToColumn(pageId, layoutId, 2, "table"); // col2
    store.getState().addComponentToColumn(pageId, layoutId, 2, "image"); // col2

    store.getState().setLayoutColumns(pageId, layoutId, 2); // 2단으로 축소

    const layout = layoutOf(pageId);
    expect(layout.columns).toHaveLength(2);
    expect(layout.props.columns).toBe(2);
    // col0 그대로, col2의 자식들은 마지막 남는 칼럼(col1) 끝으로 이동
    expect(layout.columns![0].map((c) => c.componentDefinitionId)).toEqual(["button"]);
    expect(layout.columns![1].map((c) => c.componentDefinitionId)).toEqual(["table", "image"]);
  });

  it("2~4 범위를 벗어난 값은 무시한다", () => {
    const pageId = store.getState().site!.pages[0].id;
    const layoutId = store.getState().addComponent(pageId, "layout");

    store.getState().setLayoutColumns(pageId, layoutId, 1);
    expect(layoutOf(pageId).columns).toHaveLength(2);
    store.getState().setLayoutColumns(pageId, layoutId, 5);
    expect(layoutOf(pageId).columns).toHaveLength(2);
  });
});

describe("reorderComponent", () => {
  it("인스턴스를 지정 index로 옮기고 order를 재부여한다", () => {
    const pageId = store.getState().site!.pages[0].id;
    const a = store.getState().addComponent(pageId, "button");
    store.getState().addComponent(pageId, "table");
    const c = store.getState().addComponent(pageId, "image");
    // [button, table, image] → image를 맨 앞(0)으로
    store.getState().reorderComponent(pageId, c, 0);

    const comps = store.getState().site!.pages.find((p) => p.id === pageId)!.components;
    expect(comps.map((x) => x.id)).toEqual([c, a, comps[2].id]);
    expect(comps.map((x) => x.order)).toEqual([0, 1, 2]);
  });
});

describe("duplicateComponent", () => {
  it("새 id로 복제해 원본 바로 뒤에 삽입한다", () => {
    const pageId = store.getState().site!.pages[0].id;
    const a = store.getState().addComponent(pageId, "button");
    store.getState().addComponent(pageId, "table");
    store.getState().updateComponentProps(pageId, a, { label: "원본" });

    const dup = store.getState().duplicateComponent(pageId, a);

    const comps = store.getState().site!.pages.find((p) => p.id === pageId)!.components;
    expect(comps.map((c) => c.id)).toEqual([a, dup, comps[2].id]);
    const dupInst = comps.find((c) => c.id === dup)!;
    expect(dupInst.id).not.toBe(a);
    expect(dupInst.props.label).toBe("원본");
    // 깊은 복사라 원본 props와 참조가 달라야 한다
    const orig = comps.find((c) => c.id === a)!;
    expect(dupInst.props).not.toBe(orig.props);
    expect(comps.map((c) => c.order)).toEqual([0, 1, 2]);
  });
});

describe("removeComponent", () => {
  it("인스턴스를 제거하고 order를 재부여한다", () => {
    const pageId = store.getState().site!.pages[0].id;
    const a = store.getState().addComponent(pageId, "button");
    const b = store.getState().addComponent(pageId, "table");
    store.getState().removeComponent(pageId, a);

    const comps = store.getState().site!.pages.find((p) => p.id === pageId)!.components;
    expect(comps.map((c) => c.id)).toEqual([b]);
    expect(comps[0].order).toBe(0);
  });

  it("선택된 인스턴스를 제거하면 선택이 해제된다", () => {
    const pageId = store.getState().site!.pages[0].id;
    const a = store.getState().addComponent(pageId, "button");
    store.getState().selectComponent(pageId, a);
    store.getState().removeComponent(pageId, a);
    expect(store.getState().selection).toBeNull();
  });

  it("레이아웃 칼럼 안의 자식도 재귀로 찾아 제거하고 order를 재부여한다", () => {
    const pageId = store.getState().site!.pages[0].id;
    const layoutId = store.getState().addComponent(pageId, "layout");
    const child1 = store.getState().addComponentToColumn(pageId, layoutId, 0, "button");
    store.getState().addComponentToColumn(pageId, layoutId, 0, "table");

    store.getState().removeComponent(pageId, child1);

    const layout = store.getState().site!.pages.find((p) => p.id === pageId)!.components[0];
    expect(layout.id).toBe(layoutId); // 레이아웃 자체는 유지
    expect(layout.columns![0].map((c) => c.componentDefinitionId)).toEqual(["table"]);
    expect(layout.columns![0][0].order).toBe(0);
  });

  it("선택된 칼럼 자식을 제거하면 선택이 해제된다", () => {
    const pageId = store.getState().site!.pages[0].id;
    const layoutId = store.getState().addComponent(pageId, "layout");
    const child = store.getState().addComponentToColumn(pageId, layoutId, 1, "button");
    store.getState().selectComponent(pageId, child);
    store.getState().removeComponent(pageId, child);
    expect(store.getState().selection).toBeNull();
  });
});

describe("toggleHidden", () => {
  it("hidden을 토글한다", () => {
    const pageId = store.getState().site!.pages[0].id;
    const a = store.getState().addComponent(pageId, "button");
    store.getState().toggleHidden(pageId, a);
    let inst = store.getState().site!.pages.find((p) => p.id === pageId)!.components[0];
    expect(inst.hidden).toBe(true);
    store.getState().toggleHidden(pageId, a);
    inst = store.getState().site!.pages.find((p) => p.id === pageId)!.components[0];
    expect(inst.hidden).toBe(false);
  });
});

describe("updateComponentProps", () => {
  it("props를 병합한다", () => {
    const pageId = store.getState().site!.pages[0].id;
    const a = store.getState().addComponent(pageId, "button");
    store.getState().updateComponentProps(pageId, a, { label: "확인" });
    const inst = store.getState().site!.pages.find((p) => p.id === pageId)!.components[0];
    expect(inst.props.label).toBe("확인");
  });
});

describe("selectComponent / clearSelection", () => {
  it("컴포넌트를 선택하고 해제한다", () => {
    const pageId = store.getState().site!.pages[0].id;
    const a = store.getState().addComponent(pageId, "button");
    store.getState().selectComponent(pageId, a);
    expect(store.getState().selection).toEqual({
      kind: "component",
      pageId,
      instanceId: a,
    });
    store.getState().clearSelection();
    expect(store.getState().selection).toBeNull();
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
