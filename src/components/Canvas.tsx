"use client";

import { getComponent } from "../registry";
import type { PreviewCtx } from "../registry/types";
import { useEditorState } from "../store/context";

// 중앙 캔버스 — 선택 페이지를 KRDS 미리보기로 렌더(헤더/푸터 공통 + 본문).
// 컴포넌트 드래그 배치는 Step 4, 모드/디바이스 전환은 Step 6.
export function Canvas() {
  const site = useEditorState((s) => s.site);
  const activePageId = useEditorState((s) => s.activePageId);
  if (!site) return null;

  const page = site.pages.find((p) => p.id === activePageId) ?? site.pages[0];
  const ctx: PreviewCtx = {
    site,
    page,
    resolveAsset: () => undefined,
    mode: "light",
    device: "pc",
  };

  const masthead = getComponent("masthead");
  const header = getComponent("header");
  const footer = getComponent("footer");

  return (
    <div className="canvas">
      <div className="canvas-frame">
        {site.globalLayout.masthead.visible && masthead
          ? masthead.Preview({ props: site.globalLayout.masthead, ctx })
          : null}
        {header ? header.Preview({ props: site.globalLayout.header, ctx }) : null}

        <main className="canvas-page">
          <h2 className="canvas-page-title">{page.title}</h2>
          {page.components.length === 0 ? (
            <p className="empty-guide">
              좌측의 컴포넌트를 이 영역으로 드래그하여 페이지를 구성하세요. (Step 4)
            </p>
          ) : (
            page.components
              .slice()
              .sort((a, b) => a.order - b.order)
              .filter((c) => !c.hidden)
              .map((inst) => {
                const def = getComponent(inst.componentDefinitionId);
                return (
                  <div key={inst.id} className="canvas-instance">
                    {def ? def.Preview({ props: inst.props, ctx }) : null}
                  </div>
                );
              })
          )}
        </main>

        {footer ? footer.Preview({ props: site.globalLayout.footer, ctx }) : null}
      </div>
    </div>
  );
}
