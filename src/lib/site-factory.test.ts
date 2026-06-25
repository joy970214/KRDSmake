import { describe, expect, it } from "vitest";
import { createSite } from "./site-factory";
import { SCHEMA_VERSION } from "./types";

describe("createSite", () => {
  it("주어진 이름으로 사이트를 만든다", () => {
    expect(createSite("내 사이트").name).toBe("내 사이트");
  });

  it("홈 노드 정확히 1개, path는 '/'", () => {
    const site = createSite("s");
    const homes = site.sitemap.filter((n) => n.isHome);
    expect(homes).toHaveLength(1);
    expect(homes[0].path).toBe("/");
  });

  it("홈 노드와 페이지는 1:1 대응", () => {
    const site = createSite("s");
    expect(site.pages).toHaveLength(1);
    const home = site.sitemap[0];
    const page = site.pages[0];
    expect(home.pageId).toBe(page.id);
    expect(page.sitemapNodeId).toBe(home.id);
  });

  it("schemaVersion을 기록한다", () => {
    expect(createSite("s").schemaVersion).toBe(SCHEMA_VERSION);
  });

  it("기본 테마는 light / 본문 17px", () => {
    const site = createSite("s");
    expect(site.theme.mode).toBe("light");
    expect(site.theme.baseFontSize).toBe(17);
  });

  it("두 번 만들면 서로 다른 id를 갖는다", () => {
    expect(createSite("a").id).not.toBe(createSite("b").id);
  });
});
