"use client";

import clsx from "clsx";
import { AlertTriangle, Check, Link2, PauseCircle, PlayCircle, ShieldCheck } from "lucide-react";
import { toggleChannel, useWorkspace } from "@/lib/store";
import { ChannelGlyph, Pill, SectionHeading } from "@/components/ui";
import { channelMeta, formatWhen } from "@/lib/format";

export default function ChannelsPage() {
  const { channels, agents } = useWorkspace();
  const live = channels.filter((c) => c.status === "connected").length;

  return (
    <div className="mx-auto max-w-[1240px] px-8 py-9">
      <div className="stagger">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-ink-700 pb-6">
          <div>
            <div className="label-mono">05 / CHANNELS</div>
            <h1 className="mt-2 font-display text-[34px] leading-none tracking-[-0.02em]">渠道账号</h1>
            <p className="mt-2 max-w-xl text-[12px] leading-relaxed text-muted">
              只接入你自有或已获书面授权的账号。平台需具备官方 API 与合规条款；本演示全部使用本地 mock 适配器。
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Pill tone="sage">
              <ShieldCheck size={10} /> {live} / {channels.length} 在线
            </Pill>
            <Pill tone="muted">0 个真实平台接入</Pill>
          </div>
        </div>
      </div>

      {/* compliance banner */}
      <div className="mt-5 flex items-start gap-3 border border-oxide/30 bg-oxide-soft px-4 py-3">
        <AlertTriangle size={15} className="mt-0.5 shrink-0 text-oxide" />
        <div className="text-[11.5px] leading-relaxed text-bone/85">
          <span className="text-oxide">接入边界：</span>
          需要官方 API 凭据、账号所有权证明与平台条款允许的用途。禁止接入他人账号、代管账号池、云端多开设备或任何规避平台风控的方案。
        </div>
      </div>

      <section className="stagger mt-6 grid gap-4 md:grid-cols-2">
        {channels.map((ch) => {
          const meta = channelMeta[ch.type];
          const isLive = ch.status === "connected";
          return (
            <div key={ch.id} className="panel p-5">
              <div className="flex items-start gap-3">
                <ChannelGlyph type={ch.type} size={36} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate text-[14px] text-bone">{ch.name}</h3>
                    <Pill tone={isLive ? "sage" : ch.status === "needs_auth" ? "oxide" : "muted"}>
                      {isLive ? "已连接" : ch.status === "needs_auth" ? "需授权" : "已暂停"}
                    </Pill>
                  </div>
                  <div className="mt-0.5 font-mono text-[10.5px] text-muted">{ch.handle}</div>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2.5">
                {[
                  ["负责人", ch.owner],
                  ["覆盖地区", ch.region],
                  ["今日入站", `${ch.messagesToday} 条`],
                  ["最近同步", formatWhen(ch.lastSync)],
                ].map(([k, v]) => (
                  <div key={k}>
                    <div className="label-mono">{k}</div>
                    <div className="mt-0.5 text-[11.5px] text-bone/85">{v}</div>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-ink-700 pt-3">
                <span className="flex items-center gap-1.5 font-mono text-[9.5px] uppercase tracking-[0.12em] text-muted/70">
                  <Link2 size={10} /> 适配器 mock · {meta.short}
                </span>
                {ch.status === "needs_auth" ? (
                  <button className="btn-ghost px-2 py-1 font-mono text-[10px] uppercase tracking-[0.12em]">
                    重新授权
                  </button>
                ) : (
                  <button
                    onClick={() => toggleChannel(ch.id)}
                    className={clsx(
                      "btn px-2 py-1 font-mono text-[10px] uppercase tracking-[0.12em]",
                      isLive
                        ? "border border-ink-700 text-muted hover:text-bone"
                        : "border border-sage/40 text-sage"
                    )}
                  >
                    {isLive ? <PauseCircle size={11} /> : <PlayCircle size={11} />}
                    {isLive ? "暂停" : "恢复"}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </section>

      <section className="stagger mt-9 grid gap-4 lg:grid-cols-12">
        <div className="panel p-5 lg:col-span-7">
          <SectionHeading index="A" title="接入前检查清单" meta="必须全部满足" />
          <ul className="mt-4 space-y-2.5">
            {[
              "账号归本人或本机构所有，可提供授权证明",
              "使用平台官方 API（Bot API / Cloud API / Messaging API）",
              "用途符合平台条款与当地法律，不涉及招工中介或跨境输运",
              "出站频率低于平台限流阈值，模板已审校",
              "数据留存期限与删除机制明确，可响应删除请求",
            ].map((t) => (
              <li key={t} className="flex items-start gap-2.5 text-[12px] leading-relaxed text-bone/85">
                <Check size={13} className="mt-0.5 shrink-0 text-sage" />
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="panel p-5 lg:col-span-5">
          <SectionHeading index="B" title="团队成员" meta={`${agents.length} 人`} />
          <div className="mt-4 space-y-2.5">
            {agents.map((a) => (
              <div key={a.id} className="flex items-center gap-3 border-b border-ink-700/50 pb-2.5 last:border-b-0 last:pb-0">
                <span
                  className={clsx(
                    "h-1.5 w-1.5 shrink-0 rounded-full",
                    a.status === "online" ? "bg-sage" : "bg-ink-700"
                  )}
                />
                <div className="min-w-0 flex-1">
                  <div className="text-[12px] text-bone/90">{a.name}</div>
                  <div className="truncate font-mono text-[9.5px] text-muted/70">{a.scope}</div>
                </div>
                <Pill tone={a.role === "管理员" ? "oxide" : a.role === "只读" ? "muted" : "cobalt"}>
                  {a.role}
                </Pill>
                <span className="w-10 text-right font-mono text-[10px] tabular-nums text-muted/70">
                  {a.load} 单
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
