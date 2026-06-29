import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { createEditorStore, type EditorStore, findInstance } from "../../store/editor-store";
import { EditorStoreProvider } from "../../store/context";
import { ComponentForm } from "./ComponentForm";

let store: EditorStore;
let pageId: string;
beforeEach(() => {
  store = createEditorStore();
  store.getState().createSite("테스트");
  pageId = store.getState().site!.pages[0].id;
});

function renderForm(instanceId: string) {
  return render(
    <EditorStoreProvider store={store}>
      <ComponentForm pageId={pageId} instanceId={instanceId} />
    </EditorStoreProvider>,
  );
}

describe("ComponentForm", () => {
  it("선택 컴포넌트의 editableProps로 필드를 그리고 편집이 store에 반영된다", () => {
    const id = store.getState().addComponent(pageId, "button");
    renderForm(id);
    const input = screen.getByLabelText(/버튼 글자/) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "신청하기" } });
    const comps = store.getState().site!.pages.find((p) => p.id === pageId)!.components;
    expect(findInstance(comps, id)!.props.label).toBe("신청하기");
  });

  it("칼럼 안 자식도 편집된다", () => {
    const layoutId = store.getState().addComponent(pageId, "layout");
    const child = store.getState().addComponentToColumn(pageId, layoutId, 0, "button");
    renderForm(child);
    fireEvent.change(screen.getByLabelText(/버튼 글자/), { target: { value: "확인" } });
    const comps = store.getState().site!.pages.find((p) => p.id === pageId)!.components;
    expect(findInstance(comps, child)!.props.label).toBe("확인");
  });
});
