"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Device, Page, Site, ThemeMode } from "../lib/types";
import type { PreviewCtx } from "../registry/types";
import { krdsModeAttr } from "../lib/krds-mode";
import { DEVICE_WIDTH } from "../lib/device";
import { PreviewDocument } from "./PreviewDocument";

// 읽기전용 디바이스/테마 미리보기. 자체 <html>을 가진 iframe이라 KRDS 뷰포트 미디어쿼리와
// data-krds-mode 테마가 무수정으로 발동한다. src 없는 same-origin blank iframe(특수 권한 불필요).
export function DevicePreview({
  mode,
  device,
  site,
  page,
}: {
  mode: ThemeMode;
  device: Device;
  site: Site;
  page: Page;
}) {
  const ref = useRef<HTMLIFrameElement>(null);
  const [body, setBody] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const doc = ref.current?.contentDocument;
    if (!doc) return;
    // 부모 head의 스타일시트(output.css·editor.css 등) 복제(1회). Next 번들 경로에 비의존.
    if (!doc.getElementById("krds-preview-styles")) {
      const marker = doc.createElement("meta");
      marker.id = "krds-preview-styles";
      doc.head.appendChild(marker);
      document.head
        .querySelectorAll('link[rel="stylesheet"], style')
        .forEach((n) => doc.head.appendChild(n.cloneNode(true)));
      doc.documentElement.lang = "ko";
    }
    // 테마 속성: <html data-krds-mode>
    const attr = krdsModeAttr(mode);
    if (attr) doc.documentElement.setAttribute("data-krds-mode", attr);
    else doc.documentElement.removeAttribute("data-krds-mode");
    setBody(doc.body);
  }, [mode]);

  const w = DEVICE_WIDTH[device];
  const ctx: PreviewCtx = { site, page, resolveAsset: () => undefined, mode, device };

  return (
    <div className="device-preview">
      <iframe
        ref={ref}
        title="디바이스 미리보기"
        className="device-preview-frame"
        data-device={device}
        style={w == null ? undefined : { width: `${w}px` }}
      />
      {body ? createPortal(<PreviewDocument site={site} page={page} ctx={ctx} />, body) : null}
    </div>
  );
}
