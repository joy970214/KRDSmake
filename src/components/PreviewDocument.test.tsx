import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { createEditorStore, type EditorStore } from "../store/editor-store";
import type { PreviewCtx } from "../registry/types";
import { PreviewDocument } from "./PreviewDocument";

let store: EditorStore;
beforeEach(() => {
  store = createEditorStore();
  store.getState().createSite("테스트");
});
function ctxFor(): PreviewCtx {
  const site = store.getState().site!;
  return { site, page: site.pages[0], resolveAsset: () => undefined, mode: "light", device: "pc" };
}

describe("PreviewDocument", () => {
  it("페이지 제목과 KRDS 구조를 편집 크롬 없이 렌더한다", () => {
    const site = store.getState().site!;
    const page = site.pages[0];
    const { container } = render(<PreviewDocument site={site} page={page} ctx={ctxFor()} />);
    expect(container.querySelector(".canvas-page-title")?.textContent).toBe(page.title);
    expect(container.querySelector(".krds-table-wrap, .page-frame")).not.toBeNull();
    // 편집 크롬 없음
    expect(container.querySelector(".ci-drag")).toBeNull();
    expect(container.querySelector(".ci-select")).toBeNull();
    expect(container.querySelector(".ci-toolbar")).toBeNull();
  });

  it("배치된 컴포넌트의 Preview를 렌더하고 숨김은 제외한다", () => {
    const pageId = store.getState().site!.pages[0].id;
    const visibleId = store.getState().addComponent(pageId, "button");
    const hiddenId = store.getState().addComponent(pageId, "button");
    store.getState().toggleHidden(pageId, hiddenId);
    const site = store.getState().site!;
    const page = site.pages.find((p) => p.id === pageId)!;
    const { container } = render(<PreviewDocument site={site} page={page} ctx={ctxFor()} />);
    // 보이는 1개만 krds-btn 렌더(숨김 제외)
    expect(container.querySelectorAll(".krds-btn").length).toBe(1);
    expect(visibleId).not.toBe(hiddenId);
  });

  it("다단 레이아웃 인스턴스를 .krds-grid + N개의 .krds-grid-col로 렌더한다", () => {
    const pageId = store.getState().site!.pages[0].id;
    const layoutId = store.getState().addComponent(pageId, "layout");
    store.getState().setLayoutColumns(pageId, layoutId, 3);
    store.getState().addComponentToColumn(pageId, layoutId, 0, "button");
    const site = store.getState().site!;
    const page = site.pages.find((p) => p.id === pageId)!;
    const { container } = render(<PreviewDocument site={site} page={page} ctx={ctxFor()} />);
    expect(container.querySelector(".krds-grid")).not.toBeNull();
    expect(container.querySelectorAll(".krds-grid-col").length).toBe(3);
    // 첫 번째 칼럼에 버튼이 렌더됐는지 확인
    const firstCol = container.querySelectorAll(".krds-grid-col")[0];
    expect(firstCol.querySelector(".krds-btn")).not.toBeNull();
  });
});
