"use client";

import { useMemo, useState } from "react";
import clsx from "clsx";
import {
  FilePlus2,
  Paperclip,
  Plus,
  Search,
  ShieldCheck,
  ShieldOff,
  X,
} from "lucide-react";
import {
  addEvidence,
  addLead,
  assignLead,
  setLeadStatus,
  useWorkspace,
} from "@/lib/store";
import { EmptyState, LeadPriority, Pill, SectionHeading } from "@/components/ui";
import { formatWhen, leadCategories, leadStatusMeta } from "@/lib/format";
import type { Evidence, Lead, LeadCategory, LeadStatus } from "@/lib/types";

const statusOptions: LeadStatus[] = ["new", "triage", "evidence", "referred", "closed"];
const evidenceKinds: Evidence["kind"][] = ["截图", "录音", "文本", "链接"];

export default function LeadsPage() {
  const { leads, agents } = useWorkspace();
  const [selectedId, setSelectedId] = useState<string | null>(leads[0]?.id ?? null);
  const [statusFilter, setStatusFilter] = useState<LeadStatus | "all">("all");
  const [query, setQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [evidenceName, setEvidenceName] = useState("");
  const [evidenceKind, setEvidenceKind] = useState<Evidence["kind"]>("截图");

  const [form, setForm] = useState({
    source: "",
    region: "",
    category: "虚假招聘" as LeadCategory,
    priority: "P1" as Lead["priority"],
    summary: "",
    consent: false,
  });

  const filtered = useMemo(
    () =>
      leads
        .filter((l) => (statusFilter === "all" ? true : l.status === statusFilter))
        .filter((l) => {
          if (!query.trim()) return true;
          const q = query.trim().toLowerCase();
          return (
            l.ref.toLowerCase().includes(q) ||
            l.summary.toLowerCase().includes(q) ||
            l.region.toLowerCase().includes(q) ||
            l.category.includes(q)
          );
        }),
    [leads, statusFilter, query]
  );

  const selected = leads.find((l) => l.id === selectedId) ?? filtered[0] ?? null;

  const stats = {
    total: leads.length,
    p0: leads.filter((l) => l.priority === "P0" && l.status !== "closed").length,
    noConsent: leads.filter((l) => !l.consentOnFile && l.status !== "closed").length,
    evidence: leads.reduce((n, l) => n + l.evidence.length, 0),
  };

  const submitLead = () => {
    if (!form.summary.trim() || !form.source.trim()) return;
    addLead({
      source: form.source,
      region: form.region || "未知",
      category: form.category,
      summary: form.summary,
      priority: form.priority,
      consentOnFile: form.consent,
    });
    setForm({ source: "", region: "", category: "虚假招聘", priority: "P1", summary: "", consent: false });
    setShowForm(false);
  };

  const submitEvidence = () => {
    if (!selected || !evidenceName.trim()) return;
    addEvidence(selected.id, evidenceKind, evidenceName.trim());
    setEvidenceName("");
  };

  return (
    <div className="flex h-screen flex-col">
      {/* header */}
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-ink-700 px-8 py-6">
        <div>
          <div className="label-mono">03 / LEAD INTAKE &amp; REFERRAL</div>
          <h1 className="mt-2 font-display text-[34px] leading-none tracking-[-0.02em]">线索与上报</h1>
          <p className="mt-2 text-[12px] text-muted">
            面向受害者的求助受理与证据留存 · 需书面同意方可转介 · 全流程可追溯
          </p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary">
          <Plus size={14} /> 登记新线索
        </button>
      </div>

      {/* stat strip */}
      <div className="grid grid-cols-2 gap-px border-b border-ink-700 bg-ink-700 md:grid-cols-4">
        {[
          { k: "线索总数", v: stats.total, note: "含已结案" },
          { k: "P0 未结", v: stats.p0, note: "需 1 小时内响应", accent: true },
          { k: "缺同意书", v: stats.noConsent, note: "不得对外转介" },
          { k: "证据条目", v: stats.evidence, note: "含哈希校验" },
        ].map((s) => (
          <div key={s.k} className="bg-ink-900 px-5 py-3.5">
            <div className="label-mono">{s.k}</div>
            <div className="mt-1.5 flex items-baseline gap-2">
              <span
                className="font-display text-[24px] leading-none tabular-nums"
                style={s.accent ? { color: "var(--oxide)" } : undefined}
              >
                {s.v}
              </span>
              <span className="text-[10px] text-muted/70">{s.note}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="flex min-h-0 flex-1">
        {/* table */}
        <div className="min-w-0 flex-1 overflow-y-auto">
          <div className="flex items-center gap-2 px-5 py-3">
            <div className="flex items-center gap-1.5 rounded-[3px] border border-ink-700 bg-ink-850 px-2.5 py-1.5">
              <Search size={12} className="text-muted" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="搜索编号、摘要、地区"
                className="w-48 bg-transparent text-[12px] text-bone placeholder:text-muted/60 outline-none"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as LeadStatus | "all")}
              className="rounded-[3px] border border-ink-700 bg-ink-850 px-2 py-1.5 font-mono text-[10px] uppercase tracking-[0.1em] text-muted outline-none"
            >
              <option value="all">全部状态</option>
              {statusOptions.map((s) => (
                <option key={s} value={s}>
                  {leadStatusMeta[s].label}
                </option>
              ))}
            </select>
            <span className="ml-auto font-mono text-[10px] uppercase tracking-[0.14em] text-muted/60">
              {filtered.length} / {leads.length}
            </span>
          </div>

          <div className="px-2 pb-4">
            {filtered.length === 0 && <EmptyState title="没有匹配线索" />}
            {filtered.map((l) => {
              const meta = leadStatusMeta[l.status];
              const active = selected?.id === l.id;
              return (
                <button
                  key={l.id}
                  onClick={() => setSelectedId(l.id)}
                  className={clsx(
                    "relative flex w-full items-start gap-3 border-b border-ink-700/60 px-3 py-3 text-left transition-colors",
                    active ? "bg-ink-850" : "hover:bg-ink-850/60"
                  )}
                >
                  {active && <span className="absolute inset-y-0 left-0 w-[2px] bg-oxide" />}
                  <div className="w-[74px] shrink-0 pt-0.5">
                    <LeadPriority priority={l.priority} />
                    <div className="mt-1.5 font-mono text-[9.5px] text-muted/60">{l.ref}</div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[12.5px] text-bone">{l.category}</span>
                      <span className="font-mono text-[10px] text-muted">· {l.region}</span>
                      {!l.consentOnFile && (
                        <span className="flex items-center gap-1 font-mono text-[9px] uppercase tracking-[0.1em] text-oxide">
                          <ShieldOff size={10} /> 缺同意书
                        </span>
                      )}
                    </div>
                    <div className="mt-1 line-clamp-1 text-[11.5px] text-muted">{l.summary}</div>
                    <div className="mt-1.5 flex items-center gap-3 font-mono text-[9.5px] text-muted/60">
                      <span>{l.source}</span>
                      <span>{formatWhen(l.reportedAt)}</span>
                      <span className="flex items-center gap-1">
                        <Paperclip size={9} /> {l.evidence.length}
                      </span>
                    </div>
                  </div>
                  <div className="shrink-0 pt-0.5 text-right">
                    <Pill tone={meta.tone}>{meta.label}</Pill>
                    <div className="mt-1.5 text-[10px] text-muted/70">{l.assignedTo}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* detail rail */}
        {selected && (
          <div className="w-[360px] shrink-0 overflow-y-auto border-l border-ink-700 bg-ink-900/50">
            <div className="border-b border-ink-700 px-5 py-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-mono text-[10px] text-muted/70">{selected.ref}</div>
                  <h2 className="mt-1 font-display text-[21px] leading-tight">{selected.category}</h2>
                </div>
                <LeadPriority priority={selected.priority} />
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {selected.consentOnFile ? (
                  <Pill tone="sage">
                    <ShieldCheck size={10} /> 同意书在档
                  </Pill>
                ) : (
                  <Pill tone="oxide">
                    <ShieldOff size={10} /> 缺同意书
                  </Pill>
                )}
                <Pill tone={leadStatusMeta[selected.status].tone}>
                  {leadStatusMeta[selected.status].label}
                </Pill>
              </div>
            </div>

            <div className="space-y-5 px-5 py-4">
              <div>
                <div className="label-mono">摘要</div>
                <p className="mt-1.5 text-[12px] leading-relaxed text-bone/90">{selected.summary}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="label-mono">来源</div>
                  <div className="mt-1 text-[11.5px] text-bone/85">{selected.source}</div>
                </div>
                <div>
                  <div className="label-mono">地区</div>
                  <div className="mt-1 text-[11.5px] text-bone/85">{selected.region}</div>
                </div>
                <div>
                  <div className="label-mono">受理时间</div>
                  <div className="mt-1 font-mono text-[11px] text-bone/85">
                    {formatWhen(selected.reportedAt)}
                  </div>
                </div>
                <div>
                  <div className="label-mono">转介</div>
                  <div className="mt-1 text-[11.5px] text-bone/85">{selected.referral ?? "未转介"}</div>
                </div>
              </div>

              <div className="border-t border-ink-700 pt-4">
                <div className="flex items-center justify-between">
                  <span className="label-mono">处置</span>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <select
                    value={selected.status}
                    onChange={(e) => setLeadStatus(selected.id, e.target.value as LeadStatus)}
                    className="field py-1.5 text-[11.5px]"
                  >
                    {statusOptions.map((s) => (
                      <option key={s} value={s}>
                        状态：{leadStatusMeta[s].label}
                      </option>
                    ))}
                  </select>
                  <select
                    value={selected.assignedTo}
                    onChange={(e) => assignLead(selected.id, e.target.value)}
                    className="field py-1.5 text-[11.5px]"
                  >
                    <option value="未分配">未分配</option>
                    {agents.map((a) => (
                      <option key={a.id} value={a.name}>
                        指派给 {a.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="border-t border-ink-700 pt-4">
                <div className="flex items-center justify-between">
                  <span className="label-mono">证据（{selected.evidence.length}）</span>
                  <span className="font-mono text-[9px] text-muted/50">sha256 校验</span>
                </div>
                <div className="mt-2 space-y-1.5">
                  {selected.evidence.length === 0 && (
                    <div className="text-[11px] text-muted/70">尚无证据条目</div>
                  )}
                  {selected.evidence.map((ev) => (
                    <div
                      key={ev.id}
                      className="flex items-center gap-2 border border-ink-700 bg-ink-850/60 px-2.5 py-1.5"
                    >
                      <FilePlus2 size={11} className="shrink-0 text-muted" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[11px] text-bone/90">{ev.name}</div>
                        <div className="truncate font-mono text-[9px] text-muted/60">{ev.hash}</div>
                      </div>
                      <Pill tone="muted" className="shrink-0">
                        {ev.kind}
                      </Pill>
                    </div>
                  ))}
                </div>
                <div className="mt-2 flex gap-1.5">
                  <select
                    value={evidenceKind}
                    onChange={(e) => setEvidenceKind(e.target.value as Evidence["kind"])}
                    className="field w-[84px] px-2 py-1.5 text-[11px]"
                  >
                    {evidenceKinds.map((k) => (
                      <option key={k} value={k}>
                        {k}
                      </option>
                    ))}
                  </select>
                  <input
                    value={evidenceName}
                    onChange={(e) => setEvidenceName(e.target.value)}
                    placeholder="文件名"
                    className="field flex-1 py-1.5 text-[11px]"
                  />
                  <button onClick={submitEvidence} className="btn-ghost px-2 py-1.5">
                    <Paperclip size={12} />
                  </button>
                </div>
                <p className="mt-2 text-[9.5px] leading-relaxed text-muted/50">
                  仅登记证据元数据与哈希，不存储原始文件；导出前需合规复核。
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* new lead modal */}
      {showForm && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-ink-950/80 p-6 backdrop-blur-sm">
          <div className="panel w-full max-w-[560px] animate-slide-in">
            <div className="flex items-center justify-between border-b border-ink-700 px-5 py-3.5">
              <SectionHeading index="NEW" title="登记新线索" />
              <button onClick={() => setShowForm(false)} className="btn-quiet p-1.5">
                <X size={15} />
              </button>
            </div>
            <div className="space-y-3 px-5 py-4">
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="label-mono">来源</span>
                  <input
                    value={form.source}
                    onChange={(e) => setForm({ ...form, source: e.target.value })}
                    placeholder="渠道 / 会话 / 机构"
                    className="field mt-1"
                  />
                </label>
                <label className="block">
                  <span className="label-mono">地区</span>
                  <input
                    value={form.region}
                    onChange={(e) => setForm({ ...form, region: e.target.value })}
                    placeholder="如 泰国 · 曼谷"
                    className="field mt-1"
                  />
                </label>
                <label className="block">
                  <span className="label-mono">类别</span>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value as LeadCategory })}
                    className="field mt-1"
                  >
                    {leadCategories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="label-mono">优先级</span>
                  <select
                    value={form.priority}
                    onChange={(e) => setForm({ ...form, priority: e.target.value as Lead["priority"] })}
                    className="field mt-1"
                  >
                    <option value="P0">P0 · 立即响应</option>
                    <option value="P1">P1 · 24 小时内</option>
                    <option value="P2">P2 · 常规</option>
                  </select>
                </label>
              </div>
              <label className="block">
                <span className="label-mono">摘要</span>
                <textarea
                  value={form.summary}
                  onChange={(e) => setForm({ ...form, summary: e.target.value })}
                  rows={3}
                  placeholder="仅记录必要事实，避免复制可识别个人信息"
                  className="field mt-1 resize-none leading-relaxed"
                />
              </label>
              <label className="flex items-start gap-2 rounded-[3px] border border-ink-700 bg-ink-850/60 px-3 py-2.5">
                <input
                  type="checkbox"
                  checked={form.consent}
                  onChange={(e) => setForm({ ...form, consent: e.target.checked })}
                  className="mt-0.5 accent-[var(--oxide)]"
                />
                <span className="text-[11px] leading-relaxed text-muted">
                  当事人已知悉并书面同意在必要时转介至官方或公益援助渠道。未取得同意时，线索仅可在内部取证，不得对外转介。
                </span>
              </label>
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-ink-700 px-5 py-3">
              <button onClick={() => setShowForm(false)} className="btn-ghost">
                取消
              </button>
              <button
                onClick={submitLead}
                disabled={!form.source.trim() || !form.summary.trim()}
                className="btn-primary"
              >
                保存并登记
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
