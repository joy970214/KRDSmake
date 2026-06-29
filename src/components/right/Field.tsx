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
    case "repeater": {
      const arr = Array.isArray(value) ? (value as string[]) : [];
      const setAt = (i: number, v: string) => onChange(arr.map((x, j) => (j === i ? v : x)));
      const add = () => onChange([...arr, ""]);
      const removeAt = (i: number) => onChange(arr.filter((_, j) => j !== i));
      return titled(
        <div className="repeater">
          {arr.map((v, i) => (
            <div className="repeater-row" key={i}>
              <input className="krds-input" value={v} onChange={(e) => setAt(i, e.target.value)} />
              <button type="button" aria-label={`${i + 1}번 항목 삭제`} onClick={() => removeAt(i)}>✕</button>
            </div>
          ))}
          <button type="button" aria-label="항목 추가" onClick={add}>＋ 항목 추가</button>
        </div>,
      );
    }
    case "table": {
      const rows = Array.isArray(value) ? (value as string[][]) : [];
      const cols = rows[0]?.length ?? 0;
      const setCell = (r: number, c: number, v: string) =>
        onChange(rows.map((row, ri) => (ri === r ? row.map((x, ci) => (ci === c ? v : x)) : row)));
      const addRow = () => onChange([...rows, Array.from({ length: cols || 1 }, () => "")]);
      const addCol = () => onChange(rows.map((row) => [...row, ""]));
      const removeRow = (r: number) => onChange(rows.filter((_, ri) => ri !== r));
      return titled(
        <div className="table-editor">
          {rows.map((row, ri) => (
            <div className="table-row" key={ri}>
              {row.map((cell, ci) => (
                <input className="krds-input" key={ci} value={cell} onChange={(e) => setCell(ri, ci, e.target.value)} />
              ))}
              <button type="button" aria-label={`${ri + 1}행 삭제`} onClick={() => removeRow(ri)}>✕</button>
            </div>
          ))}
          <div className="table-editor-actions">
            <button type="button" onClick={addRow}>＋ 행</button>
            <button type="button" onClick={addCol}>＋ 열</button>
          </div>
        </div>,
      );
    }
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
