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
