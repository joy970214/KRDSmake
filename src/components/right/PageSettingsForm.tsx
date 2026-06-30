"use client";

import { useId } from "react";
import type { SitemapNode } from "../../lib/types";
import { useEditorState, useEditorStoreApi } from "../../store/context";

function findNode(nodes: SitemapNode[], id: string): SitemapNode | undefined {
  for (const n of nodes) {
    if (n.id === id) return n;
    const c = n.children ? findNode(n.children, id) : undefined;
    if (c) return c;
  }
  return undefined;
}

// KRDS 토글 스위치 — 켜짐/꺼짐이 시각적으로 드러난다(toggle_switch.html).
function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  const id = useId();
  return (
    <div className="krds-form-toggle-switch">
      <input type="checkbox" id={id} checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <label htmlFor={id}>
        <span className="switch-toggle">
          <i></i>
        </span>
        {label}
      </label>
    </div>
  );
}

// 선택이 없을 때: 현재 페이지의 설정(기본정보 + LNB·브레드크럼·인페이지내비·SEO).
export function PageSettingsForm({ pageId }: { pageId: string }) {
  const api = useEditorStoreApi();
  const page = useEditorState((s) => s.site?.pages.find((p) => p.id === pageId));
  const node = useEditorState((s) =>
    s.site ? findNode(s.site.sitemap, page?.sitemapNodeId ?? "") : undefined,
  );
  if (!page) return null;
  const set = (patch: Parameters<ReturnType<typeof api.getState>["updatePageMeta"]>[1]) =>
    api.getState().updatePageMeta(pageId, patch);
  const rename = (patch: { title?: string; slug?: string }) =>
    api.getState().renameNode(page.sitemapNodeId, patch);

  return (
    <div className="settings-form">
      <div className="panel-head">
        <strong>페이지 설정 — {page.title}</strong>
      </div>
      <div className="settings-body">
        <div className="form-group">
          <div className="form-tit">
            <label htmlFor="pg-title">페이지 제목</label>
          </div>
          <div className="form-conts">
            <input
              id="pg-title"
              className="krds-input"
              value={page.title}
              onChange={(e) => rename({ title: e.target.value })}
            />
          </div>
        </div>
        {node && !node.isHome ? (
          <div className="form-group">
            <div className="form-tit">
              <label htmlFor="pg-slug">URL 주소(slug)</label>
            </div>
            <div className="form-conts">
              <input
                id="pg-slug"
                className="krds-input"
                value={node.slug}
                onChange={(e) => rename({ slug: e.target.value })}
              />
            </div>
          </div>
        ) : null}

        <Toggle
          label="사이드바 표시"
          checked={page.showSidebar ?? true}
          onChange={(v) => set({ showSidebar: v })}
        />
        <Toggle
          label="브레드크럼 표시"
          checked={page.showBreadcrumb}
          onChange={(v) => set({ showBreadcrumb: v })}
        />
        <Toggle
          label="인페이지 내비게이션"
          checked={page.showInPageNavigation}
          onChange={(v) => set({ showInPageNavigation: v })}
        />

        <div className="form-group">
          <div className="form-tit">
            <label htmlFor="seo-title">SEO 제목</label>
          </div>
          <div className="form-conts">
            <input
              id="seo-title"
              className="krds-input"
              value={page.seoTitle ?? ""}
              onChange={(e) => set({ seoTitle: e.target.value })}
            />
          </div>
        </div>
        <div className="form-group">
          <div className="form-tit">
            <label htmlFor="seo-desc">SEO 설명</label>
          </div>
          <div className="form-conts">
            <div className="textarea-wrap">
              <textarea
                id="seo-desc"
                className="krds-input"
                value={page.seoDescription ?? ""}
                onChange={(e) => set({ seoDescription: e.target.value })}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
