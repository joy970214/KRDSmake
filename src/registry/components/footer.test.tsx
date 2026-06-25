import { describe, expect, it } from "vitest";
import { makeExportCtx } from "../test-utils";
import { footerDefinition as def } from "./footer";

describe("푸터", () => {
  it("KRDS 표준(아이덴티티)", () => {
    expect(def.isKrdsStandard).toBe(true);
    expect(def.category).toBe("아이덴티티");
  });

  it("html은 #krds-footer와 운영기관·저작권을 만든다", () => {
    const html = def.exportTemplates.html(
      {
        organizationName: "행정안전부",
        copyright: "© 2026 MOIS",
      },
      makeExportCtx(),
    );
    expect(html).toContain('id="krds-footer"');
    expect(html).toContain("행정안전부");
    expect(html).toContain("© 2026 MOIS");
  });

  it("정책 링크를 목록으로 렌더한다", () => {
    const html = def.exportTemplates.html(
      {
        organizationName: "o",
        copyright: "c",
        policyLinks: [{ label: "개인정보처리방침", url: "/privacy" }],
      },
      makeExportCtx(),
    );
    expect(html).toContain("개인정보처리방침");
    expect(html).toContain('href="/privacy"');
  });
});
