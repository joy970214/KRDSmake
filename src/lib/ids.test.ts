import { describe, expect, it } from "vitest";
import { newId } from "./ids";

describe("newId", () => {
  it("매번 다른 id를 만든다", () => {
    expect(newId()).not.toBe(newId());
  });

  it("crypto.randomUUID가 없는 비보안 컨텍스트(HTTP)에서도 UUID를 만든다", () => {
    const orig = globalThis.crypto.randomUUID;
    // 비보안 컨텍스트(HTTP+외부IP)에서는 randomUUID가 undefined
    // @ts-expect-error 강제 제거
    globalThis.crypto.randomUUID = undefined;
    try {
      const id = newId();
      expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    } finally {
      globalThis.crypto.randomUUID = orig;
    }
  });
});
