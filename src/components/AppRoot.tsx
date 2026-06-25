"use client";

import { useState } from "react";
import { AppShell } from "./AppShell";
import { createEditorStore } from "../store/editor-store";
import { EditorStoreProvider } from "../store/context";
import { useBootstrap } from "../store/use-bootstrap";

export function AppRoot() {
  const [store] = useState(() => createEditorStore());
  const ready = useBootstrap(store);

  return (
    <EditorStoreProvider store={store}>
      {ready ? <AppShell /> : <div className="app-loading">불러오는 중…</div>}
    </EditorStoreProvider>
  );
}
