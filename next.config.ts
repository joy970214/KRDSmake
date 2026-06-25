import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 정적 SPA로 export (서버 런타임 없음) — 설계 2장
  output: "export",
  // 정적 export에서는 기본 이미지 최적화(서버) 불가
  images: { unoptimized: true },
};

export default nextConfig;
