"use client";

import { getComponent } from "../../registry";
import { findInstance } from "../../store/editor-store";
import { useEditorState, useEditorStoreApi } from "../../store/context";
import { Field } from "./Field";

// 선택된 인스턴스의 editableProps로 자동 폼. 입력 시 updateComponentProps로 즉시 반영.
export function ComponentForm({ pageId, instanceId }: { pageId: string; instanceId: string }) {
  const api = useEditorStoreApi();
  const inst = useEditorState((s) => {
    const page = s.site?.pages.find((p) => p.id === pageId);
    return page ? findInstance(page.components, instanceId) : undefined;
  });
  if (!inst) return null;
  const def = getComponent(inst.componentDefinitionId);
  if (!def) return null;

  return (
    <div className="settings-form">
      <div className="panel-head">
        <strong>{def.name} 설정</strong>
      </div>
      <div className="settings-body">
        {def.editableProps.map((schema) => (
          <Field
            key={schema.key}
            schema={schema}
            value={inst.props[schema.key]}
            onChange={(v) => api.getState().updateComponentProps(pageId, instanceId, { [schema.key]: v })}
          />
        ))}
      </div>
    </div>
  );
}
