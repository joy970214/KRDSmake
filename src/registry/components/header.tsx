import { attr, escapeHtml, pending2x, thumb } from "../helpers";
import type { Site } from "../../lib/types";
import type { ComponentDefinition, ExportCtx, PreviewCtx, Props } from "../types";

/**
 * MVP 단순화 헤더 — KRDS 공식 골격 준수 (audit E3 교정 적용).
 *
 * 렌더 구조 (vendor/krds/html/code/header.html 기반):
 *   header#krds-header
 *     div.header-in
 *       div.header-container > div.inner
 *         div.header-branding
 *           h2.logo > a
 *           div.header-actions
 *             button.btn-navi.sch   (통합검색, 조건부)
 *             a.btn-navi.login      (로그인, 조건부)
 *             button.btn-navi.join  (회원가입, 조건부)
 *             button.btn-navi.all[aria-controls=mobile-nav]  (전체메뉴, 조건부)
 *       nav.krds-main-menu
 *         div.inner > ul.gnb-menu
 *           li > a.gnb-main-trigger.is-link  (1Depth 링크)
 *
 * 의도적 생략 (MVP 백로그):
 *   - header-utility 바 (폰트크기·언어·관련사이트)
 *   - GNB 2depth+ flyout (gnb-toggle-wrap / gnb-main-list / gnb-sub-list / gnb-sub-banner)
 *   - 나의 GOV 드롭다운 (krds-drop-wrap my-drop)
 *   - 모바일 GNB (#mobile-nav.krds-main-menu-mobile)
 *   - 로고 이미지 (sr-only + CSS background) → 텍스트 직접 표시
 */
type Auth = { showLogin?: boolean; showSignup?: boolean; showMyMenu?: boolean };

function topMenu(site: Site): { title: string; path: string }[] {
  return site.sitemap
    .filter((n) => !n.isHome && n.visibleInHeader)
    .map((n) => ({ title: n.title, path: n.path }));
}

export const headerDefinition: ComponentDefinition = {
  id: "header",
  name: "헤더",
  nameEn: "Header",
  category: "아이덴티티",
  thumbnail: thumb(3),
  description: "로고·주메뉴·검색·로그인을 포함한 사이트 머리글. 전 페이지 공통.",
  isKrdsStandard: true,
  variants: [],
  defaultProps: {
    serviceName: "",
    showSearch: true,
    showAllMenu: true,
    auth: { showLogin: true, showSignup: true, showMyMenu: false },
  },
  editableProps: [
    { key: "serviceName", label: "사이트명", type: "text", required: true },
    { key: "showSearch", label: "통합검색 표시", type: "checkbox" },
    { key: "showAllMenu", label: "전체메뉴 표시", type: "checkbox" },
  ],

  Preview({ props, ctx }: { props: Props; ctx: PreviewCtx }) {
    const auth = (props.auth ?? {}) as Auth;
    return (
      <header id="krds-header">
        <div className="header-in">
          <div className="header-container">
            <div className="inner">
              <div className="header-branding">
                <h2 className="logo">
                  <a href="/">{String(props.serviceName ?? "")}</a>
                </h2>
                <div className="header-actions">
                  {props.showSearch ? (
                    <button type="button" className="btn-navi sch">
                      통합검색
                    </button>
                  ) : null}
                  {auth.showLogin ? (
                    <a href="#" className="btn-navi login">
                      로그인
                    </a>
                  ) : null}
                  {auth.showSignup ? (
                    <button type="button" className="btn-navi join">
                      회원가입
                    </button>
                  ) : null}
                  {props.showAllMenu ? (
                    <button type="button" className="btn-navi all" aria-controls="mobile-nav">
                      전체메뉴
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
          <nav className="krds-main-menu">
            <div className="inner">
              <ul className="gnb-menu">
                {topMenu(ctx.site).map((m, i) => (
                  <li key={i}>
                    <a href={m.path} className="gnb-main-trigger is-link">
                      {m.title}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </nav>
        </div>
      </header>
    );
  },

  exportTemplates: {
    html(props, ctx: ExportCtx) {
      const auth = (props.auth ?? {}) as Auth;
      const menu = topMenu(ctx.site)
        .map(
          (m) =>
            `\t\t\t\t<li><a href="${attr(m.path)}" class="gnb-main-trigger is-link">${escapeHtml(m.title)}</a></li>`,
        )
        .join("\n");
      const actions = [
        props.showSearch
          ? `\t\t\t\t\t<button type="button" class="btn-navi sch">통합검색</button>`
          : "",
        auth.showLogin ? `\t\t\t\t\t<a href="#" class="btn-navi login">로그인</a>` : "",
        auth.showSignup
          ? `\t\t\t\t\t<button type="button" class="btn-navi join">회원가입</button>`
          : "",
        props.showAllMenu
          ? `\t\t\t\t\t<button type="button" class="btn-navi all" aria-controls="mobile-nav">전체메뉴</button>`
          : "",
      ]
        .filter(Boolean)
        .join("\n");
      return [
        `<header id="krds-header">`,
        `\t<div class="header-in">`,
        `\t\t<div class="header-container">`,
        `\t\t\t<div class="inner">`,
        `\t\t\t\t<div class="header-branding">`,
        `\t\t\t\t\t<h2 class="logo"><a href="/">${escapeHtml(props.serviceName)}</a></h2>`,
        `\t\t\t\t\t<div class="header-actions">`,
        actions,
        `\t\t\t\t\t</div>`,
        `\t\t\t\t</div>`,
        `\t\t\t</div>`,
        `\t\t</div>`,
        `\t\t<nav class="krds-main-menu">`,
        `\t\t\t<div class="inner">`,
        `\t\t\t\t<ul class="gnb-menu">`,
        menu,
        `\t\t\t\t</ul>`,
        `\t\t\t</div>`,
        `\t\t</nav>`,
        `\t</div>`,
        `</header>`,
      ]
        .filter((l) => l !== "")
        .join("\n");
    },
    vue: () => pending2x("vue"),
    react: () => pending2x("react"),
  },
};
