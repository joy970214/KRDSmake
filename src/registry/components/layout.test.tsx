import { describe, expect, it } from "vitest";
import { makeExportCtx } from "../test-utils";
import { layoutDefinition as def } from "./layout";

describe("다단 레이아웃 컴포넌트 정의", () => {
  it("레이아웃 및 표현 카테고리의 비표준 컨테이너다", () => {
    expect(def.id).toBe("layout");
    expect(def.category).toBe("레이아웃 및 표현");
    // KRDS에 범용 그리드 컴포넌트가 없으므로 정직하게 false
    expect(def.isKrdsStandard).toBe(false);
  });

  it("컨테이너 마커로 칼럼 수 프로퍼티를 가리킨다", () => {
    expect(def.container).toEqual({ columnCountProp: "columns" });
  });

  it("기본 2단으로 시작한다", () => {
    expect(def.defaultProps.columns).toBe(2);
  });

  describe("html 익스포트", () => {
    it("krds-grid 래퍼를 생성한다", () => {
      const html = def.exportTemplates.html(def.defaultProps, makeExportCtx());
      expect(html).toContain("krds-grid");
    });

    it("칼럼 수를 --cols 커스텀 속성으로 반영한다", () => {
      const html = def.exportTemplates.html({ columns: 3 }, makeExportCtx());
      expect(html).toContain("--cols:3");
    });
  });

  it("vue/react 익스포트는 2차(호출 시 에러)", () => {
    expect(() => def.exportTemplates.vue({}, makeExportCtx("vue"))).toThrow();
    expect(() => def.exportTemplates.react({}, makeExportCtx("react"))).toThrow();
  });
});
