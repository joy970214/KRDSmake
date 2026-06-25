import { escapeHtml, pending2x, thumb } from "../helpers";
import type { ComponentDefinition, Props } from "../types";

const DEFAULT_TEXT = "이 누리집은 대한민국 공식 전자정부 누리집입니다.";

// KRDS 마크업: #krds-masthead > toggle-wrap > toggle-head > inner > span.nuri-txt
export const mastheadDefinition: ComponentDefinition = {
  id: "masthead",
  name: "공식 배너",
  nameEn: "Masthead",
  category: "아이덴티티",
  thumbnail: thumb(1),
  description: "정부 공식 전자정부 누리집임을 알리는 식별 배너. 스크롤 고정에서 제외.",
  isKrdsStandard: true,
  variants: [],
  defaultProps: { text: DEFAULT_TEXT },
  editableProps: [{ key: "text", label: "안내 문구", type: "text", required: true }],

  Preview({ props }: { props: Props }) {
    return (
      <div id="krds-masthead">
        <div className="toggle-wrap">
          <div className="toggle-head">
            <div className="inner">
              <span className="nuri-txt">{String(props.text ?? DEFAULT_TEXT)}</span>
            </div>
          </div>
        </div>
      </div>
    );
  },

  exportTemplates: {
    html(props) {
      return [
        `<div id="krds-masthead">`,
        `\t<div class="toggle-wrap">`,
        `\t\t<div class="toggle-head">`,
        `\t\t\t<div class="inner">`,
        `\t\t\t\t<span class="nuri-txt">${escapeHtml(props.text ?? DEFAULT_TEXT)}</span>`,
        `\t\t\t</div>`,
        `\t\t</div>`,
        `\t</div>`,
        `</div>`,
      ].join("\n");
    },
    vue: () => pending2x("vue"),
    react: () => pending2x("react"),
  },
};
