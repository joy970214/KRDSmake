import { attr, escapeHtml, pending2x, thumb } from "../helpers";
import type { ComponentDefinition, Props } from "../types";

// curated 단일 아이콘(검색). 다종 아이콘 선택은 후속(백로그).
const ICON = "ico-sch";

// 여러 prop을 KRDS 버튼 클래스 배열로 조립.
function buttonClass(p: Props): string {
  const c = ["krds-btn"];
  if (p.variant) c.push(String(p.variant));
  if (p.size) c.push(String(p.size));
  if (p.textStyle) c.push("text");
  if (p.icon === "only") c.push("icon");
  return c.join(" ");
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
  defaultProps: {
    label: "버튼",
    variant: "primary",
    size: "medium",
    textStyle: false,
    icon: "none",
    disabled: false,
    asLink: false,
    href: "",
  },
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
    {
      key: "size",
      label: "크기",
      type: "select",
      options: [
        { label: "아주 작게", value: "xsmall" },
        { label: "작게", value: "small" },
        { label: "보통", value: "medium" },
        { label: "크게", value: "large" },
        { label: "아주 크게", value: "xlarge" },
      ],
    },
    { key: "textStyle", label: "텍스트형 버튼", type: "checkbox" },
    {
      key: "icon",
      label: "아이콘",
      type: "select",
      options: [
        { label: "없음", value: "none" },
        { label: "글자+아이콘", value: "with" },
        { label: "아이콘만", value: "only" },
      ],
    },
    { key: "disabled", label: "비활성", type: "checkbox" },
    { key: "asLink", label: "링크처럼 동작", type: "checkbox" },
    { key: "href", label: "링크 주소", type: "url", help: "'링크처럼 동작'을 켰을 때 사용" },
  ],

  Preview({ props }: { props: Props }) {
    const cls = buttonClass(props);
    const label = String(props.label ?? "");
    const onlyIcon = props.icon === "only";
    const icon =
      props.icon && props.icon !== "none" ? (
        <i className={`svg-icon ${ICON}`} aria-hidden="true" />
      ) : null;
    const children = onlyIcon ? icon : (
      <>
        {label}
        {icon}
      </>
    );
    if (props.asLink) {
      return (
        <a
          className={cls}
          href={String(props.href || "#")}
          aria-disabled={props.disabled ? true : undefined}
          aria-label={onlyIcon ? label : undefined}
        >
          {children}
        </a>
      );
    }
    return (
      <button
        type="button"
        className={cls}
        disabled={!!props.disabled}
        aria-label={onlyIcon ? label : undefined}
      >
        {children}
      </button>
    );
  },

  exportTemplates: {
    html(props) {
      const cls = buttonClass(props);
      const onlyIcon = props.icon === "only";
      const icon =
        props.icon && props.icon !== "none" ? `<i class="svg-icon ${ICON}"></i>` : "";
      const inner = onlyIcon ? icon : `${escapeHtml(props.label)}${icon}`;
      const al = onlyIcon ? ` aria-label="${attr(props.label)}"` : "";
      if (props.asLink) {
        const dis = props.disabled ? ` aria-disabled="true"` : "";
        return `<a class="${cls}" href="${attr(props.href || "#")}"${dis}${al}>${inner}</a>`;
      }
      const dis = props.disabled ? " disabled" : "";
      return `<button type="button" class="${cls}"${dis}${al}>${inner}</button>`;
    },
    vue: () => pending2x("vue"),
    react: () => pending2x("react"),
  },
};
