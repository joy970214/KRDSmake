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
