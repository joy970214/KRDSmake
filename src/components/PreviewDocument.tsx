"use client";

import { getComponent } from "../registry";
import type { PreviewCtx } from "../registry/types";
import type { ComponentInstance, Page, Site } from "../lib/types";
import { buildLnb } from "../lib/lnb";
import { buildBreadcrumb } from "../lib/breadcrumb";
import { buildInPageNav } from "../lib/in-page-nav";
import { LnbItem } from "./Canvas";

// 읽기전용 KRDS 페이지 렌더(편집 크롬 없음). DevicePreview의 iframe 본문에 portal로 들어간다.
// Canvas의 인라인 렌더와 동일한 KRDS 구조를 쓰되, 드래그/선택/툴바를 제거한 형태.
export function PreviewDocument({
  site,
  page,
  ctx,
}: {
  site: Site;
  page: Page;
  ctx: PreviewCtx;
}) {
  const masthead = getComponent("masthead");
  const header = getComponent("header");
  const footer = getComponent("footer");

  const showSidebar = page.showSidebar ?? true;
  const lnb = buildLnb(site.sitemap, page.sitemapNodeId);
  const crumbs = page.showBreadcrumb ? buildBreadcrumb(site.sitemap, page.sitemapNodeId) : [];
  const showInPageNav = !!page.showInPageNavigation;
  const sections = buildInPageNav(page);
  const components = page.components
    .slice()
    .sort((a, b) => a.order - b.order)
    .filter((c) => !c.hidden);

  function renderInstance(inst: ComponentInstance) {
    if (inst.columns) {
      return (
        <div className="krds-grid" style={{ "--cols": inst.columns.length } as React.CSSProperties}>
          {inst.columns.map((children, i) => (
            <div key={i} className="krds-grid-col">
              {children
                .filter((c) => !c.hidden)
                .map((child) => {
                  const cdef = getComponent(child.componentDefinitionId);
                  return (
                    <div key={child.id} className="ci-preview">
                      {cdef ? cdef.Preview({ props: child.props, ctx }) : null}
                    </div>
                  );
                })}
            </div>
          ))}
        </div>
      );
    }
    const def = getComponent(inst.componentDefinitionId);
    return def ? def.Preview({ props: inst.props, ctx }) : null;
  }

  return (
    <div className="canvas-frame">
      {site.globalLayout.masthead.visible && masthead
        ? masthead.Preview({ props: site.globalLayout.masthead, ctx })
        : null}
      {header ? header.Preview({ props: site.globalLayout.header, ctx }) : null}

      <div className="page-frame">
        {showSidebar && lnb ? (
          <nav className="krds-side-navigation" aria-label="좌측 메뉴">
            <h2 className="lnb-tit">{lnb.sectionTitle}</h2>
            <ul className="lnb-list" role="menubar">
              {lnb.items.map((n) => (
                <LnbItem key={n.id} node={n} activeNodeId={lnb.activeNodeId} />
              ))}
            </ul>
          </nav>
        ) : null}

        <main className="canvas-page" aria-label="페이지 본문">
          {crumbs.length >= 2 ? (
            <nav className="krds-breadcrumb-wrap" aria-label="현재 경로">
              <ol className="breadcrumb">
                {crumbs.map((c, i) => (
                  <li key={i} className={c.isHome ? "home" : undefined}>
                    <a href={c.path} className="txt" onClick={(e) => e.preventDefault()}>
                      {c.title}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
          ) : null}
          <h2 className="canvas-page-title">{page.title}</h2>
          {components.map((inst) => (
            <div key={inst.id} className="ci-preview">
              {renderInstance(inst)}
            </div>
          ))}
        </main>

        {showInPageNav ? (
          <div className="krds-in-page-navigation-type">
            <div className="krds-in-page-navigation-area">
              <div className="in-page-navigation-header">
                <p className="quick-caption">이 페이지의 구성</p>
                <p className="quick-title">{page.title}</p>
              </div>
              {sections.length > 0 ? (
                <nav className="in-page-navigation-list" aria-label="콘텐츠 내 탐색">
                  <ul>
                    {sections.map((t, i) => (
                      <li key={i}>
                        <a
                          href="#"
                          className={i === 0 ? "active" : undefined}
                          onClick={(e) => e.preventDefault()}
                        >
                          {t}
                        </a>
                      </li>
                    ))}
                  </ul>
                </nav>
              ) : (
                <p className="in-page-empty">제목영역 컴포넌트를 추가하면 목록이 생깁니다.</p>
              )}
            </div>
          </div>
        ) : null}
      </div>

      {footer ? footer.Preview({ props: site.globalLayout.footer, ctx }) : null}
    </div>
  );
}
