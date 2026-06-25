import localforage from "localforage";
import type { Site } from "./types";

// IndexedDB(localforage)에 현재 사이트 JSON을 보관. 자산 바이너리는 별도(설계 §3.7-4).
const db = localforage.createInstance({
  name: "krds-website-builder",
  storeName: "sites",
});

const CURRENT_SITE_KEY = "current-site";

export async function saveSite(site: Site): Promise<void> {
  await db.setItem(CURRENT_SITE_KEY, site);
}

export async function loadSite(): Promise<Site | null> {
  return (await db.getItem<Site>(CURRENT_SITE_KEY)) ?? null;
}

export async function clearPersistedSite(): Promise<void> {
  await db.removeItem(CURRENT_SITE_KEY);
}
