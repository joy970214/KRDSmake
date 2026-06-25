# KRDS 기반 공공 웹사이트 빌더 — 설계 문서

- 작성일: 2026-06-25
- 상태: 승인됨 (구현 착수 전) · KRDS 공식 사이트/자산 대조 검증 완료 2026-06-25 (13장 참조)
- 범위: 전체 제품 아키텍처 설계 + 1차 MVP 구현 경계

---

## 0. 한 줄 정의

개발 지식이 없는 사용자가 KRDS 디자인 시스템 기반으로 공공 웹사이트를 드래그 앤 드롭으로 구성하고, 완성본을 HTML/Vue/React 코드로 다운로드하는 **노코드 웹사이트 제작 도구**.

이것은 "웹사이트"가 아니라 "웹사이트를 만드는 도구"다.

---

## 1. 확정된 핵심 결정 (브레인스토밍 결과)

| 항목 | 결정 | 이유 |
|---|---|---|
| 데이터 저장 | **브라우저 로컬 전용** (서버/DB 없음) | 기술스택(JSZip/FileSaver)과 일치, MVP 최단 경로 |
| 빌드 도구 | **Next.js (App Router) — `output: 'export'` 정적 SPA** | 사용자 선택. 클라이언트 전용과 양립 |
| 영속화 | **IndexedDB** (`localforage`) | 이미지 Blob/base64가 localStorage 5MB 한도 초과 |
| 상태관리 | **Zustand** | 단일 `Site` 트리에 적합, 보일러플레이트 최소 |
| 미리보기 렌더링 | **전용 React 미리보기 컴포넌트 (선택지 B)** | dnd-kit 선택/드래그 경험 우선, 괴리는 스냅샷 테스트로 방어 |
| 컴포넌트 구조 | 컴포넌트당 **미리보기 1개 + 익스포트 템플릿 3개(html/vue/react)** | 캔버스용/다운로드용 분리 |
| 테마 처리 | **CSS 변수 + data-attribute 토글** (미리보기·익스포트 공통) | 모드별 코드 분기 제거 |
| KRDS 자산 | **공식 사이트 배포 자산 다운로드 후 프로젝트에 포함** | 실제 토큰/CSS를 단일 출처로 |
| 문서 범위 | **전체 아키텍처 설계 + 1차 MVP 구현** | 이후 단계 코드 누락 방지를 위해 인터페이스까지 명시 |

---

## 2. 전체 아키텍처

```
[ Next.js App (정적 export, 클라이언트 전용) ]
        │
  ┌─────┴───────────────────────────────────────────────┐
  │  UI 레이어 (3패널 에디터)                              │
  │   상단바 · 좌측패널 · 중앙 캔버스 · 우측 설정패널        │
  ├──────────────────────────────────────────────────────┤
  │  상태 레이어 (Zustand store)                          │
  │   현재 Site · 선택 상태 · 미리보기 모드/디바이스        │
  ├──────────────────────────────────────────────────────┤
  │  도메인 레이어                                         │
  │   ComponentRegistry · 패턴 정의 · KRDS 테마 토큰        │
  ├──────────────────────────────────────────────────────┤
  │  익스포트 레이어                                       │
  │   HTML/Vue/React Generator · AssetExporter · ZIP       │
  ├──────────────────────────────────────────────────────┤
  │  영속화 레이어                                         │
  │   IndexedDB(프로젝트 JSON + 이미지 Blob) via localforage │
  └──────────────────────────────────────────────────────┘
```

### 레이어 책임 경계

- **UI 레이어**: 화면 표시와 사용자 입력만 담당. 도메인 로직 없음. store를 읽고 액션을 호출.
- **상태 레이어**: 단일 진실 공급원(single source of truth). `Site` 객체 + 에디터 UI 상태(선택 대상, 미리보기 모드/디바이스). 모든 변경은 store 액션을 통해서만.
- **도메인 레이어**: 순수 데이터/함수. UI·React에 의존하지 않는 부분(레지스트리 메타, 패턴 팩토리, path 계산, 검증 규칙). 단, 미리보기 컴포넌트는 React 요소를 반환하므로 예외적으로 React에 의존.
- **익스포트 레이어**: `Site` → 가상 파일맵 → ZIP. 순수 함수. DOM 비의존(문자열 생성).
- **영속화 레이어**: store ↔ IndexedDB 직렬화. store 구독으로 자동 저장(디바운스).

### Next.js 사용 방식

