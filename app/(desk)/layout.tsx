import { Sidebar } from "@/components/Sidebar";

export default function DeskLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-screen max-w-[1600px]">
      <Sidebar />
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
