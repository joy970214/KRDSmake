# Step 6 — 테마(라이트/선명/시스템) + 디바이스 전환 설계

- 작성일: 2026-06-30
- 빌드 순서: 10장 빌드순서 Step 6 (`docs/superpowers/specs/2026-06-25-krds-website-builder-design.md:515`)
- 선행: Step 5+ (feat/rich-settings) master 머지 완료
- 검증 기준(원 설계): "모드·폭 전환 시 캔버스 반응"

## 1. 목적과 범위

에디터에서 **테마 3종(기본/선명하게/시스템)** 과 **디바이스 3종(PC/태블릿/모바일)** 으로 현재 페이지가 KRDS 규격대로 어떻게 보이는지 **미리보기**한다.

### 결정된 범위 (사용자 확인)
- **테마 = 에디터 미리보기 전용**. 발행물의 테마(방문자가 직접 고르거나 OS를 따르는 것)는 이 단계 범위 밖. `previewMode`는 **비영속 UI 상태**이며 `Site.theme.mode`(영속 사이트 기본값)와 별개. 익스포트 반영은 Step 7 소관.
- **디바이스 = 읽기전용 프리뷰**. 디바이스 전환 시 편집(DnD/선택)은 비활성. 편집은 PC/기본 테마에서.

### 비범위 (YAGNI)
- 익스포트 결과물에 테마/디바이스 반영 (Step 7).
- 가짜 디바이스 베젤/크롬, 회전, 커스텀 폭 입력.
- "시스템" 모드의 다크 강제 시뮬레이션(브라우저 `prefers-color-scheme`에 의존).

### 공식 KRDS 스타일 가이드 대조 (2026-06-30 검증)
`style_09`(선명한 화면 모드)·`style_07`(디자인 토큰) 공식 페이지와 대조 결과 위배 없음:
- 선명=고대비(다크모드 아님, 명도대비 강화·접근성 목적). 본문 **15:1 대비**, 흰 배경 회피 요구.
- 공식 UI 라벨 = **"기본 / 선명하게 / 시스템 설정"** → `PreviewControls` 라벨이 이를 따른다.
- 전환 주체 = **방문자**(발행 페이지의 "글자·화면 표시 설정" 패널) + 시스템 연동 → 빌더는 테마를 페이지에 고정하지 않고 미리보기만 한다(§1).
- 토큰: 라이트/고대비 색·border 분리, 색·글자·간격·그림자 포함. 본 설계는 `output.css`를 **무수정 재현**하므로 토큰 위배가 발생하지 않는다.
- 15:1 대비·흰 배경 회피는 `:root`/`body` 레벨 토큰 전환으로만 충족되므로 **`<html>`에 `data-krds-mode`를 거는 iframe 방식이 필수**(§4) — 중간 컨테이너에 걸면 배경이 안 바뀌어 이 원칙을 위배한다.

## 2. 핵심 모델 — "편집 모드 vs 프리뷰 모드"

| 조건 | 렌더 | 편집 |
|---|---|---|
| `previewMode==="light"` **AND** `previewDevice==="pc"` | 인라인 캔버스(현행) | 가능(DnD·선택·조작) |
| 그 외(테마≠light **또는** 디바이스≠pc) | 읽기전용 `<iframe>` 프리뷰 | 비활성 |

근거: KRDS 테마 CSS는 `data-krds-mode` 속성이 문서 **`<html>`** 에 있어야 완전 동작하고(§4), KRDS 반응형은 **뷰포트** 기준 미디어쿼리라 컨테이너 폭 제약만으론 발동하지 않는다. 둘 다 **자체 문서/뷰포트를 가진 iframe** 에서만 무수정·고충실로 재현된다. 따라서 비기본 프리뷰는 모두 iframe 경로로 통합한다.

## 3. 상태 (store) — `src/store/editor-store.ts`

`EditorState`에 비영속 UI 상태 추가:

```ts
previewMode: ThemeMode;     // 기본 "light"  (타입은 lib/types.ts:4에 이미 존재)
previewDevice: Device;      // 기본 "pc"     (타입은 lib/types.ts:5에 이미 존재)
setPreviewMode: (mode: ThemeMode) => void;
setPreviewDevice: (device: Device) => void;
```

- `createEditorStore` 초기값에 `previewMode: "light"`, `previewDevice: "pc"` 추가.
- 직렬화/언두/사이트 모델에 포함하지 않는다(순수 에디터 UI 상태).
- `Canvas`는 하드코딩된 `mode:"light"`/`device:"pc"`(`Canvas.tsx:36-37`)를 이 상태값으로 교체해 `ctx`에 전달.

