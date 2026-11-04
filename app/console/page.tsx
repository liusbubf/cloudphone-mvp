"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import { KeyRound, RefreshCw, ShieldCheck } from "lucide-react";
import { Pill } from "@/components/ui";
import type { RelayStatus } from "@/lib/relay";

type Item = {
  ref: string;
  status: RelayStatus;
  category: string;
  region: string;
  priority: "P0" | "P1";
  summary: string;
  createdAt: string;
  updatedAt: string;
  notifiedAt: string | null;
  family: {
    name?: string;
    contact?: string;
    channel?: string;
    verify?: string;
    status?: string;
    place?: string;
  } | null;
  next: RelayStatus[];
};

const labels: Record<RelayStatus, string> = {
  received: "已受理",
  reviewing: "跟进中",
  referred: "已转介",
  closed: "已结案",
};

const tones: Record<RelayStatus, "cobalt" | "oxide" | "sage" | "muted"> = {
  received: "cobalt",
  reviewing: "oxide",
  referred: "sage",
  closed: "muted",
};

const actionLabels: Record<RelayStatus, string> = {
  received: "退回受理",
  reviewing: "开始跟进",
  referred: "转介机构",
  closed: "结案",
};

const filters: (RelayStatus | "all")[] = ["all", "received", "reviewing", "referred", "closed"];

