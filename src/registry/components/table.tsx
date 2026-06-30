import { escapeHtml, pending2x, thumb } from "../helpers";
import type { ComponentDefinition, Props } from "../types";

// KRDS 마크업: div.krds-table-wrap > table.tbl.col.data > caption/thead/tbody.
// KRDS 키트에 'tbl row' 클래스는 없음 — 클래스는 항상 'tbl col data'(실존).
// 행형/열형은 KRDS 지침대로 클래스가 아니라 <th scope>로 구분한다:
// 행형=본문 첫 칸 th scope=row(벤더 table.html 정본), 열형=본문 전부 td.
function asColumns(props: Props): string[] {
  return Array.isArray(props.columns) ? (props.columns as string[]) : [];
}
function asRows(props: Props): string[][] {
  return Array.isArray(props.rows) ? (props.rows as string[][]) : [];
}

export const tableDefinition: ComponentDefinition = {
  id: "table",
  name: "표",
  nameEn: "Table",
  category: "레이아웃 및 표현",
  thumbnail: thumb(22),
  description: "행과 열로 데이터를 정리하는 표.",
  isKrdsStandard: true,
  variants: [],
  defaultProps: {
    caption: "표 제목",
    columns: ["제목1", "제목2"],
    rows: [
      ["제목1-1", "내용이 들어갑니다."],
      ["제목1-2", "내용이 들어갑니다."],
    ],
    headerType: "col",
    showCaption: true,
  },
  editableProps: [
    { key: "caption", label: "표 제목(요약)", type: "text", required: true },
    { key: "columns", label: "열 머리글", type: "repeater" },
    { key: "rows", label: "표 내용", type: "table" },
    {
      key: "headerType",
      label: "머리글 위치",
      type: "select",
      options: [
        { label: "열 머리글(위)", value: "col" },
        { label: "행 머리글(왼쪽)", value: "row" },
      ],
    },
    { key: "showCaption", label: "표 제목 보이기", type: "checkbox" },
  ],

  Preview({ props }: { props: Props }) {
    const columns = asColumns(props);
    const rows = asRows(props);
    const rowHeader = props.headerType === "row";
    const showCaption = props.showCaption !== false;
    return (
      <div className="krds-table-wrap">
        <table className="tbl col data">
          <caption className={showCaption ? undefined : "sr-only"}>
            {String(props.caption ?? "")}
          </caption>
          <colgroup>
            {columns.map((_, i) => (
              <col key={i} />
            ))}
          </colgroup>
          <thead>
            <tr>
              {columns.map((c, i) => (
                <th key={i} scope="col">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, ri) => (
              <tr key={ri}>
                {r.map((cell, ci) =>
                  rowHeader && ci === 0 ? (
                    <th key={ci} scope="row">
                      {cell}
                    </th>
                  ) : (
                    <td key={ci}>{cell}</td>
                  ),
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  },

  exportTemplates: {
    html(props) {
      const columns = asColumns(props);
      const rows = asRows(props);
      const rowHeader = props.headerType === "row";
      const showCaption = props.showCaption !== false;
      const captionCls = showCaption ? "" : ` class="sr-only"`;
      const headCells = columns
        .map((c) => `<th scope="col">${escapeHtml(c)}</th>`)
        .join("");
      const bodyRows = rows
        .map((r) => {
          const cells = r
            .map((cell, ci) =>
              rowHeader && ci === 0
                ? `<th scope="row">${escapeHtml(cell)}</th>`
                : `<td>${escapeHtml(cell)}</td>`,
            )
            .join("");
          return `\t\t<tr>${cells}</tr>`;
        })
        .join("\n");
      const colgroup = `<colgroup>${columns.map(() => "<col>").join("")}</colgroup>`;
      return [
        `<div class="krds-table-wrap">`,
        `\t<table class="tbl col data">`,
        `\t\t<caption${captionCls}>${escapeHtml(props.caption)}</caption>`,
        `\t\t${colgroup}`,
        `\t\t<thead><tr>${headCells}</tr></thead>`,
        `\t\t<tbody>`,
        bodyRows,
        `\t\t</tbody>`,
        `\t</table>`,
        `</div>`,
      ].join("\n");
    },
    vue: () => pending2x("vue"),
    react: () => pending2x("react"),
  },
};
