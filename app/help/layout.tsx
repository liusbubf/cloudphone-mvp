import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "出行助手 · Travel Kit",
  description: "汇率换算与出行小工具",
};

export default function HelpLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
