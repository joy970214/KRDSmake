import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { makeExportCtx, makePreviewCtx } from "../test-utils";
import { buttonDefinition as def } from "./button";

describe("버튼 컴포넌트 정의", () => {
  it("KRDS 표준 컴포넌트로 표시된다", () => {
    expect(def.isKrdsStandard).toBe(true);
    expect(def.category).toBe("액션");
  });

  describe("html 익스포트", () => {
    it("krds-btn 클래스의 button을 생성한다", () => {
      const html = def.exportTemplates.html({ label: "신청하기" }, makeExportCtx());
      expect(html).toContain('class="krds-btn"');
      expect(html).toContain("<button");
      expect(html).toContain("신청하기");
    });

    it("variant=primary는 krds-btn primary로 렌더한다(KRDS 위계)", () => {
      const html = def.exportTemplates.html({ label: "확인", variant: "primary" }, makeExportCtx());
      expect(html).toContain('class="krds-btn primary"');
    });

    it("라벨의 HTML 특수문자를 이스케이프한다", () => {
      const html = def.exportTemplates.html({ label: "<b>x</b>" }, makeExportCtx());
      expect(html).toContain("&lt;b&gt;x&lt;/b&gt;");
      expect(html).not.toContain("<b>x</b>");
    });

    it("variant가 secondary면 krds-btn에 secondary 클래스가 붙는다", () => {
      const html = def.exportTemplates.html(
        { label: "취소", variant: "secondary" },
        makeExportCtx(),
      );
      expect(html).toContain("secondary");
    });

    it("크기/텍스트형 클래스를 조합한다", () => {
      const html = def.exportTemplates.html(
        { label: "검색", variant: "primary", size: "large", textStyle: true },
        makeExportCtx(),
      );
      expect(html).toContain('class="krds-btn primary large text"');
    });

    it("비활성이면 disabled를 단다", () => {
      const html = def.exportTemplates.html({ label: "확인", disabled: true }, makeExportCtx());
      expect(html).toContain("disabled");
    });

    it("아이콘만이면 icon 클래스 + svg-icon을 렌더하고 aria-label을 단다", () => {
      const html = def.exportTemplates.html({ label: "검색", icon: "only" }, makeExportCtx());
      expect(html).toContain("krds-btn");
      expect(html).toContain("icon");
      expect(html).toContain('class="svg-icon ico-sch"');
      expect(html).toContain('aria-label="검색"');
    });

    it("링크처럼 동작이면 a 태그 + href로 렌더한다", () => {
      const html = def.exportTemplates.html(
        { label: "이동", asLink: true, href: "/go" },
        makeExportCtx(),
      );
      expect(html).toContain("<a ");
      expect(html).toContain('href="/go"');
      expect(html).not.toContain("<button");
    });
  });

  describe("Preview", () => {
    it("라벨을 가진 버튼을 렌더한다", () => {
      render(def.Preview({ props: { label: "신청하기" }, ctx: makePreviewCtx() }));
      expect(screen.getByRole("button", { name: "신청하기" })).toBeInTheDocument();
    });
  });

  it("vue/react 익스포트는 2차(호출 시 에러)", () => {
    expect(() => def.exportTemplates.vue({}, makeExportCtx("vue"))).toThrow();
    expect(() => def.exportTemplates.react({}, makeExportCtx("react"))).toThrow();
  });
});
