import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { createEditorStore, type EditorStore } from "../../store/editor-store";
import { EditorStoreProvider } from "../../store/context";
import { SitemapTree } from "./SitemapTree";

let store: EditorStore;
beforeEach(() => {
  store = createEditorStore();
  store.getState().createSite("테스트");
});

function renderTree() {
  return render(
    <EditorStoreProvider store={store}>
      <SitemapTree />
    </EditorStoreProvider>,
  );
}

describe("SitemapTree", () => {
  it("현재 활성 페이지 행에 is-active를 준다", () => {
    const { container } = renderTree();
    // 기본 활성=홈
    const homeId = store.getState().site!.pages[0].id;
    expect(store.getState().activePageId).toBe(homeId);
    expect(container.querySelector(".node-row.is-active")).not.toBeNull();
  });

  it("＋메뉴 추가하면 새 행이 즉시 편집모드(제목 input)로 뜬다", () => {
    renderTree();
    fireEvent.click(screen.getByRole("button", { name: "메뉴 추가" }));
    expect(screen.getByLabelText("제목")).toBeInTheDocument();
  });

  it("편집 중 제목을 입력하면 slug가 자동 생성된다", () => {
    renderTree();
    fireEvent.click(screen.getByRole("button", { name: "메뉴 추가" }));
    fireEvent.change(screen.getByLabelText("제목"), { target: { value: "About Us" } });
    expect((screen.getByLabelText("slug") as HTMLInputElement).value).toBe("about-us");
  });

  it("저장하면 renameNode가 반영된다", () => {
    renderTree();
    fireEvent.click(screen.getByRole("button", { name: "메뉴 추가" }));
    fireEvent.change(screen.getByLabelText("제목"), { target: { value: "About" } });
    fireEvent.click(screen.getByRole("button", { name: "저장" }));
    const titles = store.getState().site!.sitemap.map((n) => n.title);
    expect(titles).toContain("About");
  });

  it("제목 클릭은 그 페이지를 활성화한다", () => {
    const id = store.getState().addSitemapNode({ title: "서비스", slug: "service" });
    const pageId = store.getState().site!.sitemap.find((n) => n.id === id)!.pageId;
    renderTree();
    fireEvent.click(screen.getByRole("button", { name: "서비스" }));
    expect(store.getState().activePageId).toBe(pageId);
  });
});
