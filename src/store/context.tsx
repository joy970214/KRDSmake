"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useStore } from "zustand";
import type { EditorState, EditorStore } from "./editor-store";

const EditorStoreContext = createContext<EditorStore | null>(null);

export function EditorStoreProvider({
  store,
  children,
}: {
  store: EditorStore;
  children: ReactNode;
}) {
  return (
    <EditorStoreContext.Provider value={store}>{children}</EditorStoreContext.Provider>
  );
}

// 액션 호출용 store API (getState().action())
export function useEditorStoreApi(): EditorStore {
  const store = useContext(EditorStoreContext);
  if (!store) throw new Error("EditorStoreProvider 밖에서 사용됨");
  return store;
}

// 반응형 상태 구독
export function useEditorState<T>(selector: (s: EditorState) => T): T {
  return useStore(useEditorStoreApi(), selector);
}
