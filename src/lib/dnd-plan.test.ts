import { describe, expect, it } from "vitest";
import { planDrop, CANVAS_DROPPABLE_ID, columnDroppableId } from "./dnd-plan";

const ids = ["a", "b", "c"]; // 캔버스에 배치된 인스턴스 순서

describe("planDrop — 팔레트에서 새 컴포넌트 추가", () => {
  it("인스턴스 위에 드롭하면 그 인스턴스 앞 index로 추가한다", () => {
    const plan = planDrop({
      activeId: "palette:button",
      componentDefinitionId: "button",
      overId: "b",
      componentIds: ids,
    });
    expect(plan).toEqual({ kind: "add", componentDefinitionId: "button", index: 1 });
  });

  it("드롭 영역(컨테이너) 위에 드롭하면 맨 끝에 추가한다", () => {
    const plan = planDrop({
      activeId: "palette:button",
      componentDefinitionId: "button",
      overId: CANVAS_DROPPABLE_ID,
      componentIds: ids,
    });
    expect(plan).toEqual({ kind: "add", componentDefinitionId: "button", index: 3 });
  });

  it("over가 없으면(영역 밖) 추가하지 않는다", () => {
    const plan = planDrop({
      activeId: "palette:button",
      componentDefinitionId: "button",
      overId: null,
      componentIds: ids,
    });
    expect(plan).toBeNull();
  });
});

describe("planDrop — 배치된 인스턴스 순서변경", () => {
  it("다른 인스턴스 위에 놓으면 그 위치로 이동한다", () => {
    const plan = planDrop({
      activeId: "a",
      overId: "c",
      componentIds: ids,
    });
    expect(plan).toEqual({ kind: "move", instanceId: "a", index: 2 });
  });

  it("자기 자신 위에 놓으면 변화 없음(null)", () => {
    const plan = planDrop({
      activeId: "a",
      overId: "a",
      componentIds: ids,
    });
    expect(plan).toBeNull();
  });

  it("컨테이너 위에 놓으면 맨 끝으로 이동한다", () => {
    const plan = planDrop({
      activeId: "a",
      overId: CANVAS_DROPPABLE_ID,
      componentIds: ids,
    });
    expect(plan).toEqual({ kind: "move", instanceId: "a", index: 2 });
  });
});

describe("planDrop — 레이아웃 칼럼에 드롭", () => {
  it("columnDroppableId는 col:<layoutId>:<colIndex> 형식이다", () => {
    expect(columnDroppableId("L1", 2)).toBe("col:L1:2");
  });

  it("팔레트 카드를 칼럼에 드롭하면 그 칼럼에 추가하는 플랜을 만든다", () => {
    const plan = planDrop({
      activeId: "palette:button",
      componentDefinitionId: "button",
      overId: columnDroppableId("L1", 1),
      componentIds: ids,
    });
    expect(plan).toEqual({
      kind: "add-to-column",
      layoutInstanceId: "L1",
      columnIndex: 1,
      componentDefinitionId: "button",
    });
  });

  it("componentDefinitionId가 없으면 칼럼 드롭은 무시한다", () => {
    const plan = planDrop({
      activeId: "palette:button",
      overId: columnDroppableId("L1", 0),
      componentIds: ids,
    });
    expect(plan).toBeNull();
  });

  it("MVP에서는 배치된 인스턴스를 칼럼으로 옮기지 않는다(null)", () => {
    const plan = planDrop({
      activeId: "a",
      overId: columnDroppableId("L1", 0),
      componentIds: ids,
    });
    expect(plan).toBeNull();
  });
});
