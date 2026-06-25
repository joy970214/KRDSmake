import "fake-indexeddb/auto";
import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AppRoot } from "./AppRoot";

describe("AppRoot (3패널 셸 통합)", () => {
  it("부트스트랩 후 에디터 셸과 사이트맵/캔버스를 보여준다", async () => {
    render(<AppRoot />);

    await waitFor(() => {
      expect(screen.getByText("KRDS 웹사이트 빌더")).toBeInTheDocument();
    });

    // 좌측 탭 + 사이트맵 트리(홈) + 캔버스 빈 안내
    expect(screen.getByRole("tab", { name: "사이트맵" })).toBeInTheDocument();
    // 홈은 트리 노드 + 캔버스 페이지 제목에 모두 나타남
    expect(screen.getAllByText("홈").length).toBeGreaterThan(0);
    expect(screen.getByText(/드래그하여 페이지를 구성/)).toBeInTheDocument();
  });
});
