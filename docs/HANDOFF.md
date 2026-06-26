# 작업 인수인계 (이어서 진행용)

- 최종 업데이트: 2026-06-26 (세션 재개분 반영)
- 저장소: `git@github.com:joy970214/KRDSmake.git` (브랜치 `master`)
  ⚠️ 로컬 master가 origin보다 **2 커밋 앞섬(push 안 됨)** — `913102e`(Step4), `028a950`(드래그 순서/드롭위치)
- 프로젝트: KRDS 기반 공공 웹사이트 빌더 (노코드, 정적 export)

> **재개 시 먼저 §4-2(사용자 보고 이슈 & 다음 작업: 가로 다단 레이아웃)부터 읽을 것.**
> Step 5(우측 폼)보다 이게 우선 — 사용자가 캔버스 레이아웃 문제를 직접 보고했고 방향까지 확정 단계.

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
| **4-2** | **가로 다단 레이아웃 (사용자 보고 #3) — §4-2 참조** | **⬜ ← 다음(우선)** |
| 5 | 우측 설정 패널 자동 폼(RHF+Zod) + 실시간 반영 (RHF/Zod 미설치 확인됨) | ⬜ |
| 6 | 테마(라이트/선명/시스템) + 디바이스 전환 | ⬜ |
| 7 | HTML 익스포트 + ZIP 다운로드 | ⬜ |

- 테스트: **115개 통과**(22 파일) · lint 0 · tsc 0 · static export 빌드 성공
- 화면 확인됨: 3패널 에디터 정상 렌더 + 팔레트→캔버스 드래그 배치/선택/복제/순서변경
  (헤드리스 비보안컨텍스트 스크린샷 검증; 스샷 직전세션 scratchpad `785ffa5c`의 reorder.png 등)

## 2. 재개 명령어

```bash
cd /mnt/data/project/jyj/KRDSmake
npm run dev        # 개발 서버(자동으로 vendor/krds → public/krds 복사)
npm test           # vitest (watch: npm run test:watch)
npm run build      # 정적 export → out/
npm run lint       # eslint
```

### 외부에서 화면 보기 (현재 띄워둔 서버)

- 정적 빌드를 `serve`로 `http://172.213.188.161:17200` 서빙 중.
- 코드 바꾼 뒤 반영하려면: `npm run build` (serve가 out/을 라이브로 읽음).
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
    types.ts            # 도메인 모델(Site/SitemapNode/Page/ComponentInstance/…)
    ids.ts              # newId() — 비보안 컨텍스트 폴백 포함
    sitemap.ts          # joinPath, recomputePaths(slug→path·order 파생)
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
      SitemapTree.tsx   # 사이트맵 트리 CRUD/순서변경
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

## 4-2. ★ 사용자 보고 이슈 & 다음 작업: 가로 다단 레이아웃 (최우선)

사용자가 캔버스를 써보고 보고한 4가지 → 현재 상태:

| # | 보고 | 상태 |
|---|---|---|
| 1 | 드래그로 위아래 순서변경 안 됨 | ✅ 해결 — 인스턴스 드래그 핸들 `⠿` + dnd-kit sortable (`Canvas.tsx`) |
| 2 | 드롭한 위치 무시하고 맨 아래 배치 | ✅ 해결 — 드롭 위치 삽입 (커밋 `028a950`) |
| 3 | **레이아웃이 1단(세로 1열)만 됨 = "가로 갈래"** | ⬜ **다음 작업** |
| 4 | 컴포넌트 종류 적음 | ⬜ 백로그(배치가능 6종: 버튼/카드/이미지/입력폼/제목영역/표. 전역 4종 제외) |

**#3이 사용자가 말한 "레이아웃 관련" 작업.** 첫 메시지 "가로 갈래"도 이것(가로 다단 배치).

### KRDS 레이아웃 근거 (사용자가 지정한 출처)
출처: https://www.krds.go.kr/html/site/style/style_05.html (사용자가 직접 링크 제공 — 이 기준 준수)
- 반응형 컬럼 그리드: **large(1024~) 12–16칼럼 / medium(768~) 8–12 / small(360~) 4–6**
- 콘텐츠 최대폭 **1200px**, 거터 **16–24px**(large/medium 최적 24, small 16), 스크린 마진 PC 24 / 모바일 16
- **핵심 원칙: "동일 화면에서 칼럼 수를 혼용하지 말 것"**(시각적 일관성) → 행 단위 N등분 설계 근거
- ⚠️ **중요 확인**: 벤더링된 KRDS HTML Component Kit(`vendor/krds`)에는 **재사용 그리드 클래스(`.col-6` 류)가 없음**. `.grid`/`.row`/`.column`은 폼 등 특정 컴포넌트 전용. → 다단 그리드는 KRDS 수치를 따르되 **우리가 직접 구현**(`display:grid`)해야 함. 임의 `.col-*` 클래스 만들지 말 것.

### 확정 방향 (사용자 확인 대기 중이었음 — 마지막 메시지에서 "이 방향으로?" 질문에 미응답)
**"레이아웃(다단)" 블록을 새 배치 컴포넌트로 추가:**
- 팔레트에서 드래그 → **2단 / 3단 / 4단** 선택 → 각 칼럼이 개별 드롭 영역
- 그리드: `display:grid` + 콘텐츠폭 1200px + 거터 24px, **PC만 N단 / 모바일 자동 1단 스택**
- 한 행 = 고정 칼럼수 → "혼용 금지" 원칙 자동 충족. 익스포트도 동일 그리드 마크업.

### TDD 작업 순서(이 프로젝트 방침 = red→green 필수)
1. 데이터 모델(`lib/types.ts`): 인스턴스가 자식 보유 가능(레이아웃=칼럼별 children 배열) — 실패 테스트부터
2. store(`store/editor-store.ts`): 칼럼 안에 드롭/이동/제거 액션 (기존 add/reorder를 중첩 대응)
3. 레지스트리(`registry/components/layout.tsx`): `layout` 정의(Preview + HTML 익스포트 템플릿) + 배치가능 목록 추가
4. `Canvas.tsx`: 칼럼별 중첩 드롭 영역(`useDroppable` per column) + dnd-kit 연결
5. 헤드리스 실브라우저(playwright 캐시 브라우저)로 2단 배치 검증

주의: 기존 DnD는 평면(page.components 단일 배열) 전제 → 중첩 도입 시 `dnd-plan.ts`의 드롭 타깃 ID 체계(`canvas-page`, `palette:<id>`) 확장 필요(칼럼 droppable id 예: `col:<instanceId>:<colIndex>`).

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

- 사이트맵 트리 **드래그 앤 드롭**(현재 ↑↓ 버튼) — 폴리시로 남김.
- 헤더/푸터 익스포트는 **MVP 단순화 버전**(KRDS 459줄 헤더의 핵심 골격만). 추후 충실화.
- 이미지 컴포넌트 등 자산 업로드(IndexedDB Blob) — 좌측 5번째 탭, 아직 없음(설계 §6.2).
- KRDS `component.css`의 `img/img/` 경로 오타로 ico_flag 아이콘은 미사용 상태
  (현재 output.css만 로드해 회피).
