"use client";

import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { Archive, Search, Send, ShieldAlert, Sparkles } from "lucide-react";
import { useWorkspace, sendMessage, markConversationRead, setConversationStatus } from "@/lib/store";
import { Avatar, ChannelGlyph, EmptyState, Pill, RiskMeter } from "@/components/ui";
import { formatTime } from "@/lib/format";
import type { ConversationStatus } from "@/lib/types";

const filters: { key: "all" | ConversationStatus; label: string }[] = [
  { key: "all", label: "全部" },
  { key: "open", label: "处理中" },
  { key: "pending", label: "待跟进" },
  { key: "flagged", label: "高风险" },
  { key: "closed", label: "已归档" },
];

export default function InboxPage() {
  const { conversations, messages, channels, templates } = useWorkspace();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | ConversationStatus>("all");
  const [draft, setDraft] = useState("");

  useEffect(() => {
    const fromQuery = new URLSearchParams(window.location.search).get("c");
    if (fromQuery) setSelectedId(fromQuery);
  }, []);

  const filtered = useMemo(() => {
    return conversations
      .filter((c) => (filter === "all" ? true : c.status === filter))
      .filter((c) => {
        if (!query.trim()) return true;
        const q = query.trim().toLowerCase();
        return (
          c.contactName.toLowerCase().includes(q) ||
          c.handle.toLowerCase().includes(q) ||
          c.summary.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => (a.lastAt < b.lastAt ? 1 : -1));
  }, [conversations, filter, query]);

  const selected =
    conversations.find((c) => c.id === (selectedId ?? filtered[0]?.id ?? "")) ?? filtered[0] ?? null;
  const thread = selected ? messages.filter((m) => m.conversationId === selected.id) : [];
  const channel = channels.find((c) => c.id === selected?.channelId);

  const pick = (id: string) => {
    setSelectedId(id);
    markConversationRead(id);
  };

  const submit = () => {
    if (!selected || !draft.trim()) return;
    sendMessage(selected.id, draft);
    setDraft("");
  };

  return (
    <div className="flex h-screen flex-col">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-ink-700 px-8 py-6">
        <div>
          <div className="label-mono">02 / UNIFIED INBOX</div>
          <h1 className="mt-2 font-display text-[34px] leading-none tracking-[-0.02em]">统一收件箱</h1>
          <p className="mt-2 text-[12px] text-muted">
            仅接入已授权账号 · 出站消息按模板与留痕规则记录 · 无隐藏窗口
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-[3px] border border-ink-700 bg-ink-850 px-2.5 py-1.5">
            <Search size={13} className="text-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜索联系人或摘要"
              className="w-52 bg-transparent text-[12px] text-bone placeholder:text-muted/60 outline-none"
            />
          </div>
          <div className="flex overflow-hidden rounded-[3px] border border-ink-700">
            {filters.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={clsx(
                  "px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.1em] transition-colors",
                  filter === f.key ? "bg-oxide-soft text-oxide" : "text-muted hover:bg-ink-850 hover:text-bone"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        {/* conversation list */}
        <div className="w-[336px] shrink-0 overflow-y-auto border-r border-ink-700">
          {filtered.length === 0 && <EmptyState title="没有匹配会话" />}
          {filtered.map((c) => {
            const ch = channels.find((x) => x.id === c.channelId);
            const active = selected?.id === c.id;
            return (
              <button
                key={c.id}
                onClick={() => pick(c.id)}
                className={clsx(
                  "relative flex w-full items-start gap-3 border-b border-ink-700/60 px-4 py-3 text-left transition-colors",
                  active ? "bg-ink-850" : "hover:bg-ink-850/60"
                )}
              >
                {active && <span className="absolute inset-y-0 left-0 w-[2px] bg-oxide" />}
                <Avatar name={c.contactName} size={36} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate text-[13px] text-bone">{c.contactName}</span>
                    {ch && <ChannelGlyph type={ch.type} size={14} />}
                    <span className="ml-auto shrink-0 font-mono text-[10px] text-muted/70">
                      {formatTime(c.lastAt)}
                    </span>
                  </div>
                  <div className="mt-1 truncate text-[11.5px] text-muted">{c.summary}</div>
                  <div className="mt-1.5 flex items-center gap-1.5">
                    {c.tags.slice(0, 2).map((t) => (
                      <span
                        key={t}
                        className="rounded-[2px] border border-ink-700 px-1.5 py-0.5 font-mono text-[9px] text-muted"
                      >
                        {t}
                      </span>
                    ))}
                    {c.unread > 0 && (
                      <span className="ml-auto rounded-full bg-oxide px-1.5 py-0.5 font-mono text-[9px] text-ink-950">
                        {c.unread}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* thread */}
        {!selected ? (
          <div className="flex flex-1 items-center justify-center">
            <EmptyState title="选择一个会话" hint="左侧列表按最近活跃时间排序，未读消息会标记数量。" />
          </div>
        ) : (
          <div className="flex min-w-0 flex-1 flex-col">
            {/* thread header */}
            <div className="flex flex-wrap items-center gap-3 border-b border-ink-700 px-5 py-3">
              <Avatar name={selected.contactName} size={38} />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[14px] text-bone">{selected.contactName}</span>
                  {channel && <ChannelGlyph type={channel.type} size={15} />}
                  <span className="font-mono text-[10px] text-muted">{selected.handle}</span>
                </div>
                <div className="mt-0.5 font-mono text-[10px] text-muted/70">
                  {selected.region} · 负责人 {selected.assignedTo}
                </div>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <RiskMeter score={selected.riskScore} />
                <button
                  onClick={() =>
                    setConversationStatus(
                      selected.id,
                      selected.status === "flagged" ? "open" : "flagged"
                    )
                  }
                  className={clsx(
                    "btn px-2 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em]",
                    selected.status === "flagged"
                      ? "bg-oxide-soft text-oxide"
                      : "border border-ink-700 text-muted hover:text-bone"
                  )}
                >
                  <ShieldAlert size={12} /> 高风险
                </button>
                <button
                  onClick={() => setConversationStatus(selected.id, "closed")}
                  className="btn px-2 py-1.5 border border-ink-700 font-mono text-[10px] uppercase tracking-[0.12em] text-muted hover:text-bone"
                >
                  <Archive size={12} /> 归档
                </button>
              </div>
            </div>

            {/* messages */}
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
              <div className="mx-auto max-w-[720px] space-y-4">
                {thread.map((m) => (
                  <div
                    key={m.id}
                    className={clsx("flex gap-2.5", m.direction === "out" ? "flex-row-reverse" : "")}
                  >
                    {m.direction === "in" ? (
                      <Avatar name={selected.contactName} size={28} />
                    ) : (
                      <Avatar name={m.author} size={28} />
                    )}
                    <div className={clsx("max-w-[78%]", m.direction === "out" ? "items-end" : "")}>
                      <div
                        className={clsx(
                          "flex items-center gap-2 font-mono text-[9.5px] uppercase tracking-[0.1em] text-muted/70",
                          m.direction === "out" ? "justify-end" : ""
                        )}
                      >
                        <span>{m.author}</span>
                        <span>{formatTime(m.at)}</span>
                      </div>
                      <div
                        className={clsx(
                          "mt-1 border px-3.5 py-2.5 text-[13px] leading-relaxed",
                          m.direction === "out"
                            ? "border-oxide/30 bg-oxide-soft text-bone/95"
                            : "border-ink-700 bg-ink-850 text-bone/90"
                        )}
                      >
                        {m.body}
                      </div>
                    </div>
                  </div>
                ))}
                {thread.length === 0 && <EmptyState title="暂无消息" />}
              </div>
            </div>

            {/* composer */}
            <div className="border-t border-ink-700 bg-ink-900/60 px-5 py-3">
              <div className="mx-auto max-w-[720px]">
                <div className="mb-2 flex items-center gap-2">
                  <label className="flex items-center gap-1.5">
                    <Sparkles size={11} className="text-muted" />
                    <select
                      className="bg-transparent font-mono text-[10px] uppercase tracking-[0.1em] text-muted outline-none"
                      defaultValue=""
                      onChange={(e) => {
                        const tpl = templates.find((t) => t.id === e.target.value);
                        if (tpl) setDraft(tpl.body);
                      }}
                    >
                      <option value="" disabled>
                        套用模板
                      </option>
                      {templates.map((t) => (
                        <option key={t.id} value={t.id} className="bg-ink-900">
                          {t.name} · {t.lang}
                        </option>
                      ))}
                    </select>
                  </label>
                  <span className="font-mono text-[9.5px] text-muted/50">
                    出站记录将写入审计日志
                  </span>
                </div>
                <div className="flex items-end gap-2">
                  <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                        e.preventDefault();
                        submit();
                      }
                    }}
                    rows={2}
                    placeholder="输入回复…（Ctrl/⌘ + Enter 发送）"
                    className="field min-h-[54px] resize-none leading-relaxed"
                  />
                  <button onClick={submit} disabled={!draft.trim()} className="btn-primary h-[54px] px-4">
                    <Send size={14} /> 发送
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
