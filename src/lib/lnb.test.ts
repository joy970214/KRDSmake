import { describe, expect, it } from "vitest";
import { buildLnb } from "./lnb";
import type { SitemapNode } from "./types";

// 사이트맵 루트: [홈], [서비스 > (소개, 문의)]
const sitemap: SitemapNode[] = [
  { id: "home", title: "홈", slug: "", path: "/", order: 0, visibleInHeader: true, visibleInFooter: false, pageId: "p-home", isHome: true },
  {
    id: "svc", title: "서비스", slug: "service", path: "/service", order: 1, visibleInHeader: true, visibleInFooter: false, pageId: "p-svc",
    children: [
      { id: "intro", title: "소개", slug: "intro", path: "/service/intro", order: 0, visibleInHeader: true, visibleInFooter: false, pageId: "p-intro", parentId: "svc" },
      { id: "qna", title: "문의", slug: "qna", path: "/service/qna", order: 1, visibleInHeader: true, visibleInFooter: false, pageId: "p-qna", parentId: "svc" },
    ],
  },
];

describe("buildLnb", () => {
  it("하위 페이지에서 속한 섹션의 하위 트리를 반환하고 현재 페이지를 강조한다", () => {
    const lnb = buildLnb(sitemap, "intro");
    expect(lnb).not.toBeNull();
    expect(lnb!.sectionTitle).toBe("서비스");
    expect(lnb!.items.map((n) => n.id)).toEqual(["intro", "qna"]);
    expect(lnb!.activeNodeId).toBe("intro");
  });

  it("섹션 랜딩(자식 있는 최상위 노드)에서는 자기 자식들을 반환한다", () => {
    const lnb = buildLnb(sitemap, "svc");
    expect(lnb!.items.map((n) => n.id)).toEqual(["intro", "qna"]);
    expect(lnb!.activeNodeId).toBe("svc");
  });

  it("홈에서는 null(LNB 없음)", () => {
    expect(buildLnb(sitemap, "home")).toBeNull();
  });

  it("자식이 없는 단독 섹션에서는 null", () => {
    const flat: SitemapNode[] = [
      { id: "home", title: "홈", slug: "", path: "/", order: 0, visibleInHeader: true, visibleInFooter: false, pageId: "p-home", isHome: true },
      { id: "lone", title: "단독", slug: "lone", path: "/lone", order: 1, visibleInHeader: true, visibleInFooter: false, pageId: "p-lone" },
    ];
    expect(buildLnb(flat, "lone")).toBeNull();
  });

  it("없는 노드 id면 null", () => {
    expect(buildLnb(sitemap, "nope")).toBeNull();
  });
});
