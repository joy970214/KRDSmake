"use client";

import { useState } from "react";
import { flattenTree, slugify } from "../../lib/tree-dnd";
import { useEditorState, useEditorStoreApi } from "../../store/context";

export function SitemapTree() {
  const sitemap = useEditorState((s) => s.site?.sitemap ?? []);
  const activePageId = useEditorState((s) => s.activePageId);
  const api = useEditorStoreApi();
  // 방금 추가돼 편집모드로 열 노드 id
  const [editingId, setEditingId] = useState<string | null>(null);

  const flat = flattenTree(sitemap);

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
      <ul className="sitemap-tree">
        {flat.map((f) => (
          <SitemapRow
            key={f.id}
            flat={f}
            active={f.node.pageId === activePageId}
            editing={editingId === f.id}
            startEdit={() => setEditingId(f.id)}
            stopEdit={() => setEditingId(null)}
            addChild={() => addNew(f.id)}
          />
        ))}
      </ul>
    </div>
  );
}

function SitemapRow({
  flat,
  active,
  editing,
  startEdit,
  stopEdit,
  addChild,
}: {
  flat: import("../../lib/tree-dnd").FlatNode;
  active: boolean;
  editing: boolean;
  startEdit: () => void;
  stopEdit: () => void;
  addChild: () => void;
}) {
  const api = useEditorStoreApi();
  const node = flat.node;
  const [title, setTitle] = useState(node.title);
  const [slug, setSlug] = useState(node.slug);
  const [slugDirty, setSlugDirty] = useState(false);

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
    <li className="sitemap-row-li" style={{ paddingLeft: flat.depth * 14 }}>
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
            <span className="node-grip" aria-hidden="true">⠿</span>
            <button
              type="button"
              className="node-title"
              onClick={() => api.getState().setActivePage(node.pageId)}
            >
              {node.title}
            </button>
            {node.isHome ? <span className="node-home-badge">대표</span> : null}
            <code className="node-path">{node.path}</code>
            <span className="node-actions">
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
