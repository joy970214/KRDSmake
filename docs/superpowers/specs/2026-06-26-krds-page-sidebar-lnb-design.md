# 설계: 페이지 레벨 좌측 사이드바(LNB)

- 날짜: 2026-06-26
- 상태: 승인됨 (사용자 확정)
- 관련: `2026-06-25-krds-website-builder-design.md`(전체 설계), KRDS `style_05`(레이아웃/그리드)

## 배경 / 문제

사용자 지적: 빌더에 **사이드바가 없다**. KRDS `style_05`의 페이지 골격은 5영역
`Header / Left menu(선택) / Main contents / Right menu(선택) / Footer`로 정의되는데,
현재 모델(`GlobalLayoutSettings` = masthead/header/footer/skipLink, `Page` = `components[]`뿐)에는
**좌/우 메뉴(사이드바) 영역 자체가 없다**. 즉 사이드바는 "컴포넌트가 없어서"가 아니라
**페이지 레이아웃 영역이 모델에 없어서** 빠져 있었다.

또한 직전에 만든 "다단 레이아웃" 블록의 CSS `.krds-grid { max-width:1200px; margin:0 auto }`는
**페이지 프레임**이 져야 할 1200px 제약을 **블록마다** 지고 있어, 사이드바로 본문이 좁아지면
어긋나는 **잠재 버그**가 있다(이번에 함께 정리).

## 개념과 경계 (핵심)

- **LNB(이번 작업)**: 페이지 골격의 **좌측 탐색 메뉴**. 사이트맵에서 **자동 파생**(읽기 전용).
  페이지를 `[사이드바 | 본문]` 두 칼럼으로 가른다.
- **다단 레이아웃(기존, 4-2)**: 본문 *안에* 드롭하는 콘텐츠 블록 그리드. LNB와 **별개**, 공존한다.
- LNB는 `ComponentInstance`가 **아니다** — 선택/드롭 대상이 아닌, 사이트맵의 파생 뷰.

## 결정 사항 (브레인스토밍 확정)

1. **콘텐츠 출처 = 사이트맵 자동 파생(A)**: 좌측 메뉴는 현재 페이지가 속한 섹션의 사이트맵
   하위 트리를 자동 렌더. 사용자는 토글만.
2. **노출 제어 + 범위 = 페이지별 토글 + 섹션 트리(B)**: `Page.showSidebar` 불리언으로 켜고 끈다.
   나열 범위는 최상위(depth-0) 섹션의 하위 트리 전체, 현재 페이지 강조.
3. **토글 진입점 = 캔버스 상단 페이지 컨트롤(A)**: 캔버스 페이지 제목 옆 체크박스.
   ⚠️ **Step 5(우측 설정 자동 폼) 구현 시 이 토글을 우측 폼으로 이전**한다(누락 방지 — 아래 "후속" 참조).
4. 우측 메뉴(KRDS Right menu)는 기존 `Page.showInPageNavigation`로 별개 → 이번 작업에서 손대지 않음.

## 데이터 모델

- `Page`에 `showSidebar?: boolean` 추가(`src/lib/types.ts`).
  - **기본값 = 홈 외 켜짐.** 구현은 *미설정(undefined)을 켜짐으로 간주*(`page.showSidebar ?? true`).
    - 신규 페이지는 굳이 값을 세팅하지 않는다(undefined → 켜짐).
    - 홈 페이지는 값과 무관하게 `buildLnb`가 `null`을 반환(아래 파생 로직)하므로 LNB가 표시되지 않는다.
    - 사용자가 끄면 비로소 `false`가 명시적으로 저장된다.
  - optional이라 옛 영속 데이터(IndexedDB, 필드 없음)에도 동일 규칙이 자연스럽게 적용된다(undefined → 켜짐).

### 기본값 동작 설명 (말로 설명할 수 있게)

> "**홈을 제외한 모든 페이지는 사이드바가 기본으로 켜져 있습니다.** 단, 보여줄 메뉴가 실제로
> 있을 때만(= 해당 페이지가 속한 섹션에 하위 페이지가 있을 때만) 사이드바가 나타납니다.
> 홈, 또는 하위 페이지가 없는 단독 섹션에서는 켜져 있어도 자동으로 숨겨집니다.
> 특정 페이지에서 끄고 싶으면 캔버스 상단의 '사이드바 표시' 체크를 해제하면 됩니다."

- 표시 최종 판정식: `(page.showSidebar ?? true) && buildLnb(...) !== null`