- `next.config.js`에 `output: 'export'` — 정적 사이트로 빌드, 서버 런타임 없음.
- 에디터 전체는 클라이언트 컴포넌트(`'use client'`). SSR/서버 액션/서버 라우팅 미사용.
- 단일 라우트(`/`)에서 에디터가 동작. 사이트맵 라우팅은 "사용자가 만드는 사이트"의 개념이지 빌더 앱 자체의 라우팅이 아님.

---

## 3. 데이터 모델

기획서 5장 타입을 채택하고 구현에 필요한 보강만 추가한다.

### 3.1 Site

```ts
type Site = {
  id: string;
  name: string;
  description?: string;
  logo?: AssetRef;
  organizationName?: string;
  theme: ThemeSettings;
  globalLayout: GlobalLayoutSettings; // 헤더/푸터 설정
  sitemap: SitemapNode[];             // 트리 (루트 노드 배열)
  pages: Page[];                       // 평면 배열
  assets: Asset[];
  schemaVersion: number;               // 마이그레이션 대비
};
```

### 3.2 SitemapNode (트리)

```ts
type SitemapNode = {
  id: string;
  title: string;
  slug: string;          // 사용자가 입력 (예: "intro")
  path: string;          // 자동 계산 (예: "/service/intro")
  parentId?: string;
  order: number;
  visibleInHeader: boolean;
  visibleInFooter: boolean;
  children?: SitemapNode[];
  pageId: string;        // 1:1 대응 페이지
  isHome?: boolean;
};
```

### 3.3 Page (평면 배열)

```ts
type Page = {
  id: string;
  sitemapNodeId: string;
  title: string;
  path: string;          // SitemapNode.path와 동기화
  description?: string;
  seoTitle?: string;
  seoDescription?: string;
  showBreadcrumb: boolean;
  showInPageNavigation: boolean;
  components: ComponentInstance[]; // order순 렌더
};
```

### 3.4 ComponentInstance

```ts
type ComponentInstance = {
  id: string;
  componentDefinitionId: string;
  variantId?: string;
  props: Record<string, any>;
  order: number;
  hidden?: boolean;
  locked?: boolean;
  responsive?: {
    desktop?: Record<string, any>;
    tablet?: Record<string, any>;
    mobile?: Record<string, any>;
  };
};
```

### 3.5 Asset (보강)

```ts
type Asset = {
  id: string;
  kind: 'logo' | 'image';
  fileName: string;
  mime: string;                 // image/svg+xml, image/png ...
  blobKey: string;              // IndexedDB 키 (바이너리는 JSON에 미포함)
  alt: string;                  // 필수 (접근성)
  darkVariantId?: string;       // 다크/선명 모드용 대체 이미지 Asset id
};

// 컴포넌트 props 안에서는 Asset 전체가 아니라 참조만 보관
type AssetRef = { assetId: string };
```

### 3.6 ThemeSettings / GlobalLayoutSettings

```ts
type ThemeSettings = {
  mode: 'light' | 'high-contrast' | 'system';
  baseFontSize: number;          // px — KRDS 본문 기본 17px (rem 루트 환산 기준은 별도 10px=62.5%)
  // 실제 색/타이포 값은 krds_tokens.css 변수가 단일 출처 (파일명 언더스코어, --krds-* 네임스페이스)
};

type GlobalLayoutSettings = {
  masthead: MastheadSettings;    // 공식 배너 — 헤더와 별도 전역 요소(스크롤 고정 제외)
  header: HeaderSettings;        // 기획서 4.4-2 입력항목
  footer: FooterSettings;        // 기획서 4.4-3 입력항목
  skipLink: { enabled: boolean }; // 건너뛰기 링크(접근성 필수) — 기본 on
};

// 공식 배너(마스트헤드): 정부 식별 배너. 헤더 위 최상단, 스크롤 고정 시 제외.
type MastheadSettings = {
  visible: boolean;              // 기본 true (정부 사이트 권장)
  text?: string;                 // 예: "이 누리집은 대한민국 공식 전자정부 누리집입니다."
};

type HeaderSettings = {
  logo?: AssetRef;               // 서비스 아이덴티티
  serviceName: string;
  utilityLinks: NavLink[];       // 유틸리티 링크 그룹(5+ 시 드롭다운)
  showSearch: boolean;           // 통합검색
  showAllMenu: boolean;          // 전체메뉴
  sticky: boolean;               // 스크롤 고정(공식 배너는 제외)
  auth: {                        // 로그인과 별개로 회원가입·개인메뉴 분리
    showLogin: boolean;
    showSignup: boolean;
    showMyMenu: boolean;         // 개인 메뉴("나의 GOV" 류)
  };
};

type FooterSettings = {
  logo?: AssetRef;               // 푸터 서비스 로고
  organizationName: string;      // 운영기관 식별자
  address?: string;
  tel?: string;
  email?: string;                // KRDS 비표준 — 선택(optional)
  copyright: string;
  utilityLinks: NavLink[];       // 유틸리티 링크(이용안내·찾아오시는 길 등)
  policyLinks: NavLink[];        // 정책 링크(개인정보처리방침·저작권 등)
  snsLinks: NavLink[];
  certMarks: AssetRef[];         // 웹접근성 품질인증 마크 등
};

type NavLink = { label: string; url: string };
```

