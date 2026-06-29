"use client";

import { useEditorState, useEditorStoreApi } from "../../store/context";

// 선택이 없을 때: 현재 페이지의 설정(LNB·브레드크럼·인페이지내비·SEO).
export function PageSettingsForm({ pageId }: { pageId: string }) {
  const api = useEditorStoreApi();
  const page = useEditorState((s) => s.site?.pages.find((p) => p.id === pageId));
  if (!page) return null;
  const set = (patch: Parameters<ReturnType<typeof api.getState>["updatePageMeta"]>[1]) =>
    api.getState().updatePageMeta(pageId, patch);

  return (
    <div className="settings-form">
      <div className="panel-head">
        <strong>페이지 설정 — {page.title}</strong>
      </div>
      <div className="settings-body">
        <label className="krds-form-check inline">
          <input
            type="checkbox"
            checked={page.showSidebar ?? true}
            onChange={(e) => set({ showSidebar: e.target.checked })}
          />
          <span>사이드바 표시</span>
        </label>
        <label className="krds-form-check inline">
          <input
            type="checkbox"
            checked={page.showBreadcrumb}
            onChange={(e) => set({ showBreadcrumb: e.target.checked })}
          />
          <span>브레드크럼 표시</span>
        </label>
        <label className="krds-form-check inline">
          <input
            type="checkbox"
            checked={page.showInPageNavigation}
            onChange={(e) => set({ showInPageNavigation: e.target.checked })}
          />
          <span>인페이지 내비게이션</span>
        </label>
        <div className="form-group">
          <div className="form-tit"><label htmlFor="seo-title">SEO 제목</label></div>
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
          <div className="form-tit"><label htmlFor="seo-desc">SEO 설명</label></div>
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
