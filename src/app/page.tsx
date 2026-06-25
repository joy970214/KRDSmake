"use client";

// Step 0 셸 placeholder. 에디터 전체는 클라이언트 전용(설계 2장).
// 본격 3패널 UI는 Step 3에서 구현. 여기서는 레이아웃 골격만 둔다.
// (테두리·텍스트 색은 KRDS 토큰 --krds-* 사용 → 토큰 로드 시 KRDS 색상으로 표시)
export default function Home() {
  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <header
        style={{
          padding: "12px 24px",
          borderBottom: "1px solid var(--krds-color-light-gray-20, #cdd1d5)",
          fontWeight: 700,
        }}
      >
        KRDS 웹사이트 빌더
      </header>

      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
        <aside style={panel("left")}>좌측 패널 (Step 3)</aside>
        <main style={{ ...panel("center"), flex: 1 }}>
          <p>좌측의 컴포넌트 또는 기본 패턴을 이 영역으로 드래그하여 페이지를 구성하세요.</p>
        </main>
        <aside style={panel("right")}>우측 설정 패널 (Step 5)</aside>
      </div>
    </div>
  );
}

function panel(which: "left" | "center" | "right"): React.CSSProperties {
  return {
    padding: 24,
    width: which === "center" ? undefined : 240,
    borderRight: which === "left" ? "1px solid var(--krds-color-light-gray-20, #cdd1d5)" : undefined,
    borderLeft: which === "right" ? "1px solid var(--krds-color-light-gray-20, #cdd1d5)" : undefined,
    color: "var(--krds-color-light-gray-70, #464c53)",
  };
}
