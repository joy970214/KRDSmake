// 컴포넌트 테스트용 ctx 빌더 (테스트 파일 아님 — *.test.* 만 실행됨)
import { createSite } from "../lib/site-factory";
import type { ExportCtx, Framework, PreviewCtx } from "./types";

export function makeExportCtx(framework: Framework = "html"): ExportCtx {
  const site = createSite("테스트");
  return {
    site,
    page: site.pages[0],
    resolveAsset: () => undefined,
    framework,
  };
}

export function makePreviewCtx(): PreviewCtx {
  const site = createSite("테스트");
  return {
    site,
    page: site.pages[0],
    resolveAsset: () => undefined,
    mode: "light",
    device: "pc",
  };
}
