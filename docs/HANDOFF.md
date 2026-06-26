# 작업 인수인계 (이어서 진행용)

- 최종 업데이트: 2026-06-26 (4-2~4-5 완료 반영 — 다단 레이아웃·LNB·트리 UX·카테고리 메뉴)
- 저장소: `git@github.com:joy970214/KRDSmake.git` (브랜치 `master`)
  ✅ **origin/master와 동기화됨**(이번 세션 작업 전부 push 완료, `b7f1d3c` 기준).
- 프로젝트: KRDS 기반 공공 웹사이트 빌더 (노코드, 정적 export)

> **재개 시 다음 작업 = Step 5(우측 설정 패널 자동 폼). §4 참조.**
> 이번 세션 완료: 4-2(가로 다단 레이아웃)·4-3(좌측 LNB)·4-4(사이트맵 트리 UX 개편)·4-5(카테고리 메뉴),
> 모두 TDD + 실브라우저 검증 끝남(§4-2~§4-5 참조).
> ⚠️ **Step 5 착수 전 체크리스트는 §4 하단에 모아둠** — 먼저 읽을 것.

---

## 1. 지금 어디까지 됐나

설계 문서 `docs/superpowers/specs/2026-06-25-krds-website-builder-design.md` 의
10장 빌드 순서(0~7) 기준:

