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

export type { ComponentDefinition } from "./types";
