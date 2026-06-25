import { escapeHtml, pending2x, thumb } from "../helpers";
import type { ComponentDefinition, Props } from "../types";

// KRDS 마크업 기준: <button type="button" class="krds-btn">버튼</button>
// 위계(variant): primary(기본) / secondary / tertiary → krds-btn 뒤 클래스 부가.

function classFor(variant: unknown): string {
  return variant && variant !== "primary" ? `krds-btn ${variant}` : "krds-btn";
}

export const buttonDefinition: ComponentDefinition = {
  id: "button",
  name: "버튼",
  nameEn: "Button",
  category: "액션",
  thumbnail: thumb(26),
  description: "사용자가 액션을 실행하는 버튼.",
  isKrdsStandard: true,
  variants: [
    { id: "primary", name: "기본" },
    { id: "secondary", name: "보조" },
    { id: "tertiary", name: "3차" },
  ],
  defaultProps: { label: "버튼", variant: "primary" },
  editableProps: [
    { key: "label", label: "버튼 글자", type: "text", required: true },
    {
      key: "variant",
      label: "버튼 종류",
      type: "select",
      options: [
        { label: "기본", value: "primary" },
        { label: "보조", value: "secondary" },
        { label: "3차", value: "tertiary" },
      ],
    },
  ],

  Preview({ props }: { props: Props }) {
    return (
      <button type="button" className={classFor(props.variant)}>
        {String(props.label ?? "")}
      </button>
    );
  },

  exportTemplates: {
    html(props) {
      return `<button type="button" class="${classFor(props.variant)}">${escapeHtml(props.label)}</button>`;
    },
    vue: () => pending2x("vue"),
    react: () => pending2x("react"),
  },
};
