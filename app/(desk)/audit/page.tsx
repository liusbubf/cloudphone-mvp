"use client";

import { useMemo, useState } from "react";
import clsx from "clsx";
import { Download, Eye, EyeOff, ScrollText, ShieldCheck, Trash2 } from "lucide-react";
import { resetWorkspace, updateSettings, useWorkspace } from "@/lib/store";
import { Pill, SectionHeading } from "@/components/ui";
import { formatWhen } from "@/lib/format";

export default function AuditPage() {
  const { audit, settings, leads } = useWorkspace();
  const [query, setQuery] = useState("");
  const [actor, setActor] = useState("all");
  const [saved, setSaved] = useState(false);

  const actors = useMemo(() => Array.from(new Set(audit.map((a) => a.actor))), [audit]);

  const filtered = audit.filter((a) => {
    if (actor !== "all" && a.actor !== actor) return false;
    if (!query.trim()) return true;
    const q = query.trim().toLowerCase();
    return (
      a.action.toLowerCase().includes(q) ||
      a.target.toLowerCase().includes(q) ||
      a.detail.toLowerCase().includes(q)
    );
  });

  const exportCsv = () => {
    const rows = [
      ["时间", "操作人", "动作", "对象", "详情", "IP"],
      ...filtered.map((a) => [a.at, a.actor, a.action, a.target, a.detail, a.ip]),
    ];
    const csv = rows
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `audit-2026-11-04.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const saveSettings = () => {
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1600);
  };

  return (
    <div className="mx-auto max-w-[1240px] px-8 py-9">
      <div className="stagger">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-ink-700 pb-6">
          <div>
            <div className="label-mono">06 / AUDIT &amp; COMPLIANCE</div>
            <h1 className="mt-2 font-display text-[34px] leading-none tracking-[-0.02em]">审计与合规</h1>
            <p className="mt-2 max-w-xl text-[12px] leading-relaxed text-muted">
              所有查看、发送、转介与状态变更都会写入不可裁剪的操作日志；导出前可脱敏。
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Pill tone="sage">
              <ShieldCheck size={10} /> 日志完整
            </Pill>
            <button onClick={exportCsv} className="btn-ghost">
              <Download size={13} /> 导出 CSV
            </button>
          </div>
        </div>
      </div>

      {/* boundary statement */}
      <div className="stagger mt-5 grid gap-4 lg:grid-cols-12">
        <div className="panel p-5 lg:col-span-4">
          <SectionHeading index="A" title="系统边界" meta="设计约束" />
          <div className="mt-4 space-y-2.5">
            {[
              { k: "界面可见性", v: "始终可见，不提供老板键或全局隐藏" },
              { k: "进程与窗口", v: "不做伪装、不隐藏托盘或服务" },
              { k: "数据来源", v: "仅本人/本机构授权账号" },
              { k: "外发能力", v: "限速 + 模板审校 + 逐条留痕" },
            ].map((x) => (
              <div key={x.k} className="flex items-start justify-between gap-3 border-b border-ink-700/50 pb-2.5 last:border-b-0 last:pb-0">
                <span className="label-mono shrink-0">{x.k}</span>
                <span className="text-right text-[11.5px] leading-snug text-bone/85">{x.v}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="panel p-5 lg:col-span-4">
          <SectionHeading index="B" title="数据策略" meta="本地演示" />
          <div className="mt-4 space-y-3">
            <label className="block">
              <span className="label-mono">留存期限（天）</span>
              <select
                value={settings.dataRetentionDays}
                onChange={(e) => updateSettings({ dataRetentionDays: Number(e.target.value) })}
                className="field mt-1 py-1.5 text-[12px]"
              >
                {[30, 60, 90, 180, 365].map((d) => (
                  <option key={d} value={d}>
                    {d} 天
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="label-mono">出站限速（条/分钟）</span>
              <input
                type="number"
                min={5}
                max={60}
                value={settings.outboundRateLimit}
                onChange={(e) => updateSettings({ outboundRateLimit: Number(e.target.value) })}
                className="field mt-1 py-1.5 text-[12px]"
              />
            </label>
            <div className="flex items-center justify-between border-t border-ink-700 pt-3">
              <span className="text-[11.5px] text-bone/85">转介前必须留存书面同意</span>
              <button
                onClick={() => updateSettings({ requireConsent: !settings.requireConsent })}
                className={clsx(
                  "relative h-5 w-9 rounded-full border transition-colors",
                  settings.requireConsent ? "border-sage/50 bg-sage-soft" : "border-ink-700 bg-ink-800"
                )}
                aria-label="切换同意书要求"
              >
                <span
                  className={clsx(
                    "absolute top-0.5 h-3.5 w-3.5 rounded-full transition-all",
                    settings.requireConsent ? "left-[18px] bg-sage" : "left-0.5 bg-muted"
                  )}
                />
              </button>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-[11.5px] text-bone/85">
                {settings.maskPii ? <EyeOff size={12} className="text-sage" /> : <Eye size={12} className="text-muted" />}
                导出时脱敏个人信息
              </span>
              <button
                onClick={() => updateSettings({ maskPii: !settings.maskPii })}
                className={clsx(
                  "relative h-5 w-9 rounded-full border transition-colors",
                  settings.maskPii ? "border-sage/50 bg-sage-soft" : "border-ink-700 bg-ink-800"
                )}
                aria-label="切换脱敏"
              >
                <span
                  className={clsx(
                    "absolute top-0.5 h-3.5 w-3.5 rounded-full transition-all",
                    settings.maskPii ? "left-[18px] bg-sage" : "left-0.5 bg-muted"
                  )}
                />
              </button>
            </div>
            <div className="flex items-center justify-between border-t border-ink-700 pt-3">
              <button onClick={saveSettings} className={clsx("btn-ghost px-2 py-1 text-[11px]", saved && "border-sage/50 text-sage")}>
                {saved ? "已保存" : "保存策略"}
              </button>
              <button
                onClick={() => {
                  if (window.confirm("将清空本地演示数据并恢复初始状态，确定？")) resetWorkspace();
                }}
                className="btn-quiet px-1.5 py-1 font-mono text-[9.5px] uppercase tracking-[0.12em]"
              >
                <Trash2 size={10} /> 重置演示
              </button>
            </div>
          </div>
        </div>

        <div className="panel p-5 lg:col-span-4">
          <SectionHeading index="C" title="合规概览" meta="实时" />
          <div className="mt-4 space-y-4">
            {[
              { k: "日志条目", v: audit.length, unit: "条" },
              { k: "线索总数", v: leads.length, unit: "件" },
              { k: "缺同意书线索", v: leads.filter((l) => !l.consentOnFile).length, unit: "件", accent: true },
            ].map((s) => (
              <div key={s.k} className="flex items-baseline justify-between">
                <span className="label-mono">{s.k}</span>
                <span
                  className="font-display text-[22px] leading-none tabular-nums"
                  style={s.accent ? { color: "var(--oxide)" } : undefined}
                >
                  {s.v}
                  <span className="ml-1 font-mono text-[9px] text-muted">{s.unit}</span>
                </span>
              </div>
            ))}
            <div className="border-t border-ink-700 pt-3 text-[10.5px] leading-relaxed text-muted">
              缺同意书的线索仅限内部取证，不会被转介至任何外部机构。
            </div>
          </div>
        </div>
      </div>

      {/* log */}
      <section className="stagger mt-9">
        <SectionHeading
          index="D"
          title="操作日志"
          meta={`${filtered.length} / ${audit.length}`}
          action={
            <div className="flex items-center gap-2">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="搜索动作 / 对象 / 详情"
                className="w-56 rounded-[3px] border border-ink-700 bg-ink-850 px-2.5 py-1.5 text-[11.5px] text-bone placeholder:text-muted/60 outline-none"
              />
              <select
                value={actor}
                onChange={(e) => setActor(e.target.value)}
                className="rounded-[3px] border border-ink-700 bg-ink-850 px-2 py-1.5 font-mono text-[10px] uppercase tracking-[0.1em] text-muted outline-none"
              >
                <option value="all">全部操作人</option>
                {actors.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>
          }
        />

        <div className="mt-4 overflow-hidden border border-ink-700">
          <div className="grid grid-cols-[120px_110px_120px_130px_1fr_110px] gap-3 border-b border-ink-700 bg-ink-850 px-4 py-2">
            {["时间", "操作人", "动作", "对象", "详情", "IP"].map((h) => (
              <span key={h} className="label-mono">
                {h}
              </span>
            ))}
          </div>
          {filtered.length === 0 && (
            <div className="flex items-center justify-center gap-2 px-4 py-12 text-[12px] text-muted">
              <ScrollText size={14} /> 没有匹配的日志
            </div>
          )}
          {filtered.map((a) => (
            <div
              key={a.id}
              className="row-hover grid grid-cols-[120px_110px_120px_130px_1fr_110px] items-center gap-3 border-b border-ink-700/50 px-4 py-2.5 last:border-b-0"
            >
              <span className="font-mono text-[10.5px] tabular-nums text-muted/80">{formatWhen(a.at)}</span>
              <span className="truncate text-[11.5px] text-bone/90">{a.actor}</span>
              <span className="text-[11px] text-sage">{a.action}</span>
              <span className="truncate font-mono text-[10.5px] text-muted">{a.target}</span>
              <span className="truncate text-[11px] text-muted/80">{a.detail}</span>
              <span className="font-mono text-[10px] text-muted/60">{a.ip}</span>
            </div>
          ))}
        </div>
        <p className="mt-3 font-mono text-[9.5px] uppercase tracking-[0.14em] text-muted/50">
          日志为追加写入，界面不提供删除单条记录的操作
        </p>
      </section>
    </div>
  );
}
