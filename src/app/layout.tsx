import type { Metadata } from "next";
import "./krds-fonts.css";
import "./globals.css";
import "./editor.css";

export const metadata: Metadata = {
  title: "KRDS 웹사이트 빌더",
  description: "KRDS 기반 공공 웹사이트를 드래그 앤 드롭으로 제작하는 노코드 도구",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <head>
        {/* KRDS 공식 자산(public/krds, 단일 출처: vendor/krds). 빌드 시 복사됨.
            output.css = krds_tokens 임포트 + 공통(리셋·모드) + 컴포넌트 전부 포함된
            단일 번들이라 이것만 로드한다(전송량 절감, component.css의 경로 버그 회피). */}
        <link rel="stylesheet" href="/krds/css/component/output.css" />
      </head>
      <body>
        <div id="krds-editor-root">{children}</div>
      </body>
    </html>
  );
}
