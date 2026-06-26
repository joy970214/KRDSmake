import { pending2x } from "../helpers";
import type { ComponentDefinition, Props } from "../types";

// 가로 다단 레이아웃 컨테이너 (KRDS style_05 그리드 근거).
// KRDS HTML Kit에 범용 그리드 컴포넌트가 없으므로 display:grid로 자체 구현.
// 자식은 instance.columns(칼럼별 배열)에 담기며, 익스포트 자식 주입은 Step7.

function colCount(props: Props): number {
  const n = Number(props.columns);
  return Number.isFinite(n) && n >= 2 && n <= 4 ? n : 2;
}

export const layoutDefinition: ComponentDefinition = {
  id: "layout",
  name: "다단 레이아웃",
  nameEn: "Columns",
  category: "레이아웃 및 표현",
  thumbnail: "", // KRDS 표준 썸네일 없음 (자체 컨테이너)
  description: "콘텐츠를 가로로 나란히 배치하는 2~4단 그리드.",
  isKrdsStandard: false,
  container: { columnCountProp: "columns" },
  variants: [
    { id: "2", name: "2단" },
    { id: "3", name: "3단" },
    { id: "4", name: "4단" },
  ],
  defaultProps: { columns: 2 },
  editableProps: [
    {
      key: "columns",
      label: "칼럼 수",
      type: "radio",
      options: [
        { label: "2단", value: "2" },
        { label: "3단", value: "3" },
        { label: "4단", value: "4" },
      ],
    },
  ],

  Preview({ props }: { props: Props }) {
    const cols = colCount(props);
    return (
      <div
        className="krds-grid"
        style={{ "--cols": cols } as React.CSSProperties}
      />
    );
  },

  exportTemplates: {
    // 자식 주입은 익스포트 파이프라인이 columns를 재귀 처리할 때(Step7) 배선.
    html(props) {
      const cols = colCount(props);
      return `<div class="krds-grid" style="--cols:${cols}"></div>`;
    },
    vue: () => pending2x("vue"),
    react: () => pending2x("react"),
  },
};
