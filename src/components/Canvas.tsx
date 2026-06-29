"use client";

import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { getComponent } from "../registry";
import type { PreviewCtx } from "../registry/types";
import { useEditorState, useEditorStoreApi } from "../store/context";
import { CANVAS_DROPPABLE_ID, columnDroppableId } from "../lib/dnd-plan";
import { buildLnb } from "../lib/lnb";
import type { ComponentInstance, SitemapNode } from "../lib/types";

export { CANVAS_DROPPABLE_ID } from "../lib/dnd-plan";

// 중앙 캔버스 — 선택 페이지를 KRDS 미리보기로 렌더(헤더/푸터 공통 + 본문).
// 본문 컴포넌트는 드래그 배치/순서변경 + 선택/조작(복제·숨김·삭제) 가능. 모드/디바이스 전환은 Step 6.
export function Canvas() {
  const site = useEditorState((s) => s.site);
  const activePageId = useEditorState((s) => s.activePageId);
  const selection = useEditorState((s) => s.selection);
  const { setNodeRef, isOver } = useDroppable({ id: CANVAS_DROPPABLE_ID });
  if (!site) return null;

  const page = site.pages.find((p) => p.id === activePageId) ?? site.pages[0];
  const ctx: PreviewCtx = {
    site,
    page,
    resolveAsset: () => undefined,
    mode: "light",
    device: "pc",
  };

  const masthead = getComponent("masthead");
  const header = getComponent("header");
  const footer = getComponent("footer");

  const showSidebar = (page.showSidebar ?? true);
  const lnb = buildLnb(site.sitemap, page.sitemapNodeId);

  const components = page.components.slice().sort((a, b) => a.order - b.order);
  const selectedId =
    selection?.kind === "component" ? selection.instanceId : null;

  return (
    <div className="canvas">
      <div className="canvas-frame">
        {site.globalLayout.masthead.visible && masthead
          ? masthead.Preview({ props: site.globalLayout.masthead, ctx })
          : null}
        {header ? header.Preview({ props: site.globalLayout.header, ctx }) : null}

        <div className="page-frame">
        {showSidebar && lnb ? (
          <nav className="krds-side-navigation" aria-label="좌측 메뉴">
            <h2 className="lnb-tit">{lnb.sectionTitle}</h2>
            <ul className="lnb-list" role="menubar">
              {lnb.items.map((n) => (
                <LnbItem key={n.id} node={n} activeNodeId={lnb.activeNodeId} />
              ))}
            </ul>
          </nav>
        ) : null}

        <main
          ref={setNodeRef}
          className={`canvas-page${isOver ? " is-drop-over" : ""}`}
          aria-label="페이지 본문(컴포넌트 드롭 영역)"
        >
          <h2 className="canvas-page-title">{page.title}</h2>
          {components.length === 0 ? (
            <p className="empty-guide">
              좌측의 컴포넌트를 이 영역으로 드래그하여 페이지를 구성하세요.
            </p>
          ) : (
            <SortableContext
              items={components.map((c) => c.id)}
              strategy={verticalListSortingStrategy}
            >
              {components.map((inst, i) => (
                <CanvasInstance
                  key={inst.id}
                  inst={inst}
                  index={i}
                  last={i === components.length - 1}
                  pageId={page.id}
                  ctx={ctx}
                  selectedId={selectedId}
                />
              ))}
            </SortableContext>
          )}
        </main>
        </div>

        {footer ? footer.Preview({ props: site.globalLayout.footer, ctx }) : null}
      </div>
    </div>
  );
}