## 파생 로직 — `src/lib/lnb.ts` (순수)

```
buildLnb(sitemap: SitemapNode[], currentNode: SitemapNode): LnbModel | null
```

- 동작:
  - 현재 페이지의 **최상위(depth-0) 조상 섹션**을 사이트맵에서 찾는다(`parentId` 체인 또는 트리 탐색).
  - 그 섹션의 **하위 트리 전체**를 메뉴 항목으로 구성, 현재 페이지를 `activeNodeId`로 표시.
  - 다음이면 `null`(표시할 LNB 없음): 현재 노드가 홈(`isHome`)이거나, 섹션에 자식이 없음.
- 반환 `LnbModel`: `{ sectionTitle: string; items: SitemapNode[]; activeNodeId: string }`
  - `items`는 섹션 자식들의 (중첩) 트리. 렌더가 `children`을 재귀로 그린다.

## 렌더 + 레이아웃 / CSS

Canvas 구조(헤더와 푸터 사이) 변경:

```
<div class="page-frame">              /* max-width:1200px; margin:0 auto; display:flex; gap:24px */
  <aside class="lnb"> … 파생 메뉴 … </aside>   /* showSidebar && buildLnb≠null 일 때만; 약 240px */
  <main class="canvas-page" ref=droppable> … 본문 … </main>  /* flex:1 */
</div>
```

- 사이드바 없을 때도 `.page-frame`이 본문을 감싸 1200px·가운데정렬을 보장(본문은 전체폭).
- **`.krds-grid`에서 `max-width:1200px; margin:0 auto` 제거 → `width:100%`.** 1200px 제약은
  이제 `.page-frame`(페이지 프레임) 책임. 사이드바로 본문이 좁아져도 다단 블록이 본문폭에 맞게 채워짐.
- 모바일(`max-width:767px`): `.page-frame { flex-direction:column }` → 사이드바가 본문 위로 1단 스택.
- LNB 마크업: 중첩 `<ul>`. 현재 항목 `aria-current="page"`. 에디터에선 **비탐색(읽기 전용)** —
  링크 클릭이 페이지 전환을 일으키지 않음(정적 미리보기).

## store 액션

- `setPageSidebar(pageId: string, show: boolean)` → 해당 `Page.showSidebar` 설정. (기존 페이지 플래그
  전용 setter가 없으므로 신규 추가. `updatePageComponents`와 무관하게 페이지 메타만 수정하는 헬퍼/패턴 사용.)

## 토글 UI

- Canvas 페이지 제목 옆 체크박스 라벨 **"사이드바 표시"** → `onChange`에서 `setPageSidebar(activePageId, checked)`.
- 체크 상태 = `page.showSidebar ?? true`(기본 켜짐 반영).

## 테스트 / 검증 (TDD)

1. **모델**: `Page.showSidebar?` 추가(컴파일 토대). 기본값은 코드 상수가 아니라 `?? true` 규칙이라
   별도 생성 기본값 세팅은 없음 — 표시 판정 테스트(4단계)에서 함께 검증.
2. **`lib/lnb.ts buildLnb`**: 순수 함수 — RED→green.
   - 케이스: 섹션 하위 트리 파생 / 현재 페이지 강조 / 홈은 null / 자식 없는 섹션은 null / 깊은(2단+) 트리.
3. **store `setPageSidebar`**: RED→green — 플래그 토글, 다른 페이지 영향 없음.
4. **Canvas**: 기본(미설정) 비홈 페이지+파생결과 있을 때 `<aside.lnb>` 렌더(기본 켜짐 확인) /
   `showSidebar=false`면 미렌더 / 홈이면 미렌더 / 토글 컨트롤이 store 갱신. CSS 이동 후
   **헤드리스 실브라우저로 [사이드바|본문] 2칼럼 + 다단 블록이 좁은 본문폭에 맞는지** 검증.

## 이번에 빼는 것 (후속/백로그)

- **토글의 Step 5 이전**: 캔버스 상단 임시 토글 → Step 5 우측 자동 폼으로 옮길 것. (HANDOFF에도 기록)
- 우측 메뉴(KRDS Right menu): 기존 `showInPageNavigation`로 별도 처리(미구현 렌더 포함) — 이번 범위 아님.
- LNB 항목 수동 편집/재정렬(자동 파생이라 불필요), 다단계 아코디언 접힘 UX.
- **익스포트 LNB 주입**: `.page-frame`/LNB를 HTML 익스포트에 반영하는 건 Step 7에서 배선.
