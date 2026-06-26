import type { SitemapNode } from "./types";

export type LnbModel = {
  sectionTitle: string;
  items: SitemapNode[];
  activeNodeId: string;
};

// 루트~대상 노드까지의 경로(조상 체인). 없으면 null.
function findPath(nodes: SitemapNode[], id: string): SitemapNode[] | null {
  for (const node of nodes) {
    if (node.id === id) return [node];
    if (node.children) {
      const sub = findPath(node.children, id);
      if (sub) return [node, ...sub];
    }
  }
  return null;
}

// 현재 페이지의 사이트맵 노드 기준 LNB(좌측 메뉴) 모델.
// 최상위(depth-0) 섹션의 하위 트리를 메뉴로, 현재 노드를 강조. 표시할 게 없으면 null.
export function buildLnb(
  sitemap: SitemapNode[],
  currentNodeId: string,
): LnbModel | null {
  const path = findPath(sitemap, currentNodeId);
  if (!path) return null;
  const current = path[path.length - 1];
  if (current.isHome) return null;
  const section = path[0];
  const items = section.children ?? [];
  if (items.length === 0) return null;
  return { sectionTitle: section.title, items, activeNodeId: currentNodeId };
}
