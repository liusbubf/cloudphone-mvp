"use client";

import { useMemo, useState } from "react";
import clsx from "clsx";
import { CheckCircle2, Clock4, Lock, Search, Send, UserRound } from "lucide-react";
import {
  addTicketReply,
  assignTicket,
  setTicketStatus,
  useWorkspace,
} from "@/lib/store";
import { ChannelGlyph, EmptyState, Pill } from "@/components/ui";
import { channelMeta, formatWhen, ticketStatusMeta } from "@/lib/format";
import type { TicketStatus } from "@/lib/types";

const statusFilters: (TicketStatus | "all")[] = ["all", "open", "waiting", "resolved"];

export default function TicketsPage() {
  const { tickets, agents } = useWorkspace();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<TicketStatus | "all">("all");
  const [selectedId, setSelectedId] = useState<string | null>(tickets[0]?.id ?? null);
  const [draft, setDraft] = useState("");
  const [internal, setInternal] = useState(false);

  const filtered = useMemo(
    () =>
      tickets
        .filter((t) => (statusFilter === "all" ? true : t.status === statusFilter))
        .filter((t) => {
          if (!query.trim()) return true;
          const q = query.trim().toLowerCase();
          return (
            t.ref.toLowerCase().includes(q) ||
            t.subject.toLowerCase().includes(q) ||
            t.requester.toLowerCase().includes(q)
          );
        }),
    [tickets, statusFilter, query]
  );

  const selected = tickets.find((t) => t.id === selectedId) ?? filtered[0] ?? null;

  const counts = {
    open: tickets.filter((t) => t.status === "open").length,
    waiting: tickets.filter((t) => t.status === "waiting").length,
    resolved: tickets.filter((t) => t.status === "resolved").length,
  };

  const submit = () => {
    if (!selected || !draft.trim()) return;
    addTicketReply(selected.id, draft, internal);
    setDraft("");
  };

  return (
    <div className="flex h-screen flex-col">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-ink-700 px-8 py-6">
        <div>
          <div className="label-mono">04 / SERVICE DESK</div>
          <h1 className="mt-2 font-display text-[34px] leading-none tracking-[-0.02em]">服务工单</h1>
          <p className="mt-2 text-[12px] text-muted">
            团队内部工单与外部咨询的分流 · 内部备注不对访客可见 · 全程留痕
          </p>
        </div>
        <div className="flex items-center gap-3">
          {(["open", "waiting", "resolved"] as TicketStatus[]).map((s) => (
            <div key={s} className="flex items-center gap-1.5">
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{
                  background:
                    s === "open" ? "var(--cobalt)" : s === "waiting" ? "var(--oxide)" : "var(--sage)",
                }}
              />
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
                {ticketStatusMeta[s].label} {counts[s]}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        {/* list */}
        <div className="w-[420px] shrink-0 overflow-y-auto border-r border-ink-700">
          <div className="flex items-center gap-2 px-3 py-3">
            <div className="flex flex-1 items-center gap-1.5 rounded-[3px] border border-ink-700 bg-ink-850 px-2.5 py-1.5">
              <Search size={12} className="text-muted" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="搜索工单"
                className="w-full bg-transparent text-[12px] text-bone placeholder:text-muted/60 outline-none"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as TicketStatus | "all")}
              className="rounded-[3px] border border-ink-700 bg-ink-850 px-2 py-1.5 font-mono text-[10px] uppercase tracking-[0.1em] text-muted outline-none"
            >
              {statusFilters.map((s) => (
                <option key={s} value={s}>
                  {s === "all" ? "全部" : ticketStatusMeta[s].label}
                </option>
              ))}
            </select>
          </div>

          {filtered.length === 0 && <EmptyState title="没有匹配工单" />}
          {filtered.map((t) => {
            const meta = ticketStatusMeta[t.status];
            const active = selected?.id === t.id;
            const overdue = t.status !== "resolved" && new Date(t.slaDue) < new Date("2026-11-04T15:00:00+08:00");
            return (
              <button
                key={t.id}
                onClick={() => setSelectedId(t.id)}
                className={clsx(
                  "relative block w-full border-b border-ink-700/60 px-4 py-3 text-left transition-colors",
                  active ? "bg-ink-850" : "hover:bg-ink-850/60"
                )}
              >
                {active && <span className="absolute inset-y-0 left-0 w-[2px] bg-oxide" />}
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] text-muted/70">{t.ref}</span>
                  <ChannelGlyph type={t.channel} size={14} />
                  <Pill tone={meta.tone} className="ml-auto">
                    {meta.label}
                  </Pill>
                </div>
                <div className="mt-1.5 line-clamp-2 text-[12.5px] leading-snug text-bone">{t.subject}</div>
                <div className="mt-2 flex items-center gap-3 font-mono text-[9.5px] text-muted/65">
                  <span className="flex items-center gap-1">
                    <UserRound size={9} /> {t.assignee}
                  </span>
                  <span className={clsx("flex items-center gap-1", overdue && "text-oxide")}>
                    <Clock4 size={9} /> SLA {formatWhen(t.slaDue)}
                  </span>
                  <span className="ml-auto">{t.priority}优先级</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* detail */}
        {selected ? (
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="border-b border-ink-700 px-6 py-4">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] text-muted/70">{selected.ref}</span>
                <Pill tone={ticketStatusMeta[selected.status].tone}>
                  {ticketStatusMeta[selected.status].label}
                </Pill>
                <Pill tone={selected.priority === "高" ? "oxide" : "muted"}>{selected.priority}优先级</Pill>
              </div>
              <h2 className="mt-2 font-display text-[24px] leading-tight">{selected.subject}</h2>
              <div className="mt-3 grid grid-cols-4 gap-3">
                {[
                  ["提交人", selected.requester],
                  ["渠道", channelMeta[selected.channel].label],
                  ["受理人", selected.assignee],
                  ["SLA 截止", formatWhen(selected.slaDue)],
                ].map(([k, v]) => (
                  <div key={k}>
                    <div className="label-mono">{k}</div>
                    <div className="mt-0.5 truncate text-[11.5px] text-bone/85">{v}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
              <div className="mx-auto max-w-[760px] space-y-3">
                {selected.replies.map((r) => (
                  <div
                    key={r.id}
                    className={clsx(
                      "border px-4 py-3",
                      r.internal
                        ? "border-sage/25 bg-sage-soft"
                        : "border-ink-700 bg-ink-850/50"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[12px] text-bone/90">{r.author}</span>
                      {r.internal && (
                        <Pill tone="sage">
                          <Lock size={9} /> 内部
                        </Pill>
                      )}
                      <span className="ml-auto font-mono text-[10px] text-muted/60">
                        {formatWhen(r.at)}
                      </span>
                    </div>
                    <p className="mt-1.5 text-[12.5px] leading-relaxed text-bone/85">{r.body}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-ink-700 bg-ink-900/60 px-6 py-3">
              <div className="mx-auto max-w-[760px]">
                <div className="mb-2 flex items-center gap-3">
                  <label className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.1em] text-muted">
                    <input
                      type="checkbox"
                      checked={internal}
                      onChange={(e) => setInternal(e.target.checked)}
                      className="accent-[var(--sage)]"
                    />
                    内部备注（访客不可见）
                  </label>
                  <div className="ml-auto flex items-center gap-1.5">
                    <select
                      value={selected.status}
                      onChange={(e) => setTicketStatus(selected.id, e.target.value as TicketStatus)}
                      className="rounded-[3px] border border-ink-700 bg-ink-850 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.1em] text-muted outline-none"
                    >
                      {(["open", "waiting", "resolved"] as TicketStatus[]).map((s) => (
                        <option key={s} value={s}>
                          {ticketStatusMeta[s].label}
                        </option>
                      ))}
                    </select>
                    <select
                      value={selected.assignee}
                      onChange={(e) => assignTicket(selected.id, e.target.value)}
                      className="rounded-[3px] border border-ink-700 bg-ink-850 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.1em] text-muted outline-none"
                    >
                      {agents.map((a) => (
                        <option key={a.id} value={a.name}>
                          {a.name}
                        </option>
                      ))}
                      <option value="运维 · 周放">运维 · 周放</option>
                      <option value="内容 · 玛诺">内容 · 玛诺</option>
                    </select>
                  </div>
                </div>
                <div className="flex items-end gap-2">
                  <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    rows={2}
                    placeholder={internal ? "仅团队可见的处理备注…" : "回复提交人…"}
                    className="field min-h-[54px] resize-none leading-relaxed"
                  />
                  <button onClick={submit} disabled={!draft.trim()} className="btn-primary h-[54px] px-4">
                    <Send size={14} /> {internal ? "记备注" : "回复"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-1 items-center justify-center">
            <EmptyState title="选择一个工单" hint="左侧按状态筛选，红色 SLA 表示已超时。" />
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 border-t border-ink-700 px-8 py-2.5">
        <CheckCircle2 size={12} className="text-sage" />
        <span className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-muted/60">
          工单状态变更与内部备注均写入审计日志
        </span>
      </div>
    </div>
  );
}
