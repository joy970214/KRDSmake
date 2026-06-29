import { describe, expect, it } from "vitest";
import { makeExportCtx } from "../test-utils";
import { imageDefinition as def } from "./image";

describe("이미지", () => {
  it("KRDS 표준(레이아웃 및 표현)", () => {
    expect(def.isKrdsStandard).toBe(true);
    expect(def.category).toBe("레이아웃 및 표현");
  });

  it("html은 src와 alt를 가진 img를 생성한다", () => {
    const html = def.exportTemplates.html(
      { src: "/img/a.png", alt: "안내 이미지" },
      makeExportCtx(),
    );
    expect(html).toContain("<img");
    expect(html).toContain('src="/img/a.png"');
    expect(html).toContain('alt="안내 이미지"');
  });

  it("caption이 있으면 figure/figcaption으로 감싼다", () => {
    const html = def.exportTemplates.html(
      { src: "/x.png", alt: "x", caption: "그림 1" },
      makeExportCtx(),
    );
    expect(html).toContain("<figure");
    expect(html).toContain("<figcaption");
    expect(html).toContain("그림 1");
  });

  it("접근성: alt 입력 스키마가 필수", () => {
    const altProp = def.editableProps.find((p) => p.key === "alt");
    expect(altProp?.required).toBe(true);
  });
});

describe("이미지 변형", () => {
  it("가운데 정렬이면 래퍼에 text-align:center를 준다", () => {
    const html = def.exportTemplates.html(
      { src: "/a.png", alt: "그림", align: "center" },
      makeExportCtx(),
    );
    expect(html).toContain("text-align:center");
  });

  it("꽉참이면 img에 width:100%를 준다", () => {
    const html = def.exportTemplates.html(
      { src: "/a.png", alt: "그림", fit: "full" },
      makeExportCtx(),
    );
    expect(html).toContain("width:100%");
  });
});
