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

  it("위조 클래스 없이 항상 KRDS 실존 클래스 tbl col data만 쓴다", () => {
    const row = def.exportTemplates.html(
      { caption: "표", columns: ["a", "b"], rows: [["1", "2"]], headerType: "row" },
      makeExportCtx(),
    );
    const col = def.exportTemplates.html(
      { caption: "표", columns: ["a", "b"], rows: [["1", "2"]], headerType: "col" },
      makeExportCtx(),
    );
    expect(row).toContain('class="tbl col data"');
    expect(col).toContain('class="tbl col data"');
    expect(row).not.toContain("tbl row");
  });

  it("행형은 본문 첫 칸을 th scope=row로 낸다(KRDS scope 시맨틱)", () => {
    const html = def.exportTemplates.html(
      { caption: "표", columns: ["항목", "값"], rows: [["인구", "100"]], headerType: "row" },
      makeExportCtx(),
    );
    expect(html).toContain('<th scope="row">인구</th>');
    expect(html).toContain("<td>100</td>");
  });

  it("열형은 본문을 전부 td로 낸다(th scope=row 없음)", () => {
    const html = def.exportTemplates.html(
      { caption: "표", columns: ["항목", "값"], rows: [["인구", "100"]], headerType: "col" },
      makeExportCtx(),
    );
    expect(html).toContain("<td>인구</td>");
    expect(html).not.toContain('scope="row"');
  });

  it("캡션 숨김이면 caption에 sr-only를 단다", () => {
    const html = def.exportTemplates.html(
      { caption: "표", columns: ["a"], rows: [["1"]], showCaption: false },
      makeExportCtx(),
    );
    expect(html).toContain('class="sr-only"');
  });
});
