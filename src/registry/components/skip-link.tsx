import { attr, escapeHtml, pending2x, thumb } from "../helpers";
import type { ComponentDefinition, Props } from "../types";

// KRDS 마크업: <div id="krds-skip-link"><a href="#...">본문 바로가기</a></div>
export const skipLinkDefinition: ComponentDefinition = {
  id: "skip-link",
  name: "건너뛰기 링크",
  nameEn: "Skip link",
  category: "탐색",
  thumbnail: thumb(5),
  description: "키보드 사용자가 본문으로 바로 이동하는 접근성 링크.",
  isKrdsStandard: true,
  variants: [],
  defaultProps: { label: "본문 바로가기", target: "#main" },
  editableProps: [
    { key: "label", label: "링크 글자", type: "text", required: true },
    { key: "target", label: "이동 대상(앵커)", type: "text", required: true },
  ],

  Preview({ props }: { props: Props }) {
    return (
      <div id="krds-skip-link">
        <a href={String(props.target ?? "#main")}>{String(props.label ?? "")}</a>
      </div>
    );
  },

  exportTemplates: {
    html(props) {
      return `<div id="krds-skip-link">\n\t<a href="${attr(props.target)}">${escapeHtml(props.label)}</a>\n</div>`;
    },
    vue: () => pending2x("vue"),
    react: () => pending2x("react"),
  },
};
