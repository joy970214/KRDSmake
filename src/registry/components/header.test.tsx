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

  // --- KRDS 클래스 교정 (audit E3) ---

  it("nav 클래스가 krds-main-menu이고, ul 클래스가 gnb-menu이다", () => {
    const html = def.exportTemplates.html({ serviceName: "s" }, ctxWithMenu());
    expect(html).toContain('class="krds-main-menu"');
    expect(html).toContain('class="gnb-menu"');
    // nav 자체에 gnb-menu 클래스가 붙으면 안 됨
    expect(html).not.toContain('<nav class="gnb-menu"');
  });

  it("주메뉴 링크에 gnb-main-trigger is-link 클래스를 사용한다", () => {
    const html = def.exportTemplates.html({ serviceName: "s" }, ctxWithMenu());
    expect(html).toContain('class="gnb-main-trigger is-link"');
  });

  it("액션 영역이 header-actions이고 gnb-utils는 없다", () => {
    const html = def.exportTemplates.html({ serviceName: "s" }, ctxWithMenu());
    expect(html).toContain('class="header-actions"');
    expect(html).not.toContain("gnb-utils");
  });

  it("버튼/링크에 btn-navi 클래스를 사용하고 발명된 클래스는 없다", () => {
    const ctx = ctxWithMenu();
    const html = def.exportTemplates.html(
      { serviceName: "s", showSearch: true, showAllMenu: true, auth: { showLogin: true, showSignup: true } },
      ctx,
    );
    expect(html).toContain('class="btn-navi sch"');
    expect(html).toContain('class="btn-navi login"');
    expect(html).toContain('class="btn-navi join"');
    expect(html).toContain('class="btn-navi all"');
    // 발명된 클래스 없음
    expect(html).not.toContain("btn-search");
    expect(html).not.toContain('"btn-all"');
  });

  it("회원가입이 anchor가 아닌 button이다", () => {
    const ctx = ctxWithMenu();
    const html = def.exportTemplates.html(
      { serviceName: "s", auth: { showSignup: true } },
      ctx,
    );
    expect(html).toContain('<button type="button" class="btn-navi join"');
    // anchor로 회원가입이 나오면 안 됨
    expect(html).not.toMatch(/<a[^>]+>회원가입/);
  });
});
