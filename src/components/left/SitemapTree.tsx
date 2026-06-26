"use client";

import { useState } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragMoveEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { flattenTree, slugify, getProjectedDrop } from "../../lib/tree-dnd";
import { useEditorState, useEditorStoreApi } from "../../store/context";
import { resolveTargetPageId } from "../../lib/sitemap";
import type { SitemapNode } from "../../lib/types";

// 투영된 parentId의 깊이 = 들여쓰기 칸 수(루트=0). 인디케이터 위치용.
function indicatorDepthFor(
  flat: import("../../lib/tree-dnd").FlatNode[],
  proj: { parentId: string | undefined; index: number },
): number {
  if (!proj.parentId) return 0;
  const parent = flat.find((f) => f.id === proj.parentId);
  return parent ? parent.depth + 1 : 0;
}

export function SitemapTree() {
  const sitemap = useEditorState((s) => s.site?.sitemap ?? []);
  const activePageId = useEditorState((s) => s.activePageId);
  const api = useEditorStoreApi();
  // 방금 추가돼 편집모드로 열 노드 id
  const [editingId, setEditingId] = useState<string | null>(null);

  const flat = flattenTree(sitemap);

  const INDENT = 14;
  const [activeId, setActiveId] = useState<string | null>(null);
  const [offsetX, setOffsetX] = useState(0);
  const [overId, setOverId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const projected =
    activeId && overId ? getProjectedDrop(flat, activeId, overId, offsetX, INDENT) : null;

  const onDragStart = (e: DragStartEvent) => {
    setActiveId(String(e.active.id));
    setOverId(String(e.active.id));
    setOffsetX(0);
  };
  const onDragMove = (e: DragMoveEvent) => {
    setOffsetX(e.delta.x);
    setOverId(e.over ? String(e.over.id) : null);
  };
  const onDragEnd = (e: DragEndEvent) => {
    const id = String(e.active.id);
    const over = e.over ? String(e.over.id) : null;
    const proj = over ? getProjectedDrop(flat, id, over, e.delta.x, INDENT) : null;
    setActiveId(null);
    setOverId(null);
    setOffsetX(0);
    if (proj) {
      try {
        api.getState().moveNode(id, proj.parentId, proj.index);
      } catch {
        /* 자기/자손 아래 이동 등은 무시 */
      }
    }
  };

  // 새 노드 추가 후 즉시 편집모드. slug 기본은 menu-<전체노드수+1>.
  const addNew = (parentId?: string) => {
    const n = flattenTree(api.getState().site?.sitemap ?? []).length + 1;
    const id = api.getState().addSitemapNode({ title: "새 메뉴", slug: `menu-${n}`, parentId });
    setEditingId(id);
  };

  return (
    <div>
      <div className="panel-head">
        <strong>사이트맵</strong>
        <button type="button" onClick={() => addNew()} aria-label="메뉴 추가" className="krds-btn small">
          ＋ 메뉴 추가
        </button>
      </div>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={onDragStart}
        onDragMove={onDragMove}
        onDragEnd={onDragEnd}
        onDragCancel={() => {
          setActiveId(null);
          setOverId(null);
        }}
      >
        <SortableContext items={flat.map((f) => f.id)} strategy={verticalListSortingStrategy}>
          <ul className="sitemap-tree">
            {flat.map((f) => (
              <SitemapRow
                key={f.id}
                flat={f}
                sitemap={sitemap}
                indent={INDENT}
                active={f.node.pageId === activePageId}
                editing={editingId === f.id}
                showIndicator={!!activeId && overId === f.id && !!projected}
                indicatorDepth={projected ? indicatorDepthFor(flat, projected) : 0}
                startEdit={() => setEditingId(f.id)}
                stopEdit={() => setEditingId(null)}
                addChild={() => addNew(f.id)}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>
    </div>
  );
}

function SitemapRow({
  flat,
  sitemap,
  indent,
  active,
  editing,
  showIndicator,
  indicatorDepth,
  startEdit,
  stopEdit,
  addChild,
}: {
  flat: import("../../lib/tree-dnd").FlatNode;
  sitemap: SitemapNode[];
  indent: number;
  active: boolean;
  editing: boolean;
  showIndicator: boolean;
  indicatorDepth: number;
  startEdit: () => void;
  stopEdit: () => void;
  addChild: () => void;
}) {
  const api = useEditorStoreApi();
  const node = flat.node;
  const [title, setTitle] = useState(node.title);
  const [slug, setSlug] = useState(node.slug);
  const [slugDirty, setSlugDirty] = useState(false);
  const { setNodeRef, setActivatorNodeRef, listeners, attributes, transform, transition, isDragging } =
    useSortable({ id: flat.id });

  const onTitle = (v: string) => {
    setTitle(v);
    if (!slugDirty) {
      const s = slugify(v);
      if (s) setSlug(s); // 변환 가능할 때만 자동(한글이면 기존 유지)
    }
  };
  const save = () => {
    api.getState().renameNode(node.id, { title, slug });
    stopEdit();
  };

  return (
    <li
      ref={setNodeRef}
      className="sitemap-row-li"
      style={{
        paddingLeft: flat.depth * indent,
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
      }}
    >
      {showIndicator ? (
        <div className="drop-indicator" style={{ marginLeft: indicatorDepth * indent }} />
      ) : null}
      <div className={`node-row${active ? " is-active" : ""}`}>
        {editing ? (
          <span className="node-edit">
            <input
              aria-label="제목"
              autoFocus
              value={title}
              onChange={(e) => onTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") save();
                if (e.key === "Escape") stopEdit();
              }}
            />
            <input
              aria-label="slug"
              value={slug}
              disabled={node.isHome}
              placeholder="slug"
              onChange={(e) => {
                setSlugDirty(true);
                setSlug(e.target.value);
              }}
            />
            <button type="button" onClick={save} aria-label="저장">
              저장
            </button>
          </span>
        ) : (
          <span className="node-view">
            <button
              type="button"
              ref={setActivatorNodeRef}
              className="node-grip"
              aria-label={`${node.title} 이동`}
              {...attributes}
              {...listeners}
            >
              ⠿
            </button>
            <button
              type="button"
              className="node-title"
              onClick={() =>
                api.getState().setActivePage(
                  node.isCategory ? resolveTargetPageId(sitemap, node.id) : node.pageId,
                )
              }
            >
              {node.title}
            </button>
            {node.isHome ? <span className="node-home-badge">대표</span> : null}
            {node.isCategory ? <span className="node-cat-badge">카테고리</span> : null}
            <code className="node-path">{node.path}</code>
            <span className="node-actions">
              {node.children && node.children.length > 0 ? (
                <button
                  type="button"
                  className={`node-cat-toggle${node.isCategory ? " is-on" : ""}`}
                  aria-pressed={!!node.isCategory}
                  aria-label={`${node.title} 카테고리 ${node.isCategory ? "해제" : "지정"}`}
                  onClick={() => api.getState().setNodeCategory(node.id, !node.isCategory)}
                >
                  🗂
                </button>
              ) : null}
              <button type="button" onClick={addChild} aria-label={`${node.title} 하위 추가`}>
                ＋
              </button>
              <button
                type="button"
                onClick={() => {
                  setTitle(node.title);
                  setSlug(node.slug);
                  setSlugDirty(false);
                  startEdit();
                }}
                aria-label={`${node.title} 이름변경`}
              >
                ✎
              </button>
              {!node.isHome ? (
                <button
                  type="button"
                  onClick={() => api.getState().setHome(node.id)}
                  aria-label={`${node.title} 홈지정`}
                >
                  홈으로
                </button>
              ) : null}
              {!node.isHome ? (
                <button
                  type="button"
                  onClick={() => api.getState().deleteNode(node.id)}
                  aria-label={`${node.title} 삭제`}
                >
                  ✕
                </button>
              ) : null}
            </span>
          </span>
        )}
      </div>
    </li>
  );
}
