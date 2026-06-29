import { describe, expect, it } from "vitest";
import { makeExportCtx } from "../test-utils";
import { cardDefinition as def } from "./card";

describe("카드", () => {
  it("KRDS 비표준(구조화 목록 기반 자체 컴포넌트)", () => {
    expect(def.isKrdsStandard).toBe(false);
  });

  it("html은 krds-structured-list 마크업으로 제목·설명을 렌더한다", () => {
    const html = def.exportTemplates.html(
      { title: "지원 사업", text: "간단한 설명" },
      makeExportCtx(),
    );
    expect(html).toContain("krds-structured-list");
    expect(html).toContain('class="c-tit"');
    expect(html).toContain("지원 사업");
    expect(html).toContain("간단한 설명");
  });

  it("링크 라벨이 있으면 krds-btn 링크를 추가한다", () => {
    const html = def.exportTemplates.html(
      { title: "t", text: "x", linkLabel: "신청하기", linkUrl: "/apply" },
      makeExportCtx(),
    );
    expect(html).toContain("krds-btn");
    expect(html).toContain("신청하기");
    expect(html).toContain('href="/apply"');
  });

  it("썸네일 URL이 있으면 img를 렌더한다", () => {
    const html = def.exportTemplates.html(
      { title: "카드", text: "설명", thumbnail: "/t.png" },
      makeExportCtx(),
    );
    expect(html).toContain('src="/t.png"');
  });

  it("테두리를 켜면 ul에 border 스타일을 준다", () => {
    const html = def.exportTemplates.html(
      { title: "카드", text: "설명", bordered: true },
      makeExportCtx(),
    );
    expect(html).toContain("border");
  });
});
