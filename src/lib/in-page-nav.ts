import type { Page } from "./types";

// 페이지 안 최상위·비숨김 제목영역(page-title) 컴포넌트들의 제목 목록(order 순).
// 콘텐츠 내 탐색(인페이지 내비)의 섹션 목록 소스.
export function buildInPageNav(page: Page): string[] {
  return page.components
    .filter((c) => !c.hidden && c.componentDefinitionId === "page-title")
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((c) => String(c.props.title ?? ""));
}
