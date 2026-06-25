import { newId } from "./ids";
import {
  type GlobalLayoutSettings,
  type Page,
  type Site,
  type SitemapNode,
  SCHEMA_VERSION,
} from "./types";

function defaultGlobalLayout(serviceName: string): GlobalLayoutSettings {
  return {
    masthead: {
      visible: true,
      text: "이 누리집은 대한민국 공식 전자정부 누리집입니다.",
    },
    header: {
      serviceName,
      utilityLinks: [],
      showSearch: true,
      showAllMenu: true,
      sticky: true,
      auth: { showLogin: true, showSignup: true, showMyMenu: false },
    },
    footer: {
      organizationName: "",
      copyright: "",
      utilityLinks: [],
      policyLinks: [],
      snsLinks: [],
      certMarks: [],
    },
    skipLink: { enabled: true },
  };
}

// 새 Site 생성. 홈 노드 1개 + 1:1 페이지를 함께 만든다(불변식 1·3).
export function createSite(name: string): Site {
  const nodeId = newId();
  const pageId = newId();

  const home: SitemapNode = {
    id: nodeId,
    title: "홈",
    slug: "",
    path: "/",
    order: 0,
    visibleInHeader: true,
    visibleInFooter: false,
    pageId,
    isHome: true,
  };

  const page: Page = {
    id: pageId,
    sitemapNodeId: nodeId,
    title: "홈",
    path: "/",
    showBreadcrumb: false,
    showInPageNavigation: false,
    components: [],
  };

  return {
    id: newId(),
    name,
    theme: { mode: "light", baseFontSize: 17 },
    globalLayout: defaultGlobalLayout(name),
    sitemap: [home],
    pages: [page],
    assets: [],
    schemaVersion: SCHEMA_VERSION,
  };
}
