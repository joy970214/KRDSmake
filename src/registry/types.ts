import type { ReactElement } from "react";
import type { Asset, AssetRef, Device, Page, Site, ThemeMode } from "../lib/types";

export type Framework = "html" | "vue" | "react";

// 다운로드 코드 생성 컨텍스트 — 설계 §4.2
export type ExportCtx = {
  site: Site;
  page: Page;
  resolveAsset: (ref: AssetRef) => Asset | undefined;
  framework: Framework;
};

// 캔버스 미리보기 컨텍스트 (자산 해석 + 현재 미리보기 모드/디바이스)
export type PreviewCtx = {
  site: Site;
  page: Page;
  resolveAsset: (ref: AssetRef) => Asset | undefined;
  mode: ThemeMode;
  device: Device;
};

// 우측 설정 폼 자동 생성 스키마 — 설계 §4.3
export type EditablePropType =
  | "text"
  | "textarea"
  | "url"
  | "number"
  | "select"
  | "radio"
  | "checkbox"
  | "image"
  | "color"
  | "repeater"
  | "table"
  | "date";

export type EditablePropSchema = {
  key: string;
  label: string; // 쉬운 한국어
  type: EditablePropType;
  required?: boolean;
  options?: { label: string; value: string }[]; // select/radio
  help?: string;
};

export type ComponentVariant = {
  id: string;
  name: string;
};

export type Props = Record<string, unknown>;

export type ComponentDefinition = {
  id: string;
  name: string; // 한국어 표시명
  nameEn?: string;
  category: string;
  thumbnail: string; // 좌측 카드 썸네일 경로
  description: string;
  isKrdsStandard: boolean; // KRDS 공식 컴포넌트 여부(제목영역/카드는 false)
  variants: ComponentVariant[];
  defaultProps: Props;
  editableProps: EditablePropSchema[];
  accessibilityProps?: EditablePropSchema[];

  // (A) 캔버스 미리보기 — React
  Preview: (args: { props: Props; ctx: PreviewCtx }) => ReactElement;

  // (B) 다운로드 코드 — 프레임워크별 문자열 생성 함수
  // 1차는 html 본문만, vue/react는 2차(인터페이스만 유지) — 설계 §9.2
  exportTemplates: {
    html: (props: Props, ctx: ExportCtx) => string;
    vue: (props: Props, ctx: ExportCtx) => string;
    react: (props: Props, ctx: ExportCtx) => string;
  };
};
