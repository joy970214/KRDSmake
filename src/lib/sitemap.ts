import type { SitemapNode } from "./types";

// 부모 경로 아래에 slug를 이어붙인다. 루트("/")는 슬래시 중복 없이 처리.
export function joinPath(parentPath: string, slug: string): string {
  return parentPath === "/" ? `/${slug}` : `${parentPath}/${slug}`;
}

// 사이트맵 트리의 모든 노드 path를 조상 slug 기반으로 재계산(불변 업데이트).
// 홈 노드는 항상 "/". 설계 불변식 2·3.
export function recomputePaths(nodes: SitemapNode[]): SitemapNode[] {
  const walk = (list: SitemapNode[], parentPath: string): SitemapNode[] =>
    list.map((n, i) => {
      const path = n.isHome ? "/" : joinPath(parentPath, n.slug);
      // order는 형제 내 위치 기반 파생값으로 함께 갱신
      return {
        ...n,
        path,
        order: i,
        children: n.children ? walk(n.children, path) : n.children,
      };
    });
  return walk(nodes, "/");
}

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
