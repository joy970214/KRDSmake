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
    size: "medium",
    state: "default",
    required: false,
    inputType: "text",
  },
  editableProps: [
    { key: "label", label: "항목 이름", type: "text", required: true },
    { key: "placeholder", label: "입력 안내(placeholder)", type: "text" },
    { key: "hint", label: "도움말(선택)", type: "text" },
    { key: "fieldId", label: "필드 id(고유)", type: "text", required: true },
    {
      key: "size",
      label: "크기",
      type: "select",
      options: [
        { label: "작게", value: "small" },
        { label: "보통", value: "medium" },
        { label: "크게", value: "large" },
      ],
    },
    {
      key: "state",
      label: "상태",
      type: "select",
      options: [
        { label: "기본", value: "default" },
        { label: "오류", value: "error" },
        { label: "성공", value: "success" },
        { label: "비활성", value: "disabled" },
      ],
    },
    { key: "required", label: "필수 입력", type: "checkbox" },
    {
      key: "inputType",
      label: "입력 종류",
      type: "select",
      options: [
        { label: "텍스트", value: "text" },
        { label: "이메일", value: "email" },
        { label: "전화", value: "tel" },
        { label: "숫자", value: "number" },
        { label: "비밀번호", value: "password" },
        { label: "날짜", value: "date" },
      ],
    },
  ],

  Preview({ props }: { props: Props }) {
    const id = String(props.fieldId || "field1");
    const hint = String(props.hint ?? "");
    const size = props.size ? ` ${props.size}` : "";
    const state = props.state;
    const contsCls =
      state === "error"
        ? "form-conts is-error"
        : state === "success"
        ? "form-conts is-success"
        : "form-conts";
    return (
      <div className="form-group">
        <div className="form-tit">
          <label htmlFor={id}>
            {String(props.label ?? "")}
            {props.required ? <span className="required" aria-hidden="true"> *</span> : null}
          </label>
        </div>
        <div className={contsCls}>
          <input
            type={String(props.inputType || "text")}
            id={id}
            className={`krds-input${size}`}
            placeholder={String(props.placeholder ?? "")}
            disabled={state === "disabled"}
            required={!!props.required}
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
      const size = props.size ? ` ${props.size}` : "";
      const state = props.state;
      const contsCls =
        state === "error"
          ? "form-conts is-error"
          : state === "success"
          ? "form-conts is-success"
          : "form-conts";
      const dis = state === "disabled" ? " disabled" : "";
      const req = props.required ? " required" : "";
      const star = props.required ? ` <span class="required" aria-hidden="true">*</span>` : "";
      return [
        `<div class="form-group">`,
        `\t<div class="form-tit">`,
        `\t\t<label for="${attr(id)}">${escapeHtml(props.label)}${star}</label>`,
        `\t</div>`,
        `\t<div class="${contsCls}">`,
        `\t\t<input type="${attr(props.inputType || "text")}" id="${attr(id)}" class="krds-input${size}" placeholder="${attr(props.placeholder)}"${dis}${req}>`,
        `\t</div>${hintHtml}`,
        `</div>`,
      ].join("\n");
    },
    vue: () => pending2x("vue"),
    react: () => pending2x("react"),
  },
};
