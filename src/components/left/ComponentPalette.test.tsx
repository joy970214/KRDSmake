import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ComponentPalette } from "./ComponentPalette";

describe("컴포넌트 팔레트", () => {
  it("레지스트리의 10종 컴포넌트 카드를 보여준다", () => {
    render(<ComponentPalette />);
    for (const name of ["버튼", "표", "헤더", "푸터", "카드", "입력폼", "이미지"]) {
      expect(screen.getByText(name)).toBeInTheDocument();
    }
  });

  it("KRDS 비표준 컴포넌트에 표시를 단다", () => {
    render(<ComponentPalette />);
    // 카드 카드(자체 컴포넌트)에 비표준 배지
    const cardItem = screen.getByText("카드").closest("[data-component-id]")!;
    expect(cardItem.textContent).toContain("자체");
  });
});
