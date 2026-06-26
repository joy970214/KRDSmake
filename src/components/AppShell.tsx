"use client";

import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { Canvas, CANVAS_DROPPABLE_ID } from "./Canvas";
import { LeftPanel } from "./left/LeftPanel";
import { PALETTE_DRAG_PREFIX } from "./left/ComponentPalette";
import { useEditorState, useEditorStoreApi } from "../store/context";

export function AppShell() {
  const siteName = useEditorState((s) => s.site?.name ?? "");
  const api = useEditorStoreApi();
  // 약간 끌어야 드래그 시작(카드 클릭과 구분).
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || over.id !== CANVAS_DROPPABLE_ID) return;
    const defId = active.data.current?.componentDefinitionId as string | undefined;
    if (!defId || !String(active.id).startsWith(PALETTE_DRAG_PREFIX)) return;
    const pageId = api.getState().activePageId;
    if (!pageId) return;
    const instId = api.getState().addComponent(pageId, defId);
    api.getState().selectComponent(pageId, instId);
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
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
