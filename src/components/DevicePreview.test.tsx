import { render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { createEditorStore, type EditorStore } from "../store/editor-store";
import { DevicePreview } from "./DevicePreview";

let store: EditorStore;
beforeEach(() => {
  store = createEditorStore();
  store.getState().createSite("테스트");
});

describe("DevicePreview", () => {
  it("iframe 호스트를 렌더한다", () => {
    const site = store.getState().site!;
    const { getByTitle } = render(
      <DevicePreview mode="high-contrast" device="pc" site={site} page={site.pages[0]} />,
    );
    expect(getByTitle("디바이스 미리보기").tagName).toBe("IFRAME");
  });

  it("모바일이면 iframe 폭을 360px로 제약한다", () => {
    const site = store.getState().site!;
    const { getByTitle } = render(
      <DevicePreview mode="light" device="mobile" site={site} page={site.pages[0]} />,
    );
    const iframe = getByTitle("디바이스 미리보기");
    expect(iframe).toHaveStyle({ width: "360px" });
    expect(iframe.getAttribute("data-device")).toBe("mobile");
  });

  it("PC면 폭을 인라인 고정하지 않는다(가변)", () => {
    const site = store.getState().site!;
    const { getByTitle } = render(
      <DevicePreview mode="high-contrast" device="pc" site={site} page={site.pages[0]} />,
    );
    expect(getByTitle("디바이스 미리보기").style.width).toBe("");
  });

  it("PreviewDocument 콘텐츠를 iframe body로 포털한다", async () => {
    const site = store.getState().site!;
    const { getByTitle } = render(
      <DevicePreview mode="light" device="pc" site={site} page={site.pages[0]} />,
    );
    const iframe = getByTitle("디바이스 미리보기") as HTMLIFrameElement;
    await waitFor(() => {
      expect(iframe.contentDocument?.body.querySelector(".canvas-frame")).not.toBeNull();
    });
  });
});
