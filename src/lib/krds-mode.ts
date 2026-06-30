import type { ThemeMode } from "./types";

// KRDS 테마 훅(data-krds-mode) 값 매핑. <html>에 적용해야 배경·루트 토큰까지 전환됨.
// light=속성 없음, high-contrast(선명)='high-contrast', system='theme'(+prefers-color-scheme).
export function krdsModeAttr(mode: ThemeMode): "high-contrast" | "theme" | undefined {
  if (mode === "high-contrast") return "high-contrast";
  if (mode === "system") return "theme";
  return undefined;
}
