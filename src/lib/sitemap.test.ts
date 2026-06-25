import { describe, expect, it } from "vitest";
import { joinPath, recomputePaths } from "./sitemap";
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
