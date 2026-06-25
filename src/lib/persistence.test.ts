import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { createSite } from "./site-factory";
import { clearPersistedSite, loadSite, saveSite } from "./persistence";
import { createEditorStore } from "../store/editor-store";

beforeEach(async () => {
  await clearPersistedSite();
});

describe("persistence", () => {
  it("저장된 사이트가 없으면 null을 반환한다", async () => {
    expect(await loadSite()).toBeNull();
  });

  it("저장한 사이트를 그대로 복원한다 (새 Site 생성 → 새로고침 → 복원)", async () => {
    const site = createSite("복원 테스트");
    await saveSite(site);

    const loaded = await loadSite();
    expect(loaded).toEqual(site);
  });

  it("중첩 사이트맵 구조도 직렬화 후 보존된다", async () => {
    const store = createEditorStore();
    store.getState().createSite("구조 테스트");
    const parentId = store
      .getState()
      .addSitemapNode({ title: "서비스", slug: "service" });
    store.getState().addSitemapNode({ title: "소개", slug: "intro", parentId });

    const site = store.getState().site!;
    await saveSite(site);
    const loaded = await loadSite();

    expect(loaded).toEqual(site);
    // 자손 path가 복원본에서도 동일
    const child = loaded!.sitemap[1].children![0];
    expect(child.path).toBe("/service/intro");
  });
});
