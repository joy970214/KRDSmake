# 작업 인수인계 (이어서 진행용)

- 최종 업데이트: 2026-06-29 (**Step 5 우측 설정 자동 폼 구현 완료** — SDD 6 task + 검증 보강)
- 저장소: `git@github.com:joy970214/KRDSmake.git` (브랜치 `master`)
  ⚠️ origin보다 **앞섬** — Step 5 설계(`8a6a9af`)·계획(`09c58d1`) + Step5 구현 커밋들 미푸시.
- 프로젝트: KRDS 기반 공공 웹사이트 빌더 (노코드, 정적 export)

> **재개 시 다음 작업 = Step 6 (테마 라이트/선명/시스템 + 디바이스 전환).** 설계·계획 아직 없음 →
> 브레인스토밍 → writing-plans → subagent-driven-development 순서.
>
> 이번 세션 완료: **Step 5 우측 설정 자동 폼**(§Step5). 스키마 기반 자동 폼(RHF/Zod 미사용),
> 2모드(컴포넌트/페이지), KRDS 폼 마크업 위젯 12종, 실시간 반영, 캔버스 사이드바 토글→페이지 설정 폼 이전.

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
| **4-6** | **컴포넌트 KRDS 충실도 audit** — 원칙 명문화 + error 4건(button/table/header/footer) 교정 | ✅ |
| **5** | **우측 설정 패널 자동 폼 + 실시간 반영** (RHF/Zod 안 씀, 스키마 기반 직접 구현) | ✅ |
| 6 | 테마(라이트/선명/시스템) + 디바이스 전환 | ⬜ |
| 7 | HTML 익스포트 + ZIP 다운로드 | ⬜ |

- 테스트: **190개 통과**(28 파일) · lint 0 · tsc 0 · static export 빌드 성공
- 화면 확인됨: 3패널 에디터 + 팔레트→캔버스 배치/선택/복제/순서변경, **가로 다단(2~4단) 배치**,
  **좌측 LNB [사이드바|본문] 2칼럼**, **사이트맵 트리 DnD 재배치/활성강조/호버액션**, **카테고리 토글/배지**
  (scratchpad `f65ad225`: layout-result.png, lnb-desktop.png, tree-dnd.png, category.png)

### Step 5. 우측 설정 자동 폼 (완료)
- 설계 `docs/superpowers/specs/2026-06-26-step5-settings-form-design.md`, 계획 `…/plans/2026-06-26-step5-settings-form.md`(SDD 6 task).
- 커밋: `582f599`(store)·`4c30105`(Field 단일값)·`6644bbf`(Field repeater/table)·`8e25455`(ComponentForm)·`5275004`(RightPanel+PageSettings+배선)·`6b69d4e`(빈 캔버스 클릭 선택해제 보강).
- **store**(`editor-store.ts`): `updateComponentProps` **재귀화**(칼럼 자식 patch) + `findInstance`(export, 재귀 탐색) + `updatePageMeta(pageId, patch)`. `setPageSidebar` **제거**(updatePageMeta로 대체).
- **위젯**(`src/components/right/Field.tsx`): `EditablePropType` 12종 → KRDS 폼 마크업(`.form-group>.form-tit>label + .form-conts>입력 + .form-hint`). text/url/number/date=`krds-input`, textarea=`.textarea-wrap`, select=`krds-form-select`, radio/checkbox=`.krds-check-area`, color=네이티브, **image=URL 입력+미리보기**(파일 업로드 후속), repeater(string[])·table(string[][])=빌더 내부 편집기.
- **자동 폼**(`ComponentForm.tsx`): 선택 인스턴스의 def `editableProps`로 Field 조합, `onChange`→`updateComponentProps` **실시간 반영**. 칼럼 자식도 편집(findInstance 재귀).
- **2모드**(`RightPanel.tsx`): `selection.kind==="component"`→ComponentForm / 없으면 활성 페이지 `PageSettingsForm`(사이드바·브레드크럼·인페이지내비 토글 + SEO 제목/설명). `AppShell` 우측 패널이 RightPanel 렌더.
- **캔버스 토글 이전**: 캔버스 상단 "사이드바 표시" 임시 토글 제거 → 페이지 설정 폼으로. **빈 캔버스 배경 클릭 시 `clearSelection`**(자식 클릭은 `e.target===e.currentTarget` 가드 제외)으로 페이지 설정 폼 복귀 동선 추가.
- 검증: 실브라우저(드롭→버튼 글자 "신청하기" 실시간 반영, 선택해제→페이지 설정 전환) 통과. scratchpad `00f44446`: step5-component.png / step5-page.png.
- ⚠️ **후속/백로그**:
  1. **전역요소 편집**(헤더/푸터/마스트헤드)=Step 5 범위 밖: `Selection {kind:'global', target}` + 전역 3종 `editableProps` + 선택 진입점.
  2. **파일 업로드**(image 자산): IndexedDB Blob·자산 목록·alt(좌측 자산 탭). 현재 image는 URL만.
  3. **폼 입력 컴포넌트 확충**(결과 사이트용 select/radio/checkbox/textarea/date) — audit §4-6 백로그.
  4. **PageSettingsForm 체크박스 시각 마감**: 간이 `.krds-form-check.inline` 구조라 KRDS 커스텀 체크박스 스타일 미적용(네이티브 체크박스). 기능 정상, 시각 폴리시 후속.
  5. **⚠️ 페이지 설정 일부는 현재 persist-only(렌더 소비처 없음)** — 설계가 의도적으로 둔 forward-looking 메타데이터. `showSidebar`만 캔버스가 소비(LNB). **`showBreadcrumb`·`showInPageNavigation`는 렌더러 미구현**(브레드크럼/인페이지 내비 렌더 = Step 6/7 소관), `seoTitle`/`seoDescription`은 **익스포트(Step 7)에서 소비** 예정. 토글해도 지금은 캔버스 변화 없음 — 후속 단계에서 배선.
  6. `set` 헬퍼 복합 타입표기(`Parameters<ReturnType<...>>`)·repeater/table index key는 무해, 정리 선택.
  7. **Field number 위젯 빈값 처리**: 비우면 `""`(빈 문자열)을 number prop에 씀 → 향후 number editableProp 추가 시 Preview/export에 문자열 유입 우려. 현재 number 타입 쓰는 컴포넌트 없어 라이브 경로 없음. 추가 시 `undefined`/기본값으로 교정 권장(Field.tsx number case).
  8. **레이아웃 삭제 엣지케이스**: 칼럼 자식이 선택된 채로 부모 레이아웃을 삭제하면 `removeComponent`가 selection을 안 지움(부모 id만 비교) → ComponentForm `findInstance` undefined → 빈 패널. 드묾. 삭제 후 미해결 선택이면 `clearSelection` 추가 고려.

