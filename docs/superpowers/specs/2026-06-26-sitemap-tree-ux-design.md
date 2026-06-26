# 설계: 사이트맵 트리 UI/UX 개편

- 날짜: 2026-06-26
- 상태: 승인됨 (사용자 확정)
- 관련: `2026-06-25-krds-website-builder-design.md`(전체), 좌측 패널 `SitemapTree.tsx`

## 배경 / 문제

현재 `SitemapTree.tsx`는 각 행에 액션 버튼 6개(↑ ↓ ＋ ✎ 홈으로 ✕)를 **항상 노출**해
복잡하고 비좁다. 또 **현재 캔버스에 떠 있는 페이지가 트리에서 강조되지 않고**, 순서변경이
↑↓ 버튼(드래그 아님)이며, 새 메뉴가 항상 `새 메뉴 / menu-N`으로 박혀 이름을 바로 못 바꾼다.

사용자가 4가지를 모두 개선 요청: ① 시각적 정돈(버튼 호버/숨김) ② 드래그앤드롭 순서변경·재배치
③ 현재 페이지 강조 ④ 추가/이름변경 흐름.

## 결정 사항 (브레인스토밍 확정)

1. **DnD 범위 = 재배치까지(B)**: 형제 순서변경 + 다른 메뉴 안으로 넣기/밖으로 빼기(뎁스 변경).
2. **추가/slug = 즉시 인라인 편집 + slug 자동(A)**: ＋추가 시 제목 입력 자동 포커스, 제목에서
   slug 자동 생성(영문·숫자·하이픈). 한글 등 변환 불가하면 `menu-N` 유지, 사용자가 수정 가능.
3. ↑↓ 버튼은 제거하고 DnD로 대체. 빌더 자체 접근성을 위해 dnd-kit **KeyboardSensor**로
   키보드 세로 재정렬은 유지(키보드로 뎁스 변경/재배치는 후속).

## 구조 (격리 단위)

- **`src/lib/tree-dnd.ts`** (순수 함수, TDD):
  - `flattenTree(nodes: SitemapNode[]): FlatNode[]` — 표시 순서대로 평탄화.
    `FlatNode = { id: string; parentId: string | undefined; depth: number; node: SitemapNode }`
  - `getProjectedDrop(flat, activeId, overId, offsetX, indentWidth): { parentId: string | undefined; index: number }`
    — over 행 위치 + **수평 드래그 오프셋**으로 들어갈 부모/뎁스/순서를 계산.
    이웃(위/아래 형제) 기준으로 가능한 뎁스 범위를 클램프하고, **활성 노드의 자손은 드롭 대상에서
    제외**(순환 방지). 반환 `index`는 해당 `parentId`의 children 배열 내 삽입 위치.
  - `slugify(title: string): string` — 소문자화, 공백→`-`, `[a-z0-9-]` 외 제거. 결과가 비면 `""`.
- **`src/components/left/SitemapTree.tsx`** 재작성:
  - 트리 전용 `DndContext`(AppShell 캔버스 컨텍스트와 별개, 중첩) + `SortableContext`(평탄 리스트,
    `verticalListSortingStrategy`). 센서: `PointerSensor`(distance 4) + `KeyboardSensor`.
  - 행 컴포넌트 `SitemapRow`(`useSortable`).
  - 상위 상태: `editingId`(인라인 편집 중 노드), 드래그 중 `offsetX`(투영용).
- **`src/app/editor.css`**: 행 스타일 개편 — 활성 강조, 호버 액션, 드래그 핸들, 드롭 인디케이터, 뎁스 들여쓰기.

## 각 개선의 동작

### ① 드래그앤드롭 재배치
- dnd-kit "평탄화 + 수평이동 뎁스투영" 패턴. `onDragMove`에서 수평 오프셋 추적 →
  `getProjectedDrop`로 투영 부모/뎁스 계산 → 그 위치에 **드롭 인디케이터 선**(들여쓰기 반영) 표시.
- `onDragEnd`: `moveNode(activeId, projected.parentId, projected.index)` 호출.
  store `moveNode`는 부모변경·path/order 재계산·순환방지를 이미 지원.
- 홈 노드도 드래그 가능하나 위치/뎁스 제약은 store 규칙을 따른다(홈은 항상 존재; 삭제만 금지).

### ② 현재 페이지 강조
- 행에 `node.pageId === activePageId`면 `.is-active` 부여(KRDS primary 톤 좌측 바 + 옅은 배경).
- 제목 클릭 = `setActivePage(node.pageId)`(기존 동작 유지) → 강조 갱신.

### ③ 시각적 정돈
- 평소엔 **드래그 핸들(흐림) + 제목 + (대표 배지)** 만. 경로는 작게 흐리게.
- 우측 액션(＋하위 · ✎이름 · 홈지정 · ✕삭제)은 **행 호버 또는 선택 시에만** 노출(`opacity` 전환).
- ↑↓ 버튼 제거(DnD로 대체).

### ④ 추가/이름변경 흐름
- ＋추가(루트/하위) → `addSitemapNode` 반환 id를 `editingId`로 설정 → 그 행이 즉시 인라인 편집,
  **제목 input 자동 포커스**(`autoFocus`).
- 편집 중 제목 입력 → slug가 `slugify(title)`로 자동 갱신. 단 사용자가 slug를 직접 건드리면
  자동 끔(`slugDirty`). `slugify` 결과가 빈 문자열(한글 등)이면 기존/`menu-N` 유지.
- 엔터 또는 저장 = `renameNode(id, { title, slug })`. ESC = 취소(빈 새 노드는 그대로 두되 기본값 유지).

## 데이터 흐름

`store.sitemap` → `flattenTree` → 행 렌더. 드래그 → `getProjectedDrop` → `moveNode` →
store가 path·order 재계산 → 리렌더. 활성 표시는 `activePageId` 구독.

## 테스트 / 검증

- **순수 `tree-dnd.ts`**(TDD red→green):
  - `flattenTree`: 중첩 트리를 표시순서+depth로 평탄화.
  - `getProjectedDrop`: 같은 레벨 재정렬 / 다른 메뉴 안으로(깊이+1) / 밖으로(깊이-1) /
    뎁스 범위 클램프 / 활성 노드의 자손을 부모로 못 잡음(순환 방지).
  - `slugify`: 영문/공백/대문자/특수문자/한글(→"") 케이스.
- **컴포넌트**(testing-library): 현재 페이지 행에 `.is-active` / 추가 시 편집모드 진입(제목 input 존재)
  / 이름 저장이 `renameNode` 호출 / 액션 버튼 존재. (jsdom 드래그 한계로 DnD 자체는 제외)
- **DnD 실동작**: **헤드리스 실브라우저**로 "한 메뉴를 다른 메뉴 안으로 끌어 넣기"가 뎁스 변경으로
  반영되는지 검증(스크린샷).

## 범위 밖 (후속/백로그)

- **키보드 재배치/뎁스 변경**: KeyboardSensor 세로 재정렬만 유지, 키보드로 부모 변경은 후속.
- 멀티선택 드래그, 드래그 중 자동 펼침(collapsed 자식) — 현재 트리는 항상 펼침이라 해당 없음.
- 사이트맵 노드 접기/펼치기(collapse) — 별도 기능.
