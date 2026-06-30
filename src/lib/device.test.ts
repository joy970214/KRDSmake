import { describe, expect, it } from "vitest";
import { DEVICE_WIDTH } from "./device";

describe("DEVICE_WIDTH", () => {
  it("pc는 가변(null)", () => {
    expect(DEVICE_WIDTH.pc).toBeNull();
  });
  it("tablet=768, mobile=360 (KRDS 브레이크포인트)", () => {
    expect(DEVICE_WIDTH.tablet).toBe(768);
    expect(DEVICE_WIDTH.mobile).toBe(360);
  });
});
