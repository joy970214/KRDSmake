import { describe, expect, it } from "vitest";
import { getComponent, listComponents, listPlaceableComponents } from "./index";
import { makeExportCtx } from "./test-utils";

describe("컴포넌트 레지스트리", () => {
  it("MVP 11종을 등록한다", () => {
    expect(listComponents()).toHaveLength(11);
  });

  it("id로 정의를 조회한다", () => {
    expect(getComponent("button")?.name).toBe("버튼");
    expect(getComponent("없는컴포넌트")).toBeUndefined();
  });

  it("id는 모두 고유하다", () => {
    const ids = listComponents().map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("모든 컴포넌트는 defaultProps로 비어있지 않은 html을 생성한다", () => {
    for (const d of listComponents()) {
      const html = d.exportTemplates.html(d.defaultProps, makeExportCtx());
      expect(html.length, d.id).toBeGreaterThan(0);
    }
  });

  it("KRDS 비표준은 제목영역·카드·다단레이아웃이다", () => {
    const nonStd = listComponents()
      .filter((d) => !d.isKrdsStandard)
      .map((d) => d.id)
      .sort();
    expect(nonStd).toEqual(["card", "layout", "page-title"]);
  });

  it("배치 가능한 컴포넌트는 전역 요소(마스트헤드·헤더·푸터·건너뛰기링크)를 제외한다", () => {
    const ids = listPlaceableComponents()
      .map((d) => d.id)
      .sort();
    expect(ids).toEqual([
      "button",
      "card",
      "image",
      "input-form",
      "layout",
      "page-title",
      "table",
    ]);
  });

  it("모든 카테고리는 KRDS 공식 11종 안에 있다", () => {
    const official = [
      "아이덴티티",
      "탐색",
      "레이아웃 및 표현",
      "액션",
      "선택",
      "피드백",
      "도움",
      "입력",
      "설정",
      "콘텐츠",
      "모바일",
    ];
    for (const d of listComponents()) {
      expect(official, d.id).toContain(d.category);
    }
  });
});
