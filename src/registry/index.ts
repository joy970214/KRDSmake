import type { ComponentDefinition } from "./types";
import { mastheadDefinition } from "./components/masthead";
import { headerDefinition } from "./components/header";
import { footerDefinition } from "./components/footer";
import { skipLinkDefinition } from "./components/skip-link";
import { pageTitleDefinition } from "./components/page-title";
import { buttonDefinition } from "./components/button";
import { imageDefinition } from "./components/image";
import { cardDefinition } from "./components/card";
import { tableDefinition } from "./components/table";
import { inputFormDefinition } from "./components/input-form";

// MVP 10종. 컴포넌트 추가 = 파일 1개 + 이 배열에 등록(설계 §4.2).
export const componentDefinitions: ComponentDefinition[] = [
  mastheadDefinition,
  headerDefinition,
  footerDefinition,
  skipLinkDefinition,
  pageTitleDefinition,
  buttonDefinition,
  imageDefinition,
  cardDefinition,
  tableDefinition,
  inputFormDefinition,
];

export const componentRegistry: Map<string, ComponentDefinition> = new Map(
  componentDefinitions.map((d) => [d.id, d]),
);

export function getComponent(id: string): ComponentDefinition | undefined {
  return componentRegistry.get(id);
}

export function listComponents(): ComponentDefinition[] {
  return componentDefinitions;
}

// 전역 레이아웃 요소: globalLayout에서 별도 렌더되므로 페이지 본문에 배치 불가.
export const GLOBAL_COMPONENT_IDS = new Set(["masthead", "header", "footer", "skip-link"]);

// 캔버스 본문에 드래그 배치 가능한 컴포넌트(전역 요소 제외).
export function listPlaceableComponents(): ComponentDefinition[] {
  return componentDefinitions.filter((d) => !GLOBAL_COMPONENT_IDS.has(d.id));
}

export type { ComponentDefinition } from "./types";
