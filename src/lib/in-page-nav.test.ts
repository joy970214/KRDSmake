import { describe, expect, it } from "vitest";
import type { Page } from "./types";
import { buildInPageNav } from "./in-page-nav";

function page(components: Page["components"]): Page {
  return {
    id: "p1",
    sitemapNodeId: "n1",
    title: "페이지",
    components,
  } as Page;
}

describe("buildInPageNav", () => {
  it("제목영역 컴포넌트들의 제목을 order 순으로 모은다", () => {
    const p = page([
      { id: "b", componentDefinitionId: "button", order: 0, props: {} },
      { id: "t2", componentDefinitionId: "page-title", order: 2, props: { title: "둘째" } },
      { id: "t1", componentDefinitionId: "page-title", order: 1, props: { title: "첫째" } },
    ] as Page["components"]);
    expect(buildInPageNav(p)).toEqual(["첫째", "둘째"]);
  });

  it("숨김 제목영역은 제외한다", () => {
    const p = page([
      { id: "t1", componentDefinitionId: "page-title", order: 0, props: { title: "보임" } },
      { id: "t2", componentDefinitionId: "page-title", order: 1, props: { title: "숨김" }, hidden: true },
    ] as Page["components"]);
    expect(buildInPageNav(p)).toEqual(["보임"]);
  });
});
