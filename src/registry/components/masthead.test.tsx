import { describe, expect, it } from "vitest";
import { makeExportCtx } from "../test-utils";
import { mastheadDefinition as def } from "./masthead";

describe("공식 배너(마스트헤드)", () => {
  it("KRDS 표준(아이덴티티)", () => {
    expect(def.isKrdsStandard).toBe(true);
    expect(def.category).toBe("아이덴티티");
  });

  it("html은 #krds-masthead와 nuri-txt 안내문을 만든다", () => {
    const html = def.exportTemplates.html(
      { text: "이 누리집은 대한민국 공식 전자정부 누리집입니다." },
      makeExportCtx(),
    );
    expect(html).toContain('id="krds-masthead"');
    expect(html).toContain('class="nuri-txt"');
    expect(html).toContain("공식 전자정부 누리집");
  });
});