## 4. 테마 메커니즘 — `data-krds-mode`

KRDS 배포 CSS(`output.css`, 셀렉터 516건)의 테마 훅:

| 테마 | `data-krds-mode` 값 |
|---|---|
| 기본(light) | (속성 없음) |
| 선명하게(high-contrast) | `"high-contrast"` |
| 시스템(system) | `"theme"` (+ `@media (prefers-color-scheme: dark)`) |

- "선명" = **고대비(high-contrast)**. 어두운 배경을 쓰지만 다크모드가 아니라 명도대비 강화가 목적.
- 셀렉터가 `[data-krds-mode=X] body`, `[data-krds-mode=X] :root`, `[data-krds-mode=X] .krds-btn` 형태 → **속성이 `<html>`(문서 최상위)에 있어야** 배경·루트 토큰·컴포넌트 색이 모두 전환된다. 중간 컨테이너(`.canvas-frame`)에 걸면 반쪽만 적용되고, 에디터 본체 `<html>`에 걸면 에디터 UI 전체가 물든다 → **iframe의 `<html>`** 이 유일한 올바른 적용 지점.
- KRDS 키트엔 이 속성을 세팅하는 JS/HTML 샘플이 없음(순수 CSS 훅). 우리가 직접 세팅.

순수 헬퍼 `src/lib/krds-mode.ts`:
```ts
export function krdsModeAttr(mode: ThemeMode): "high-contrast" | "theme" | undefined {
  if (mode === "high-contrast") return "high-contrast";
  if (mode === "system") return "theme";
  return undefined; // light
}
```

## 5. 디바이스 메커니즘 — iframe 폭 제약

| 디바이스 | iframe 폭 | 근거(KRDS 브레이크포인트) |
|---|---|---|
| PC | 100% (max 1200px) | large 1024~ / 콘텐츠 최대폭 1200 |
| 태블릿 | 768px | medium 768~1024 |
| 모바일 | 360px | small 360~ |

- iframe은 자체 뷰포트를 가지므로 폭을 px로 주면 KRDS·editor.css의 뷰포트 미디어쿼리(모바일 1단 스택, LNB 접힘 등)가 **실제로 발동**한다.
- 폭 상수는 `src/lib/device.ts`에 `DEVICE_WIDTH: Record<Device, number | null>`(pc=null=가변)로 둔다.

## 6. 컴포넌트 설계

### 6.1 `PreviewControls` — 상단바 토글 UI
- 위치: `AppShell` `.topbar`(`AppShell.tsx:65`), `topbar-spacer` 부근.
- 테마 세그먼트(기본/선명하게/시스템) + 디바이스 세그먼트(PC/태블릿/모바일). 각 버튼 `aria-pressed`로 현재값 표시, 클릭 시 `setPreviewMode`/`setPreviewDevice` 호출.
- **에디터 크롬이므로 KRDS 충실도 대상이 아니다**(출력물이 아님). 패널/토밥과 같은 평범한 세그먼트 버튼 스타일(editor.css).

### 6.2 `PreviewDocument` — 읽기전용 KRDS 페이지 렌더
- 입력: `{ site, page, ctx }`. KRDS 페이지 구조(masthead/header/`.page-frame`[LNB+브레드크럼+본문+인페이지내비]/footer)를 **편집 크롬(드래그 핸들·선택 버튼·툴바) 없이** 렌더.
- 본문 컴포넌트는 `def.Preview({ props, ctx })`를 그대로 호출(레이아웃 다단 포함). 편집 인터랙션 없음.
- 기존 읽기전용 하위 컴포넌트(`LnbItem`/`LnbSubItem`)는 재사용(현재도 `preventDefault`만 하는 읽기전용). 필요 시 `Canvas.tsx`에서 export.
- Step 7 익스포트 페이지 렌더와 구조가 가까워 재활용 가치가 있다(단, 익스포트는 별도 단계).

### 6.3 `DevicePreview` — iframe 호스트
- `<iframe>`을 만들고 mount 시:
  1. iframe `<head>`에 `output.css`, `editor.css` `<link>` 주입.
  2. iframe `<html>`에 `data-krds-mode`(=`krdsModeAttr(previewMode)`) 세팅. light면 속성 제거.
  3. iframe `<body>`(또는 `#krds-editor-root` 상응 래퍼)에 `PreviewDocument`를 **React portal**로 렌더.
- 폭 = `DEVICE_WIDTH[previewDevice]`(px) 또는 가변(PC). 가운데 정렬, 주변 회색 배경, 높이는 캔버스 영역 채움.
- 스타일시트 로드 완료 전 깜빡임을 줄이기 위해 `<head>` 주입 후 portal 렌더(구현 시 onLoad/초기화 순서 주의).

