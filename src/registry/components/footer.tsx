import { attr, escapeHtml, pending2x, thumb } from "../helpers";
import type { NavLink } from "../../lib/types";
import type { ComponentDefinition, Props } from "../types";

// MVP 단순화 푸터. KRDS 푸터(#krds-footer) 핵심: 운영기관·연락처·정책 링크·저작권.
// 교정된 KRDS 구조 (audit-C.md E4):
//   기관/주소: <p class="info-addr"> (이전: f-org — 발명된 클래스)
//   연락처:    <ul class="info-cs"><li><strong class="strong">…</strong></li></ul>
//              (이전: <address> — 구조·클래스 모두 불일치)
//   정책링크:  <div class="f-menu"><a href>…</a></div>
//              (이전: <ul class="f-link"> — f-link는 kit에서 바로가기+SNS 래퍼)
// 의도적 생략 (백로그): foot-quick, f-logo, f-cnt, link-go, link-sns, f-btm, krds-identifier
function asLinks(value: unknown): NavLink[] {
  return Array.isArray(value) ? (value as NavLink[]) : [];
}

export const footerDefinition: ComponentDefinition = {
  id: "footer",
  name: "푸터",
  nameEn: "Footer",
  category: "아이덴티티",
  thumbnail: thumb(4),
  description: "운영기관·연락처·정책 링크·저작권을 담은 사이트 바닥글. 전 페이지 공통.",
  isKrdsStandard: true,
  variants: [],
  defaultProps: {
    organizationName: "",
    copyright: "",
    address: "",
    tel: "",
    policyLinks: [],
  },
  editableProps: [
    { key: "organizationName", label: "운영기관", type: "text", required: true },
    { key: "address", label: "주소", type: "text" },
    { key: "tel", label: "대표전화", type: "text" },
    { key: "email", label: "이메일(선택)", type: "text" },
    { key: "copyright", label: "저작권 문구", type: "text", required: true },
  ],

  Preview({ props }: { props: Props }) {
    const address = String(props.address ?? "");
    const tel = String(props.tel ?? "");
    const email = String(props.email ?? "");
    const contactItems = [address, tel, email].filter(Boolean);
    const policy = asLinks(props.policyLinks);
    return (
      <footer id="krds-footer">
        <div className="inner">
          <div className="f-info">
            <p className="info-addr">{String(props.organizationName ?? "")}</p>
            {contactItems.length ? (
              <ul className="info-cs">
                {contactItems.map((item, i) => (
                  <li key={i}>
                    <strong className="strong">{item}</strong>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
          {policy.length ? (
            <div className="f-menu">
              {policy.map((l, i) => (
                <a key={i} href={l.url}>{l.label}</a>
              ))}
            </div>
          ) : null}
          <p className="f-copy">{String(props.copyright ?? "")}</p>
        </div>
      </footer>
    );
  },

  exportTemplates: {
    html(props) {
      const address = String(props.address ?? "");
      const tel = String(props.tel ?? "");
      const email = String(props.email ?? "");
      const contactItems = [address, tel, email].filter(Boolean);
      const policy = asLinks(props.policyLinks);
      const contactHtml = contactItems.length
        ? [
            `\t\t\t<ul class="info-cs">`,
            ...contactItems.map(
              (item) => `\t\t\t\t<li><strong class="strong">${escapeHtml(item)}</strong></li>`,
            ),
            `\t\t\t</ul>`,
          ].join("\n")
        : "";
      const policyHtml = policy.length
        ? [
            `\t\t<div class="f-menu">`,
            ...policy.map(
              (l) => `\t\t\t<a href="${attr(l.url)}">${escapeHtml(l.label)}</a>`,
            ),
            `\t\t</div>`,
          ].join("\n")
        : "";
      return [
        `<footer id="krds-footer">`,
        `\t<div class="inner">`,
        `\t\t<div class="f-info">`,
        `\t\t\t<p class="info-addr">${escapeHtml(props.organizationName)}</p>`,
        contactHtml,
        `\t\t</div>`,
        policyHtml,
        `\t\t<p class="f-copy">${escapeHtml(props.copyright)}</p>`,
        `\t</div>`,
        `</footer>`,
      ]
        .filter((l) => l !== "")
        .join("\n");
    },
    vue: () => pending2x("vue"),
    react: () => pending2x("react"),
  },
};
