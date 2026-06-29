import { describe, expect, it } from "vitest";
import type { SitemapNode } from "./types";
import { buildBreadcrumb } from "./breadcrumb";

const sitemap: SitemapNode[] = [
  { id: "home", title: "홈", slug: "", path: "/", isHome: true, children: [] } as SitemapNode,
  {
    id: "svc",
    title: "서비스",
    slug: "service",
    path: "/service",
    children: [
      { id: "intro", title: "소개", slug: "intro", path: "/service/intro", children: [] } as SitemapNode,
    ],
  } as SitemapNode,
];

describe("buildBreadcrumb", () => {
  it("홈 + 조상 경로를 순서대로 반환한다", () => {
    const crumbs = buildBreadcrumb(sitemap, "intro");
    expect(crumbs.map((c) => c.title)).toEqual(["홈", "서비스", "소개"]);
    expect(crumbs[0].isHome).toBe(true);
  });

  it("현재가 홈이면 빈 배열", () => {
    expect(buildBreadcrumb(sitemap, "home")).toEqual([]);
  });

  it("없는 노드면 빈 배열", () => {
    expect(buildBreadcrumb(sitemap, "nope")).toEqual([]);
  });
});
