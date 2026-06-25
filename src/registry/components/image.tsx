import { attr, escapeHtml, pending2x, thumb } from "../helpers";
import type { ComponentDefinition, Props } from "../types";

// KRDS에는 전용 .krds-img 클래스가 없어 시맨틱 img(+선택적 figure/figcaption)로 처리.
// 접근성: 정보성 이미지는 alt 필수(장식용은 빈 alt) — 설계 §8.3.
const PLACEHOLDER = "/krds-thumbnails/img/img_guide_component_19.png";

export const imageDefinition: ComponentDefinition = {
  id: "image",
  name: "이미지",
  nameEn: "Image",
  category: "레이아웃 및 표현",
  thumbnail: thumb(19),
  description: "사진·일러스트 등 이미지를 표시.",
  isKrdsStandard: true,
  variants: [],
  defaultProps: { src: "", alt: "", caption: "" },
  editableProps: [
    { key: "src", label: "이미지", type: "image", required: true },
    {
      key: "alt",
      label: "대체 텍스트(장식용이면 비움)",
      type: "text",
      required: true,
      help: "화면을 못 보는 사용자에게 이미지를 설명합니다.",
    },
    { key: "caption", label: "설명(선택)", type: "text" },
  ],

  Preview({ props }: { props: Props }) {
    const src = String(props.src || PLACEHOLDER);
    const alt = String(props.alt ?? "");
    const caption = String(props.caption ?? "");
    const img = <img src={src} alt={alt} style={{ maxWidth: "100%" }} />;
    return caption ? (
      <figure>
        {img}
        <figcaption>{caption}</figcaption>
      </figure>
    ) : (
      img
    );
  },

  exportTemplates: {
    html(props) {
      const img = `<img src="${attr(props.src)}" alt="${attr(props.alt)}">`;
      const caption = String(props.caption ?? "");
      return caption
        ? `<figure>\n\t${img}\n\t<figcaption>${escapeHtml(caption)}</figcaption>\n</figure>`
        : img;
    },
    vue: () => pending2x("vue"),
    react: () => pending2x("react"),
  },
};
