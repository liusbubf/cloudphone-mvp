"use client";

import { useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Copy,
  Download,
  Landmark,
  Phone,
  Printer,
  Search,
  ShieldAlert,
  Siren,
} from "lucide-react";
import { addLead, useWorkspace } from "@/lib/store";
import { formatWhen } from "@/lib/format";

const steps = [
  {
    no: "01",
    title: "一分钱都不要转",
    body:
      "任何以他/她名义索要赎金、保证金、机票钱、罚款的要求，先拒绝。骗子最常用的手法就是逼本人打电话回家要钱，家属一转账就再也拿不回来。",
    icon: ShieldAlert,
  },
  {
    no: "02",
    title: "把证据留下来",
    body:
      "记下来电号码、通话时间、要求金额，能录音就录音，聊天记录和转账要求不要删。这些是报警和立案的关键材料。",
    icon: Copy,
  },
  {
    no: "03",
    title: "同时向两边报案",
    body:
      "一边打 110 报案并做笔录，一边联系外交部全球领事保护热线 12308，让使领馆介入。两条线并行，不要只等一边。",
    icon: Siren,
  },
];

const checklist = [
  "核对来电号码，是否就是家人平时用的号码",
  "确认声音、口音、说话习惯，有无被照稿念的迹象",
  "询问只有家里人知道的小事，答不上来要提高警惕",
  "拒绝任何形式的汇款，包括“先交一点证明诚意”",
  "记录全部联系时间点和对方要求，交给警方",
];

const relayStatus: Record<string, string> = {
  received: "已受理",
  reviewing: "跟进中",
  referred: "已转介",
  closed: "已结案",
};

