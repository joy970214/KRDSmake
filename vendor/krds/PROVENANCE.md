# KRDS 공식 자산 (vendored)

이 디렉터리는 KRDS HTML Component Kit 공식 배포 자산의 **무수정 복사본**이다.
설계 문서 1장 결정사항("공식 사이트 배포 자산 다운로드 후 프로젝트에 포함")에 따른 단일 출처(single source of truth).

## 출처

| 항목 | 값 |
|---|---|
| 저장소 | https://github.com/KRDS-uiux/krds-uiux |
| 버전 | v1.1.0 |
| 커밋 | `d6bb184c823e4757f05807ea4646a23e3133b6e6` |
| 커밋일 | 2026-01-12 |
| 토큰 생성일 | 2024-12-09 (krds_tokens.css 헤더 기준) |
| 라이선스 | ISC (upstream package.json) |
| 받은 날짜 | 2026-06-25 |

> **수정 금지**: 이 트리는 업스트림 원본이다. 우리 코드는 여기서 읽거나 빌드 시 복사만 한다. 업스트림 갱신은 같은 커밋 핀 절차로 재다운로드한다.

## 디렉터리 ↔ 설계 매핑

| 경로 | 내용 | 설계 매핑 |
|---|---|---|
| `resources/css/token/krds_tokens.css` | 디자인 토큰 (CSS 변수, 49KB) | 8장 테마 변수 **단일 출처** |
| `tokens/figma_token.json`, `tokens/transformed_tokens.json` | 토큰 원본(JSON) | 참조/마이그레이션용 |
| `resources/css/common/common.css` | 공통 스타일 + **모드 전환 규칙** | 8.1 모드 |
| `resources/css/component/component.css`, `output.css` | 컴포넌트 스타일 | 미리보기·익스포트 공통 |
| `resources/cdn/krds.min.css` (594KB), `krds.min.js` (188KB) | 단일 번들 | 익스포트 결과물 동봉 |
| `resources/js/component/ui-script.js` | 컴포넌트 동작 JS | 익스포트 동작 |
| `resources/css/plugin/`, `resources/js/plugin/` | swiper 번들 | 슬라이더 컴포넌트 |
| `resources/fonts/PretendardGOV-*` | 정부 서브셋 폰트 (woff/woff2) | 기본 폰트 |
| `resources/img/` | 아이콘·파비콘 95종 | 아이콘 자산 |
| `html/code/*.html` (74종) | 컴포넌트 마크업 예제 | **exportTemplates 작성 기준** |

## 설계 문서 보정 필요 사항 (자산 확인으로 드러남)

1. **모드 전환 속성**: 설계 문서 8.1은 `data-theme`로 표기했으나, 실제 KRDS는
   **`data-krds-mode`** 를 쓴다 (`resources/css/common/common.css` 기준):
   - 기본(라이트): 속성 없음
   - 선명한 화면: `[data-krds-mode="high-contrast"]`
   - 시스템(다크): `[data-krds-mode="theme"]` + `@media (prefers-color-scheme: dark)`

   → 미리보기 캔버스 컨테이너와 익스포트 결과물 모두 `data-krds-mode`를 사용해야 한다.
   설계 문서의 `data-theme` 표기는 구현 시 `data-krds-mode`로 정정.

2. **토큰 네임스페이스**: 모든 변수가 `--krds-*` 프리픽스. 라이트는
   `--krds-color-light-*`, 선명은 `--krds-color-high-contrast-*` 프리미티브가 별도 존재.

3. **컴포넌트 클래스 규약**: `krds-` 접두 + BEM 유사
   (예: `.krds-accordion > .accordion-item > .accordion-header`).