export default function ConsolePage() {
  const [token, setToken] = useState("");
  const [authed, setAuthed] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [filter, setFilter] = useState<RelayStatus | "all">("all");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [busyRef, setBusyRef] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ ref: string; ok: boolean; text: string } | null>(null);

  const fmt = (iso: string) => new Date(iso).toISOString().slice(0, 16).replace("T", " ");

  const load = async (t: string, status: RelayStatus | "all" = "all") => {
    setLoading(true);
    setError(null);
    try {
      const qs = status === "all" ? "" : `&status=${status}`;
      const res = await fetch(`/api/relay/admin?limit=60${qs}`, {
        headers: { Authorization: `Bearer ${t}` },
      });
      if (res.ok) {
        const data = (await res.json()) as { items: Item[] };
        setItems(data.items);
        setAuthed(true);
        sessionStorage.setItem("sea-console-token", t);
      } else if (res.status === 401) {
        setAuthed(false);
        setError("凭证无效，请重新输入。");
        sessionStorage.removeItem("sea-console-token");
      } else if (res.status === 503) {
        setError("服务端未配置 RELAY_CONSOLE_TOKEN，接口已拒绝所有请求。");
      } else if (res.status === 429) {
        setError("请求过于频繁，请稍后再试。");
      } else {
        setError("读取失败，请检查服务端日志。");
      }
    } catch {
      setError("无法连接服务端。");
    }
    setLoading(false);
  };

  useEffect(() => {
    const saved = sessionStorage.getItem("sea-console-token");
    if (saved) {
      setToken(saved);
      void load(saved);
    }
  }, []);

  const change = async (ref: string, status: RelayStatus) => {
    setBusyRef(ref);
    try {
      const res = await fetch("/api/relay/admin", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ref, status, actor: "接线员" }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(
          data.error === "invalid_transition"
            ? "该状态不允许这样流转。"
            : data.error === "not_found"
              ? "编号不存在。"
              : "更新失败。"
        );
      } else {
        await load(token, filter);
      }
    } catch {
      setError("无法连接服务端。");
    }
    setBusyRef(null);
  };

  const notifyToFamily = async (ref: string) => {
    setBusyRef(ref);
    setNotice(null);
    try {
      const res = await fetch("/api/relay/notify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ref }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        to?: string;
        queued?: boolean;
        provider?: string;
      };
      if (res.ok) {
        setNotice({
          ref,
          ok: true,
          text: data.queued
            ? "未配置短信通道，已进入待发送队列（可在 outbox 中人工发送）"
            : `已发送至 ${data.to ?? "家属"}（${data.provider ?? "sms"}）`,
        });
        await load(token, filter);
      } else {
        const map: Record<string, string> = {
          no_family_contact: "该求助没有填写家属联系方式",
          already_notified: "已经通知过，不能重复发送",
          not_found: "编号不存在",
        };
        setNotice({ ref, ok: false, text: map[data.error ?? ""] ?? "发送失败，请检查服务端日志" });
      }
    } catch {
      setNotice({ ref, ok: false, text: "无法连接服务端" });
    }
    setBusyRef(null);
  };

  return (
    <div className="min-h-screen bg-ink-950 text-bone">
      <div className="mx-auto max-w-[980px] px-6 py-10">
        <header className="flex flex-wrap items-end justify-between gap-4 border-b border-ink-700 pb-5">
          <div>
            <div className="label-mono">RELAY CONSOLE · 机构后台</div>
            <h1 className="mt-2 font-display text-[32px] leading-none tracking-[-0.02em]">求助受理台</h1>
            <p className="mt-2 text-[12px] text-muted">
              仅持有令牌的接应人员可访问。所有状态变更写入审计文件，不可撤销。
            </p>
          </div>
          {authed && (
            <button onClick={() => load(token, filter)} className="btn-ghost">
              <RefreshCw size={12} className={clsx(loading && "animate-spin")} /> 刷新
            </button>
          )}
        </header>

        {!authed ? (
          <div className="panel mt-8 p-5">
            <div className="flex items-center gap-2">
              <KeyRound size={14} className="text-oxide" />
              <span className="label-mono text-bone">接入凭证</span>
            </div>
            <p className="mt-2 text-[11.5px] leading-relaxed text-muted">
              在服务端设置环境变量 <span className="font-mono text-bone">RELAY_CONSOLE_TOKEN</span>
              ，把同一个值填在这里。凭证只保存在当前标签页，关闭即失效。
            </p>
            <div className="mt-3 flex gap-2">
              <input
                value={token}
                onChange={(e) => setToken(e.target.value)}
                type="password"
                placeholder="粘贴令牌"
                className="field flex-1"
                onKeyDown={(e) => e.key === "Enter" && token && load(token)}
              />
              <button onClick={() => token && load(token)} className="btn-primary">
                验证并进入
              </button>
            </div>
            {error && <div className="mt-3 text-[11px] text-oxide">{error}</div>}
          </div>
        ) : (
          <>
            <div className="mt-5 flex flex-wrap items-center gap-2">
              {filters.map((f) => (
                <button
                  key={f}
                  onClick={() => {
                    setFilter(f);
                    void load(token, f);
                  }}
                  className={clsx(
                    "rounded-[3px] border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.1em] transition-colors",
                    filter === f
                      ? "border-oxide bg-oxide/10 text-bone"
                      : "border-ink-700 text-muted hover:text-bone"
                  )}
                >
                  {f === "all" ? "全部" : labels[f]}
                </button>
              ))}
              <span className="ml-auto font-mono text-[10px] uppercase tracking-[0.14em] text-muted/60">
                {items.length} 条
              </span>
            </div>

            {error && <div className="mt-3 text-[11px] text-oxide">{error}</div>}

            <div className="mt-3 space-y-2">
              {items.length === 0 && (
                <div className="panel px-4 py-8 text-center text-[12px] text-muted">没有符合条件的求助</div>
              )}
              {items.map((it) => (
                <div key={it.ref} className="panel px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[11px] text-muted">{it.ref}</span>
                    <Pill tone={tones[it.status]}>{labels[it.status]}</Pill>
                    <Pill tone={it.priority === "P0" ? "oxide" : "muted"}>{it.priority}</Pill>
                    <span className="text-[12px] text-bone">
                      {it.category} · {it.region}
                    </span>
                    <span className="ml-auto font-mono text-[9.5px] text-muted/60">
                      提交 {new Date(it.createdAt).toISOString().slice(0, 16).replace("T", " ")} · 更新{" "}
                      {new Date(it.updatedAt).toISOString().slice(0, 16).replace("T", " ")}
                    </span>
                  </div>
                  <p className="mt-1.5 text-[11.5px] leading-relaxed text-muted">{it.summary}</p>
                  {it.family?.contact && (
                    <div className="mt-2.5 flex flex-wrap items-center gap-2 border-t border-ink-700/60 pt-2">
                      <span className="label-mono">家属转达</span>
                      <span className="text-[11px] text-bone">
                        {it.family.name || "未署名"} · {it.family.contact}
                      </span>
                      {it.family.verify && (
                        <span className="text-[10.5px] text-muted">核对：{it.family.verify}</span>
                      )}
                      {it.notifiedAt ? (
                        <span className="ml-auto font-mono text-[9.5px] uppercase tracking-[0.1em] text-sage">
                          已通知 {fmt(it.notifiedAt)}
                        </span>
                      ) : (
                        <button
                          onClick={() => notifyToFamily(it.ref)}
                          disabled={busyRef === it.ref}
                          className="btn-ghost ml-auto px-2 py-1 font-mono text-[10px] uppercase tracking-[0.08em]"
                        >
                          {busyRef === it.ref ? "发送中" : "发送家属通知"}
                        </button>
                      )}
                    </div>
                  )}
                  {notice?.ref === it.ref && (
                    <div className={clsx("mt-1.5 text-[10.5px]", notice.ok ? "text-sage" : "text-oxide")}>
                      {notice.text}
                    </div>
                  )}
                  {it.next.length > 0 && (
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {it.next.map((n) => (
                        <button
                          key={n}
                          onClick={() => change(it.ref, n)}
                          disabled={busyRef === it.ref}
                          className="btn-ghost px-2 py-1 font-mono text-[10px] uppercase tracking-[0.08em]"
                        >
                          {busyRef === it.ref ? "处理中" : actionLabels[n]}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-6 flex items-center gap-2 border-t border-ink-700 pt-3">
              <ShieldCheck size={12} className="text-sage" />
              <span className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-muted/60">
                状态流转：已受理 → 跟进中 → 已转介 → 已结案，不可跳回
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
