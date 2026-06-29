"use client";

import { useId } from "react";
import type { EditablePropSchema } from "../../registry/types";

// editableProps 스키마 1건 → KRDS 폼 마크업 위젯. 값/콜백은 상위(폼)가 store와 연결.
export function Field({
  schema,
  value,
  onChange,
}: {
  schema: EditablePropSchema;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  const id = useId();
  const hint = schema.help ? <p className="form-hint">{schema.help}</p> : null;
  const str = value == null ? "" : String(value);
  const opts = schema.options ?? [];

  // 레이블이 입력 앞(form-tit)에 오는 일반형
  const titled = (input: React.ReactNode) => (
    <div className="form-group">
      <div className="form-tit">
        <label htmlFor={id}>
          {schema.label}
          {schema.required ? <span className="required" aria-hidden="true"> *</span> : null}
        </label>
      </div>
      <div className="form-conts">{input}</div>
      {hint}
    </div>
  );

  switch (schema.type) {
    case "textarea":
      return titled(
        <div className="textarea-wrap">
          <textarea id={id} className="krds-input" value={str} onChange={(e) => onChange(e.target.value)} />
        </div>,
      );
    case "number":
      return titled(
        <input
          id={id}
          type="number"
          className="krds-input"
          value={str}
          onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))}
        />,
      );
    case "select":
      return titled(
        <select id={id} className="krds-form-select" value={str} onChange={(e) => onChange(e.target.value)}>
          {opts.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>,
      );
    case "radio":
      return titled(
        <div className="krds-check-area">
          {opts.map((o, i) => (
            <div className="krds-form-check" key={o.value}>
              <input
                type="radio"
                name={id}
                id={`${id}-${i}`}
                checked={str === o.value}
                onChange={() => onChange(o.value)}
              />
              <label htmlFor={`${id}-${i}`}>{o.label}</label>
            </div>
          ))}
        </div>,
      );
    case "checkbox":
      // 불리언 — 라벨을 체크박스 옆에(form-tit 없이)
      return (
        <div className="form-group">
          <div className="form-conts">
            <div className="krds-check-area">
              <div className="krds-form-check">
                <input
                  type="checkbox"
                  id={id}
                  checked={!!value}
                  onChange={(e) => onChange(e.target.checked)}
                />
                <label htmlFor={id}>{schema.label}</label>
              </div>
            </div>
          </div>
          {hint}
        </div>
      );
    case "color":
      return titled(
        <input id={id} type="color" value={str || "#000000"} onChange={(e) => onChange(e.target.value)} />,
      );
    case "date":
      return titled(
        <input id={id} type="date" className="krds-input" value={str} onChange={(e) => onChange(e.target.value)} />,
      );
    case "image":
      return titled(
        <>
          <input
            id={id}
            type="text"
            className="krds-input"
            placeholder="이미지 주소(URL)"
            value={str}
            onChange={(e) => onChange(e.target.value)}
          />
          {str ? <img className="field-img-preview" src={str} alt="" /> : null}
        </>,
      );
    case "repeater":
    case "table":
      // Task 3에서 구현
      return titled(<p className="field-pending">복합 위젯(Task 3)</p>);
    default:
      // text / url
      return titled(
        <input
          id={id}
          type={schema.type === "url" ? "url" : "text"}
          className="krds-input"
          value={str}
          onChange={(e) => onChange(e.target.value)}
        />,
      );
  }
}