### 4-6. 컴포넌트 KRDS 충실도 audit (완료)
- 원칙: `docs/COMPONENT-FIDELITY.md` — **모든 컴포넌트·폼 위젯·패턴 마크업은 `vendor/krds/html/code/*.html`(KRDS 공식 키트)에서 가져온다.** 대응 없으면 가장 가까운 패턴 + `isKrdsStandard:false`.
- audit 4건 교정(TDD): button(`krds-btn primary`)·table(`<colgroup>`)·header(`krds-main-menu`/`header-actions`/`btn-navi`)·footer(`info-addr`/`info-cs`/`f-menu`). 커밋 `a248676`/`e3b803d`/`69c8c9e`/`419ab0d`.
- ⚠️ 백로그(audit이 잡은 미구현/단순화): header GNB 플라이아웃·footer SNS/인증마크/관련사이트(섹션 전체 미구현), **폼 입력 컴포넌트 select/radio/checkbox/textarea/date 미구현**(결과 사이트용), button 크기 variant.
- ⚠️ **컴포넌트 마크업 바꾸면** `src/registry/html-snapshots.test.ts`(toMatchSnapshot) 깨짐 → 의도된 변경이면 `npx vitest run -u`로 갱신·diff 검토.

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
    right/              # Step 5 우측 설정 자동 폼
      Field.tsx         # EditablePropType 12종 → KRDS 폼 마크업 위젯
      ComponentForm.tsx # 선택 인스턴스 editableProps로 자동 폼 + 실시간 반영
      PageSettingsForm.tsx # 선택 없을 때 현재 페이지 설정(LNB/브레드크럼/인페이지/SEO)
      RightPanel.tsx    # selection 유무로 ComponentForm/PageSettingsForm 분기
