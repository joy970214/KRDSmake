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
      // 레지스트리 컴포넌트는 plain <img>를 쓴다 — 임의 사용자 이미지 + 익스포트는
      // 프레임워크 무관 HTML이라 next/image 부적합.
      "@next/next/no-img-element": "off",
      // 레지스트리의 <a>는 "사용자가 만드는 사이트"의 링크(빌더 라우팅 아님)라
      // next/link 부적합.
      "@next/next/no-html-link-for-pages": "off",
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