### 3.7 모델 불변식 (Invariants)

구현 시 항상 보장해야 하는 규칙:

1. **사이트맵 노드 ↔ 페이지는 1:1**. 노드 생성 시 페이지 자동 생성, 노드 삭제 시 페이지 삭제.
2. **`path`는 파생 값**: 부모 노드 `slug`들을 `/`로 이어 자동 계산. 사용자는 `slug`만 입력. 부모 변경/순서변경 시 자손 `path` 재계산.
3. **홈 노드는 정확히 1개**. `path = "/"`.
4. **자산 바이너리는 IndexedDB에만** 존재. `Site` JSON에는 `blobKey` 참조만.
5. **글로벌 요소는 사이트 전역 1벌**. KRDS 글로벌 요소 = 헤더·푸터·공식 배너(마스트헤드)·운영기관 식별자·건너뛰기 링크. 페이지별로 따로 두지 않음. 공식 배너(마스트헤드)는 헤더와 **별도 요소**이며 스크롤 고정에서 제외된다.

---

## 4. 컴포넌트 레지스트리 설계

### 4.1 디렉터리 구조

```
src/registry/
  index.ts                 // Map<id, ComponentDefinition>로 모아서 export
  categories.ts            // 카테고리 메타(KRDS 공식 11종: 아이덴티티/탐색/레이아웃 및 표현/액션/선택/피드백/도움/입력/설정/콘텐츠/모바일)
  types.ts                 // ComponentDefinition 등 타입
  components/
    header.tsx        // KRDS 표준(아이덴티티)
    footer.tsx        // KRDS 표준(아이덴티티)
    page-title.tsx    // ⚠ KRDS 비표준 — 페이지 제목은 시맨틱 헤딩+타이포 토큰 처리. 자체 컴포넌트로 명시
    button.tsx        // KRDS 표준(액션)
    image.tsx         // KRDS 표준(레이아웃 및 표현)
    card.tsx          // ⚠ KRDS 비표준 — 가장 근접 공식 컴포넌트는 구조화 목록(Structured list). 자체 컴포넌트로 명시
    table.tsx         // KRDS 표준(레이아웃 및 표현)
    input-form.tsx    // 단일 컴포넌트 아님 — 입력 카테고리(텍스트입력/텍스트영역/셀렉트/체크박스/라디오) 조합 폼
    masthead.tsx      // KRDS 표준(아이덴티티) — 공식 배너, 전역 요소(스크롤 고정 제외)
    skip-link.tsx     // KRDS 표준(탐색) — 건너뛰기 링크, 접근성 필수
  patterns/                // 기본 패턴 = ComponentInstance[] 생성 팩토리
    input-form.ts
  service-patterns/        // 서비스 패턴 = 페이지 초기 components[] 템플릿
    search.ts
```

### 4.2 ComponentDefinition 형태

```ts
type ExportCtx = {
  site: Site;
  page: Page;
  resolveAsset: (ref: AssetRef) => Asset | undefined;
  framework: 'html' | 'vue' | 'react';
};

// 캔버스 미리보기용 컨텍스트 (자산 해석 + 현재 미리보기 모드/디바이스)
type PreviewCtx = {
  site: Site;
  page: Page;
  resolveAsset: (ref: AssetRef) => Asset | undefined;
  mode: 'light' | 'high-contrast' | 'system';
  device: 'pc' | 'tablet' | 'mobile';
};

type ComponentDefinition = {
  id: string;
  name: string;                 // 한국어 표시명
  category: string;
  thumbnail: string;            // 좌측 카드 썸네일 경로
  description: string;
  variants: ComponentVariant[];
  defaultProps: Record<string, any>;
  editableProps: EditablePropSchema[];
  accessibilityProps?: EditablePropSchema[];

  // (A) 캔버스 미리보기 — React
  Preview: (args: { props: Record<string, any>; ctx: PreviewCtx }) => ReactElement;

  // (B) 다운로드 코드 — 프레임워크별 문자열 생성 함수
  exportTemplates: {
    html: (props: Record<string, any>, ctx: ExportCtx) => string;
    vue: (props: Record<string, any>, ctx: ExportCtx) => string;
    react: (props: Record<string, any>, ctx: ExportCtx) => string;
  };
};
```

