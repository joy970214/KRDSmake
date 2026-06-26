// 캔버스 드래그앤드롭의 "어디에 꽂을지" 결정 — 순수 로직(테스트 용이).
// 실제 dnd-kit 배선(AppShell onDragEnd)은 이 결과를 store 액션으로 실행만 한다.

// 캔버스 본문 드롭 컨테이너 id (Canvas useDroppable / SortableContext와 공유).
export const CANVAS_DROPPABLE_ID = "canvas-page";
// 팔레트 카드 draggable id 접두사.
export const PALETTE_DRAG_PREFIX = "palette:";
// 레이아웃 칼럼 드롭 컨테이너 id 접두사.
export const COLUMN_DROPPABLE_PREFIX = "col:";

// 레이아웃 칼럼 droppable id 생성: col:<layoutId>:<colIndex>
export function columnDroppableId(layoutInstanceId: string, columnIndex: number): string {
  return `${COLUMN_DROPPABLE_PREFIX}${layoutInstanceId}:${columnIndex}`;
}

// col:<layoutId>:<colIndex> 파싱(아니면 null).
function parseColumnDroppableId(
  id: string,
): { layoutInstanceId: string; columnIndex: number } | null {
  if (!id.startsWith(COLUMN_DROPPABLE_PREFIX)) return null;
  const rest = id.slice(COLUMN_DROPPABLE_PREFIX.length);
  const sep = rest.lastIndexOf(":");
  if (sep < 0) return null;
  const layoutInstanceId = rest.slice(0, sep);
  const columnIndex = Number(rest.slice(sep + 1));
  if (!layoutInstanceId || !Number.isInteger(columnIndex) || columnIndex < 0) return null;
  return { layoutInstanceId, columnIndex };
}

export type DropPlan =
  | { kind: "add"; componentDefinitionId: string; index: number }
  | { kind: "move"; instanceId: string; index: number }
  | {
      kind: "add-to-column";
      layoutInstanceId: string;
      columnIndex: number;
      componentDefinitionId: string;
    }
  | null;

export function planDrop({
  activeId,
  componentDefinitionId,
  overId,
  componentIds,
}: {
  activeId: string;
  componentDefinitionId?: string;
  overId: string | null;
  componentIds: string[];
}): DropPlan {
  if (!overId) return null;

  // 레이아웃 칼럼에 드롭 — MVP는 팔레트→칼럼 추가만(인스턴스 이동은 후속).
  const col = parseColumnDroppableId(overId);
  if (col) {
    if (!activeId.startsWith(PALETTE_DRAG_PREFIX) || !componentDefinitionId) return null;
    return {
      kind: "add-to-column",
      layoutInstanceId: col.layoutInstanceId,
      columnIndex: col.columnIndex,
      componentDefinitionId,
    };
  }

  const overIndex =
    overId === CANVAS_DROPPABLE_ID
      ? componentIds.length
      : componentIds.indexOf(overId);
  if (overIndex < 0) return null;

  // 팔레트에서 새 컴포넌트 추가
  if (activeId.startsWith(PALETTE_DRAG_PREFIX)) {
    if (!componentDefinitionId) return null;
    return { kind: "add", componentDefinitionId, index: overIndex };
  }

  // 배치된 인스턴스 순서변경
  if (overId === activeId) return null;
  // 제거 후 삽입 기준 index로 보정(컨테이너=맨 끝, 그 외=대상 위치)
  const target = Math.min(overIndex, componentIds.length - 1);
  return { kind: "move", instanceId: activeId, index: target };
}
