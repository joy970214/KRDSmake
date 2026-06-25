import { fireEvent, render, screen, within } from "@testing-library/react";
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

describe("사이트맵 트리", () => {
  it("홈 노드를 path '/'와 함께 보여준다", () => {
    renderTree();
    expect(screen.getByText("홈")).toBeInTheDocument();
    expect(screen.getByText("/")).toBeInTheDocument();
  });

  it("메뉴 추가 → 새 루트 노드가 나타난다", () => {
    renderTree();
    fireEvent.click(screen.getByRole("button", { name: "메뉴 추가" }));
    expect(screen.getByText("새 메뉴")).toBeInTheDocument();
  });

  it("하위 추가 시 자식 path가 부모 slug 기준으로 자동계산된다", () => {
    store.getState().addSitemapNode({ title: "서비스", slug: "service" });
    renderTree();
    fireEvent.click(screen.getByRole("button", { name: "서비스 하위 추가" }));
    // 새 자식 path가 /service/ 로 시작
    expect(screen.getByText(/^\/service\//)).toBeInTheDocument();
  });

  it("이름변경: 제목과 slug를 바꾸면 path가 갱신된다", () => {
    store.getState().addSitemapNode({ title: "서비스", slug: "service" });
    renderTree();
    fireEvent.click(screen.getByRole("button", { name: "서비스 이름변경" }));
    fireEvent.change(screen.getByLabelText("제목"), { target: { value: "사업" } });
    fireEvent.change(screen.getByLabelText("slug"), { target: { value: "biz" } });
    fireEvent.click(screen.getByRole("button", { name: "저장" }));
    expect(screen.getByText("사업")).toBeInTheDocument();
    expect(screen.getByText("/biz")).toBeInTheDocument();
  });

  it("삭제: 노드를 제거한다", () => {
    store.getState().addSitemapNode({ title: "서비스", slug: "service" });
    renderTree();
    fireEvent.click(screen.getByRole("button", { name: "서비스 삭제" }));
    expect(screen.queryByText("서비스")).not.toBeInTheDocument();
  });

  it("홈 노드에는 삭제 버튼이 없다", () => {
    renderTree();
    const homeRow = screen.getByText("홈").closest("li")!;
    expect(within(homeRow).queryByRole("button", { name: /삭제/ })).toBeNull();
  });

  it("순서변경: 아래로 버튼이 형제 순서를 바꾼다", () => {
    store.getState().addSitemapNode({ title: "가", slug: "ga" });
    store.getState().addSitemapNode({ title: "나", slug: "na" });
    renderTree();
    // 루트 순서: 홈, 가, 나. "가 아래로" → 홈, 나, 가
    fireEvent.click(screen.getByRole("button", { name: "가 아래로" }));
    const ids = store.getState().site!.sitemap.map((n) => n.title);
    expect(ids.indexOf("나")).toBeLessThan(ids.indexOf("가"));
  });

  it("홈지정: 다른 노드를 홈으로 바꾼다", () => {
    store.getState().addSitemapNode({ title: "메인", slug: "main" });
    renderTree();
    fireEvent.click(screen.getByRole("button", { name: "메인 홈지정" }));
    // 메인이 홈이 되어 path '/'
    const mainRow = screen.getByText("메인").closest("li")!;
    expect(within(mainRow).getByText("/")).toBeInTheDocument();
  });
});
