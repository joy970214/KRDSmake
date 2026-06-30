"use client";

import { useEditorState, useEditorStoreApi } from "../store/context";
import type { Device, ThemeMode } from "../lib/types";

// 상단바 미리보기 토글 — 에디터 크롬(KRDS 출력 아님). 라벨은 공식 KRDS("기본/선명하게/시스템").
const MODES: { value: ThemeMode; label: string }[] = [
  { value: "light", label: "기본" },
  { value: "high-contrast", label: "선명하게" },
  { value: "system", label: "시스템" },
];
const DEVICES: { value: Device; label: string }[] = [
  { value: "pc", label: "PC" },
  { value: "tablet", label: "태블릿" },
  { value: "mobile", label: "모바일" },
];

export function PreviewControls() {
  const mode = useEditorState((s) => s.previewMode);
  const device = useEditorState((s) => s.previewDevice);
  const api = useEditorStoreApi();
  return (
    <div className="preview-controls">
      <div className="seg" role="group" aria-label="화면 모드">
        {MODES.map((m) => (
          <button
            key={m.value}
            type="button"
            className="seg-btn"
            aria-pressed={mode === m.value}
            onClick={() => api.getState().setPreviewMode(m.value)}
          >
            {m.label}
          </button>
        ))}
      </div>
      <div className="seg" role="group" aria-label="디바이스">
        {DEVICES.map((d) => (
          <button
            key={d.value}
            type="button"
            className="seg-btn"
            aria-pressed={device === d.value}
            onClick={() => api.getState().setPreviewDevice(d.value)}
          >
            {d.label}
          </button>
        ))}
      </div>
    </div>
  );
}
