import { describe, expect, it } from "vitest";
import { makeExportCtx } from "../test-utils";
import { pageTitleDefinition as def } from "./page-title";

describe("제목영역", () => {
  it("KRDS 비표준(자체 컴포넌트)로 표시된다", () => {
    expect(def.isKrdsStandard).toBe(false);
  });

  it("html은 제목을 시맨틱 헤딩(h2)으로 만든다", () => {
    const html = def.exportTemplates.html({ title: "서비스 소개" }, makeExportCtx());
    expect(html).toContain("<h2");
    expect(html).toContain("서비스 소개");
  });

  it("설명이 있으면 본문 단락을 함께 렌더한다", () => {
    const html = def.exportTemplates.html(
      { title: "t", description: "설명입니다" },
      makeExportCtx(),
    );
    expect(html).toContain("설명입니다");
  });
});
