import { describe, expect, it } from "vitest";
import { flattenTree, slugify, getProjectedDrop } from "./tree-dnd";
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
