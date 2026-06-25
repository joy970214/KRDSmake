import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // KRDS 공식 CSS는 의도적으로 public에서 정적 서빙(<link>)한다(번들 미포함).
      // 설계: vendor/krds 단일 출처 → 빌드 시 public/krds 복사 → <link> 로드.
      "@next/next/no-css-tags": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // KRDS 무수정 vendored 자산 + 빌드 시 복사본은 린트 대상 아님
    "vendor/**",
    "public/krds/**",
  ]),
]);

export default eslintConfig;
