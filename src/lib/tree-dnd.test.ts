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
