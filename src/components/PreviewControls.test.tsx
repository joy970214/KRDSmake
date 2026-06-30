import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { createEditorStore, type EditorStore } from "../store/editor-store";
import { EditorStoreProvider } from "../store/context";
import { PreviewControls } from "./PreviewControls";

let store: EditorStore;
beforeEach(() => {
  store = createEditorStore();
  store.getState().createSite("테스트");
});
function renderControls() {
  return render(
    <EditorStoreProvider store={store}>
      <PreviewControls />
    </EditorStoreProvider>,
  );
}

describe("PreviewControls", () => {
  it("테마/디바이스 세그먼트 6개를 렌더한다(공식 KRDS 라벨)", () => {
    renderControls();
    ["기본", "선명하게", "시스템", "PC", "태블릿", "모바일"].forEach((label) =>
      expect(screen.getByRole("button", { name: label })).toBeInTheDocument(),
    );
  });

  it("테마 버튼 클릭이 setPreviewMode를 호출한다", () => {
    renderControls();
    fireEvent.click(screen.getByRole("button", { name: "선명하게" }));
    expect(store.getState().previewMode).toBe("high-contrast");
  });

  it("디바이스 버튼 클릭이 setPreviewDevice를 호출한다", () => {
    renderControls();
    fireEvent.click(screen.getByRole("button", { name: "모바일" }));
    expect(store.getState().previewDevice).toBe("mobile");
  });

  it("현재값 버튼에 aria-pressed=true가 붙는다", () => {
    renderControls();
    expect(screen.getByRole("button", { name: "기본" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "PC" })).toHaveAttribute("aria-pressed", "true");
  });
});
