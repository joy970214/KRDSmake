# KRDS 기반 공공 웹사이트 빌더 — 설계 문서

- 작성일: 2026-06-25
- 상태: 승인됨 (구현 착수 전)
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
  baseFontSize: number;          // px
  // 실제 색/타이포 값은 krds-theme.css 변수가 단일 출처
};

type GlobalLayoutSettings = {
  header: HeaderSettings;        // 기획서 4.4-2 입력항목
  footer: FooterSettings;        // 기획서 4.4-3 입력항목
};
```

### 3.7 모델 불변식 (Invariants)

구현 시 항상 보장해야 하는 규칙:

1. **사이트맵 노드 ↔ 페이지는 1:1**. 노드 생성 시 페이지 자동 생성, 노드 삭제 시 페이지 삭제.
2. **`path`는 파생 값**: 부모 노드 `slug`들을 `/`로 이어 자동 계산. 사용자는 `slug`만 입력. 부모 변경/순서변경 시 자손 `path` 재계산.
3. **홈 노드는 정확히 1개**. `path = "/"`.
4. **자산 바이너리는 IndexedDB에만** 존재. `Site` JSON에는 `blobKey` 참조만.
5. **헤더/푸터는 사이트 전역 1벌**. 페이지별로 따로 두지 않음.

---

## 4. 컴포넌트 레지스트리 설계

### 4.1 디렉터리 구조

```
src/registry/
  index.ts                 // Map<id, ComponentDefinition>로 모아서 export
  categories.ts            // 카테고리 메타(아이덴티티/탐색/액션 등)
  types.ts                 // ComponentDefinition 등 타입
  components/
    header.tsx
    footer.tsx
    page-title.tsx
    button.tsx
    image.tsx
    card.tsx
    table.tsx
    input-form.tsx
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

- **기본 패턴**: `(): ComponentInstance[]` 팩토리. 드롭하면 여러 인스턴스로 펼쳐져 각각 개별 편집 가능(기획서 4.2.3).
- **서비스 패턴**: 새 페이지 생성 시 `page.components`를 채우는 템플릿. 사용자 여정 기반 구조(기획서 4.2.4).
- MVP에서는 인터페이스만 확정하고 "입력 폼" 기본 패턴 1개 정도로 검증, 본격 확장은 2차.

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
- 캔버스 컨테이너에 `data-theme`(모드) + 폭 제약(디바이스) 적용.

### 6.4 우측 설정 패널 (selection별)

| selection | 폼 내용 |
|---|---|
| site | 사이트명·설명·운영기관·로고·기본 모드·연락처·저작권·링크 (기획서 4.4-1) |
| header | 로고/사이트명/배너/검색/전체메뉴/고정/로그인 표시 여부 (4.4-2) |
| footer | 운영기관·주소·전화·이메일·저작권·링크·SNS·인증마크 (4.4-3) |
| page | 제목·URL·상위메뉴·노출·SEO·브레드크럼·목차·개별 다운로드 (4.4-4) |
| component | 해당 정의의 `editableProps`에서 **자동 생성된 폼** (4.4-5) |

**설계 원칙**(기획서 4.3): 개발 용어 대신 쉬운 한국어, 변경 즉시 미리보기 반영, URL 검증, 이미지 alt 필수, 필수값 표시, 오류 안내.

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
- **KRDS 테마**: `krds-theme.css`를 전 결과물에 포함, 사용자 설정은 `style.css` 변수 오버라이드.

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

- 기본(light) / 선명한 화면(high-contrast) / 시스템.
- CSS 변수 + `data-theme` 토글로 미리보기·익스포트 공통 처리.
- 다크/선명 모드 식별 곤란 이미지는 `darkVariantId`로 대체.
- SVG 아이콘은 색상 토큰(`currentColor`/CSS 변수)으로 모드 자동 대응.

### 8.2 반응형 (기획서 8.2)

- PC/태블릿/모바일 미리보기 전환(캔버스 폭 제약).
- 헤더 메뉴는 모바일에서 햄버거/전체메뉴로 전환.
- 표·카드·검색결과는 모바일 재배치.

### 8.3 접근성 (기획서 7-6)

- 이미지 alt 입력 필수(미입력 시 경고).
- URL 입력 검증, 링크 목적 명확화 필드.
- 키보드 이동/초점 표시/색상 대비/오류 메시지 명확화.
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
| 컴포넌트 8종 | 헤더·푸터·제목영역·버튼·이미지·카드·표·입력폼 |
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
   → 검증: dev 서버 기동 + krds-theme.css 변수 로드 확인
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
- **CSS 변수 기반 KRDS theme.css** (라이트/선명 모드 전환)
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