**원칙:**
- 익스포트 템플릿은 문자열이 아니라 **함수** — 표의 행, 메뉴 트리 같은 반복/조건을 안전하게 처리하고 타입 체크가 된다.
- 컴포넌트 추가 = 파일 1개 추가 + `index.ts` 등록. 다른 코드 수정 불필요(레지스트리 주도).
- 좌측 패널·우측 폼·익스포트가 모두 이 정의를 읽어 동작.

### 4.3 EditablePropSchema (기획서 5.6 채택)

`type`: `text | textarea | url | number | select | radio | checkbox | image | color | repeater | table | date`.
우측 설정 폼은 이 스키마 배열에서 **자동 생성**(React Hook Form + Zod). 컴포넌트별 폼 하드코딩 금지.

### 4.4 기본 패턴 / 서비스 패턴

- **기본 패턴**: `(): ComponentInstance[]` 팩토리. 드롭하면 여러 인스턴스로 펼쳐져 각각 개별 편집 가능(기획서 4.2.3). KRDS 공식 기본 패턴 11종: 개인 식별 정보 입력·도움·동의·목록 탐색·사용자 피드백·상세 정보 확인·오류·입력폼·첨부 파일·필터링/정렬·확인.
- **서비스 패턴**: 사용자 여정 기반 구조(기획서 4.2.4). KRDS 공식 서비스 패턴 5종: 방문·검색·로그인·신청·정책 정보 확인. ⚠ KRDS 서비스 패턴은 **단일 페이지가 아니라 다단계 여정**(예: 신청 = 개요→대상 탐색→…→확인·확정). 따라서 "한 페이지 초기 `components` 1벌" 모델로는 부족하며, **여정 단계(step)별 페이지 템플릿 시퀀스**(한 서비스 패턴이 복수 페이지를 생성)로 모델링해야 한다.
- MVP에서는 인터페이스만 확정하고 "입력폼" 기본 패턴 1개 정도로 검증, 본격 확장은 2차.

```ts
// 기본 패턴: 한 페이지 안에 펼쳐지는 컴포넌트 인스턴스 묶음
type BasicPattern = {
  id: string;
  name: string;                  // 예: "입력폼"
  build: () => ComponentInstance[];
};

// 서비스 패턴: 다단계 여정 → 복수 페이지를 생성하는 시퀀스
type ServicePatternStep = {
  title: string;                 // 단계명 (예: "신청 대상 탐색")
  slug: string;                  // 페이지 slug (path는 사이트맵 규칙으로 파생)
  build: () => ComponentInstance[]; // 해당 단계 페이지의 초기 components
};

type ServicePattern = {
  id: string;
  name: string;                  // 방문·검색·로그인·신청·정책 정보 확인
  steps: ServicePatternStep[];   // 단일 단계여도 배열(여정 다단계성 보존)
};
// 적용 시: steps → 사이트맵 노드 + 페이지를 순서대로 생성(불변식 1·2 적용).
// MVP는 타입만 확정, 카탈로그 본문(11/5종)은 2차에 채움.
```

---

## 5. 상태 관리 (Zustand store)

```ts
type Selection =
  | { kind: 'site' }
  | { kind: 'header' }
  | { kind: 'footer' }
  | { kind: 'page'; pageId: string }
  | { kind: 'component'; pageId: string; instanceId: string }
  | { kind: 'none' };

type EditorState = {
  site: Site | null;
  selection: Selection;
  activePageId: string | null;
  previewMode: 'light' | 'high-contrast' | 'system';
  previewDevice: 'pc' | 'tablet' | 'mobile';

  // 액션 (모든 변경은 여기를 통해서만)
  loadSite / createSite / updateSiteMeta
  addSitemapNode / renameNode / moveNode / deleteNode / setHome
  addComponent / updateComponentProps / reorderComponent /
    duplicateComponent / removeComponent / toggleHidden
  select(selection)
  setPreviewMode / setPreviewDevice
};
```

