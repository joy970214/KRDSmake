"use client";

import { useEffect, useRef, useState } from "react";
import { loadSite, saveSite } from "../lib/persistence";
import type { EditorStore } from "./editor-store";

// 마운트 시 복원 or 새 사이트 생성, 이후 변경을 디바운스 자동저장(설계 §5).
export function useBootstrap(store: EditorStore): boolean {
  const [ready, setReady] = useState(false);
  const readyRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const existing = await loadSite();
      if (cancelled) return;
      if (existing) {
        store.setState({
          site: existing,
          activePageId: existing.pages[0]?.id ?? null,
        });
      } else {
        store.getState().createSite("새 사이트");
      }
      readyRef.current = true;
      setReady(true);
    })();

    let timer: ReturnType<typeof setTimeout> | null = null;
    const unsub = store.subscribe((s) => {
      if (!readyRef.current || !s.site) return;
      const site = s.site;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => void saveSite(site), 500);
    });

    return () => {
      cancelled = true;
      unsub();
      if (timer) clearTimeout(timer);
    };
  }, [store]);

  return ready;
}