```

자산(커밋됨, gitignore된 public/ 복사본은 빌드 때 생성):
- `vendor/krds/` — KRDS HTML Component Kit v1.1.0 (PROVENANCE.md)
- `vendor/krds-thumbnails/` — 컴포넌트 썸네일 55종 + `manifest.json`(번호↔컴포넌트)

## 4. 다음 작업 = Step 5 (우측 설정 자동 폼) — 설계·계획 완료, 실행만 남음

- **설계**: `docs/superpowers/specs/2026-06-26-step5-settings-form-design.md`
- **계획**: `docs/superpowers/plans/2026-06-26-step5-settings-form.md` (TDD 6 task, 전체 코드 포함)
- **실행**: superpowers:subagent-driven-development로 task 1부터 (브레인스토밍/계획 단계 건너뜀).

확정된 핵심 결정(계획에 반영됨):
1. **2모드**: 컴포넌트 선택 시 그 인스턴스 폼 / 선택 없음 → 현재 페이지 설정 폼.
2. **위젯 = KRDS 공식 폼 마크업**(`.form-group`/`.krds-input`/`.krds-form-select`/`.krds-check-area`). `editableProps`의 `label→form-tit`, `help→form-hint`, `required→필수`. 12종 전부, **image는 URL 입력**(파일 업로드 후속).
3. **RHF/Zod 안 씀** — 스키마 기반 제어 컴포넌트로 직접 구현(새 의존성 0).
4. store 변경: `updateComponentProps` 재귀화(칼럼 자식) + `findInstance` + `updatePageMeta`.
5. 페이지 설정 폼에 **"사이드바 표시" 토글 이전**(캔버스 임시 토글 제거 + `setPageSidebar` 제거).

### Step 5 착수 전 선결 — 대부분 계획에 이미 반영됨
1. ✅(계획 Task 1) `updateComponentProps` 재귀화 + `findInstance`. (`toggleHidden`/`duplicate`/`reorder`는 여전히 최상위 전용 — 칼럼 자식 순서변경/복제 필요 시 후속.)
2. ✅(계획 Task 5) LNB "사이드바 표시" 토글을 페이지 설정 폼으로 이전.
3. ⬜ **전역요소(헤더/푸터/마스트헤드) 편집 = Step 5 범위 밖, 후속**: `Selection`에 `{kind:'global', target}` 추가 + 전역 3종 `editableProps` 작성 + 선택 진입점. (별도 작업)

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

### 📌 패턴(기본/서비스) — 좌측 패널에 추가 (Step 5 이후, 사용자 요청)
KRDS는 컴포넌트 위에 "패턴" 층이 있음. 좌측 패널(현재 사이트맵/컴포넌트 2탭)에 패턴을 넣어야 함.
- **기본 패턴**(global_summary.html, ~11종: 개인식별정보입력·도움·동의·목록탐색·사용자피드백·상세정보확인·오류·입력폼·첨부파일·필터링정렬·확인) = **섹션/기능 단위**(컴포넌트 조합) → 빌더에선 **캔버스에 컴포넌트 묶음 한 번에 삽입**(매크로 컴포넌트).
- **서비스 패턴**(service_summary.html, 5종: 방문·검색·로그인·신청·정책정보확인) = **멀티스텝 사용자 여정**(여러 페이지 흐름) → 빌더에선 **사이트맵에 여러 페이지 스캐폴딩**.
- 출처: https://www.krds.go.kr/html/site/global/global_summary.html , https://www.krds.go.kr/html/site/service/service_summary.html
- ⚠️ **벤더 키트에 패턴 마크업 없음**(개념·가이드만) → 컴포넌트로 직접 조합해 구현.
- **의존**: 패턴 ← 컴포넌트(재료) ← 우측 편집폼(Step 5). 그래서 Step 5 먼저. 패턴은 두 하위기능(캔버스 삽입 vs 페이지 스캐폴딩)으로 분리, **기본 패턴부터** 권장.
- 컴포넌트 현황: 11/55 구현(배치가능 7). 패턴 풍부도는 컴포넌트 확충과 함께 올라감.

### Step 5 후속(범위 밖)
- **전역요소 편집**(헤더/푸터/마스트헤드): `Selection {kind:'global', target}` + 전역 3종 `editableProps` 작성 + 선택 진입점.
- **파일 업로드(image 자산)**: IndexedDB Blob 저장·자산 목록·alt 관리(좌측 자산 탭, 설계 §6.2). 현재 image 위젯은 URL 입력만.
- **폼 입력 컴포넌트 확충**(결과 사이트용): select/radio/checkbox/textarea/date — KRDS 키트 마크업으로(audit §4-6).

- ~~사이트맵 트리 드래그 앤 드롭~~ → ✅ 완료(4-4, 재배치 포함). 후속: 키보드 뎁스변경, 노드 접기.
- 카테고리/LNB **익스포트 배선**(Step 7): 카테고리=첫 하위 리다이렉트, LNB 토글 펼침용 KRDS JS.
- 헤더/푸터 **충실화**(KRDS 클래스는 4-6에서 교정 완료): GNB 플라이아웃·footer SNS/인증마크/관련사이트 섹션 빌드.
- KRDS `component.css`의 `img/img/` 경로 오타로 ico_flag 아이콘은 미사용 상태
  (현재 output.css만 로드해 회피).
