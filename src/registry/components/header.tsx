import { attr, escapeHtml, pending2x, thumb } from "../helpers";
import type { Site } from "../../lib/types";
import type { ComponentDefinition, ExportCtx, PreviewCtx, Props } from "../types";

// MVP 단순화 헤더. 실제 KRDS 헤더(#krds-header)의 핵심 골격(로고·주메뉴·유틸)만 구성.
// 주메뉴는 사이트맵 상위 노드(홈 제외, 헤더 노출)에서 생성 — 설계 §12-5.
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
        <div className="inner">
          <h1 className="logo">
            <a href="/">{String(props.serviceName ?? "")}</a>
          </h1>
          <nav className="gnb-menu" aria-label="주메뉴">
            <ul className="gnb-main-list">
              {topMenu(ctx.site).map((m, i) => (
                <li key={i}>
                  <a href={m.path}>{m.title}</a>
                </li>
              ))}
            </ul>
          </nav>
          <div className="gnb-utils">
            {props.showSearch ? (
              <button type="button" className="btn-search">
                통합검색
              </button>
            ) : null}
            {auth.showLogin ? (
              <a href="#" className="krds-btn text">
                로그인
              </a>
            ) : null}
            {auth.showSignup ? (
              <a href="#" className="krds-btn text">
                회원가입
              </a>
            ) : null}
            {props.showAllMenu ? (
              <button type="button" className="btn-all">
                전체메뉴
              </button>
            ) : null}
          </div>
        </div>
      </header>
    );
  },

  exportTemplates: {
    html(props, ctx: ExportCtx) {
      const auth = (props.auth ?? {}) as Auth;
      const menu = topMenu(ctx.site)
        .map((m) => `\t\t\t\t<li><a href="${attr(m.path)}">${escapeHtml(m.title)}</a></li>`)
        .join("\n");
      const utils = [
        props.showSearch
          ? `\t\t\t<button type="button" class="btn-search">통합검색</button>`
          : "",
        auth.showLogin ? `\t\t\t<a href="#" class="krds-btn text">로그인</a>` : "",
        auth.showSignup ? `\t\t\t<a href="#" class="krds-btn text">회원가입</a>` : "",
        props.showAllMenu
          ? `\t\t\t<button type="button" class="btn-all">전체메뉴</button>`
          : "",
      ]
        .filter(Boolean)
        .join("\n");
      return [
        `<header id="krds-header">`,
        `\t<div class="inner">`,
        `\t\t<h1 class="logo"><a href="/">${escapeHtml(props.serviceName)}</a></h1>`,
        `\t\t<nav class="gnb-menu" aria-label="주메뉴">`,
        `\t\t\t<ul class="gnb-main-list">`,
        menu,
        `\t\t\t</ul>`,
        `\t\t</nav>`,
        `\t\t<div class="gnb-utils">`,
        utils,
        `\t\t</div>`,
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