function CanvasInstance({
  inst,
  index,
  last,
  pageId,
  ctx,
  selectedId,
}: {
  inst: ComponentInstance;
  index: number;
  last: boolean;
  pageId: string;
  ctx: PreviewCtx;
  selectedId: string | null;
}) {
  const api = useEditorStoreApi();
  const def = getComponent(inst.componentDefinitionId);
  const name = def?.name ?? inst.componentDefinitionId;
  const selected = selectedId === inst.id;
  const { setNodeRef, setActivatorNodeRef, listeners, attributes, transform, transition, isDragging } =
    useSortable({ id: inst.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`canvas-instance${selected ? " is-selected" : ""}${
        inst.hidden ? " is-hidden" : ""
      }${isDragging ? " is-dragging" : ""}`}
      data-instance-id={inst.id}
    >
      <button
        type="button"
        ref={setActivatorNodeRef}
        className="ci-drag"
        aria-label={`${name} 이동`}
        {...attributes}
        {...listeners}
      >
        ⠿
      </button>
      <button
        type="button"
        className="ci-select"
        aria-label={`${name} 선택`}
        onClick={() => api.getState().selectComponent(pageId, inst.id)}
      />
      {inst.hidden ? <span className="ci-hidden-badge">숨김</span> : null}
      <div className="ci-preview" aria-hidden={inst.hidden}>
        {inst.columns ? (
          <LayoutGrid
            inst={inst}
            pageId={pageId}
            ctx={ctx}
            selectedId={selectedId}
          />
        ) : def ? (
          def.Preview({ props: inst.props, ctx })
        ) : null}
      </div>

      {selected ? (
        <div className="ci-toolbar" role="toolbar" aria-label={`${name} 조작`}>
          {inst.columns
            ? [2, 3, 4].map((n) => (
                <button
                  key={n}
                  type="button"
                  aria-label={`${n}단`}
                  aria-pressed={inst.columns!.length === n}
                  disabled={inst.columns!.length === n}
                  onClick={() => api.getState().setLayoutColumns(pageId, inst.id, n)}
                >
                  {n}단
                </button>
              ))
            : null}
          <button
            type="button"
            aria-label={`${name} 위로`}
            disabled={index === 0}
            onClick={() => api.getState().reorderComponent(pageId, inst.id, index - 1)}
          >
            ↑
          </button>
          <button
            type="button"
            aria-label={`${name} 아래로`}
            disabled={last}
            onClick={() => api.getState().reorderComponent(pageId, inst.id, index + 1)}
          >
            ↓
          </button>
          <button
            type="button"
            aria-label={`${name} 복제`}
            onClick={() => api.getState().duplicateComponent(pageId, inst.id)}
          >
            복제
          </button>
          <button
            type="button"
            aria-label={`${name} ${inst.hidden ? "표시" : "숨김"}`}
            onClick={() => api.getState().toggleHidden(pageId, inst.id)}
          >
            {inst.hidden ? "표시" : "숨김"}
          </button>
          <button
            type="button"
            className="ci-del"
            aria-label={`${name} 삭제`}
            onClick={() => api.getState().removeComponent(pageId, inst.id)}
          >
            삭제
          </button>
        </div>
      ) : null}
    </div>
  );
}

// 다단 레이아웃 본문 — 칼럼 수만큼 드롭존을 가로로 배치(display:grid).
function LayoutGrid({
  inst,
  pageId,
  ctx,
  selectedId,
}: {
  inst: ComponentInstance;
  pageId: string;
  ctx: PreviewCtx;
  selectedId: string | null;
}) {
  const cols = inst.columns!.length;
  return (
    <div
      className="krds-grid"
      style={{ "--cols": cols } as React.CSSProperties}
    >
      {inst.columns!.map((children, i) => (
        <ColumnDropZone
          key={i}
          layoutId={inst.id}
          columnIndex={i}
          items={children}
          pageId={pageId}
          ctx={ctx}
          selectedId={selectedId}
        />
      ))}
    </div>
  );
}

function ColumnDropZone({
  layoutId,
  columnIndex,
  items,
  pageId,
  ctx,
  selectedId,
}: {
  layoutId: string;
  columnIndex: number;
  items: ComponentInstance[];
  pageId: string;
  ctx: PreviewCtx;
  selectedId: string | null;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: columnDroppableId(layoutId, columnIndex),
  });
  return (
    <div
      ref={setNodeRef}
      className={`krds-grid-col${isOver ? " is-drop-over" : ""}`}
      data-column-index={columnIndex}
      aria-label={`${columnIndex + 1}번 칼럼`}
    >
      {items.length === 0 ? (
        <p className="col-empty-guide">여기에 컴포넌트를 드롭</p>
      ) : (
        items.map((child) => (
          <ColumnChild
            key={child.id}
            child={child}
            pageId={pageId}
            ctx={ctx}
            selected={selectedId === child.id}
          />
        ))
      )}
    </div>
  );
}

