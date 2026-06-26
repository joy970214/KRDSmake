# 설계: Step 5 — 우측 설정 자동 폼

- 날짜: 2026-06-26
- 상태: 승인됨 (사용자 확정)
- 관련: 전체 설계 `2026-06-25-krds-website-builder-design.md` §10 Step5, `docs/COMPONENT-FIDELITY.md`

## 목표

**인스턴스 선택 → 우측에 자동 폼 → 입력 시 캔버스 실시간 반영.** 컴포넌트가 들고 있는
`editableProps` 스키마를 읽어 폼을 자동 생성하는 **범용 렌더러**(컴포넌트별 화면을 따로 짜지 않음).

## 핵심 결정 (브레인스토밍 확정)

1. **두 모드**: 컴포넌트 선택 시 → 그 인스턴스 폼 / 선택 없음 → 현재 페이지 설정 폼. (B안)
2. **위젯 = KRDS 공식 폼 마크업** 사용(아래). 12종 전부 구현(C안). **image는 URL 입력**(파일 업로드는
   자산관리 별도 백로그). (A안)
3. **RHF/Zod 안 씀** — 스키마 기반 제어 컴포넌트로 직접 구현. 새 의존성 0.
4. **전역요소(헤더/푸터/마스트헤드) 편집은 후속**(별도 작업). 이번 범위 아님.

## 위젯 = KRDS 공식 폼 마크업 (`docs/COMPONENT-FIDELITY.md` 원칙)

KRDS 키트(`text_input.html`/`select.html` 등) 구조를 그대로 사용. CSS는 벤더 output.css가 담당.
```
<div class="form-group">
  <div class="form-tit"><label for="ID">{label}</label></div>
  <div class="form-conts">{입력}</div>
  <p class="form-hint">{help}</p>     // help 있을 때만
</div>
```
스키마 매핑: `label`→`.form-tit>label`, `help`→`.form-hint`, `required`→필수 표시.
입력 위젯(타입별, `EditablePropType` 12종):
- text·url → `<input class="krds-input">` (url은 type=url)
- textarea → `<textarea class="krds-input">`
- number → `<input type="number" class="krds-input">` (값은 number로 저장)
- select → `<select class="krds-form-select">` + options
- radio → `.krds-form-check` 라디오 그룹 + options
- checkbox → `.krds-form-check` 체크박스(불리언)
- date → `<input type="date" class="krds-input">`
- color → `<input type="color">`(네이티브; 비보안 컨텍스트 OK)
- image → `<input type="text" class="krds-input">` URL 입력 + 작은 미리보기. 파일 업로드는 후속.
- repeater → 문자열 배열 편집(행 추가/삭제) — 예: 표 `columns`
- table → 2차원 문자열 그리드 편집(행/열 추가·삭제) — 예: 표 `rows`

> repeater/table은 현재 스키마상 **문자열 배열**만 다룬다(중첩 객체 미지원). 표 컴포넌트의
> `columns`(string[]) / `rows`(string[][]) 용도. 중첩 객체 repeater는 후속.

## 구조 (격리 단위)

- `src/components/right/RightPanel.tsx` — `selection`/활성페이지 구독, 모드 분기. AppShell `.panel-right` 자리 교체.
- `src/components/right/ComponentForm.tsx` — 인스턴스 + `def.editableProps` → `Field` 목록 렌더.
- `src/components/right/Field.tsx` — `EditablePropType`별 위젯 분기(switch). KRDS 폼 마크업 emit.
- `src/components/right/PageSettingsForm.tsx` — 현재 페이지의 고정 설정 폼.
- `src/app/editor.css` — 폼 컨테이너 여백 등 최소 보강(입력 자체 스타일은 KRDS output.css).

## store 변경

- `updateComponentProps` **재귀화**: 칼럼 안 자식까지 patch 적용(현재 최상위만). `removeFromList` 패턴 참고.
- `findInstance(components, id): ComponentInstance | undefined` — 순수 헬퍼(최상위 + `columns` 재귀).
  폼이 선택된 인스턴스의 현재 props를 읽기 위함.
- `updatePageMeta(pageId, patch)` — 페이지 설정(`showSidebar`/`showBreadcrumb`/`showInPageNavigation`/
  `seoTitle`/`seoDescription`) 불변 갱신. **페이지 설정은 전부 이걸로 통일.** 캔버스 토글 제거로 기존
  `setPageSidebar`의 유일 호출처가 사라지므로 **`setPageSidebar` 제거**하고 그 테스트는 `updatePageMeta` 테스트로 대체.

## 페이지 설정 폼 (선택 없을 때)

현재 활성 페이지 기준:
- `[✓] 사이드바 표시`(`showSidebar`) ← **캔버스 상단 임시 토글을 여기로 이전, 캔버스 토글 제거**.
- `[✓] 브레드크럼`(`showBreadcrumb`) · `[ ] 인페이지 내비`(`showInPageNavigation`)
- `SEO 제목`(`seoTitle`, text) · `SEO 설명`(`seoDescription`, textarea)
- 페이지 제목/slug는 사이트맵 트리에서 편집(중복 안 함).

## 데이터 흐름

`selection`(component) → `findInstance`로 인스턴스 → `ComponentForm`(props 표시) →
`Field` onChange(key,value) → `updateComponentProps(pageId, instanceId, {key:value})` → store →
캔버스 + 폼 동시 갱신(store가 단일 출처). 디바운스 없이 onChange마다 갱신(인메모리, 자동저장은 별도 디바운스).

## 테스트 / 검증

- **store**(TDD): `updateComponentProps` 재귀(칼럼 자식 props 변경) / `findInstance`(최상위·칼럼 재귀·없는 id) / `updatePageMeta`.
- **`Field`**: 타입별 위젯이 KRDS 폼 마크업으로 렌더(`.form-group`/`.krds-input`/`.krds-form-select` 등) + 변경 시 onChange(key,value) 호출. select/radio/checkbox/number/textarea/date/color/image(URL)/repeater/table 각각.
- **`RightPanel`**: 컴포넌트 선택 → 그 컴포넌트 폼 / 선택 없음 → 페이지 설정 폼 / 편집이 store 반영.
- **헤드리스**: 버튼 선택 → "버튼 글자" 바꾸면 캔버스 즉시 반영. 페이지 설정에서 사이드바 표시 토글.

## 범위 밖 (후속/백로그)

- **전역요소 편집**(헤더/푸터/마스트헤드): `Selection {kind:'global', target}` + 전역 3종 `editableProps` 작성
  + 선택 진입점. 별도 작업.
- **파일 업로드(image 자산)**: IndexedDB Blob 저장·자산 목록·alt 관리. 좌측 자산 탭(설계 §6.2).
- repeater의 **중첩 객체**(현재 스키마는 문자열 배열만).
- 폼 입력 컴포넌트 확충(select/radio/checkbox/textarea/date를 "결과 사이트의 컴포넌트"로) — 컴포넌트 확충 백로그(audit).
