import type { SitemapNode } from "./types";

export type Crumb = { title: string; path: string; isHome: boolean };

// 루트~대상 노드까지의 경로(조상 체인). 없으면 null. (lnb.ts와 동일 패턴)
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

// 현재 페이지 노드의 브레드크럼 = 홈 + (루트 섹션~현재) 경로.
// 현재가 홈이거나 노드를 못 찾으면 빈 배열(렌더 안 함).
export function buildBreadcrumb(
  sitemap: SitemapNode[],
  currentNodeId: string,
): Crumb[] {
  const path = findPath(sitemap, currentNodeId);
  if (!path) return [];
  const current = path[path.length - 1];
  if (current.isHome) return [];
  const crumbs: Crumb[] = [];
  const home = sitemap.find((n) => n.isHome);
  if (home) crumbs.push({ title: home.title, path: home.path, isHome: true });
  for (const n of path) crumbs.push({ title: n.title, path: n.path, isHome: false });
  return crumbs;
}
