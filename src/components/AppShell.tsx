"use client";

import { Canvas } from "./Canvas";
import { LeftPanel } from "./left/LeftPanel";
import { useEditorState } from "../store/context";

export function AppShell() {
  const siteName = useEditorState((s) => s.site?.name ?? "");
  return (
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
  );
}
