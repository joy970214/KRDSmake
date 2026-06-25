import { describe, expect, it } from "vitest";
import { createEditorStore } from "../../store/editor-store";
import type { ExportCtx } from "../types";
import { headerDefinition as def } from "./header";

function ctxWithMenu(): ExportCtx {
  const store = createEditorStore();
  store.getState().createSite("정부24");
  store.getState().addSitemapNode({ title: "서비스", slug: "service" });
  const site = store.getState().site!;
  return { site, page: site.pages[0], resolveAsset: () => undefined, framework: "html" };
}

describe("헤더", () => {
  it("KRDS 표준(아이덴티티)", () => {
    expect(def.isKrdsStandard).toBe(true);
    expect(def.category).toBe("아이덴티티");
  });

  it("html은 #krds-header와 서비스명 로고를 만든다", () => {
    const html = def.exportTemplates.html({ serviceName: "정부24" }, ctxWithMenu());
    expect(html).toContain('id="krds-header"');
    expect(html).toContain("정부24");
  });

  it("사이트맵 상위 노드로 주메뉴를 생성한다", () => {
    const html = def.exportTemplates.html({ serviceName: "정부24" }, ctxWithMenu());
    expect(html).toContain("서비스");
    expect(html).toContain('href="/service"');
  });

  it("로그인/검색 표시 여부를 반영한다", () => {
    const ctx = ctxWithMenu();
    const on = def.exportTemplates.html(
      { serviceName: "s", showSearch: true, auth: { showLogin: true } },
      ctx,
    );
    expect(on).toContain("로그인");
    expect(on).toContain("통합검색");

    const off = def.exportTemplates.html(
      { serviceName: "s", showSearch: false, auth: { showLogin: false } },
      ctx,
    );
    expect(off).not.toContain("로그인");
  });
});
