import { describe, expect, it } from "vitest";
import { makeExportCtx } from "../test-utils";
import { tableDefinition as def } from "./table";

describe("표", () => {
  it("KRDS 표준(레이아웃 및 표현)", () => {
    expect(def.isKrdsStandard).toBe(true);
    expect(def.category).toBe("레이아웃 및 표현");
  });

  it("html은 krds-table-wrap과 tbl 클래스 표를 만든다", () => {
    const html = def.exportTemplates.html(
      { caption: "현황표", columns: ["항목", "값"], rows: [["인구", "100"]] },
      makeExportCtx(),
    );
    expect(html).toContain('class="krds-table-wrap"');
    expect(html).toContain('class="tbl col data"');
    expect(html).toContain("<caption>현황표</caption>");
  });

  it("colgroup으로 열 수만큼 col을 만든다(KRDS)", () => {
    const html = def.exportTemplates.html(
      { caption: "c", columns: ["a", "b", "c"], rows: [["1", "2", "3"]] },
      makeExportCtx(),
    );
    expect(html).toContain("<colgroup>");
    expect((html.match(/<col>/g) || []).length).toBe(3);
  });

  it("열 머리글은 scope=col, 데이터는 행으로 렌더된다", () => {
    const html = def.exportTemplates.html(
      { caption: "c", columns: ["항목", "값"], rows: [["인구", "100"]] },
      makeExportCtx(),
    );
    expect(html).toContain('<th scope="col">항목</th>');
    expect(html).toContain("<td>100</td>");
  });

  it("행형 헤더면 tbl row 클래스를 쓴다", () => {
    const html = def.exportTemplates.html(
      { caption: "표", columns: ["a"], rows: [["1"]], headerType: "row" },
      makeExportCtx(),
    );
    expect(html).toContain('class="tbl row data"');
  });

  it("캡션 숨김이면 caption에 sr-only를 단다", () => {
    const html = def.exportTemplates.html(
      { caption: "표", columns: ["a"], rows: [["1"]], showCaption: false },
      makeExportCtx(),
    );
    expect(html).toContain('class="sr-only"');
  });
});
