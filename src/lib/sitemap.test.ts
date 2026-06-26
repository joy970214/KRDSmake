import { describe, expect, it } from "vitest";
import { joinPath, recomputePaths, resolveTargetPageId } from "./sitemap";
import type { SitemapNode } from "./types";

describe("joinPath", () => {
  it("루트 경로 아래 slug를 이어붙인다", () => {
    expect(joinPath("/", "service")).toBe("/service");
  });

  it("중첩 경로에 slug를 이어붙인다", () => {
    expect(joinPath("/service", "intro")).toBe("/service/intro");
  });
});

// 트리 빌더 헬퍼
function node(part: Partial<SitemapNode> & { id: string; slug: string }): SitemapNode {
  return {
    title: part.id,
    path: "",
    order: 0,
    visibleInHeader: true,
    visibleInFooter: false,
    pageId: `page-${part.id}`,
    ...part,
  };
}

describe("recomputePaths", () => {
  it("홈 노드는 path가 '/'", () => {
    const tree = [node({ id: "home", slug: "", isHome: true })];
    const result = recomputePaths(tree);
    expect(result[0].path).toBe("/");
  });

  it("최상위 비홈 노드는 '/slug'", () => {
    const tree = [node({ id: "svc", slug: "service" })];
    expect(recomputePaths(tree)[0].path).toBe("/service");
  });

  it("자손 path는 조상 slug들을 이어 계산한다", () => {
    const tree = [
      node({
        id: "svc",
        slug: "service",
        children: [node({ id: "intro", slug: "intro", parentId: "svc" })],
      }),
    ];
    const result = recomputePaths(tree);
    expect(result[0].path).toBe("/service");
    expect(result[0].children?.[0].path).toBe("/service/intro");
  });

  it("부모 slug가 바뀌면 자손 path가 함께 갱신된다", () => {
    const tree = [
      node({
        id: "svc",
        slug: "biz", // 변경됨
        children: [node({ id: "intro", slug: "intro", parentId: "svc" })],
      }),
    ];
    const result = recomputePaths(tree);
    expect(result[0].children?.[0].path).toBe("/biz/intro");
  });
});

// Test helper for resolveTargetPageId
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