export default function FamilyPage() {
  const { leads } = useWorkspace();
  const [checked, setChecked] = useState<number[]>([]);
  const [copied, setCopied] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [queryRef, setQueryRef] = useState("");
  const [lookup, setLookup] = useState<{
    ref: string;
    status: string;
    region: string;
    category: string;
    createdAt: string;
    updatedAt: string;
  } | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  const [form, setForm] = useState({
    name: "",
    relation: "",
    lastContact: "",
    place: "",
    extortion: "暂未收到索款要求",
    note: "",
    phone: "",
    kin: false,
    reported: false,
  });

  const toggle = (i: number) =>
    setChecked((c) => (c.includes(i) ? c.filter((x) => x !== i) : [...c, i]));

  const copy = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      window.setTimeout(() => setCopied(null), 1600);
    } catch {
      setCopied(null);
    }
  };

  const check = async () => {
    const ref = queryRef.trim().toUpperCase();
    if (!ref) return;
    setChecking(true);
    setLookup(null);
    setLookupError(null);
    try {
      const res = await fetch(`/api/relay?ref=${encodeURIComponent(ref)}`);
      if (res.ok) {
        setLookup(await res.json());
      } else {
        setLookupError(
          res.status === 404 ? "没有找到这个编号，请核对大小写和连字符。" : "查询失败，请稍后再试。"
        );
      }
    } catch {
      setLookupError("网络不可用，请直接拨打电话。");
    }
    setChecking(false);
  };

  const submit = () => {
    if (!form.kin || !form.note.trim() || !form.relation.trim()) return;
    const lead = addLead(
      {
        source: "家属端 · 失联报案",
        region: form.place || "未知",
        category: "人员失联",
        summary: [
          `当事人：${form.name || "未填写"}`,
          `关系：${form.relation}`,
          `最后联系：${form.lastContact || "未填写"}`,
          `已知位置：${form.place || "未知"}`,
          `索款情况：${form.extortion}`,
          form.reported ? "家属已向警方报案" : "家属尚未报案",
          form.phone ? `家属联系方式：${form.phone}` : "",
          `情况：${form.note.trim()}`,
        ]
          .filter(Boolean)
          .join("；"),
        priority: form.extortion === "已收到索款要求" ? "P0" : "P1",
        consentOnFile: true,
      },
      { persist: false }
    );
    setResult(lead.ref);
  };

  const reset = () => {
    setForm({
      name: "",
      relation: "",
      lastContact: "",
      place: "",
      extortion: "暂未收到索款要求",
      note: "",
      phone: "",
      kin: false,
      reported: false,
    });
    setResult(null);
  };

  const myCases = leads.filter((l) => l.source === "家属端 · 失联报案").slice(0, 3);

  return (
    <div className="min-h-screen bg-[#f4f0e6] text-[#1c1a16]">
      <div className="mx-auto max-w-[860px] px-6 py-10 print:px-0 print:py-0">
        <header className="flex flex-wrap items-end justify-between gap-4 border-b-2 border-[#1c1a16] pb-4">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-[#6b6455]">
              Family Desk · 家属端
            </div>
            <h1 className="mt-2 font-display text-[38px] leading-[1.05] tracking-[-0.02em]">
              家人失联了,先做这三件事
            </h1>
            <p className="mt-3 max-w-[560px] text-[12.5px] leading-relaxed text-[#5d574a]">
              这份清单写给家属。不要先找中介、不要先私下谈钱,按顺序做完再想别的。
            </p>
          </div>
          <div className="flex gap-2 no-print">
            <a
              href="/seahelp-card.html"
              download
              className="flex items-center gap-1.5 border border-[#1c1a16] px-3 py-2 font-mono text-[10px] uppercase tracking-[0.12em] transition-colors hover:bg-[#1c1a16] hover:text-[#f4f0e6]"
            >
              <Download size={12} /> 离线求助卡
            </a>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 border border-[#1c1a16] px-3 py-2 font-mono text-[10px] uppercase tracking-[0.12em] transition-colors hover:bg-[#1c1a16] hover:text-[#f4f0e6]"
            >
              <Printer size={12} /> 打印 / 存为 PDF
            </button>
          </div>
        </header>

        {/* three steps */}
        <section className="mt-8 grid gap-3 md:grid-cols-3">
          {steps.map((s) => (
            <div key={s.no} className="border border-[#d5cdb9] bg-[#fbf8f0] p-4">
              <div className="flex items-center justify-between">
                <s.icon size={15} className="text-[#a8452a]" />
                <span className="font-mono text-[10px] tracking-[0.14em] text-[#a09884]">{s.no}</span>
              </div>
              <h2 className="mt-3 font-display text-[19px] leading-tight">{s.title}</h2>
              <p className="mt-2 text-[11.5px] leading-relaxed text-[#5d574a]">{s.body}</p>
            </div>
          ))}
        </section>

        {/* emergency contacts */}
        <section className="mt-8 border border-[#d5cdb9] bg-[#1c1a16] p-5 text-[#f0ebdf]">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-[20px]">现在就打这两个电话</h2>
            <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-[#9a9282]">
              24 小时
            </span>
          </div>
          <div className="mt-4 grid gap-2 md:grid-cols-2">
            {[
              { label: "外交部 · 全球领事保护与服务应急热线", num: "+86-10-12308", key: "12308" },
              { label: "国家反诈中心 · 报警与咨询", num: "96110", key: "96110" },
            ].map((c) => (
              <div key={c.key} className="flex items-center gap-3 border border-[#3a362d] bg-[#24221c] px-3 py-2.5">
                <Phone size={14} className="shrink-0 text-[#d8a06a]" />
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] text-[#9a9282]">{c.label}</div>
                  <a
                    href={`tel:${c.num.replace(/-/g, "")}`}
                    className="mt-0.5 block font-mono text-[15px] tracking-[0.04em] text-[#f0ebdf] hover:underline"
                  >
                    {c.num}
                  </a>
                </div>
                <button
                  onClick={() => copy(c.num, c.key)}
                  className="shrink-0 border border-[#3a362d] px-2 py-1 font-mono text-[9px] uppercase tracking-[0.1em] text-[#c9c1b0] hover:border-[#d8a06a] no-print"
                >
                  {copied === c.key ? "已复制" : "复制"}
                </button>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[10.5px] leading-relaxed text-[#9a9282]">
            报案时说清：亲属关系、最后联系时间、已知所在国家/城市、是否收到索款要求。有受理编号的，一并告诉接警人员和使领馆。
          </p>
        </section>

        <section className="mt-8 border border-[#d5cdb9] bg-[#fbf8f0] p-5">
          <div className="flex items-center gap-2">
            <Search size={15} className="text-[#a8452a]" />
            <h2 className="font-display text-[22px]">按受理编号查询</h2>
          </div>
          <p className="mt-1.5 text-[11.5px] leading-relaxed text-[#5d574a]">
            输入求助端生成的完整编号（含末位字母）。只返回处理状态，不显示具体内容。
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <input
              value={queryRef}
              onChange={(e) => setQueryRef(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && check()}
              placeholder="LD-2026-421-7QX9"
              className="min-w-[220px] flex-1 border border-[#c9c0aa] bg-white px-2.5 py-2 font-mono text-[12px] uppercase tracking-[0.04em] outline-none focus:border-[#a8452a]"
            />
            <button
              onClick={check}
              disabled={!queryRef.trim() || checking}
              className="flex items-center gap-1.5 bg-[#1c1a16] px-4 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-[#f4f0e6] disabled:opacity-35"
            >
              <Search size={12} /> {checking ? "查询中" : "查询"}
            </button>
          </div>
          {lookup && (
            <div className="mt-3 border border-[#a8452a] bg-[#fdf2ec] px-3 py-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-[12px] text-[#a8452a]">{lookup.ref}</span>
                <span className="border border-[#a8452a] px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-[0.1em] text-[#a8452a]">
                  {relayStatus[lookup.status] ?? lookup.status}
                </span>
                <span className="ml-auto font-mono text-[10px] text-[#8c8470]">
                  提交于 {formatWhen(lookup.createdAt)}
                </span>
              </div>
              <div className="mt-1.5 text-[11px] text-[#5d574a]">
                {lookup.category} · {lookup.region} · 最近更新 {formatWhen(lookup.updatedAt)}
              </div>
            </div>
          )}
          {lookupError && <div className="mt-3 text-[11px] text-[#a8452a]">{lookupError}</div>}
        </section>

        {/* checklist */}
        <section className="mt-8">
          <div className="flex items-baseline gap-3">
            <h2 className="font-display text-[22px]">核对清单</h2>
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#8c8470]">
              {checked.length} / {checklist.length}
            </span>
          </div>
          <ul className="mt-3 divide-y divide-[#ddd5c1] border-y border-[#ddd5c1]">
            {checklist.map((item, i) => (
              <li key={item}>
                <button
                  onClick={() => toggle(i)}
                  className="flex w-full items-start gap-3 px-1 py-2.5 text-left"
                >
                  <span
                    className={`mt-[3px] flex h-[13px] w-[13px] shrink-0 items-center justify-center border ${
                      checked.includes(i) ? "border-[#a8452a] bg-[#a8452a]" : "border-[#b3ab96]"
                    }`}
                  >
                    {checked.includes(i) && <CheckCircle2 size={10} className="text-white" />}
                  </span>
                  <span
                    className={`text-[12px] leading-relaxed ${
                      checked.includes(i) ? "text-[#8c8470] line-through" : "text-[#1c1a16]"
                    }`}
                  >
                    {item}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>

        {/* report form */}
        <section className="mt-8 border border-[#d5cdb9] bg-[#fbf8f0] p-5">
          <div className="flex items-center gap-2">
            <Landmark size={15} className="text-[#a8452a]" />
            <h2 className="font-display text-[22px]">登记失联 / 报案信息</h2>
          </div>
          <p className="mt-1.5 text-[11.5px] leading-relaxed text-[#5d574a]">
            填写后会生成一个受理编号，交给警方和使领馆时直接报这个编号。信息只用于转介，不会公开。
          </p>

          {result ? (
            <div className="mt-4 border border-[#a8452a] bg-[#fdf2ec] p-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-[#a8452a]" />
                <span className="text-[12px]">已登记</span>
              </div>
              <div className="mt-2 font-mono text-[26px] tracking-[0.04em] text-[#a8452a]">{result}</div>
              <p className="mt-2 text-[11px] leading-relaxed text-[#5d574a]">
                把这串编号写下来。报警时提供编号，接警人员可以核对这份记录。
              </p>
              <div className="mt-3 flex gap-2 no-print">
                <button
                  onClick={() => copy(result, "ref")}
                  className="border border-[#1c1a16] px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.1em] hover:bg-[#1c1a16] hover:text-[#f4f0e6]"
                >
                  {copied === "ref" ? "已复制" : "复制编号"}
                </button>
                <button
                  onClick={reset}
                  className="border border-[#b3ab96] px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.1em] text-[#5d574a]"
                >
                  再登记一条
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <label className="block">
                  <span className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-[#6b6455]">
                    当事人姓名
                  </span>
                  <input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="mt-1 w-full border border-[#c9c0aa] bg-white px-2.5 py-2 text-[12px] outline-none focus:border-[#a8452a]"
                  />
                </label>
                <label className="block">
                  <span className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-[#6b6455]">
                    与你的关系
                  </span>
                  <input
                    value={form.relation}
                    onChange={(e) => setForm({ ...form, relation: e.target.value })}
                    placeholder="如：母亲 / 兄弟 / 配偶"
                    className="mt-1 w-full border border-[#c9c0aa] bg-white px-2.5 py-2 text-[12px] outline-none focus:border-[#a8452a]"
                  />
                </label>
                <label className="block">
                  <span className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-[#6b6455]">
                    最后联系时间
                  </span>
                  <input
                    value={form.lastContact}
                    onChange={(e) => setForm({ ...form, lastContact: e.target.value })}
                    placeholder="如：10 月 28 日晚 8 点"
                    className="mt-1 w-full border border-[#c9c0aa] bg-white px-2.5 py-2 text-[12px] outline-none focus:border-[#a8452a]"
                  />
                </label>
                <label className="block">
                  <span className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-[#6b6455]">
                    已知所在位置
                  </span>
                  <input
                    value={form.place}
                    onChange={(e) => setForm({ ...form, place: e.target.value })}
                    placeholder="国家 / 城市 / 园区名"
                    className="mt-1 w-full border border-[#c9c0aa] bg-white px-2.5 py-2 text-[12px] outline-none focus:border-[#a8452a]"
                  />
                </label>
                <label className="block">
                  <span className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-[#6b6455]">
                    索款情况
                  </span>
                  <select
                    value={form.extortion}
                    onChange={(e) => setForm({ ...form, extortion: e.target.value })}
                    className="mt-1 w-full border border-[#c9c0aa] bg-white px-2.5 py-2 text-[12px] outline-none focus:border-[#a8452a]"
                  >
                    <option>暂未收到索款要求</option>
                    <option>已收到索款要求</option>
                    <option>已转账 / 已付钱</option>
                  </select>
                </label>
                <label className="block">
                  <span className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-[#6b6455]">
                    你的联系电话
                  </span>
                  <input
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    inputMode="tel"
                    placeholder="便于接警人员回访"
                    className="mt-1 w-full border border-[#c9c0aa] bg-white px-2.5 py-2 text-[12px] outline-none focus:border-[#a8452a]"
                  />
                </label>
              </div>

              <label className="mt-3 block">
                <span className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-[#6b6455]">
                  情况说明
                </span>
                <textarea
                  value={form.note}
                  onChange={(e) => setForm({ ...form, note: e.target.value })}
                  rows={3}
                  placeholder="什么时候失联、通过什么渠道、对方说过什么要求"
                  className="mt-1 w-full resize-none border border-[#c9c0aa] bg-white px-2.5 py-2 text-[12px] leading-relaxed outline-none focus:border-[#a8452a]"
                />
              </label>

              <div className="mt-3 space-y-2">
                <label className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    checked={form.reported}
                    onChange={(e) => setForm({ ...form, reported: e.target.checked })}
                    className="mt-0.5 accent-[#a8452a]"
                  />
                  <span className="text-[11px] leading-relaxed text-[#5d574a]">
                    我已经向当地警方或国内 110 报案
                  </span>
                </label>
                <label className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    checked={form.kin}
                    onChange={(e) => setForm({ ...form, kin: e.target.checked })}
                    className="mt-0.5 accent-[#a8452a]"
                  />
                  <span className="text-[11px] leading-relaxed text-[#5d574a]">
                    我是当事人的直系亲属或紧急联系人，以上信息属实，同意在必要时转介给警方和使领馆
                  </span>
                </label>
                {!form.kin && form.note.trim().length > 0 && (
                  <div className="flex items-center gap-1.5 text-[10.5px] text-[#a8452a]">
                    <AlertTriangle size={11} /> 需勾选上一项才能提交
                  </div>
                )}
              </div>

              <button
                onClick={submit}
                disabled={!form.kin || !form.relation.trim() || !form.note.trim()}
                className="mt-4 flex w-full items-center justify-center gap-2 bg-[#1c1a16] px-4 py-2.5 text-[12px] text-[#f4f0e6] transition-opacity disabled:opacity-35"
              >
                提交登记 <ArrowRight size={13} />
              </button>
            </>
          )}
        </section>

        {myCases.length > 0 && (
          <section className="mt-8 print:hidden">
            <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#8c8470]">
              本机提交记录（演示用，仅存在于当前设备的内存中）
            </div>
            <div className="mt-2 space-y-1.5">
              {myCases.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center gap-3 border border-[#d5cdb9] bg-[#fbf8f0] px-3 py-2"
                >
                  <span className="font-mono text-[11px] text-[#a8452a]">{c.ref}</span>
                  <span className="truncate text-[11.5px] text-[#5d574a]">{c.summary}</span>
                  <span className="ml-auto shrink-0 font-mono text-[10px] text-[#8c8470]">
                    {formatWhen(c.reportedAt)}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        <footer className="mt-10 border-t border-[#d5cdb9] pt-4 text-[10px] leading-relaxed text-[#8c8470]">
          本页面不联网、不保存数据，关闭即清空。提交的登记信息交由接应团队按流程转介，不会公开。
          若你正处于危险中，请优先拨打电话，而不是填写表格。
        </footer>
      </div>
    </div>
  );
}
