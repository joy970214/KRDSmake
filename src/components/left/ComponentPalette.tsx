"use client";

import Image from "next/image";
import { useDraggable } from "@dnd-kit/core";
import { listPlaceableComponents } from "../../registry";
import type { ComponentDefinition } from "../../registry/types";
import { PALETTE_DRAG_PREFIX } from "../../lib/dnd-plan";

// 좌측 "컴포넌트" 탭 — 페이지 본문에 드래그 배치 가능한 카드 목록.
// 전역 요소(헤더/푸터/공식배너/건너뛰기링크)는 전역 설정에서 편집하므로 제외.
export function ComponentPalette() {
  return (
    <div>
      <div className="panel-head">
        <strong>컴포넌트</strong>
      </div>
      <ul className="component-palette">
        {listPlaceableComponents().map((def) => (
          <PaletteCard key={def.id} def={def} />
        ))}
      </ul>
    </div>
  );
}

function PaletteCard({ def }: { def: ComponentDefinition }) {
  const { setNodeRef, listeners, attributes, isDragging } = useDraggable({
    id: `${PALETTE_DRAG_PREFIX}${def.id}`,
    data: { componentDefinitionId: def.id },
  });
  return (
    <li
      ref={setNodeRef}
      data-component-id={def.id}
      className={`palette-card${isDragging ? " is-dragging" : ""}`}
      {...listeners}
      {...attributes}
    >
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
        {!def.isKrdsStandard ? <span className="palette-badge">자체</span> : null}
      </span>
    </li>
  );
}
