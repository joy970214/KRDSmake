import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Home from "./page";

// Step 0 스모크: 에디터 셸이 렌더되고 빈 페이지 안내가 보인다.
describe("에디터 셸", () => {
  it("빈 페이지 안내 문구를 렌더한다", () => {
    render(<Home />);
    expect(
      screen.getByText(/드래그하여 페이지를 구성/),
    ).toBeInTheDocument();
  });

  it("제목 영역에 앱 이름을 표시한다", () => {
    render(<Home />);
    expect(screen.getByText("KRDS 웹사이트 빌더")).toBeInTheDocument();
  });
});
