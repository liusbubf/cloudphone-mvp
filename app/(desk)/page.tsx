"use client";

import Link from "next/link";
import { ArrowUpRight, Clock3, ShieldAlert } from "lucide-react";
import clsx from "clsx";
import { useWorkspace } from "@/lib/store";
import { KpiCard, Pill, RiskMeter, SectionHeading, Avatar, ChannelGlyph } from "@/components/ui";
import {
  channelMeta,
  conversationStatusMeta,
  formatTime,
  formatWhen,
  leadCategories,
} from "@/lib/format";

export default function OverviewPage() {
  const { conversations, channels, leads, audit, messages, helpChannels, tickets } = useWorkspace();

  const unread = conversations.reduce((n, c) => n + c.unread, 0);
  const flagged = conversations.filter((c) => c.status === "flagged");
  const openLeads = leads.filter((l) => l.status !== "closed");
  const p0 = leads.filter((l) => l.priority === "P0" && l.status !== "closed");
  const today = "2026-11-04";
  const outboundToday = messages.filter((m) => m.direction === "out" && m.at.startsWith(today)).length;
  const totalVolume = channels.reduce((n, c) => n + c.messagesToday, 0);
  const maxVolume = Math.max(...channels.map((c) => c.messagesToday), 1);
  const openTickets = tickets.filter((t) => t.status !== "resolved").length;

  const categoryCounts = leadCategories.map((cat) => ({
    cat,
    count: leads.filter((l) => l.category === cat).length,
  }));
  const maxCat = Math.max(...categoryCounts.map((c) => c.count), 1);

  const inboundSeries = [18, 26, 22, 34, 29, 41, 38, 52, 47, 61, 55, 68];

  return (
    <div className="relative">
      <div className="mx-auto max-w-[1240px] px-8 py-9">
        {/* header */}
        <header className="stagger">
          <div className="flex flex-wrap items-end justify-between gap-6 border-b border-ink-700 pb-6">
            <div>
              <div className="flex items-center gap-3">
                <span className="label-mono">WORKSPACE / 2026-11-04</span>
                <span className="h-px w-8 bg-ink-700" />
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-sage">
                  ● 合规模式已启用
                </span>
              </div>
              <h1 className="mt-4 font-display text-[46px] leading-[0.95] tracking-[-0.025em] text-bone">
                今日协作总览
              </h1>
              <p className="mt-3 max-w-xl text-[13px] leading-relaxed text-muted">
                聚合你已授权的渠道账号，按风险排序处理求助与线索。所有操作写入审计日志，界面无隐藏模式。
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/inbox" className="btn-primary">
                进入收件箱 <ArrowUpRight size={13} />
              </Link>
              <Link href="/leads" className="btn-ghost">
                登记线索
              </Link>
            </div>
          </div>
        </header>

        {/* kpis */}
        <section className="stagger mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <KpiCard label="待处理会话" value={unread} unit="条" delta="+7" hint="其中 2 个判定为高风险" />
          <KpiCard
            label="未结线索"
            value={openLeads.length}
            unit="件"
            delta="+2"
            hint={`P0 待响应 ${p0.length} 件`}
            accent
          />
          <KpiCard label="首响中位数" value="4:12" unit="分:秒" delta="-38s" hint="过去 24 小时 · 目标 ≤ 5 分钟" />
          <KpiCard label="今日外发" value={outboundToday} unit="条" hint={`工单待处理 ${openTickets} 件 · 共 ${totalVolume} 条入站`} />
        </section>

        {/* charts */}
        <section className="stagger mt-9 grid gap-4 lg:grid-cols-12">
          <div className="panel p-5 lg:col-span-7">
            <SectionHeading index="01" title="渠道入站分布" meta="今日" />
            <div className="mt-5 space-y-3">
              {channels.map((ch) => {
                const meta = channelMeta[ch.type];
                return (
                  <div key={ch.id} className="flex items-center gap-3">
                    <ChannelGlyph type={ch.type} />
                    <span className="w-28 shrink-0 truncate text-[12px] text-bone/90">{ch.name}</span>
                    <div className="relative h-[6px] flex-1 bg-ink-800">
                      <div
                        className="absolute inset-y-0 left-0 transition-all"
                        style={{
                          width: `${(ch.messagesToday / maxVolume) * 100}%`,
                          background: meta.color,
                          opacity: ch.status === "connected" ? 1 : 0.35,
                        }}
                      />
                    </div>
                    <span className="w-10 text-right font-mono text-[11px] tabular-nums text-muted">
                      {ch.messagesToday}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="mt-5 flex items-center justify-between border-t border-ink-700 pt-3">
              <span className="label-mono">入站趋势 · 12h</span>
              <div className="flex items-end gap-[3px]">
                {inboundSeries.map((v, i) => (
                  <span
                    key={i}
                    className="w-[5px] bg-oxide/70"
                    style={{ height: `${(v / 68) * 26}px`, opacity: 0.35 + i / 24 }}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="panel p-5 lg:col-span-5">
            <SectionHeading index="02" title="线索类别" meta={`${leads.length} 件`} />
            <div className="mt-5 space-y-4">
              {categoryCounts.map(({ cat, count }) => (
                <div key={cat}>
                  <div className="flex items-center justify-between text-[12px]">
                    <span className="text-bone/90">{cat}</span>
                    <span className="font-mono text-[11px] tabular-nums text-muted">{count}</span>
                  </div>
                  <div className="mt-1.5 h-[3px] w-full bg-ink-800">
                    <div
                      className="h-full bg-cobalt/80"
                      style={{ width: `${(count / maxCat) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-5 border-t border-ink-700 pt-3">
              <Link href="/leads" className="flex items-center justify-between text-[11px] text-muted transition-colors hover:text-bone">
                <span>查看全部线索与证据</span>
                <ArrowUpRight size={12} />
              </Link>
            </div>
          </div>
        </section>

        {/* risk queue + audit */}
        <section className="stagger mt-9 grid gap-4 lg:grid-cols-12">
          <div className="panel lg:col-span-7">
            <div className="p-5 pb-2">
              <SectionHeading index="03" title="优先处理队列" meta="按风险排序" />
            </div>
            <div className="px-2 pb-2">
              {flagged.length === 0 && (
                <div className="px-3 py-8 text-center text-[12px] text-muted">当前没有高风险会话</div>
              )}
              {flagged.map((c) => {
                const ch = channels.find((x) => x.id === c.channelId);
                const tone = conversationStatusMeta[c.status];
                return (
                  <Link
                    key={c.id}
                    href={`/inbox?c=${c.id}`}
                    className="row-hover flex items-start gap-3 border-b border-ink-700/60 px-3 py-3.5 last:border-b-0"
                  >
                    <Avatar name={c.contactName} size={34} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-[13px] text-bone">{c.contactName}</span>
                        {ch && <ChannelGlyph type={ch.type} size={15} />}
                        <Pill tone={tone.tone}>{tone.label}</Pill>
                      </div>
                      <div className="mt-1 truncate text-[11.5px] text-muted">{c.summary}</div>
                      <div className="mt-1.5 flex items-center gap-3 font-mono text-[10px] text-muted/70">
                        <span>{c.region}</span>
                        <span>{formatWhen(c.lastAt)}</span>
                      </div>
                    </div>
                    <div className="shrink-0 pt-1">
                      <RiskMeter score={c.riskScore} />
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="panel lg:col-span-5">
            <div className="p-5 pb-2">
              <SectionHeading index="04" title="最近留痕" meta="审计日志" />
            </div>
            <div className="max-h-[396px] overflow-auto px-5 pb-4">
              {audit.slice(0, 7).map((a) => (
                <div key={a.id} className="flex gap-3 border-b border-ink-700/50 py-3 last:border-b-0">
                  <div className="w-12 shrink-0 font-mono text-[10px] tabular-nums text-muted/70">
                    {formatTime(a.at)}
                  </div>
                  <div className="min-w-0">
                    <div className="text-[12px] text-bone/90">
                      {a.actor} · <span className="text-sage">{a.action}</span>
                    </div>
                    <div className="mt-0.5 truncate text-[11px] text-muted">{a.detail}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t border-ink-700 px-5 py-3">
              <Link href="/audit" className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-muted hover:text-bone">
                完整审计 <ArrowUpRight size={11} />
              </Link>
            </div>
          </div>
        </section>

        {/* help channels */}
        <section className="stagger mt-9">
          <SectionHeading index="05" title="求助与转介渠道" meta="仅展示官方与公益渠道" />
          <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {helpChannels.map((h) => (
              <div key={h.id} className="panel-quiet p-4">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[12.5px] leading-snug text-bone">{h.name}</span>
                  <Pill tone="sage">{h.region}</Pill>
                </div>
                <div className="mt-2 font-mono text-[11px] text-cobalt">{h.contact}</div>
                <div className="mt-1.5 flex items-center gap-1.5 text-[10.5px] text-muted">
                  <Clock3 size={11} /> {h.hours}
                </div>
                <div className="mt-1 text-[10.5px] text-muted/70">{h.note}</div>
              </div>
            ))}
          </div>
        </section>

        <footer className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-ink-700 pt-4 pb-2">
          <span className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-muted/60">
            SEA DESK · 本地演示数据 · 未连接任何外部平台
          </span>
          <span className={clsx("flex items-center gap-1.5 font-mono text-[9.5px] uppercase tracking-[0.16em] text-muted/60")}>
            <ShieldAlert size={11} /> 操作可追溯 · 无隐蔽能力
          </span>
        </footer>
      </div>
    </div>
  );
}
