"use client";

import { useEditorState } from "../../store/context";
import { ComponentForm } from "./ComponentForm";
import { PageSettingsForm } from "./PageSettingsForm";

// 선택 유무로 컴포넌트 폼 / 페이지 설정 폼 분기.
export function RightPanel() {
  const selection = useEditorState((s) => s.selection);
  const activePageId = useEditorState((s) => s.activePageId);
  const fallbackPageId = useEditorState((s) => s.site?.pages[0]?.id);
  const pageId = activePageId ?? fallbackPageId;

  if (selection?.kind === "component") {
    return <ComponentForm pageId={selection.pageId} instanceId={selection.instanceId} />;
  }
  if (!pageId) return null;
  return <PageSettingsForm pageId={pageId} />;
}
