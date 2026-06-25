// vendor/krds(단일 출처) → public/krds 로 런타임 자산 복사.
// public/krds 는 gitignore 됨(중복 커밋 방지). dev/build 전에 자동 실행(package.json predev/prebuild).
import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "vendor", "krds", "resources");
const dest = join(root, "public", "krds");

if (!existsSync(src)) {
  console.error(`[krds-assets] 원본 없음: ${src}`);
  process.exit(1);
}

// CSS의 ../../img·../../fonts 상대경로가 유지되도록 resources 구조 그대로 복사
const dirs = ["css", "img", "fonts", "js"];

rmSync(dest, { recursive: true, force: true });
mkdirSync(dest, { recursive: true });
for (const d of dirs) {
  const from = join(src, d);
  if (existsSync(from)) cpSync(from, join(dest, d), { recursive: true });
}

console.log(`[krds-assets] 복사 완료: public/krds (${dirs.join(", ")})`);

// 컴포넌트 썸네일(가이드 사이트 출처, 별도 vendoring) → public/krds-thumbnails
const thumbSrc = join(root, "vendor", "krds-thumbnails", "img");
const thumbDest = join(root, "public", "krds-thumbnails", "img");
if (existsSync(thumbSrc)) {
  rmSync(join(root, "public", "krds-thumbnails"), { recursive: true, force: true });
  mkdirSync(thumbDest, { recursive: true });
  cpSync(thumbSrc, thumbDest, { recursive: true });
  console.log("[krds-assets] 복사 완료: public/krds-thumbnails");
}
