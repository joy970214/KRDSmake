import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { createEditorStore, type EditorStore } from "../../store/editor-store";
import { EditorStoreProvider } from "../../store/context";
import { RightPanel } from "./RightPanel";

let store: EditorStore;
let pageId: string;
beforeEach(() => {
  store = createEditorStore();
  store.getState().createSite("테스트");
  pageId = store.getState().site!.pages[0].id;
});
function renderPanel() {
  return render(
    <EditorStoreProvider store={store}>
      <RightPanel />
    </EditorStoreProvider>,
  );
}

describe("RightPanel", () => {
  it("선택이 없으면 페이지 설정 폼을 보여준다", () => {
    renderPanel();
    expect(screen.getByText("페이지 설정", { exact: false })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "브레드크럼 표시" })).toBeInTheDocument();
  });

  it("페이지 설정 편집이 updatePageMeta로 반영된다", () => {
    renderPanel();
    fireEvent.click(screen.getByRole("checkbox", { name: "브레드크럼 표시" }));
    expect(store.getState().site!.pages.find((p) => p.id === pageId)!.showBreadcrumb).toBe(true);
  });

  it("컴포넌트를 선택하면 그 컴포넌트 폼을 보여준다", () => {
    const id = store.getState().addComponent(pageId, "button");
    store.getState().selectComponent(pageId, id);
    renderPanel();
    expect(screen.getByText("버튼 설정")).toBeInTheDocument();
  });

  it("토글이 KRDS 토글 스위치 마크업으로 렌더된다", () => {
    const { container } = renderPanel();
    expect(container.querySelectorAll(".krds-form-toggle-switch").length).toBeGreaterThanOrEqual(3);
  });

  it("페이지 제목을 바꾸면 renameNode로 반영된다", () => {
    renderPanel();
    const input = screen.getByRole("textbox", { name: "페이지 제목" });
    fireEvent.change(input, { target: { value: "새 제목" } });
    expect(store.getState().site!.pages.find((p) => p.id === pageId)!.title).toBe("새 제목");
  });
});