- **자동 저장**: store 구독 → 디바운스(예: 500ms) → IndexedDB 직렬화.
- **path 재계산**: `moveNode`/`renameNode`(slug 변경) 시 자손 path 일괄 갱신.
- 우측 패널은 `selection`을 보고 어떤 폼을 그릴지 결정.

---

## 6. 3패널 에디터 UI

### 6.1 레이아웃 (기획서 4장)

```
┌──────────────────────── 상단바 ────────────────────────┐
│ 서비스명 · 사이트명 · 미리보기 · 저장 · 모드 · 디바이스 · 전체 다운로드 │
├──────────┬───────────────────────────┬─────────────────┤
│ 좌측패널  │      중앙 캔버스            │   우측 설정패널   │
│ (탭 5개) │  (선택 페이지 실시간 미리보기) │ (선택 대상별 폼)  │
└──────────┴───────────────────────────┴─────────────────┘
```

### 6.2 좌측 패널 탭

1. **사이트맵** — 트리 CRUD, dnd-kit 순서/계층 변경, 홈 지정, 메뉴 노출 설정
2. **컴포넌트** — 카테고리 필터 + 검색 + 썸네일 카드, 캔버스로 드래그
3. **기본 패턴** — 블록 단위 드래그(2차 확장)
4. **서비스 패턴** — 페이지 템플릿 선택(2차 확장)
5. **이미지/로고 자산** — 업로드/미리보기/삭제/alt/다크 대체 이미지

### 6.3 중앙 캔버스

- 선택 페이지의 컴포넌트를 order순으로 React 미리보기 렌더.
- 컴포넌트 선택 → 우측 패널 활성화. 위/아래 이동·복제·삭제·숨김 조작 핸들.
- 빈 페이지 안내: "좌측의 컴포넌트 또는 기본 패턴을 이 영역으로 드래그하여 페이지를 구성하세요."
- 캔버스 컨테이너에 `data-krds-mode`(모드: 선명=`high-contrast`, 시스템=`theme`; 라이트는 속성 없음) + 폭 제약(디바이스) 적용.

### 6.4 우측 설정 패널 (selection별)

| selection | 폼 내용 |
|---|---|
| site | 사이트명·설명·운영기관·로고·기본 모드·연락처·저작권·링크 (기획서 4.4-1) |
| header | 서비스 아이덴티티(로고/사이트명)·유틸리티 링크 그룹·검색·전체메뉴·고정·로그인/회원가입/개인메뉴·건너뛰기 링크 (4.4-2) ※공식 배너(마스트헤드)는 헤더와 별도 전역 요소 |
| masthead | 공식 배너 표시 여부 (정부 식별 배너, 스크롤 고정 제외) — 전역 요소 |
| footer | 서비스 로고·운영기관 식별자·주소·전화·저작권·유틸리티 링크·정책 링크·SNS·웹접근성 인증마크 (4.4-3) ※이메일은 KRDS 비표준(선택) |
| page | 제목·URL·상위메뉴·노출·SEO·브레드크럼·목차·개별 다운로드 (4.4-4) |
| component | 해당 정의의 `editableProps`에서 **자동 생성된 폼** (4.4-5) |

**설계 원칙**(기획서 4.3): 개발 용어 대신 쉬운 한국어, 변경 즉시 미리보기 반영, 링크 텍스트 명료성(링크 목적 설명)+URL 형식 검증, 이미지 alt(장식용 제외) 필수, 필수값 표시, 오류 안내.

---

## 7. 익스포트 생성기

### 7.1 공통 파이프라인

```
Site(JSON) ──▶ [Generator] ──▶ 가상 파일맵 { path: string => contents }
                                   ──▶ JSZip ──▶ FileSaver(.zip)
  보조: AssetExporter(IndexedDB Blob → /assets)
        RouteGenerator(sitemap 트리 → 파일경로·라우팅)
```

- 세 생성기 모두 같은 `Site`를 읽고 각 컴포넌트의 `exportTemplates[framework]`를 호출.
- **페이지 조립** = 공통 헤더 + `components`(order순, hidden 제외) + 공통 푸터.
- **KRDS 테마**: `krds_tokens.css`(+ 컴포넌트 CSS, 또는 `cdn/krds.min.css` 번들)를 전 결과물에 포함, 사용자 설정은 `style.css` 변수 오버라이드.

