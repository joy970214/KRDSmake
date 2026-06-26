import { render, screen } from "@testing-library/react";
import { DndContext } from "@dnd-kit/core";
import { describe, expect, it } from "vitest";
import { ComponentPalette } from "./ComponentPalette";

function renderPalette() {
  return render(
    <DndContext>
      <ComponentPalette />
    </DndContext>,
  );
}

describe("컴포넌트 팔레트", () => {
  it("페이지 본문에 배치 가능한 컴포넌트 카드를 보여준다", () => {
    renderPalette();
    for (const name of ["버튼", "표", "카드", "입력폼", "이미지", "제목영역"]) {
      expect(screen.getByText(name)).toBeInTheDocument();
    }
  });

  it("전역 요소(헤더·푸터·마스트헤드·건너뛰기링크)는 팔레트에 없다", () => {
    renderPalette();
    for (const name of ["헤더", "푸터", "공식 배너", "건너뛰기 링크"]) {
      expect(screen.queryByText(name)).toBeNull();
    }
  });

  it("KRDS 비표준 컴포넌트에 표시를 단다", () => {
    renderPalette();
    // 카드 카드(자체 컴포넌트)에 비표준 배지
    const cardItem = screen.getByText("카드").closest("[data-component-id]")!;
    expect(cardItem.textContent).toContain("자체");
  });
});
