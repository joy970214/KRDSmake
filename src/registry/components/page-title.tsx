import { escapeHtml, pending2x } from "../helpers";
import type { ComponentDefinition, Props } from "../types";

const SIZE_REM: Record<string, string> = { small: "1.6rem", medium: "2rem", large: "2.4rem" };
function titleFontSize(size: unknown): string {
  return SIZE_REM[String(size)] ?? SIZE_REM.medium;
}

// KRDS 비표준(자체 컴포넌트). 페이지 제목은 시맨틱 헤딩 + 타이포 토큰으로 처리(설계 §13.1).
export const pageTitleDefinition: ComponentDefinition = {
  id: "page-title",
  name: "제목영역",
  category: "콘텐츠",
  thumbnail: "", // KRDS 표준 썸네일 없음 (자체 컴포넌트)
  description: "페이지 제목과 간단한 설명 영역. (KRDS 비표준 자체 컴포넌트)",
  isKrdsStandard: false,
  variants: [],
  defaultProps: { title: "제목을 입력하세요", description: "", align: "left", size: "medium" },
  editableProps: [
    { key: "title", label: "제목", type: "text", required: true },
    { key: "description", label: "설명(선택)", type: "textarea" },
    {
      key: "align",
      label: "정렬",
      type: "select",
      options: [
        { label: "왼쪽", value: "left" },
        { label: "가운데", value: "center" },
        { label: "오른쪽", value: "right" },
      ],
    },
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
  ],

  Preview({ props }: { props: Props }) {
    const description = String(props.description ?? "");
    const align = String(props.align || "left");
    return (
      <div className="page-title-area" style={{ textAlign: align as "left" | "center" | "right" }}>
        <h2 style={{ fontSize: titleFontSize(props.size) }}>{String(props.title ?? "")}</h2>
        {description ? <p>{description}</p> : null}
      </div>
    );
  },

  exportTemplates: {
    html(props) {
      const description = String(props.description ?? "");
      const align = String(props.align || "left");
      const desc = description ? `\n\t<p>${escapeHtml(description)}</p>` : "";
      return `<div class="page-title-area" style="text-align:${align}">\n\t<h2 style="font-size:${titleFontSize(props.size)}">${escapeHtml(props.title)}</h2>${desc}\n</div>`;
    },
    vue: () => pending2x("vue"),
    react: () => pending2x("react"),
  },
};
