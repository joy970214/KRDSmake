import { describe, expect, it } from "vitest";
import { listComponents } from "./index";
import { makeExportCtx } from "./test-utils";

// 설계 §10 Step2 검증: 컴포넌트별 HTML 스냅샷.
// 미리보기(React)와 익스포트(문자열)의 괴리/회귀 방어(설계 §7.4).
describe("컴포넌트 HTML 익스포트 스냅샷", () => {
  for (const def of listComponents()) {
    it(`${def.id} — 기본 마크업`, () => {
      const html = def.exportTemplates.html(def.defaultProps, makeExportCtx());
      expect(html).toMatchSnapshot();
    });
  }
});
