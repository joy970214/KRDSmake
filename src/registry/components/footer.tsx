import { attr, escapeHtml, pending2x, thumb } from "../helpers";
import type { NavLink } from "../../lib/types";
import type { ComponentDefinition, Props } from "../types";

// MVP 단순화 푸터. KRDS 푸터(#krds-footer) 핵심: 운영기관·연락처·정책 링크·저작권.
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
    const policy = asLinks(props.policyLinks);
    return (
      <footer id="krds-footer">
        <div className="inner">
          <div className="f-info">
            <p className="f-org">{String(props.organizationName ?? "")}</p>
            {address || tel || email ? (
              <address>{[address, tel, email].filter(Boolean).join(" · ")}</address>
            ) : null}
          </div>
          {policy.length ? (
            <ul className="f-link">
              {policy.map((l, i) => (
                <li key={i}>
                  <a href={l.url}>{l.label}</a>
                </li>
              ))}
            </ul>
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
      const contact = [address, tel, email].filter(Boolean).join(" · ");
      const policy = asLinks(props.policyLinks);
      const addressHtml = contact
        ? `\n\t\t\t<address>${escapeHtml(contact)}</address>`
        : "";
      const policyHtml = policy.length
        ? [
            `\t\t<ul class="f-link">`,
            ...policy.map(
              (l) => `\t\t\t<li><a href="${attr(l.url)}">${escapeHtml(l.label)}</a></li>`,
            ),
            `\t\t</ul>`,
          ].join("\n")
        : "";
      return [
        `<footer id="krds-footer">`,
        `\t<div class="inner">`,
        `\t\t<div class="f-info">`,
        `\t\t\t<p class="f-org">${escapeHtml(props.organizationName)}</p>${addressHtml}`,
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
