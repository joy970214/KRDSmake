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

function arrayMove<T>(arr: T[], from: number, to: number): T[] {
  const copy = arr.slice();
  const [item] = copy.splice(from, 1);
  copy.splice(to, 0, item);
  return copy;
}

// 활성 노드의 "자식"들을 후보에서 제거(자기 자손으로 드롭 못 하게). 활성 노드 자신은 남긴다.
function removeChildrenOf(flat: FlatNode[], ids: string[]): FlatNode[] {
  const exclude = new Set(ids);
  return flat.filter((item) => {
    if (item.parentId && exclude.has(item.parentId)) {
      if (item.node.children?.length) exclude.add(item.id);
      return false;
    }
    return true;
  });
}

// dnd-kit 트리 패턴: over 행 위치 + 수평 오프셋으로 들어갈 부모/뎁스/순서를 투영.
export function getProjectedDrop(
  flat: FlatNode[],
  activeId: string,
  overId: string,
  offsetX: number,
  indentationWidth: number,
): { parentId: string | undefined; index: number } | null {
  const items = removeChildrenOf(flat, [activeId]);
  const overIndex = items.findIndex((i) => i.id === overId);
  const activeIndex = items.findIndex((i) => i.id === activeId);
  if (overIndex < 0 || activeIndex < 0) return null;
  const activeItem = items[activeIndex];

  const newItems = arrayMove(items, activeIndex, overIndex);
  const previousItem = newItems[overIndex - 1];
  const nextItem = newItems[overIndex + 1];

  const dragDepth = Math.round(offsetX / indentationWidth);
  const projectedDepth = activeItem.depth + dragDepth;
  const maxDepth = previousItem ? previousItem.depth + 1 : 0;
  const minDepth = nextItem ? nextItem.depth : 0;
  let depth = projectedDepth;
  if (projectedDepth >= maxDepth) depth = maxDepth;
  else if (projectedDepth < minDepth) depth = minDepth;

  const parentId = getParentId();
  const index = newItems
    .slice(0, overIndex)
    .filter((i) => i.parentId === parentId).length;
  return { parentId, index };

  function getParentId(): string | undefined {
    if (depth === 0 || !previousItem) return undefined;
    if (depth === previousItem.depth) return previousItem.parentId;
    if (depth > previousItem.depth) return previousItem.id;
    const newParent = newItems
      .slice(0, overIndex)
      .reverse()
      .find((i) => i.depth === depth)?.parentId;
    return newParent ?? undefined;
  }
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
