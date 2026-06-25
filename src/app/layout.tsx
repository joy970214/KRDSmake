import type { Metadata } from "next";
import "./krds-fonts.css";
import "./globals.css";

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
            output.css가 krds_tokens.css를 @import → --krds-* 변수 로드. */}
        <link rel="stylesheet" href="/krds/css/component/output.css" />
        <link rel="stylesheet" href="/krds/css/common/common.css" />
        <link rel="stylesheet" href="/krds/css/component/component.css" />
      </head>
      <body>
        <div id="krds-editor-root">{children}</div>
      </body>
    </html>
  );
}
