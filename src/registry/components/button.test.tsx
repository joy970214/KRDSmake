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
