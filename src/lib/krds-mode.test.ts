import { describe, expect, it } from "vitest";
import { krdsModeAttr } from "./krds-mode";

describe("krdsModeAttr", () => {
  it("light는 속성 없음(undefined)", () => {
    expect(krdsModeAttr("light")).toBeUndefined();
  });
  it("high-contrast는 'high-contrast'", () => {
    expect(krdsModeAttr("high-contrast")).toBe("high-contrast");
  });
  it("system은 'theme'", () => {
    expect(krdsModeAttr("system")).toBe("theme");
  });
});
