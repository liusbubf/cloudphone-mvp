"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import {
  Inbox,
  LayoutDashboard,
  LifeBuoy,
  Radio,
  ScrollText,
  ShieldAlert,
  UserRound,
} from "lucide-react";
import { useWorkspace } from "@/lib/store";

const nav = [
  { href: "/", index: "01", label: "总览", sub: "Overview", icon: LayoutDashboard },
  { href: "/inbox", index: "02", label: "统一收件箱", sub: "Unified inbox", icon: Inbox },
  { href: "/leads", index: "03", label: "线索与上报", sub: "Lead intake", icon: ShieldAlert },
  { href: "/tickets", index: "04", label: "服务工单", sub: "Service desk", icon: LifeBuoy },
  { href: "/channels", index: "05", label: "渠道账号", sub: "Channels", icon: Radio },
  { href: "/audit", index: "06", label: "审计与合规", sub: "Audit trail", icon: ScrollText },
];

export function Sidebar() {
  const pathname = usePathname();
  const { conversations, leads, tickets, settings, channels } = useWorkspace();

  const unread = conversations.reduce((n, c) => n + c.unread, 0);
  const openLeads = leads.filter((l) => l.status === "new" || l.status === "triage").length;
  const openTickets = tickets.filter((t) => t.status !== "resolved").length;
  const liveChannels = channels.filter((c) => c.status === "connected").length;

  const badgeFor = (href: string) => {
    if (href === "/inbox") return unread;
    if (href === "/leads") return openLeads;
    if (href === "/tickets") return openTickets;
    return 0;
  };

  return (
    <aside className="grain relative flex h-screen w-[248px] shrink-0 flex-col border-r border-ink-700 bg-ink-900/80 backdrop-blur">
      {/* brand */}
      <div className="px-5 pb-5 pt-6">
        <div className="flex items-center gap-2.5">
          <span
            className="inline-flex h-7 w-7 items-center justify-center rounded-[2px] border border-oxide/40 bg-oxide-soft font-mono text-[13px] text-oxide"
            aria-hidden
          >
            海
          </span>
          <div className="leading-tight">
            <div className="font-display text-[19px] tracking-[-0.01em] text-bone">海隅</div>
            <div className="label-mono mt-0.5">SEA DESK · v0.1</div>
          </div>
        </div>
        <div className="mt-4 border-t border-ink-700 pt-3">
          <div className="label-mono">当前工作区</div>
          <div className="mt-1 truncate text-[12px] text-bone/90">{settings.workspaceName}</div>
        </div>
      </div>

      {/* nav */}
      <nav className="flex-1 px-2">
        {nav.map((item) => {
          const active = pathname === item.href;
          const count = badgeFor(item.href);
          return (
            <Link key={item.href} href={item.href} className="nav-link" data-active={active}>
              <span className="w-4 font-mono text-[9px] text-muted/60">{item.index}</span>
              <item.icon size={15} strokeWidth={1.6} className={clsx(active ? "text-oxide" : "text-muted")} />
              <span className="flex-1 leading-tight">
                <span className="block">{item.label}</span>
                <span className="mt-0.5 block font-mono text-[9px] uppercase tracking-[0.14em] text-muted/60">
                  {item.sub}
                </span>
              </span>
              {count > 0 && (
                <span className="rounded-[2px] border border-ink-700 bg-ink-800 px-1.5 py-0.5 font-mono text-[10px] tabular-nums text-bone/80">
                  {count}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* compliance notice */}
      <div className="mx-3 mb-3 rounded-[3px] border border-ink-700 bg-ink-850/60 p-3">
        <div className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-sage" />
          <span className="label-mono text-sage">合规模式</span>
        </div>
        <p className="mt-2 text-[10.5px] leading-relaxed text-muted">
          界面全量可见、操作全程留痕。不提供隐蔽窗口、老板键或进程隐藏能力。
        </p>
      </div>

      <div className="flex items-center gap-2.5 border-t border-ink-700 px-4 py-3">
        <UserRound size={15} className="text-muted" strokeWidth={1.6} />
        <div className="min-w-0 flex-1 leading-tight">
          <div className="truncate text-[12px] text-bone">林澈</div>
          <div className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted">
            组长 · {liveChannels} 渠道在线
          </div>
        </div>
      </div>
    </aside>
  );
}
