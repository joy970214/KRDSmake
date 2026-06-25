# KRDS 웹사이트 빌더

KRDS(대한민국 정부 디자인시스템) 기반 공공 웹사이트를 드래그 앤 드롭으로 제작하고
HTML/Vue/React 코드로 내보내는 **노코드 제작 도구**.

- 설계 문서: [`docs/superpowers/specs/2026-06-25-krds-website-builder-design.md`](docs/superpowers/specs/2026-06-25-krds-website-builder-design.md)
- KRDS 공식 자산(단일 출처): [`vendor/krds/`](vendor/krds/PROVENANCE.md) — HTML Component Kit v1.1.0

## 기술 스택

Next.js 16 (App Router, 정적 `output: 'export'`) · React 19 · TypeScript · Vitest

## 개발

```bash
npm install
npm run dev      # predev가 vendor/krds → public/krds 자산 복사 후 dev 서버 기동
npm run build    # prebuild 자산 복사 후 정적 export (out/)
npm test         # Vitest
```

## KRDS 자산

`vendor/krds/`(무수정 공식 자산)가 단일 출처. `npm run dev|build` 시
`scripts/copy-krds-assets.mjs`가 `public/krds/`로 복사한다(`public/krds`는 gitignore).
테마는 `krds_tokens.css`(`--krds-*` 변수) + `[data-krds-mode]`(기본/선명/시스템) 전환.
