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

  // F5: f-org → info-addr
  it("기관명은 info-addr 클래스를 사용하고 f-org는 없어야 한다", () => {
    const html = def.exportTemplates.html(
      { organizationName: "행정안전부", copyright: "© 2026 MOIS" },
      makeExportCtx(),
    );
    expect(html).toContain('class="info-addr"');
    expect(html).not.toContain("f-org");
  });

  // F6: <address> → <ul class="info-cs">
  it("연락처는 info-cs 목록을 사용하고 address 태그는 없어야 한다", () => {
    const html = def.exportTemplates.html(
      {
        organizationName: "o",
        copyright: "c",
        address: "서울특별시 종로구",
        tel: "02-2100-3399",
        email: "gov@mois.go.kr",
      },
      makeExportCtx(),
    );
    expect(html).toContain('class="info-cs"');
    expect(html).toContain("서울특별시 종로구");
    expect(html).toContain("02-2100-3399");
    expect(html).toContain("gov@mois.go.kr");
    expect(html).not.toContain("<address");
  });

  // F7: ul.f-link → div.f-menu
  it("정책 링크는 f-menu div를 사용하고 f-link는 없어야 한다", () => {
    const html = def.exportTemplates.html(
      {
        organizationName: "o",
        copyright: "c",
        policyLinks: [{ label: "개인정보처리방침", url: "/privacy" }],
      },
      makeExportCtx(),
    );
    expect(html).toContain('class="f-menu"');
    expect(html).toContain("개인정보처리방침");
    expect(html).toContain('href="/privacy"');
    expect(html).not.toContain("f-link");
  });
});
