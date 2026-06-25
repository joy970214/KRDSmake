"use client";

import { useState } from "react";
import type { SitemapNode } from "../../lib/types";
import { useEditorState, useEditorStoreApi } from "../../store/context";

function countNodes(nodes: SitemapNode[]): number {
  return nodes.reduce((sum, n) => sum + 1 + countNodes(n.children ?? []), 0);
}

export function SitemapTree() {
  const sitemap = useEditorState((s) => s.site?.sitemap ?? []);
  const api = useEditorStoreApi();

  const addRoot = () => {
    const n = countNodes(api.getState().site?.sitemap ?? []) + 1;
    api.getState().addSitemapNode({ title: "새 메뉴", slug: `menu-${n}` });
  };

  return (
    <div>
      <div className="panel-head">
        <strong>사이트맵</strong>
        <button type="button" onClick={addRoot} aria-label="메뉴 추가" className="krds-btn small">
          ＋ 메뉴 추가
        </button>
      </div>
      <ul className="sitemap-tree">
        {sitemap.map((node, i) => (
          <TreeNode
            key={node.id}
            node={node}
            parentId={undefined}
            index={i}
            siblingCount={sitemap.length}
          />
        ))}
      </ul>
    </div>
  );
}

function TreeNode({
  node,
  parentId,
  index,
  siblingCount,
}: {
  node: SitemapNode;
  parentId: string | undefined;
  index: number;
  siblingCount: number;
}) {
  const api = useEditorStoreApi();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(node.title);
  const [slug, setSlug] = useState(node.slug);

  const addChild = () => {
    const n = countNodes(api.getState().site?.sitemap ?? []) + 1;
    api.getState().addSitemapNode({ title: "새 메뉴", slug: `menu-${n}`, parentId: node.id });
  };
  const startEdit = () => {
    setTitle(node.title);
    setSlug(node.slug);
    setEditing(true);
  };
  const save = () => {
    api.getState().renameNode(node.id, { title, slug });
    setEditing(false);
  };
  const moveUp = () => api.getState().moveNode(node.id, parentId, index - 1);
  const moveDown = () => api.getState().moveNode(node.id, parentId, index + 1);

  return (
    <li>
      <div className="node-row">
        {editing ? (
          <span className="node-edit">
            <input aria-label="제목" value={title} onChange={(e) => setTitle(e.target.value)} />
            <input
              aria-label="slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              disabled={node.isHome}
              placeholder="slug"
            />
            <button type="button" onClick={save} aria-label="저장">
              저장
            </button>
          </span>
        ) : (
          <span className="node-view">
            <button
              type="button"
              className="node-title"
              onClick={() => api.getState().setActivePage(node.pageId)}
            >
              {node.title}
            </button>
            <code className="node-path">{node.path}</code>
            {node.isHome ? <span className="node-home-badge">대표</span> : null}
            <span className="node-actions">
              <button
                type="button"
                onClick={moveUp}
                disabled={index === 0}
                aria-label={`${node.title} 위로`}
              >
                ↑
              </button>
              <button
                type="button"
                onClick={moveDown}
                disabled={index === siblingCount - 1}
                aria-label={`${node.title} 아래로`}
              >
                ↓
              </button>
              <button type="button" onClick={addChild} aria-label={`${node.title} 하위 추가`}>
                ＋
              </button>
              <button type="button" onClick={startEdit} aria-label={`${node.title} 이름변경`}>
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
      {node.children && node.children.length > 0 ? (
        <ul className="sitemap-tree">
          {node.children.map((child, i) => (
            <TreeNode
              key={child.id}
              node={child}
              parentId={node.id}
              index={i}
              siblingCount={node.children!.length}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}
