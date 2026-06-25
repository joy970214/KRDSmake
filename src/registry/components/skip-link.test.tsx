import { describe, expect, it } from "vitest";
import { makeExportCtx } from "../test-utils";
import { skipLinkDefinition as def } from "./skip-link";

describe("건너뛰기 링크", () => {
  it("KRDS 표준(탐색)", () => {
    expect(def.isKrdsStandard).toBe(true);
    expect(def.category).toBe("탐색");
  });

  it("html은 #krds-skip-link 컨테이너와 본문 바로가기 링크를 생성한다", () => {
    const html = def.exportTemplates.html(
      { label: "본문 바로가기", target: "#main" },
      makeExportCtx(),
    );
    expect(html).toContain('id="krds-skip-link"');
    expect(html).toContain('href="#main"');
    expect(html).toContain("본문 바로가기");
  });
});
