// 도메인 데이터 모델 — 설계 문서 §3 전사.
// 단일 진실 공급원은 Site 트리. 모든 변경은 store 액션을 통해서만.

export type ThemeMode = "light" | "high-contrast" | "system";
export type Device = "pc" | "tablet" | "mobile";

export type AssetRef = { assetId: string };

export type Asset = {
  id: string;
  kind: "logo" | "image";
  fileName: string;
  mime: string; // image/svg+xml, image/png ...
  blobKey: string; // IndexedDB 키 (바이너리는 JSON에 미포함)
  alt: string; // 정보성 이미지 필수(장식용 제외)
  darkVariantId?: string; // 선명/시스템 모드용 대체 이미지 Asset id
};

export type ComponentInstance = {
  id: string;
  componentDefinitionId: string;
  variantId?: string;
  props: Record<string, unknown>;
  order: number;
  hidden?: boolean;
  locked?: boolean;
  // 컨테이너(다단 레이아웃) 전용: 칼럼별 자식 인스턴스. columns.length = 단 수.
  columns?: ComponentInstance[][];
  responsive?: {
    desktop?: Record<string, unknown>;
    tablet?: Record<string, unknown>;
    mobile?: Record<string, unknown>;
  };
};

export type SitemapNode = {
  id: string;
  title: string;
  slug: string; // 사용자 입력 (예: "intro")
  path: string; // 자동 계산 (예: "/service/intro")
  parentId?: string;
  order: number;
  visibleInHeader: boolean;
  visibleInFooter: boolean;
  children?: SitemapNode[];
  pageId: string; // 1:1 대응 페이지
  isHome?: boolean;
};

export type Page = {
  id: string;
  sitemapNodeId: string;
  title: string;
  path: string; // SitemapNode.path와 동기화
  description?: string;
  seoTitle?: string;
  seoDescription?: string;
  showBreadcrumb: boolean;
  showInPageNavigation: boolean;
  showSidebar?: boolean; // 좌측 LNB 표시. 미설정=켜짐(홈은 buildLnb가 null이라 자동 미표시)
  components: ComponentInstance[]; // order순 렌더
};

export type ThemeSettings = {
  mode: ThemeMode;
  baseFontSize: number; // px — KRDS 본문 기본 17
};

export type NavLink = { label: string; url: string };

// 공식 배너(마스트헤드): 헤더와 별도 전역 요소(스크롤 고정 제외) — 설계 §3.6
export type MastheadSettings = {
  visible: boolean;
  text?: string;
};

export type HeaderSettings = {
  logo?: AssetRef;
  serviceName: string;
  utilityLinks: NavLink[];
  showSearch: boolean;
  showAllMenu: boolean;
  sticky: boolean;
  auth: {
    showLogin: boolean;
    showSignup: boolean;
    showMyMenu: boolean;
  };
};

export type FooterSettings = {
  logo?: AssetRef;
  organizationName: string;
  address?: string;
  tel?: string;
  email?: string; // KRDS 비표준 — 선택
  copyright: string;
  utilityLinks: NavLink[];
  policyLinks: NavLink[];
  snsLinks: NavLink[];
  certMarks: AssetRef[];
};

export type GlobalLayoutSettings = {
  masthead: MastheadSettings;
  header: HeaderSettings;
  footer: FooterSettings;
  skipLink: { enabled: boolean };
};

export type Site = {
  id: string;
  name: string;
  description?: string;
  logo?: AssetRef;
  organizationName?: string;
  theme: ThemeSettings;
  globalLayout: GlobalLayoutSettings;
  sitemap: SitemapNode[]; // 트리 (루트 노드 배열)
  pages: Page[]; // 평면 배열
  assets: Asset[];
  schemaVersion: number;
};

export const SCHEMA_VERSION = 1;