### 7.2 프레임워크별 산출물 (기획서 6.1 구조)

- **HTML**: `path` → 디렉터리/파일 (`service/intro.html`), `css/`, `js/main.js`, `assets/`.
- **Vue**: `pages/ServiceIntro.vue` + `router/index.ts`(sitemap 기반) + `components/krds/` + `package.json`.
- **React**: `pages/ServiceIntro.tsx` + `routes/` + `components/krds/` + `package.json`.

### 7.3 개별 페이지 다운로드 (기획서 6.2)

같은 파이프라인을 **페이지 1개 + 헤더/푸터 + 해당 페이지 자산/CSS**만으로 호출. 파일명/경로는 사이트맵 설정 반영.

### 7.4 괴리 방어

미리보기(React)와 익스포트(문자열)가 어긋나지 않도록 **컴포넌트별 익스포트 스냅샷 테스트**를 둔다. 1차는 HTML 스냅샷, 2차에서 Vue/React 추가.

---

## 8. 테마 · 반응형 · 접근성

### 8.1 화면 모드 (기획서 8.1)

- 기본(light) / 선명한 화면(high-contrast) / 시스템. KRDS UI 라벨은 "기본 / 선명하게 / 시스템 설정", 페이지명은 "선명한 화면 모드(High contrast mode)". 선명 모드는 시각적으로 **어두운 배경**을 쓰지만 목적은 **고대비**(다크모드와 다름) — 명도대비를 기본보다 강화(본문 7:1→15:1 등).
- CSS 변수 + `data-krds-mode` 속성 토글로 미리보기·익스포트 공통 처리. 값: 선명=`high-contrast`, 시스템=`theme`(+`@media (prefers-color-scheme: dark)`), 라이트=속성 없음. ※속성명 출처는 **KRDS 배포 자산 분석**(`common.css`) — 공식 사이트 콘텐츠에는 미기재.
- 다크/선명 모드 식별 곤란 이미지는 `darkVariantId`로 대체.
- SVG 아이콘은 CSS `mask-image` + `background-color` 색상 토큰으로 그리고, `[data-krds-mode]` 속성이 모드별 변수(`--krds-light-*`/`--krds-high-contrast-*`)를 적용해 자동 대응. (KRDS는 `currentColor`를 쓰지 않음 — 자체 인라인 SVG+currentColor를 쓸 경우 "KRDS 비호환 자체 방식"으로 명시.)

### 8.2 반응형 (기획서 8.2)

- PC/태블릿/모바일 미리보기 전환(캔버스 폭 제약).
- KRDS 브레이크포인트: `small(360~)` / `medium(768~)` / `large(1024~)` / `xlarge(1280~)`. 디바이스 매핑 — 모바일=360~768, 태블릿=medium(768~1024), PC=1024~. 콘텐츠 최대폭 **1200px**, 화면 마진 모바일 16px / PC 24px.
- 헤더 메뉴는 모바일에서 햄버거/전체메뉴로 전환.
- 표·카드·검색결과는 모바일 재배치.

### 8.3 접근성 (기획서 7-6)

- 이미지 alt 입력 필수(장식용 이미지 제외; 미입력 시 경고).
- 링크 텍스트 명료성(링크 목적 설명) 우선 + URL 형식 검증. 준수 기준: **KWCAG 2.2 / WCAG 2.1**.
- 키보드 이동/초점 표시/색상 대비/오류 메시지 명확화/키보드 트랩 방지.
- 3차에서 자동 점검(대비 경고·alt 누락 경고·SEO 점검)으로 확장.

---

## 9. 1차 MVP 범위

### 9.1 포함

| 영역 | 내용 |
|---|---|
| 레이아웃 | 3패널 에디터 + 상단바 |
| 사이트 설정 | 사이트명·로고·운영기관·기본 모드 |
| 사이트맵 | 트리 CRUD/순서변경(dnd-kit), slug→path 자동 |
| 페이지 편집 | 선택, 캔버스 DnD 배치, 순서/복제/삭제/숨김 |
| 헤더·푸터 | 공통 설정, 전 페이지 적용 |
| 컴포넌트 10종 | KRDS 표준: 헤더·푸터·**마스트헤드**·**건너뛰기 링크**·버튼·이미지·표 / KRDS 비표준(자체): 제목영역·카드 / 조합: 입력폼(입력 카테고리 조합) |
| 우측 패널 | `editableProps` 자동 폼 + 실시간 반영 |
| 미리보기 | 라이트/선명 모드 + PC/태블릿/모바일 |
| 다운로드 | **HTML 전체 사이트** ZIP |
| 영속화 | IndexedDB 자동 저장 |

