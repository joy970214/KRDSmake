import { escapeHtml, pending2x } from "../helpers";
import type { ComponentDefinition, Props } from "../types";

// KRDS 비표준(자체 컴포넌트). 페이지 제목은 시맨틱 헤딩 + 타이포 토큰으로 처리(설계 §13.1).
export const pageTitleDefinition: ComponentDefinition = {
  id: "page-title",
  name: "제목영역",
  category: "콘텐츠",
  thumbnail: "", // KRDS 표준 썸네일 없음 (자체 컴포넌트)
  description: "페이지 제목과 간단한 설명 영역. (KRDS 비표준 자체 컴포넌트)",
  isKrdsStandard: false,
  variants: [],
  defaultProps: { title: "제목을 입력하세요", description: "" },
  editableProps: [
    { key: "title", label: "제목", type: "text", required: true },
    { key: "description", label: "설명(선택)", type: "textarea" },
  ],

  Preview({ props }: { props: Props }) {
    const description = String(props.description ?? "");
    return (
      <div className="page-title-area">
        <h2>{String(props.title ?? "")}</h2>
        {description ? <p>{description}</p> : null}
      </div>
    );
  },

  exportTemplates: {
    html(props) {
      const description = String(props.description ?? "");
      const desc = description ? `\n\t<p>${escapeHtml(description)}</p>` : "";
      return `<div class="page-title-area">\n\t<h2>${escapeHtml(props.title)}</h2>${desc}\n</div>`;
    },
    vue: () => pending2x("vue"),
    react: () => pending2x("react"),
  },
};
