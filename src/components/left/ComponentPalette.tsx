"use client";

import Image from "next/image";
import { listComponents } from "../../registry";

// 좌측 "컴포넌트" 탭 — 레지스트리 카드 목록. (캔버스로의 드래그 배치는 Step 4)
export function ComponentPalette() {
  return (
    <div>
      <div className="panel-head">
        <strong>컴포넌트</strong>
      </div>
      <ul className="component-palette">
        {listComponents().map((def) => (
          <li key={def.id} data-component-id={def.id} className="palette-card">
            {def.thumbnail ? (
              <Image
                src={def.thumbnail}
                alt=""
                width={84}
                height={60}
                className="palette-thumb"
                unoptimized
              />
            ) : (
              <span className="palette-thumb palette-thumb-empty" aria-hidden />
            )}
            <span className="palette-meta">
              <span className="palette-name">{def.name}</span>
              <span className="palette-cat">{def.category}</span>
              {!def.isKrdsStandard ? (
                <span className="palette-badge">자체</span>
              ) : null}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
