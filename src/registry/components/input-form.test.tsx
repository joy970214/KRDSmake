import { describe, expect, it } from "vitest";
import { makeExportCtx } from "../test-utils";
import { inputFormDefinition as def } from "./input-form";

describe("입력폼", () => {
  it("입력 카테고리", () => {
    expect(def.category).toBe("입력");
  });

  it("html은 form-group/label/krds-input 구조를 만든다", () => {
    const html = def.exportTemplates.html(
      { label: "이름", placeholder: "이름을 입력하세요", hint: "실명", fieldId: "name" },
      makeExportCtx(),
    );
    expect(html).toContain('class="form-group"');
    expect(html).toContain('class="krds-input"');
    expect(html).toContain("이름");
    expect(html).toContain('placeholder="이름을 입력하세요"');
    expect(html).toContain('class="form-hint"');
  });

  it("label의 for와 input의 id가 연결된다(접근성)", () => {
    const html = def.exportTemplates.html(
      { label: "이메일", fieldId: "email" },
      makeExportCtx(),
    );
    expect(html).toContain('for="email"');
    expect(html).toContain('id="email"');
  });
});
