"use client";

import {
  closestCenter,
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { Canvas } from "./Canvas";
import { LeftPanel } from "./left/LeftPanel";
import { useEditorState, useEditorStoreApi } from "../store/context";
import { planDrop } from "../lib/dnd-plan";

export function AppShell() {
  const siteName = useEditorState((s) => s.site?.name ?? "");
  const api = useEditorStoreApi();
  // 약간 끌어야 드래그 시작(카드 클릭과 구분).
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    const state = api.getState();
    const pageId = state.activePageId;
    if (!pageId) return;
    const page = state.site?.pages.find((p) => p.id === pageId);
    if (!page) return;

    const componentIds = page.components
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((c) => c.id);

    const plan = planDrop({
      activeId: String(active.id),
      componentDefinitionId: active.data.current?.componentDefinitionId as string | undefined,
      overId: over ? String(over.id) : null,
      componentIds,
    });
    if (!plan) return;

    if (plan.kind === "add") {
      const instId = api.getState().addComponent(pageId, plan.componentDefinitionId, plan.index);
      api.getState().selectComponent(pageId, instId);
    } else if (plan.kind === "add-to-column") {
      const instId = api
        .getState()
        .addComponentToColumn(
          pageId,
          plan.layoutInstanceId,
          plan.columnIndex,
          plan.componentDefinitionId,
        );
      api.getState().selectComponent(pageId, instId);
    } else {
      api.getState().reorderComponent(pageId, plan.instanceId, plan.index);
    }
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <div className="editor-shell">
        <header className="topbar">
          <strong className="app-name">KRDS 웹사이트 빌더</strong>
          <span className="topbar-sitename">{siteName}</span>
          <span className="topbar-spacer" />
          <span className="topbar-hint">자동 저장됨</span>
        </header>
        <div className="editor-body">
          <aside className="panel panel-left">
            <LeftPanel />
          </aside>
          <main className="panel panel-center">
            <Canvas />
          </main>
          <aside className="panel panel-right">
            <div className="panel-head">
              <strong>설정</strong>
            </div>
            <p className="panel-placeholder">
              캔버스에서 대상을 선택하면 설정이 표시됩니다. (Step 5)
            </p>
          </aside>
        </div>
      </div>
    </DndContext>
  );
}