### 9.2 1차에서 제외 (인터페이스만 확정)

- Vue/React 익스포트 (`exportTemplates.vue/react`는 타입에 존재, 본문은 2차)
- 개별 페이지 다운로드
- 기본 패턴/서비스 패턴 본격 확장 (검증용 1개만)
- 접근성/대비/SEO 자동 점검 (3차)

> **이후 단계 코드 누락 방지 장치**: 타입(`exportTemplates` 3종, `responsive`, `accessibilityProps`, 패턴 팩토리 인터페이스)을 1차부터 모델에 박아두어, 2·3차에서 구조 변경 없이 본문만 채우면 되도록 한다.

---

## 10. 단계별 빌드 순서 (TDD, 각 단계 검증 기준)

```
0. 셋업: Next.js+TS+정적export, KRDS 자산 다운로드/배치
   → 검증: dev 서버 기동 + krds_tokens.css 변수 로드 확인
1. 데이터 모델 + Zustand store + IndexedDB 영속화
   → 검증: 새 Site 생성→새로고침→복원 테스트 통과
2. 컴포넌트 레지스트리 골격 + 8개 정의(Preview + html 템플릿)
   → 검증: 각 컴포넌트 HTML 스냅샷 테스트
3. 3패널 레이아웃 + 사이트맵 트리 CRUD/DnD
   → 검증: 트리 조작 → path 자동계산 테스트
4. 캔버스 DnD 배치 + 컴포넌트 조작(순서/복제/삭제/숨김)
   → 검증: 드롭 → 인스턴스 추가, 순서변경 반영
5. 우측 설정 패널 자동 폼(RHF+Zod) + 실시간 반영
   → 검증: 입력 변경 → 미리보기 즉시 갱신
6. 테마/디바이스 전환
   → 검증: 모드·폭 전환 시 캔버스 반응
7. HTML 익스포트 + ZIP 다운로드
   → 검증: 내보낸 HTML이 사이트맵 구조대로 생성 + 브라우저 정상 렌더
```

---

## 11. 기술 스택 (확정)

- React + TypeScript + **Next.js(정적 export)**
- **dnd-kit** (드래그 앤 드롭)
- **Zustand** (상태)
- **React Hook Form + Zod** (스키마 기반 폼/검증)
- **localforage** (IndexedDB 영속화)
- **JSZip + FileSaver** (다운로드)
- **CSS 변수 기반 KRDS `krds_tokens.css`** (라이트/선명 모드 전환, `data-krds-mode` 토글)
- 테스트: Vitest + React Testing Library (스냅샷/유닛)

---

## 12. 반드시 지킬 구현 원칙 (기획서 12장 요약)

1. 비개발자용 용어/화면.
2. 컴포넌트는 데이터 기반 레지스트리로 확장 가능하게.
3. 우측 패널은 선택 대상에 따라 폼 자동 전환.
4. 입력 변경 → 중앙 화면 실시간 반영.
5. 사이트맵 구조 → 다운로드 파일구조·라우팅에 반영.
6. 헤더/푸터는 전 페이지 공통.
7. 개별 페이지 다운로드 지원(2차).
8. 전체 다운로드 시 모든 페이지·자산·스타일·라우팅 포함.
9. KRDS 원칙/가이드/컴포넌트/패턴 참고.
10. 라이트/선명/시스템 모드 고려.
11. PC/태블릿/모바일 반응형.
12. 접근성 입력값 필수 고려.
13. 복잡한 개발자 기능보다 쉬운 제작 경험 우선.

UI 문구는 모두 한국어.

---

## 13. KRDS 공식 사이트 대조 검증 (2026-06-25)

`www.krds.go.kr` 공식 콘텐츠 + 배포 자산(`KRDS-uiux/krds-uiux` v1.1.0, `vendor/krds/`)을 영역별로 정독해 본 문서를 대조했다. 아래는 그 결과 **수정 완료한 사실 오류**(13.1)와 **결정 완료·반영한 설계 판단 항목**(13.4)이다.

### 13.1 검증으로 수정 완료 (사실 오류)

