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
});
