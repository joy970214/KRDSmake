import { attr, escapeHtml, pending2x, thumb } from "../helpers";
import type { ComponentDefinition, Props } from "../types";

// KRDS 마크업(text input): form-group > form-tit>label + form-conts>input.krds-input + form-hint.
// "입력폼"은 입력 카테고리 컴포넌트의 조합 기본 단위(설계 §4 주). MVP는 단일 필드.
export const inputFormDefinition: ComponentDefinition = {
  id: "input-form",
  name: "입력폼",
  nameEn: "Text input",
  category: "입력",
  thumbnail: thumb(41),
  description: "레이블·입력칸·도움말로 구성된 폼 필드.",
  isKrdsStandard: true,
  variants: [],
  defaultProps: {
    label: "레이블",
    placeholder: "플레이스홀더",
    hint: "도움말",
    fieldId: "field1",
  },
  editableProps: [
    { key: "label", label: "항목 이름", type: "text", required: true },
    { key: "placeholder", label: "입력 안내(placeholder)", type: "text" },
    { key: "hint", label: "도움말(선택)", type: "text" },
    { key: "fieldId", label: "필드 id(고유)", type: "text", required: true },
  ],

  Preview({ props }: { props: Props }) {
    const id = String(props.fieldId || "field1");
    const hint = String(props.hint ?? "");
    return (
      <div className="form-group">
        <div className="form-tit">
          <label htmlFor={id}>{String(props.label ?? "")}</label>
        </div>
        <div className="form-conts">
          <input
            type="text"
            id={id}
            className="krds-input"
            placeholder={String(props.placeholder ?? "")}
          />
        </div>
        {hint ? <p className="form-hint">{hint}</p> : null}
      </div>
    );
  },

  exportTemplates: {
    html(props) {
      const id = String(props.fieldId || "field1");
      const hint = String(props.hint ?? "");
      const hintHtml = hint ? `\n\t<p class="form-hint">${escapeHtml(hint)}</p>` : "";
      return [
        `<div class="form-group">`,
        `\t<div class="form-tit">`,
        `\t\t<label for="${attr(id)}">${escapeHtml(props.label)}</label>`,
        `\t</div>`,
        `\t<div class="form-conts">`,
        `\t\t<input type="text" id="${attr(id)}" class="krds-input" placeholder="${attr(props.placeholder)}">`,
        `\t</div>${hintHtml}`,
        `</div>`,
      ].join("\n");
    },
    vue: () => pending2x("vue"),
    react: () => pending2x("react"),
  },
};
