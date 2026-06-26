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

describe("다단 레이아웃 캔버스 렌더링", () => {
  it("레이아웃 인스턴스는 칼럼 수만큼 드롭 칼럼을 렌더한다", () => {
    store.getState().addComponent(pageId, "layout"); // 기본 2단
    const { container } = renderCanvas();
    expect(container.querySelectorAll(".krds-grid-col")).toHaveLength(2);
  });

  it("레이아웃을 선택하고 4단 버튼을 누르면 칼럼이 4개가 된다", () => {
    store.getState().addComponent(pageId, "layout");
    const { container } = renderCanvas();
    fireEvent.click(screen.getByRole("button", { name: "다단 레이아웃 선택" }));
    fireEvent.click(screen.getByRole("button", { name: "4단" }));
    const layout = store.getState().site!.pages.find((p) => p.id === pageId)!.components[0];
    expect(layout.columns).toHaveLength(4);
    expect(container.querySelectorAll(".krds-grid-col")).toHaveLength(4);
  });

  it("칼럼 안 자식이 렌더되고 선택하면 자식 id로 selection이 설정된다", () => {
    const layoutId = store.getState().addComponent(pageId, "layout");
    const childId = store.getState().addComponentToColumn(pageId, layoutId, 0, "button");
    renderCanvas();
    fireEvent.click(screen.getByRole("button", { name: "버튼 선택" }));
    expect(store.getState().selection).toEqual({
      kind: "component",
      pageId,
      instanceId: childId,
    });
  });

  it("선택한 칼럼 자식을 삭제하면 칼럼에서 제거된다", () => {
    const layoutId = store.getState().addComponent(pageId, "layout");
    store.getState().addComponentToColumn(pageId, layoutId, 0, "button");
    renderCanvas();
    fireEvent.click(screen.getByRole("button", { name: "버튼 선택" }));
    fireEvent.click(screen.getByRole("button", { name: "버튼 삭제" }));
    const layout = store.getState().site!.pages.find((p) => p.id === pageId)!.components[0];
    expect(layout.columns![0]).toHaveLength(0);
  });
});

// 헬퍼: 홈 외 섹션 + 하위 페이지 생성 → 하위 페이지 id 반환
function addSectionWithChild() {
  const svc = store.getState().addSitemapNode({ title: "서비스", slug: "service" });
  const intro = store.getState().addSitemapNode({ title: "소개", slug: "intro", parentId: svc });
  const introPage = store.getState().site!.pages.find((p) => p.sitemapNodeId === intro)!;
  return { introPageId: introPage.id };
}

describe("페이지 사이드바(LNB)", () => {
  it("비홈 하위 페이지는 기본(미설정)으로 사이드바가 보이고 섹션 제목/활성항목을 표시한다", () => {
    const { introPageId } = addSectionWithChild();
    store.getState().setActivePage(introPageId);
    const { container } = renderCanvas();
    expect(container.querySelector(".lnb")).not.toBeNull();
    expect(container.querySelector(".lnb-title")?.textContent).toBe("서비스");
    expect(container.querySelector(".lnb-link.is-active")?.textContent).toBe("소개");
  });

  it("showSidebar=false면 사이드바가 사라진다", () => {
    const { introPageId } = addSectionWithChild();
    store.getState().setActivePage(introPageId);
    store.getState().setPageSidebar(introPageId, false);
    const { container } = renderCanvas();
    expect(container.querySelector(".lnb")).toBeNull();
  });

  it("홈에서는 기본 켜짐이어도 사이드바가 없다", () => {
    addSectionWithChild();
    // 활성 페이지 미설정 → Canvas는 pages[0](홈)로 폴백
    const { container } = renderCanvas();
    expect(container.querySelector(".lnb")).toBeNull();
  });

  it("토글 체크박스가 store.showSidebar를 끈다", () => {
    const { introPageId } = addSectionWithChild();
    store.getState().setActivePage(introPageId);
    renderCanvas();
    fireEvent.click(screen.getByRole("checkbox", { name: "사이드바 표시" }));
    expect(store.getState().site!.pages.find((p) => p.id === introPageId)!.showSidebar).toBe(false);
  });
});
