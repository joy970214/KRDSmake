# KRDS 컴포넌트 썸네일 (vendored)

KRDS 공식 사이트 컴포넌트 요약 페이지의 컴포넌트 미리보기 썸네일 이미지 모음.
좌측 패널 컴포넌트 카드 썸네일(`ComponentDefinition.thumbnail`)로 사용.

## 출처

| 항목 | 값 |
|---|---|
| 출처 페이지 | https://www.krds.go.kr/html/site/component/component_summary.html |
| 이미지 경로 | `https://www.krds.go.kr/resources/img/guide/contents/main/img_guide_component_NN.png` (NN=01~55) |
| 받은 날짜 | 2026-06-25 |
| 개수 | 55 (840×600 PNG) |
| 비고 | KRDS 가이드 사이트 자산. 공식 컴포넌트 카탈로그와 1:1 대응 |

> KRDS HTML Component Kit(`vendor/krds`, ISC)과는 **다른 출처**(가이드 사이트)다.
> 정부 공개 디자인시스템 자산으로, KRDS 기반 빌더 용도에 사용.

## 파일

- `img/img_guide_component_01.png` ~ `img_guide_component_55.png` — 컴포넌트별 미리보기
- `manifest.json` — 번호 ↔ 컴포넌트 매핑:
  `{ n, nameKo, nameEn, category, detail(상세페이지), thumb(파일명) }`

`manifest.json`의 순번(n)이 곧 썸네일 번호(NN)다. 공식 카탈로그 순서·카테고리·
상세 페이지(`component_XX_YY.html`)·KRDS 마크업 예제(`vendor/krds/html/code/*.html`)
연결의 단일 근거로 쓴다.

## 빌드 연결

`scripts/copy-krds-assets.mjs`가 `img/`를 `public/krds-thumbnails/img/`로 복사
(`public/krds-thumbnails`는 gitignore). 레지스트리는
`/krds-thumbnails/img/img_guide_component_NN.png`로 참조.
