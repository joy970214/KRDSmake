import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { DndContext } from "@dnd-kit/core";
import { createEditorStore, type EditorStore } from "../store/editor-store";
import { EditorStoreProvider } from "../store/context";
import { Canvas } from "./Canvas";

let store: EditorStore;
let pageId: string;
beforeEach(() => {
  store = createEditorStore();
  store.getState().createSite("테스트");
  pageId = store.getState().site!.pages[0].id;
});

function renderCanvas() {
  return render(
    <EditorStoreProvider store={store}>
      <DndContext>
        <Canvas />
      </DndContext>
    </EditorStoreProvider>,
  );
}

describe("캔버스 인스턴스 조작", () => {
  it("배치된 컴포넌트를 선택하면 store.selection이 설정된다", () => {
    const id = store.getState().addComponent(pageId, "button");
    renderCanvas();
    fireEvent.click(screen.getByRole("button", { name: "버튼 선택" }));
    expect(store.getState().selection).toEqual({
      kind: "component",
      pageId,
      instanceId: id,
    });
  });

  it("선택했을 때만 조작 툴바가 보인다", () => {
    store.getState().addComponent(pageId, "button");
    renderCanvas();
    expect(screen.queryByRole("button", { name: "버튼 삭제" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "버튼 선택" }));
    expect(screen.getByRole("button", { name: "버튼 삭제" })).toBeInTheDocument();
  });

  it("삭제 버튼이 인스턴스를 제거한다", () => {
    store.getState().addComponent(pageId, "button");
    renderCanvas();
    fireEvent.click(screen.getByRole("button", { name: "버튼 선택" }));
    fireEvent.click(screen.getByRole("button", { name: "버튼 삭제" }));
    expect(store.getState().site!.pages.find((p) => p.id === pageId)!.components).toHaveLength(0);
  });

  it("복제 버튼이 인스턴스를 복제한다", () => {
    store.getState().addComponent(pageId, "button");
    renderCanvas();
    fireEvent.click(screen.getByRole("button", { name: "버튼 선택" }));
    fireEvent.click(screen.getByRole("button", { name: "버튼 복제" }));
    expect(store.getState().site!.pages.find((p) => p.id === pageId)!.components).toHaveLength(2);
  });

  it("숨김 버튼이 hidden을 토글한다", () => {
    const id = store.getState().addComponent(pageId, "button");
    renderCanvas();
    fireEvent.click(screen.getByRole("button", { name: "버튼 선택" }));
    fireEvent.click(screen.getByRole("button", { name: "버튼 숨김" }));
    const inst = store
      .getState()
      .site!.pages.find((p) => p.id === pageId)!
      .components.find((c) => c.id === id)!;
    expect(inst.hidden).toBe(true);
  });

  it("아래로 버튼이 순서를 바꾼다", () => {
    const a = store.getState().addComponent(pageId, "button");
    store.getState().addComponent(pageId, "table");
    renderCanvas();
    fireEvent.click(screen.getByRole("button", { name: "버튼 선택" }));
    fireEvent.click(screen.getByRole("button", { name: "버튼 아래로" }));
    // a(button)가 뒤(index 1)로 갔는지 확인
    const order = store
      .getState()
      .site!.pages.find((p) => p.id === pageId)!
      .components.findIndex((c) => c.id === a);
    expect(order).toBe(1);
  });

  it("숨겨진 인스턴스는 캔버스에서 숨김 표시되지만 렌더된다(편집용)", () => {
    const id = store.getState().addComponent(pageId, "button");
    store.getState().toggleHidden(pageId, id);
    renderCanvas();
    // 숨김 상태에서도 선택 핸들이 보여 다시 표시할 수 있어야 한다
    expect(screen.getByRole("button", { name: "버튼 선택" })).toBeInTheDocument();
  });
});
