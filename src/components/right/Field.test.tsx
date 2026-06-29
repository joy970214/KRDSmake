import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Field } from "./Field";
import type { EditablePropSchema } from "../../registry/types";

function renderField(schema: EditablePropSchema, value: unknown) {
  const onChange = vi.fn();
  const r = render(<Field schema={schema} value={value} onChange={onChange} />);
  return { ...r, onChange };
}

describe("Field — KRDS 폼 마크업", () => {
  it("text: form-group/form-tit/krds-input 구조 + 변경 콜백", () => {
    const { container, onChange } = renderField(
      { key: "label", label: "버튼 글자", type: "text" },
      "확인",
    );
    expect(container.querySelector(".form-group .form-tit label")?.textContent).toBe("버튼 글자");
    const input = container.querySelector("input.krds-input") as HTMLInputElement;
    expect(input.value).toBe("확인");
    fireEvent.change(input, { target: { value: "신청" } });
    expect(onChange).toHaveBeenCalledWith("신청");
  });

  it("help가 있으면 form-hint를 렌더한다", () => {
    const { container } = renderField(
      { key: "alt", label: "대체텍스트", type: "text", help: "이미지를 설명합니다" },
      "",
    );
    expect(container.querySelector(".form-hint")?.textContent).toBe("이미지를 설명합니다");
  });

  it("textarea: textarea-wrap > textarea.krds-input", () => {
    const { container, onChange } = renderField({ key: "t", label: "설명", type: "textarea" }, "x");
    const ta = container.querySelector(".textarea-wrap textarea.krds-input") as HTMLTextAreaElement;
    expect(ta.value).toBe("x");
    fireEvent.change(ta, { target: { value: "y" } });
    expect(onChange).toHaveBeenCalledWith("y");
  });

  it("number: 숫자로 콜백", () => {
    const { container, onChange } = renderField({ key: "n", label: "수", type: "number" }, 3);
    const input = container.querySelector('input[type="number"]') as HTMLInputElement;
    fireEvent.change(input, { target: { value: "5" } });
    expect(onChange).toHaveBeenCalledWith(5);
  });

  it("select: krds-form-select + options", () => {
    const { container, onChange } = renderField(
      { key: "v", label: "스타일", type: "select", options: [{ label: "기본", value: "primary" }, { label: "보조", value: "secondary" }] },
      "primary",
    );
    const sel = container.querySelector("select.krds-form-select") as HTMLSelectElement;
    expect(sel.value).toBe("primary");
    fireEvent.change(sel, { target: { value: "secondary" } });
    expect(onChange).toHaveBeenCalledWith("secondary");
  });

  it("radio: krds-check-area > krds-form-check, 선택 변경", () => {
    const { container, onChange } = renderField(
      { key: "v", label: "정렬", type: "radio", options: [{ label: "좌", value: "l" }, { label: "우", value: "r" }] },
      "l",
    );
    expect(container.querySelectorAll(".krds-check-area .krds-form-check")).toHaveLength(2);
    const radios = container.querySelectorAll('input[type="radio"]');
    fireEvent.click(radios[1]);
    expect(onChange).toHaveBeenCalledWith("r");
  });

  it("checkbox: 불리언 토글", () => {
    const { container, onChange } = renderField({ key: "b", label: "표시", type: "checkbox" }, false);
    const cb = container.querySelector('input[type="checkbox"]') as HTMLInputElement;
    fireEvent.click(cb);
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it("image: URL 입력 + 미리보기", () => {
    const { container, onChange } = renderField({ key: "src", label: "이미지", type: "image" }, "http://x/y.png");
    const input = container.querySelector("input.krds-input") as HTMLInputElement;
    expect(input.value).toBe("http://x/y.png");
    expect(container.querySelector("img")?.getAttribute("src")).toBe("http://x/y.png");
    fireEvent.change(input, { target: { value: "http://x/z.png" } });
    expect(onChange).toHaveBeenCalledWith("http://x/z.png");
  });
});
