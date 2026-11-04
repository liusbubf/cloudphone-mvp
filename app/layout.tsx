import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "海隅 SEA DESK · 跨境消息协作台",
  description:
    "合规优先的跨境多渠道消息协作台：统一收件箱、线索上报、服务工单与全程审计。界面全量可见，不含任何隐蔽或反取证能力。",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,300;9..144,400;9..144,500;9..144,600&family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@300;400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