// LNB(좌측 메뉴) 항목을 중첩 ul로 렌더. 에디터에선 비탐색(읽기 전용).
// 대상 노드가 이 서브트리(자기 포함)에 있는지 — 현재 페이지가 속한 가지 펼침 판정용.
function containsNode(node: SitemapNode, id: string): boolean {
  if (node.id === id) return true;
  return (node.children ?? []).some((c) => containsNode(c, id));
}

// KRDS 사이드 메뉴 2depth 항목(.lnb-item). 자식 있으면 토글+서브메뉴, 없으면 링크.
// 에디터엔 KRDS JS가 없어 펼침은 클래스로만 처리 — 현재 페이지가 속한 가지를 active로 펼친다.
function LnbItem({
  node,
  activeNodeId,
}: {
  node: SitemapNode;
  activeNodeId: string;
}) {
  const children = node.children ?? [];
  const isActiveSelf = node.id === activeNodeId;

  if (children.length === 0) {
    return (
      <li className={`lnb-item${isActiveSelf ? " active" : ""}`} role="none">
        <a
          className={`lnb-btn lnb-link${isActiveSelf ? " active selected" : ""}`}
          href={node.path}
          role="menuitem"
          aria-current={isActiveSelf ? "page" : undefined}
          onClick={(e) => e.preventDefault()}
        >
          {node.title}
        </a>
      </li>
    );
  }

  const onActiveBranch = containsNode(node, activeNodeId);
  return (
    <li className={`lnb-item${onActiveBranch ? " active" : ""}`} role="none">
      <button
        type="button"
        className={`lnb-btn lnb-toggle${onActiveBranch ? " active" : ""}`}
        role="menuitem"
        aria-expanded={onActiveBranch}
        onClick={(e) => e.preventDefault()}
      >
        {node.title}
      </button>
      <div className="lnb-submenu">
        <ul role="menu">
          {children.map((c) => (
            <LnbSubItem key={c.id} node={c} activeNodeId={activeNodeId} />
          ))}
        </ul>
      </div>
    </li>
  );
}

// KRDS 사이드 메뉴 3depth 항목(.lnb-subitem). 4depth 이상은 KRDS 슬라이드 팝업 대신
// 같은 목록에 평면으로 합친다(설계 결정 — KRDS 권장 깊이 ≤2단).
function LnbSubItem({
  node,
  activeNodeId,
}: {
  node: SitemapNode;
  activeNodeId: string;
}) {
  const isActive = node.id === activeNodeId;
  const children = node.children ?? [];
  return (
    <>
      <li className={`lnb-subitem${isActive ? " active" : ""}`} role="none">
        <a
          className={`lnb-btn lnb-link${isActive ? " selected" : ""}`}
          href={node.path}
          role="menuitem"
          aria-current={isActive ? "page" : undefined}
          onClick={(e) => e.preventDefault()}
        >
          {node.title}
        </a>
      </li>
      {children.map((g) => (
        <LnbSubItem key={g.id} node={g} activeNodeId={activeNodeId} />
      ))}
    </>
  );
}

// 칼럼 안 자식 — MVP는 선택 + 삭제(재정렬/복제는 후속).
function ColumnChild({
  child,
  pageId,
  ctx,
  selected,
}: {
  child: ComponentInstance;
  pageId: string;
  ctx: PreviewCtx;
  selected: boolean;
}) {
  const api = useEditorStoreApi();
  const def = getComponent(child.componentDefinitionId);
  const name = def?.name ?? child.componentDefinitionId;
  return (
    <div
      className={`canvas-instance col-child${selected ? " is-selected" : ""}`}
      data-instance-id={child.id}
    >
      <button
        type="button"
        className="ci-select"
        aria-label={`${name} 선택`}
        onClick={() => api.getState().selectComponent(pageId, child.id)}
      />
      <div className="ci-preview">
        {def ? def.Preview({ props: child.props, ctx }) : null}
      </div>
      {selected ? (
        <div className="ci-toolbar" role="toolbar" aria-label={`${name} 조작`}>
          <button
            type="button"
            className="ci-del"
            aria-label={`${name} 삭제`}
            onClick={() => api.getState().removeComponent(pageId, child.id)}
          >
            삭제
          </button>
        </div>
      ) : null}
    </div>
  );
}
