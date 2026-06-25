import { attr, escapeHtml, pending2x, thumb } from "../helpers";
import type { ComponentDefinition, Props } from "../types";

// KRDS에 "카드" 컴포넌트는 없다(설계 §13.1). 가장 근접한 공식 컴포넌트
// "구조화 목록(Structured list)" 마크업으로 카드를 구현한다.
export const cardDefinition: ComponentDefinition = {
  id: "card",
  name: "카드",
  category: "레이아웃 및 표현",
  thumbnail: thumb(12),
  description: "제목·설명·링크를 담는 카드. (KRDS 구조화 목록 기반 자체 컴포넌트)",
  isKrdsStandard: false,
  variants: [],
  defaultProps: {
    title: "카드 제목",
    text: "간단한 설명이 들어가는 영역입니다.",
    badge: "",
    linkLabel: "",
    linkUrl: "",
  },
  editableProps: [
    { key: "title", label: "제목", type: "text", required: true },
    { key: "text", label: "설명", type: "textarea" },
    { key: "badge", label: "뱃지(선택)", type: "text" },
    { key: "linkLabel", label: "버튼 글자(선택)", type: "text" },
    { key: "linkUrl", label: "버튼 링크(선택)", type: "url" },
  ],

  Preview({ props }: { props: Props }) {
    const badge = String(props.badge ?? "");
    const linkLabel = String(props.linkLabel ?? "");
    const linkUrl = String(props.linkUrl || "#");
    return (
      <ul className="krds-structured-list type-full">
        <li className="structured-item">
          <div className="in">
            {badge ? (
              <div className="card-top">
                <span className="krds-badge bg-light-primary">{badge}</span>
              </div>
            ) : null}
            <div className="card-body">
              <a href={linkUrl} className="c-text">
                <p className="c-tit">
                  <span className="span">{String(props.title ?? "")}</span>
                </p>
                <p className="c-txt">{String(props.text ?? "")}</p>
              </a>
              {linkLabel ? (
                <div className="c-btn">
                  <a href={linkUrl} className="krds-btn secondary">
                    {linkLabel}
                  </a>
                </div>
              ) : null}
            </div>
          </div>
        </li>
      </ul>
    );
  },

  exportTemplates: {
    html(props) {
      const badge = String(props.badge ?? "");
      const linkLabel = String(props.linkLabel ?? "");
      const linkUrl = String(props.linkUrl || "#");
      const badgeHtml = badge
        ? `\n\t\t\t<div class="card-top"><span class="krds-badge bg-light-primary">${escapeHtml(badge)}</span></div>`
        : "";
      const btnHtml = linkLabel
        ? `\n\t\t\t\t<div class="c-btn"><a href="${attr(linkUrl)}" class="krds-btn secondary">${escapeHtml(linkLabel)}</a></div>`
        : "";
      return [
        `<ul class="krds-structured-list type-full">`,
        `\t<li class="structured-item">`,
        `\t\t<div class="in">${badgeHtml}`,
        `\t\t\t<div class="card-body">`,
        `\t\t\t\t<a href="${attr(linkUrl)}" class="c-text">`,
        `\t\t\t\t\t<p class="c-tit"><span class="span">${escapeHtml(props.title)}</span></p>`,
        `\t\t\t\t\t<p class="c-txt">${escapeHtml(props.text)}</p>`,
        `\t\t\t\t</a>${btnHtml}`,
        `\t\t\t</div>`,
        `\t\t</div>`,
        `\t</li>`,
        `</ul>`,
      ].join("\n");
    },
    vue: () => pending2x("vue"),
    react: () => pending2x("react"),
  },
};