| 단계 | 내용 | 상태 |
|---|---|---|
| 0 | Next.js 정적 export + KRDS 자산 연결 | ✅ |
| 1 | 데이터 모델 + Zustand store + IndexedDB 영속화 | ✅ |
| 2 | 컴포넌트 레지스트리 + 10종 정의(Preview + HTML 템플릿) | ✅ |
| 3 | 3패널 에디터 + 사이트맵 트리 CRUD/순서변경 | ✅ |
| 4 | 캔버스 DnD 배치 + 컴포넌트 조작(순서/복제/삭제/숨김) | ✅ |
| 4+ | 인스턴스 드래그 핸들(`⠿`)로 순서변경 + 드롭 위치 삽입 (커밋 `028a950` "②") | ✅ |
| **4-2** | **가로 다단 레이아웃 (사용자 보고 #3)** — TDD 1~8단계 + 실브라우저 검증 완료 | ✅ |
| **4-3** | **페이지 좌측 사이드바(LNB)** — 사이트맵 자동파생 + 페이지별 토글 + 그리드 1200px 이전 | ✅ |
| **4-4** | **사이트맵 트리 UI/UX 개편** — DnD 재배치 + 활성강조 + 호버액션 + 추가즉시편집/slug자동 | ✅ |
| **4-5** | **카테고리 메뉴(섹션 랜딩)** — isCategory 토글 + 카테고리 제목클릭→첫 하위 콘텐츠로 라우팅 | ✅ |
| 5 | 우측 설정 패널 자동 폼(RHF+Zod) + 실시간 반영 (RHF/Zod 미설치 확인됨) | ⬜ **다음** |
| 6 | 테마(라이트/선명/시스템) + 디바이스 전환 | ⬜ |
| 7 | HTML 익스포트 + ZIP 다운로드 | ⬜ |

- 테스트: **168개 통과**(25 파일) · lint 0 · tsc 0 · static export 빌드 성공
- 화면 확인됨: 3패널 에디터 + 팔레트→캔버스 배치/선택/복제/순서변경, **가로 다단(2~4단) 배치**,
  **좌측 LNB [사이드바|본문] 2칼럼**, **사이트맵 트리 DnD 재배치/활성강조/호버액션**, **카테고리 토글/배지**
  (scratchpad `f65ad225`: layout-result.png, lnb-desktop.png, tree-dnd.png, category.png)

### 4-5. 카테고리 메뉴(섹션 랜딩) — 한 것 / 후속
- 설계 `docs/superpowers/specs/2026-06-26-category-menu-design.md`, 계획 `…/plans/2026-06-26-category-menu.md`. 커밋 `a91ad9e`(isCategory+resolveTargetPageId)·`19ee712`(setNodeCategory)·`b9ada46`(트리 UI).
- **모델**: `SitemapNode.isCategory?`(1:1 불변식 유지 — 카테고리 노드도 페이지 보유, 직접 안 보임).
- **순수** `lib/sitemap.ts resolveTargetPageId(sitemap, nodeId)`: 카테고리면 **전위 탐색으로 첫 비-카테고리 하위** pageId(체인 관통), 없으면 자기로 폴백, 없는 노드는 입력 반환.
- **store** `setNodeCategory(id, isCategory)`. **UI**: 트리 행에 카테고리 토글(🗂, **하위 있는 노드에만**, `aria-pressed`) + "카테고리" 배지. 카테고리 노드 **제목 클릭 → `resolveTargetPageId`로 첫 하위 콘텐츠 페이지 활성화**.
- ⚠️ **후속**: 익스포트(Step 7)에서 카테고리 페이지 = 첫 하위로 HTML 리다이렉트 배선 / 브레드크럼·캔버스에서 카테고리 별도 표현.

### 4-4. 사이트맵 트리 UI/UX 개편 — 한 것 / 후속
- 설계 `docs/superpowers/specs/2026-06-26-sitemap-tree-ux-design.md`, 계획 `…/plans/2026-06-26-sitemap-tree-ux.md`. 커밋 `50c0f2a`(flatten/slugify)·`5a2ebbe`(getProjectedDrop)·`bac1a1a`(트리 재작성)·`a8091f8`(DnD).
- **순수 로직** `src/lib/tree-dnd.ts`: `flattenTree`(평탄화+depth) / `slugify`(영문 slug, 한글→"") / `getProjectedDrop`(dnd-kit 평탄화+수평이동 뎁스투영 → `{parentId,index}|null`, 자손 드롭 제외=순환방지).
- **`SitemapTree.tsx` 재작성**: 평탄 리스트 + 트리 전용 `DndContext`/`SortableContext`(PointerSensor+KeyboardSensor). 드래그 핸들(⠿) 별도라 제목 클릭 선택 유지. `onDragEnd`→`getProjectedDrop`→`moveNode(id,parentId,index)`(try/catch). 드롭 인디케이터 선.
- **개선 4종**: ① DnD 재배치(뎁스 변경 포함) ② 현재 페이지 `.is-active` 강조 ③ 액션 버튼 호버/선택 시만 노출(↑↓ 제거) ④ ＋추가 즉시 인라인 편집(제목 autofocus)+slug 자동(`slugDirty`로 수동 우선).
- ⚠️ **후속**: 키보드로 뎁스 변경/재배치(현재 KeyboardSensor는 세로 재정렬만), 노드 접기/펼치기(collapse), 멀티선택 드래그.

### 4-3. 좌측 사이드바(LNB) — 한 것 / 설계근거 / 후속
- 설계: `docs/superpowers/specs/2026-06-26-krds-page-sidebar-lnb-design.md`, 계획: `docs/superpowers/plans/2026-06-26-krds-page-sidebar-lnb.md`. 커밋 `c73fbf1`(buildLnb)·`31e245c`(showSidebar+액션)·`495ac1a`(Canvas+CSS).
- **자동 파생**: `lib/lnb.ts buildLnb(sitemap, currentNodeId)` → 현재 페이지의 최상위 섹션 하위 트리를 LNB로, 현재 항목 강조. 홈/자식없는섹션/없는노드 → `null`(미표시).
- **스타일 = KRDS 공식 사이드 메뉴**(component_03_04, 커밋 `32432b4`): `nav.krds-side-navigation > h2.lnb-tit + ul.lnb-list > li.lnb-item(.lnb-btn.lnb-toggle|lnb-link) > .lnb-submenu > li.lnb-subitem`. 스타일은 **벤더 output.css가 담당**(앱이 이미 로드) — 커스텀 LNB CSS 없음. 현재 페이지 가지를 `active`로 펼침(KRDS JS 없이 클래스로), 활성=`aria-current="page"`+`selected`. 4depth↑는 3depth 목록에 평면 합침(KRDS 권장 ≤2단).
  - ⚠️ **익스포트(Step 7)**: 비활성 메뉴 토글 펼침/접힘 클릭은 KRDS JS(`vendor/krds/.../ui-script.js` 또는 `krds.min.js`)가 필요 — export HTML에 KRDS JS 배선 필요. 에디터 미리보기는 active 가지만 정적 펼침이라 JS 불필요.
- **노출**: `Page.showSidebar?`(미설정=켜짐). 표시판정 `(showSidebar ?? true) && buildLnb≠null` → **홈 외 기본 켜짐**(홈은 buildLnb null로 자동 숨김). 토글=캔버스 상단 "사이드바 표시" 체크박스 → `setPageSidebar`.
- **레이아웃**: 헤더/푸터 사이 `.page-frame`(max-width **1200px**·`margin:auto`·flex·gap24)에 `<nav.krds-side-navigation>`(260px)+`<main.canvas-page>`. **1200px 제약을 `.krds-grid` 블록에서 `.page-frame`로 이전**(블록은 `width:100%`) → 사이드바로 본문 좁아져도 다단블록 정상. 모바일(<768px) 1단 스택(미디어쿼리).
- **LNB는 읽기전용**(링크 preventDefault, ComponentInstance 아님 — 선택/드롭/익스포트 대상 아님).
- ⚠️ **후속/주의**:
  1. **토글의 Step 5 이전**: 캔버스 상단 "사이드바 표시"는 임시 진입점 → Step 5 우측 자동 폼에 `showSidebar` 필드로 옮길 것.
  2. ~~홈에서도 토글 체크박스가 보이지만 효과 없음~~ → ✅ 해결(커밋 `e60fc28`): `lnb≠null`일 때만 토글 노출(홈·하위없는 단독메뉴는 숨김).
  3. **익스포트 LNB 주입은 Step 7**: 현재 `.page-frame`/LNB는 에디터 캔버스에만. HTML 익스포트에 반영 필요.
  4. 모바일 1단 스택은 에디터 셸(데스크톱 고정)에선 육안확인 불가 — Step 6 디바이스 프리뷰/익스포트에서 의미.

## 2. 재개 명령어

```bash
cd /mnt/data/project/jyj/KRDSmake
npm run dev        # 개발 서버(자동으로 vendor/krds → public/krds 복사)
npm test           # vitest (watch: npm run test:watch)
npm run build      # 정적 export → out/
npm run lint       # eslint
```

### 외부에서 화면 보기 (현재 띄워둔 서버)

- 정적 빌드를 `serve`가 `0.0.0.0:17200`에서 서빙 중(머신 로컬 IP는 내부망 192.168.x — 외부 접속은
  NAT/포트포워딩 주소로, 사용자는 `http://175.213.188.161:17200`로 접속). 포워딩이 이 머신 `:17200`을
  가리키면 됨. 화면이 안 바뀌면 포워딩 대상 포트/머신부터 확인.
- 코드 바꾼 뒤 반영하려면: `npm run build` (serve가 out/을 라이브로 읽음) + 브라우저 강력 새로고침.
- 서버 재기동: `npx serve out -l tcp://0.0.0.0:17200`
- 중지: `pkill -f 'serve out'`
- ⚠️ **HTTP+외부IP = 비보안 컨텍스트**. `crypto.randomUUID`·`crypto.subtle`·
  `navigator.clipboard` 등 secure-context 전용 API는 undefined다.
  id는 반드시 `src/lib/ids.ts`의 `newId()`(폴백 내장) 사용.

## 3. 코드 구조 (어디에 뭐가 있나)

```
src/
  app/                  # Next App Router
    layout.tsx          # lang=ko, KRDS output.css 링크, Pretendard GOV 폰트
    page.tsx            # <AppRoot/> 렌더 (단일 라우트)
    editor.css          # 3패널 레이아웃 스타일(KRDS 토큰)
    globals.css, krds-fonts.css
  lib/
    types.ts            # 도메인 모델(Site/SitemapNode{isHome?,isCategory?}/Page{showSidebar?}/ComponentInstance{columns?}/…)
    ids.ts              # newId() — 비보안 컨텍스트 폴백 포함
    sitemap.ts          # joinPath, recomputePaths, resolveTargetPageId(카테고리→첫 하위, 4-5)
    lnb.ts              # buildLnb(사이트맵→좌측 LNB 파생, 4-3)
    tree-dnd.ts         # flattenTree/slugify/getProjectedDrop(사이트맵 트리 DnD, 4-4)
    dnd-plan.ts         # planDrop(캔버스 드롭 라우팅 + 칼럼 add-to-column, 4-2)
    site-factory.ts     # createSite(홈노드+1:1페이지)
    persistence.ts      # localforage save/load/clear (IndexedDB)
  store/
    editor-store.ts     # Zustand vanilla store + 액션 (★ 여기에 액션 추가)
    context.tsx         # EditorStoreProvider / useEditorState / useEditorStoreApi
    use-bootstrap.ts    # 복원 or 생성 + 디바운스 자동저장
  registry/
    types.ts            # ComponentDefinition / PreviewCtx / ExportCtx / EditablePropSchema
    helpers.ts          # escapeHtml, attr, thumb(n), pending2x
    index.ts            # 10종 등록 Map + getComponent/listComponents
    components/*.tsx     # 컴포넌트 10종(Preview + html 템플릿)
  components/
    AppRoot.tsx         # store 생성 + bootstrap + Provider
    AppShell.tsx        # 상단바 + 3패널
    Canvas.tsx          # 중앙 — KRDS 미리보기 + 드롭 타깃 + 인스턴스 선택/조작 툴바
    left/
      LeftPanel.tsx     # 사이트맵/컴포넌트 탭
      SitemapTree.tsx   # 사이트맵 트리 — DnD 재배치/활성강조/호버액션/인라인편집/카테고리 토글(4-4,4-5)
      ComponentPalette.tsx # draggable 카드(배치가능 6종만; 전역요소 제외)
```

자산(커밋됨, gitignore된 public/ 복사본은 빌드 때 생성):
- `vendor/krds/` — KRDS HTML Component Kit v1.1.0 (PROVENANCE.md)
- `vendor/krds-thumbnails/` — 컴포넌트 썸네일 55종 + `manifest.json`(번호↔컴포넌트)

## 4. 다음 작업 = Step 5 상세 (우측 설정 패널 자동 폼)

설계 검증기준: **인스턴스 선택 → 우측에 자동 폼 → 입력 시 캔버스 실시간 반영.**

이미 깔린 토대(Step 4에서):
- `store.selection`(`{kind:'component', pageId, instanceId}` | null) — 캔버스 선택 시 설정됨.
- `store.updateComponentProps(pageId, instanceId, patch)` — props 병합(테스트 완료).
- 각 컴포넌트 정의의 `editableProps: EditablePropSchema[]`(이미 10종 작성됨,
  `registry/types.ts`의 `EditablePropType` 12종: text/textarea/url/number/select/
  radio/checkbox/image/color/repeater/table/date).

해야 할 것:
1. **우측 패널 컴포넌트**(`AppShell.tsx`의 `.panel-right` 자리): `selection`을 구독해
   선택된 인스턴스의 `def.editableProps`로 폼을 자동 생성.
2. **RHF + Zod**(설치 여부 확인 필요): 스키마→Zod 리졸버 매핑, 필드 타입별 위젯.
   `onChange`마다 `updateComponentProps` 호출(디바운스 가능) → 캔버스 즉시 반영.
3. **전역요소 선택**: 헤더/푸터/마스트헤드는 팔레트에 없으므로(전역) 별도 진입점 필요.
   설계 §5 `Selection`에 `{kind:'global', target:'header'|'footer'|'masthead'}` 추가 고려.
   (Step 4에선 component 종류만 구현함.)

주의: `EditablePropType`에 repeater/table/image 등 복합 타입 있음 → MVP는 단순 타입
(text/textarea/url/number/select/radio/checkbox)부터, 복합은 후속.

### ⚠️ Step 5 착수 전 체크리스트 (이번 세션 작업에서 누적된 선결 항목)
1. **`updateComponentProps` 재귀화** [§4-2]: 현재 최상위 인스턴스만 탐색 → 다단 레이아웃 **칼럼 안 자식**의
   props를 우측 폼으로 편집하려면 칼럼까지 재귀해야 함(`removeFromList` 패턴 참고). `toggleHidden`/
   `duplicateComponent`/`reorderComponent`도 동일하게 최상위 전용임(필요 시 함께).
2. **LNB "사이드바 표시" 토글 이전** [§4-3]: 캔버스 상단의 임시 토글(`Page.showSidebar`)을 Step 5 우측
   폼의 페이지 설정 필드로 옮길 것.
3. **전역요소 선택 진입점** [위 3번]: 헤더/푸터/마스트헤드는 팔레트에 없음 → `Selection`에
   `{kind:'global', target:...}` 추가해 우측 폼에서 편집.

## 4-2. 가로 다단 레이아웃 — ✅ 완료 (참고용 설계 기록)

사용자 보고 4가지 → 현재 상태:

| # | 보고 | 상태 |
|---|---|---|
| 1 | 드래그로 위아래 순서변경 안 됨 | ✅ 해결 — 인스턴스 드래그 핸들 `⠿` + dnd-kit sortable (`Canvas.tsx`) |
| 2 | 드롭한 위치 무시하고 맨 아래 배치 | ✅ 해결 — 드롭 위치 삽입 (커밋 `028a950`) |
| 3 | **레이아웃이 1단(세로 1열)만 됨 = "가로 갈래"** | ✅ 해결 — 다단 레이아웃 블록(4-2, 아래) |
| 4 | 컴포넌트 종류 적음 | ⬜ 백로그(배치가능 6종: 버튼/카드/이미지/입력폼/제목영역/표. 전역 4종 제외) |

### KRDS 레이아웃 근거 (사용자가 지정한 출처)
출처: https://www.krds.go.kr/html/site/style/style_05.html (사용자가 직접 링크 제공 — 이 기준 준수)
- 반응형 컬럼 그리드: **large(1024~) 12–16칼럼 / medium(768~) 8–12 / small(360~) 4–6**
- 콘텐츠 최대폭 **1200px**, 거터 **16–24px**(large/medium 최적 24, small 16), 스크린 마진 PC 24 / 모바일 16
- **핵심 원칙: "동일 화면에서 칼럼 수를 혼용하지 말 것"**(시각적 일관성) → 행 단위 N등분 설계 근거
- ⚠️ **중요 확인**: 벤더링된 KRDS HTML Component Kit(`vendor/krds`)에는 **재사용 그리드 클래스(`.col-6` 류)가 없음**. `.grid`/`.row`/`.column`은 폼 등 특정 컴포넌트 전용. → 다단 그리드는 KRDS 수치를 따르되 **우리가 직접 구현**(`display:grid`)해야 함. 임의 `.col-*` 클래스 만들지 말 것.

### ✅ 확정 방향 (2026-06-26 사용자 승인: "레이아웃 블록 N등분 방향으로 진행")
**"다단 레이아웃" 블록을 새 배치 컴포넌트(컨테이너)로 추가:**
- 팔레트에서 드래그 → 기본 2단 생성. 선택 시 **2/3/4단** 변경(인스턴스 툴바 컨트롤).
- 각 칼럼이 개별 드롭 영역 → 그 안에 일반 컴포넌트를 드롭(가로 나란히 배치).
- 그리드: `display:grid` + 콘텐츠폭 1200px + 거터 24px, **PC만 N단 / 모바일 자동 1단 스택**.
- 한 행 = 고정 칼럼수 → KRDS "혼용 금지" 원칙 자동 충족.

### ✅ 확정 설계 (구현 상세 — 단순화 우선)
- **모델**: `ComponentInstance.columns?: ComponentInstance[][]` (레이아웃 인스턴스만 보유, `columns.length`=단 수). → `lib/types.ts`에 추가함(아래 "현재 진행 위치").
- **레지스트리**: 새 `registry/components/layout.tsx` — `id:"layout"`, `name:"다단 레이아웃"`, `category:"레이아웃 및 표현"`, `isKrdsStandard:false`(KRDS에 범용 그리드 컴포넌트 없음 — 정직하게 false), `defaultProps:{columns:2}`. **`container` 마커**를 def에 둬서(예: `container?: { columnCountProp: "columns" }`) store가 "이건 컨테이너, 초기 단 수는 defaultProps.columns"임을 알게 함. `ComponentDefinition` 타입(`registry/types.ts`)에 `container?` 추가 필요. `listPlaceableComponents()`에 자동 포함(전역 아님).
- **store 액션**(순수 — 먼저 TDD):
  1. `addComponent`가 `def.container` 있으면 `instance.columns = Array(N).fill(()=>[])`로 초기화.
  2. `addComponentToColumn(pageId, layoutInstanceId, columnIndex, defId, index?)` → 자식 id 반환.
  3. `setLayoutColumns(pageId, layoutInstanceId, count)` → columns 배열 리사이즈(축소 시 넘치는 자식은 마지막 칼럼으로 이동, 보존).
  4. `removeComponent`를 **재귀화**(칼럼 안 자식도 검색·제거) — 잘못 드롭한 자식 삭제용.
- **Canvas**(`Canvas.tsx`): 인스턴스에 `.columns` 있으면 **특수 렌더** — `<div class="krds-grid">` + 칼럼별 `useDroppable`(id `col:<layoutId>:<index>`) + 각 칼럼 자식들을 그 def.Preview로 렌더. 선택 툴바에 2/3/4단 버튼 추가.
- **dnd-plan/AppShell**: 드롭 타깃 ID 체계 확장. 칼럼 droppable id = `col:<layoutId>:<colIndex>`. `planDrop`이 이 id를 해석해 `addComponentToColumn`/칼럼 내 이동으로 라우팅. (기존 평면 `canvas-page` 경로는 유지.)
- **CSS**: `.krds-grid{display:grid;gap:24px;grid-template-columns:repeat(var(--cols),1fr);max-width:1200px}` 류를 추가(`app/editor.css` 또는 별도). 모바일 1단 접힘은 미디어쿼리(디바이스 전환 Step6과 연계).
- **익스포트(Step7로 연기)**: `exportTemplates.html`은 일단 그리드 래퍼만. 자식 주입은 익스포트 파이프라인이 columns를 재귀 처리할 때(Step7) 배선. 지금 과하게 만들지 말 것.

### TDD 작업 순서 — ✅ 전부 완료
1. ✅ 모델 타입 확장(`lib/types.ts` `columns?`, `registry/types.ts` `container?`) — 커밋 `01988ce`
2. ✅ 레지스트리 `layout` def(`layout.test.tsx`) — 커밋 `01988ce`
3. ✅ store `addComponent` 컨테이너 초기화 + `buildInstance` 헬퍼 — 커밋 `773424a`
4. ✅ store `addComponentToColumn` — 커밋 `773424a`
5. ✅ store `setLayoutColumns`(리사이즈+자식 보존+`props.columns` 동기화) — 커밋 `1ed8ae4`
6. ✅ store `removeComponent` 재귀화(`removeFromList`) — 커밋 `1ed8ae4`
7. ✅ `dnd-plan` 칼럼 라우팅(`columnDroppableId`/`add-to-column`) — 커밋 `ce262b8`
8. ✅ Canvas/AppShell 배선 + 그리드 CSS — 커밋 `ce262b8`

> **실브라우저 검증 완료**(이번 세션): 다단 레이아웃 배치→2칼럼, 버튼을 칼럼0에 드롭→자식1,
> 4단 버튼→4칼럼. scratchpad `f65ad225`의 `verify-layout.mjs` / `layout-result.png`.
> ⚠️ scratchpad 스크립트는 ESM이라 `playwright` resolve 위해 **프로젝트 루트에서 실행**해야 함
> (scratchpad에서 직접 `node`는 `ERR_MODULE_NOT_FOUND`). 루트에 복사 후 실행·삭제했음.

#### ⚠️ Step 5 선결: `updateComponentProps` 재귀화
→ §4 하단 "Step 5 착수 전 체크리스트" 1번 참조. (칼럼 안 자식 props 편집을 위해 재귀 필요.
선택 `selectComponent`/재귀 제거 `removeComponent`는 자식 id로 이미 정상 동작. 칼럼 자식 툴바는 현재 "삭제"만 노출.)

#### MVP에서 의도적으로 뺀 것(후속/백로그)
- 칼럼 **내부** 자식 순서변경 / 칼럼 간 이동(드래그) — MVP는 "드롭해 배치 + 제거"까지. 재정렬은 후속.
  (`planDrop`도 칼럼 위 기존 인스턴스 이동은 `null` 반환 = 미지원.)
- 레이아웃 **중첩**(레이아웃 안에 레이아웃) — 팔레트에 layout 있어 가능은 하나 UX 미검증. 막을지 결정 필요.
- 익스포트 자식 주입(Step7) — `layout.tsx` html 템플릿은 빈 그리드 래퍼만. columns 재귀 주입 배선 필요.

## 4-1. Step 4에서 한 것 (참고)

- store 액션(TDD): `addComponent`(defaultProps `structuredClone` 깊은복사·index 삽입),
  `reorderComponent`·`duplicateComponent`·`removeComponent`·`toggleHidden`·
  `updateComponentProps`·`selectComponent`·`clearSelection`. `order`는 배열 index와
  `renumber()`로 동기화. 삭제 시 선택 자동 해제.
- 레지스트리: `listPlaceableComponents()` + `GLOBAL_COMPONENT_IDS`(전역 4종 제외).
- dnd-kit: `AppShell`에 `DndContext`(PointerSensor distance:4) + `onDragEnd`→`addComponent`.
  `ComponentPalette` 카드 = `useDraggable`(id `palette:<defId>`), `Canvas` 본문 = `useDroppable`
  (id `canvas-page`). 드롭하면 추가+선택.
- Canvas 조작 UI: 인스턴스 위 투명 `.ci-select` 버튼으로 선택, 선택 시 `.ci-toolbar`
  (위/아래/복제/숨김↔표시/삭제). 숨김 인스턴스도 편집용으로 렌더(흐리게+배지).
- 검증: vitest 109통과, tsc/lint 0, static build OK, 헤드리스 실브라우저 드래그 배치 확인.

## 5. 알아둘 점 / 결정사항

- **TDD 필수**: 모든 단계 red→green으로 진행 중. 액션은 먼저 실패 테스트 작성.
- **dnd-kit는 설치만 됨**: Step3 트리 순서변경은 접근성 ↑↓ 버튼으로 했고,
  본격 드래그는 Step4에서 캔버스 배치와 함께 도입 예정.
- **설계 §13.4 확정 결정**(이미 모델 반영됨): MVP 컴포넌트 10종(마스트헤드·건너뛰기
  링크 포함), 마스트헤드=별도 전역요소, 서비스패턴=멀티스텝 타입, 헤더/푸터 항목 보강.
- **vue/react 익스포트**: 타입엔 있고 호출 시 `pending2x`로 에러(2차 구현). 1차는 HTML만.
- **컴포넌트 비표준 2종**: 제목영역·카드(`isKrdsStandard:false`). 카드는 구조화목록 기반.
- **eslint 의도적 off**: `no-css-tags`(KRDS CSS 정적서빙), `no-img-element`·
  `no-html-link-for-pages`(레지스트리는 "사용자가 만드는 사이트"의 마크업).
- 헤드리스 검증: playwright 캐시 브라우저 사용
  (`executablePath: ~/.cache/ms-playwright/chromium-1223/chrome-linux64/chrome`).
  비보안 컨텍스트 흉내는 `addInitScript(()=>delete Crypto.prototype.randomUUID)`.

## 6. 미해결 / 백로그

- ~~사이트맵 트리 드래그 앤 드롭~~ → ✅ 완료(4-4, 재배치 포함). 후속: 키보드 뎁스변경, 노드 접기.
- 카테고리/LNB **익스포트 배선**(Step 7): 카테고리=첫 하위 리다이렉트, LNB 토글 펼침용 KRDS JS.
- 헤더/푸터 익스포트는 **MVP 단순화 버전**(KRDS 459줄 헤더의 핵심 골격만). 추후 충실화.
- 이미지 컴포넌트 등 자산 업로드(IndexedDB Blob) — 좌측 5번째 탭, 아직 없음(설계 §6.2).
- KRDS `component.css`의 `img/img/` 경로 오타로 ico_flag 아이콘은 미사용 상태
  (현재 output.css만 로드해 회피).
