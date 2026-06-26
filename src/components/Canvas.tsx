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
import { CANVAS_DROPPABLE_ID } from "../lib/dnd-plan";
import type { ComponentInstance } from "../lib/types";

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

  const components = page.components.slice().sort((a, b) => a.order - b.order);

  return (
    <div className="canvas">
      <div className="canvas-frame">
        {site.globalLayout.masthead.visible && masthead
          ? masthead.Preview({ props: site.globalLayout.masthead, ctx })
          : null}
        {header ? header.Preview({ props: site.globalLayout.header, ctx }) : null}

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
                  selected={
                    selection?.kind === "component" && selection.instanceId === inst.id
                  }
                />
              ))}
            </SortableContext>
          )}
        </main>

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
  selected,
}: {
  inst: ComponentInstance;
  index: number;
  last: boolean;
  pageId: string;
  ctx: PreviewCtx;
  selected: boolean;
}) {
  const api = useEditorStoreApi();
  const def = getComponent(inst.componentDefinitionId);
  const name = def?.name ?? inst.componentDefinitionId;
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
        {def ? def.Preview({ props: inst.props, ctx }) : null}
      </div>

      {selected ? (
        <div className="ci-toolbar" role="toolbar" aria-label={`${name} 조작`}>
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