| # | 항목 | 수정 전 → 수정 후 | 근거 |
|---|---|---|---|
| 1 | 모드 전환 속성 | `data-theme` → **`data-krds-mode`** (선명=`high-contrast`, 시스템=`theme`, 라이트=속성 없음) | 배포 자산 `common.css`. 공식 사이트 콘텐츠엔 미기재 |
| 2 | 테마 파일명 | `krds-theme.css` → **`krds_tokens.css`** (언더스코어, `--krds-*`) | 저장소에 `krds-theme.css` 부재, 실제 토큰 파일 확인 |
| 3 | 아이콘 모드 대응 | `currentColor` → **`mask-image`+`background-color` 색상 토큰 + `[data-krds-mode]` 변수 전환** | `common.css`에 `currentColor` 전혀 없음 |
| 4 | 접근성 alt | "alt 필수" → **"장식 이미지 제외 필수"** | 디지털 포용 페이지(KWCAG 2.2/WCAG 2.1) |
| 5 | 접근성 링크 | "URL 검증" → **"링크 텍스트 명료성 + URL 형식 검증"** | KRDS는 링크 텍스트가 목적지 설명하도록 요구 |
| 6 | 카테고리 | 공식 **11종** 명시(아이덴티티/탐색/레이아웃 및 표현/액션/선택/피드백/도움/입력/설정/콘텐츠/모바일) | 컴포넌트 요약 페이지 |
| 7 | 반응형 | KRDS 브레이크포인트 구체값(small 360/medium 768/large 1024/xlarge 1280, 콘텐츠 최대 1200px, 마진 16/24) 명시 | 레이아웃 스타일 페이지 |
| 8 | 패턴 카탈로그 | 기본 패턴 **11종**·서비스 패턴 **5종** 고정 목록 명시 | 기본/서비스 패턴 소개 페이지 |
| 9 | 폰트 크기 | `baseFontSize` 의미 명확화(본문 17px / rem 루트 10px=62.5%) | 타이포그래피 페이지 |

### 13.2 확정 일치 (변경 불필요)

- 화면 모드 3종(`light`/`high-contrast`/`system`) 모델링 — KRDS "기본/선명하게/시스템 설정"과 정확 대응. **"선명한 화면=High contrast"는 KRDS 페이지 제목 그대로**(시각적으로 어두운 배경이나 목적은 고대비, 다크모드와 다름).
- 토큰 3계층(프리미티브/시멘틱/컴포넌트) 구조.
- 글로벌 요소 전역 1벌 원칙.
- 표(Table)를 단일 컴포넌트로 본 것.
- 디자인 원칙은 KRDS 공식 7종.

### 13.3 토큰 구조 정밀 확인 (자산 전수 비교)

- 프리미티브 팔레트는 `--krds-color-light-*` / `--krds-color-high-contrast-*`로 **변수명이 분리**돼 있고, 107쌍 중 **secondary 11단계만 값이 모드별로 다르고** 나머지(primary·gray 등)는 값이 동일. → "프리미티브가 모드별로 값이 전부 다르다"는 오해 금지. 모드 분기는 **주로 시멘틱 레벨**(예: `surface-gray-subtler` = 라이트 gray-5 / 선명 gray-95)에서 발생.

### 13.4 설계 판단 — 결정 완료·반영 (2026-06-25)

1. **MVP 컴포넌트 범위 → 10종으로 확대**: 기존 8종 유지(`제목영역`·`카드`는 KRDS 비표준 자체 컴포넌트로 명시) + **마스트헤드(공식 배너)·건너뛰기 링크** 추가. (4.1 레지스트리, 9.1 MVP 표 반영)
2. **마스트헤드 → 별도 전역 요소**: `GlobalLayoutSettings.masthead`(`MastheadSettings`)로 헤더와 분리, 스크롤 고정 제외 속성 보유. (3.6, 6.4 반영)
3. **서비스 패턴 멀티스텝 → 타입 지금 확정**: `ServicePattern.steps[]`(여정 단계별 페이지 시퀀스)로 모델. 카탈로그 본문(11/5종)은 2차. (4.4 타입 반영)
4. **헤더/푸터 입력 항목 → 지금 반영**: `HeaderSettings`(유틸리티 링크·검색·전체메뉴·고정·로그인/회원가입/개인메뉴), `FooterSettings`(서비스 로고·운영기관 식별자·`이메일` 선택 강등·유틸리티/정책 링크 분리·SNS·인증마크), `skipLink`. (3.6 타입 반영)
