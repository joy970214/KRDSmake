"use client";

import { useState } from "react";
import { ComponentPalette } from "./ComponentPalette";
import { SitemapTree } from "./SitemapTree";

type Tab = "sitemap" | "components";

export function LeftPanel() {
  const [tab, setTab] = useState<Tab>("sitemap");
  return (
    <div className="left-panel">
      <div className="tab-bar" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "sitemap"}
          className={tab === "sitemap" ? "tab active" : "tab"}
          onClick={() => setTab("sitemap")}
        >
          사이트맵
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "components"}
          className={tab === "components" ? "tab active" : "tab"}
          onClick={() => setTab("components")}
        >
          컴포넌트
        </button>
      </div>
      <div className="tab-body">
        {tab === "sitemap" ? <SitemapTree /> : <ComponentPalette />}
      </div>
    </div>
  );
}