### 6.4 `Canvas` 분기
- `previewMode==="light" && previewDevice==="pc"` → 현행 인라인 편집 캔버스.
- 그 외 → `<DevicePreview previewMode previewDevice site page />`.
- `ctx.mode`/`ctx.device`는 항상 store 값으로 채운다(컴포넌트가 ctx로 모드/디바이스를 참조할 수 있도록).

## 7. 데이터 흐름

```
PreviewControls --(setPreviewMode/Device)--> store(previewMode, previewDevice)
store --(useEditorState)--> Canvas
  ├ light+pc → 인라인 편집 캔버스 (ctx.mode/device 반영)
  └ else     → DevicePreview
                 ├ iframe<html data-krds-mode=krdsModeAttr(mode)>
                 ├ iframe width = DEVICE_WIDTH[device]
                 └ portal → PreviewDocument(site, page, ctx)
```

## 8. 에러/엣지

- `previewMode` 잘못된 값: 타입상 불가(세그먼트 버튼만 세팅). 헬퍼는 light로 폴백.
- 활성 페이지 없음: Canvas 기존 가드 유지(`site` 없으면 null).
- iframe 미지원/CSS 로드 실패: 프리뷰가 스타일 없이 보일 수 있음 — 데모 환경 한정, 폴백 불필요(YAGNI). 단 배포가 HTTP+외부IP이므로 secure-context 전용 API 금지(`srcdoc`/blob URL 등은 일반 DOM 조작으로 대체, 별도 권한 불필요) — 인수인계 메모 준수.
- "시스템" 모드: `prefers-color-scheme` 의존이라 빌더 OS가 라이트면 라이트로 보임. 한계 명시(범위 밖).

## 9. 테스트 (TDD, red→green)

단위:
- store 기본값 `previewMode==="light"`, `previewDevice==="pc"` + setter 동작.
- `krdsModeAttr`: light→undefined, high-contrast→"high-contrast", system→"theme".
- `DEVICE_WIDTH`: pc=null(가변), tablet=768, mobile=360.

컴포넌트(RTL):
- `PreviewControls`: 6개 세그먼트 렌더, 클릭→해당 setter, `aria-pressed`가 현재값 반영.
- `Canvas` 분기: light+pc면 편집 캔버스(`canvas-page` 존재), 비기본이면 iframe 호스트 렌더.
- `PreviewDocument`: 편집 크롬(`ci-drag`/`ci-select`/`ci-toolbar`) 없이 KRDS 구조(header/footer/page-title/컴포넌트) 렌더.

수동(실브라우저 — 검증 기준 충족):
- 선명하게 전환 → 고대비 색/배경 적용 확인.
- 모바일/태블릿 전환 → 폭 제약 + 모바일 1단 스택·LNB 접힘 등 KRDS 반응형 실발동 확인.
- jsdom에서 미디어쿼리 실발동·실제 색은 검증 불가 → 이 항목은 수동.

## 10. 영향 파일

- `src/lib/types.ts` — (변경 없음, ThemeMode/Device 이미 존재)
- `src/lib/krds-mode.ts` — 신규(헬퍼)
- `src/lib/device.ts` — 신규(폭 상수)
- `src/store/editor-store.ts` — previewMode/previewDevice + setter
- `src/components/PreviewControls.tsx` — 신규(상단바 토글)
- `src/components/PreviewDocument.tsx` — 신규(읽기전용 렌더)
- `src/components/DevicePreview.tsx` — 신규(iframe 호스트)
- `src/components/Canvas.tsx` — ctx에 store 값 반영 + 분기, LnbItem export
- `src/components/AppShell.tsx` — PreviewControls 배치
- `src/app/editor.css` — PreviewControls/DevicePreview 스타일
- 각 `*.test.tsx`/`*.test.ts` — 위 테스트

## 11. 미해결/후속

- 익스포트에 테마/디바이스 반영 → Step 7.
- **방문자용 "글자·화면 표시 설정" 전환 위젯**(기본/선명/시스템 + 글자크기): 실제 KRDS 발행 페이지의 표준 컴포넌트. 발행물이 진짜 KRDS 충실을 갖추려면 출력에 포함돼야 함 → Step 7(익스포트) 또는 전역 요소 편집에서 검토. 이번 범위(에디터 미리보기)와 별개.
- `Site.theme.mode`(영속 사이트 기본 테마) UI는 별도(페이지/사이트 설정). 이번 범위 아님.
- `PreviewDocument` ↔ 익스포트 페이지 렌더 통합은 Step 7에서 검토(중복 발생 시).
