"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Calculator,
  ChevronDown,
  Clock3,
  LifeBuoy,
  LogOut,
  ShieldCheck,
} from "lucide-react";
import { addLead, useWorkspace } from "@/lib/store";
import { leadCategories } from "@/lib/format";
import type { LeadCategory } from "@/lib/types";

/**
 * 求助端（受困者可访问）
 * - 默认呈现为普通的「汇率换算」小工具，降低被同处一室者发现的概率
 * - 连续点击标题三次（或 Ctrl/⌘ + Shift + H）进入求助页
 * - 求助页提供一键退出，回到换算界面
 * - 仅本机提交，不发送到任何真实外部机构（演示）
 */
export default function HelpPage() {
  const { helpChannels } = useWorkspace();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("1000");
  const [sent, setSent] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [relayed, setRelayed] = useState<boolean | null>(null);
  const tapRef = useRef<{ count: number; at: number }>({ count: 0, at: 0 });

  const [form, setForm] = useState({
    region: "",
    category: "园区线索" as LeadCategory,
    note: "",
    voluntary: false,
  });

  const [family, setFamily] = useState({
    name: "",
    phone: "",
    code: "",
    place: "",
    status: "我暂时安全",
    relay: false,
    channel: "sms" as "sms" | "whatsapp" | "email",
  });
  const [copied, setCopied] = useState<"msg" | "guide" | null>(null);

  const hasCode = family.code.trim().length > 0;
  const familyMessage = `我是${family.name || "＿＿"}。我现在${family.status}${
    family.place ? `，在${family.place}` : ""
  }。${hasCode ? `暗号：${family.code}。` : ""}${
    hasCode ? "如果有人用我的名义要钱，请一律不要转账，先核对暗号；对不上就马上联系使馆并报警。"
            : "如果有人用我的名义要钱，请一律不要转账，先问一件只有家里人才知道的小事；答不上来就马上联系使馆并报警。"
  }`;

  const copyText = async (text: string, key: "msg" | "guide") => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      window.setTimeout(() => setCopied(null), 1600);
    } catch {
      setCopied(null);
    }
  };

  const enter = () => {
    setOpen(true);
    setSent(null);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "h") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const onTitleTap = () => {
    const t = Date.now();
    const next = t - tapRef.current.at > 1400 ? 1 : tapRef.current.count + 1;
    tapRef.current = { count: next, at: t };
    if (next >= 3) {
      tapRef.current = { count: 0, at: 0 };
      enter();
    }
  };

  const submit = async () => {
    if (!form.voluntary || sending) return;
    setSending(true);
    const relayNote =
      family.relay && family.phone
        ? ` 并请求救援团队代为联系家人：${family.name || "家属"} ${family.phone}${
            family.code ? `（暗号：${family.code}）` : ""
          }。`
        : "";
    const payload = {
      region: form.region || family.place || "未知",
      category: form.category,
      summary:
        (form.note.trim() ||
          `通过求助端提交：${form.category}。当事人已确认在自愿且安全的情况下操作。`) + relayNote,
      priority: "P0" as const,
      family:
        family.relay && family.phone.trim()
          ? {
              name: family.name,
              contact: family.phone.trim(),
              channel: family.channel,
              verify: family.code,
              status: family.status,
              place: family.place,
            }
          : undefined,
    };

    let ref = "";
    try {
      const res = await fetch("/api/relay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const data = (await res.json()) as { ref?: string };
        ref = data.ref ?? "";
      }
    } catch {
      ref = "";
    }

    const lead = addLead(
      { ...payload, source: "求助端 · 出行助手", consentOnFile: true },
      { persist: false }
    );
    setRelayed(Boolean(ref));
    setSent(ref || lead.ref);
    setForm({ region: "", category: "园区线索", note: "", voluntary: false });
    setSending(false);
  };

  const clearAndExit = () => {
    setOpen(false);
    setSent(null);
    setForm({ region: "", category: "园区线索", note: "", voluntary: false });
    setFamily({ name: "", phone: "", code: "", place: "", status: "我暂时安全", relay: false, channel: "sms" });
    setCopied(null);
  };

  const rate = 0.207;
  const converted = (Number(amount || "0") * rate).toFixed(2);

  return (
    <div className="min-h-screen bg-paper text-[#26231d]">
      {/* ---------- 默认：伪装界面 ---------- */}
      <div className="mx-auto max-w-[520px] px-6 py-10">
        <header className="flex items-center justify-between border-b border-[#d8d0bd] pb-4">
          <button onClick={onTitleTap} className="text-left" aria-label="Travel Kit">
            <div className="font-display text-[22px] leading-none tracking-[-0.01em]">Travel Kit</div>
            <div className="mt-1 font-mono text-[9.5px] uppercase tracking-[0.2em] text-[#8b8271]">
              出行助手 · v1.0
            </div>
          </button>
          <Calculator size={20} className="text-[#8b8271]" />
        </header>

        <section className="mt-8 rounded-[3px] border border-[#d8d0bd] bg-[#faf7ee] p-5">
          <div className="label-mono text-[#8b8271]">汇率换算 · THB → CNY</div>
          <div className="mt-4 flex items-end gap-3">
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))}
              inputMode="decimal"
              className="w-full border-b border-[#cfc6b3] bg-transparent pb-2 font-display text-[30px] tabular-nums outline-none focus:border-[#8b8271]"
            />
            <span className="pb-2 font-mono text-[11px] uppercase tracking-[0.16em] text-[#8b8271]">THB</span>
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-dashed border-[#d8d0bd] pt-4">
            <div>
              <div className="label-mono text-[#8b8271]">≈ 人民币</div>
              <div className="mt-1 font-display text-[24px] tabular-nums">¥ {converted}</div>
            </div>
            <div className="text-right font-mono text-[10px] leading-relaxed text-[#8b8271]">
              1 THB = {rate} CNY
              <br />
              汇率仅供参考
            </div>
          </div>
        </section>

        <section className="mt-6">
          <div className="flex items-center justify-between">
            <span className="label-mono text-[#8b8271]">最近查询</span>
            <ChevronDown size={14} className="text-[#8b8271]" />
          </div>
          <div className="mt-2 divide-y divide-[#e2dacb] border-y border-[#e2dacb]">
            {[
              ["THB → CNY", "0.207"],
              ["USD → THB", "32.40"],
              ["MMK → CNY", "0.0034"],
            ].map(([pair, r]) => (
              <div key={pair} className="flex items-center justify-between py-2.5">
                <span className="text-[12.5px]">{pair}</span>
                <span className="font-mono text-[11px] tabular-nums text-[#8b8271]">{r}</span>
              </div>
            ))}
          </div>
        </section>

        <footer className="mt-8 flex items-center justify-between font-mono text-[9px] uppercase tracking-[0.16em] text-[#a89f8d]">
          <span>offline · 本地计算</span>
          <span>设置</span>
        </footer>
      </div>

      {/* ---------- 求助页 ---------- */}
      {open && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-[#111513] text-[#e9e5da]">
          <div className="mx-auto max-w-[560px] px-6 py-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <LifeBuoy size={16} className="text-[#e0673f]" />
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#8b948d]">
                  求助 · 仅供本人使用
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-1.5 rounded-[3px] border border-[#2a322e] px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-[#8b948d] hover:text-[#e9e5da]"
                >
                  <LogOut size={11} /> 立即退出 (Esc)
                </button>
                <button
                  onClick={clearAndExit}
                  className="flex items-center gap-1.5 rounded-[3px] border border-[#4a332c] px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-[#e0673f] hover:border-[#e0673f]/60"
                >
                  清除并退出
                </button>
              </div>
            </div>

            <h1 className="mt-6 font-display text-[30px] leading-tight tracking-[-0.01em]">
              先确认你现在是否安全
            </h1>
            <p className="mt-3 text-[12.5px] leading-relaxed text-[#8b948d]">
              如果旁边有人，或有被检查设备的可能，请立即点右上角退出。退出后页面会回到汇率换算界面。
              本页提交的内容只进入救援团队的线索库，不会公开、不会发给招聘方。
            </p>

            <details className="group mt-4 rounded-[3px] border border-[#3a3326] bg-[#1a1c17] px-3.5 py-2.5">
              <summary className="cursor-pointer list-none text-[11.5px] text-[#c8a15f] marker:hidden">
                ▸ 怎么降低被发现的风险（务必看）
              </summary>
              <ul className="mt-3 space-y-2 text-[10.5px] leading-relaxed text-[#8b948d]">
                {[
                  "没有任何手机软件能保证“一定查不到”。任何装在手机上的东西，都可能被翻到、被截图、被恢复。任何人向你保证绝对安全，都值得怀疑。",
                  "只在独处、确认周围没人、手机不在别人手里时打开；用完立刻退出，不要让它停在求助页。",
                  "不要截图、不要存相册、不要转发给任何人，包括同屋的人。受理编号记在纸上或背下来。",
                  "园区 Wi-Fi 可能被统一管理。能不用园区的网络就不用；优先用你自己的流量卡或别人的手机。",
                  "手机可能被随时检查时，更好的做法是把信息交给一个你信得过的人，或直接记住使馆、IOM 的号码，用公用电话打。",
                  "本页填写的内容不会写进本机存储，刷新后消失；但浏览器可能留有访问记录，离开前按「清除并退出」，并清理浏览记录。",
                ].map((t) => (
                  <li key={t} className="flex gap-2">
                    <span className="shrink-0 text-[#e0673f]">·</span>
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </details>

            {sent ? (
              <div className="mt-6 rounded-[3px] border border-[#3f5f48] bg-[rgba(157,184,154,0.1)] p-5">
                <div className="flex items-center gap-2 text-[#9db89a]">
                  <ShieldCheck size={15} />
                  <span className="font-mono text-[10px] uppercase tracking-[0.18em]">已受理</span>
                </div>
                <div className="mt-3 font-display text-[22px]">受理编号 {sent}</div>
                <p className="mt-2 text-[12px] leading-relaxed text-[#8b948d]">
                  记在纸上或记在脑子里，不要留在聊天记录里。救援团队会按这个编号跟进。
                  {relayed === false && (
                    <span className="mt-1 block text-[#d8a06a]">
                      当前未连上接应端，这个编号只在本次打开期间有效。请优先直接拨打电话。
                    </span>
                  )}
                </p>
                <button onClick={() => setOpen(false)} className="btn-primary mt-4">
                  返回并退出
                </button>
              </div>
            ) : (
              <>
                <section className="mt-6 grid gap-2">
                  {[
                    { icon: "1", t: "联系家人", d: "把地点与近况告知可信任的人" },
                    { icon: "2", t: "联系使领馆", d: "护照被扣、被限制自由时优先" },
                    { icon: "3", t: "联系救援机构", d: "需要临时安置或法律援助" },
                  ].map((x) => (
                    <div
                      key={x.t}
                      className="flex items-center gap-3 rounded-[3px] border border-[#2a322e] bg-[#161b19] px-3.5 py-2.5"
                    >
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[#3a4540] font-mono text-[10px] text-[#8b948d]">
                        {x.icon}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="text-[12.5px]">{x.t}</div>
                        <div className="text-[10.5px] text-[#8b948d]">{x.d}</div>
                      </div>
                      <ArrowRight size={12} className="text-[#8b948d]" />
                    </div>
                  ))}
                </section>

                <section className="mt-6 rounded-[3px] border border-[#2a322e] bg-[#161b19] p-4">
                  <div className="flex items-center justify-between">
                    <span className="label-mono">联系家人 · 核对身份</span>
                    <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-[#6f7a73]">
                      不联网 · 不落盘
                     </span>
                  </div>
                  <p className="mt-2 text-[10.5px] leading-relaxed text-[#8b948d]">
                    用你自己的渠道（短信、微信、WhatsApp）发出去。家人认声音、认号码就够了，不需要额外验证；
                    暗号只在一件事上有用——电话不是你打的，有人拿着你的手机照稿子念。
                  </p>

                  <div className="mt-3 grid grid-cols-2 gap-2.5">
                    <label className="block">
                      <span className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-[#8b948d]">
                        对家里怎么称呼你
                      </span>
                      <input
                        value={family.name}
                        onChange={(e) => setFamily({ ...family, name: e.target.value })}
                        placeholder="如：妈，我是小海"
                        className="field mt-1"
                      />
                    </label>
                    <label className="block">
                      <span className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-[#8b948d]">
                        家人号码（可留空）
                      </span>
                      <input
                        value={family.phone}
                        onChange={(e) => setFamily({ ...family, phone: e.target.value })}
                        placeholder="+86 1xx xxxx xxxx"
                        inputMode="tel"
                        className="field mt-1"
                      />
                      <div className="mt-1.5 flex gap-1">
                        {(["sms", "whatsapp", "email"] as const).map((c) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => setFamily({ ...family, channel: c })}
                            className={`rounded-[2px] border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.08em] ${
                              family.channel === c
                                ? "border-[#c4562d] bg-[#c4562d]/15 text-[#f2ede3]"
                                : "border-[#2c3330] text-[#8b948d]"
                            }`}
                          >
                            {c === "sms" ? "短信" : c}
                          </button>
                        ))}
                      </div>
                    </label>
                    <label className="block">
                      <span className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-[#8b948d]">
                        你现在在哪
                      </span>
                      <input
                        value={family.place}
                        onChange={(e) => setFamily({ ...family, place: e.target.value })}
                        placeholder="国家 / 城市 / 园区名"
                        className="field mt-1"
                      />
                    </label>
                    <label className="block">
                      <span className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-[#8b948d]">
                        暗号（可选）
                      </span>
                      <input
                        value={family.code}
                        onChange={(e) => setFamily({ ...family, code: e.target.value })}
                        placeholder="没约定就留空"
                        className="field mt-1"
                      />
                    </label>
                  </div>

                  <label className="mt-2.5 block">
                    <span className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-[#8b948d]">
                      现在的状态
                    </span>
                    <select
                      value={family.status}
                      onChange={(e) => setFamily({ ...family, status: e.target.value })}
                      className="field mt-1"
                    >
                      <option>我暂时安全</option>
                      <option>我遇到麻烦，需要帮助</option>
                      <option>我被人控制，不方便多说</option>
                    </select>
                  </label>

                  <div className="mt-3 rounded-[3px] border border-[#2a322e] bg-[#0f1312] px-3 py-2.5">
                    <div className="label-mono text-[#6f7a73]">发给家人的消息</div>
                    <p className="mt-1.5 text-[11px] leading-relaxed text-[#c9c4b8]">{familyMessage}</p>
                  </div>

                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      onClick={() => copyText(familyMessage, "msg")}
                      className="btn-ghost flex-1 px-2 py-1.5 text-[11px]"
                    >
                      {copied === "msg" ? "已复制" : "复制消息"}
                    </button>
                    <button
                      onClick={() =>
                        copyText(
                          [
                            "家人须知（请按顺序做）：",
                            "1. 先看号码是不是家人常用号码、声音是不是本人；约过暗号的再对一下。对不上就当作不是本人，不要转账。",
                            "2. 任何以他/她名义索要赎金、保证金、机票钱的要求，一律拒绝，不要汇款。",
                            "3. 记录来电号码、通话时间、要求金额，能录音就录音。",
                            "4. 联系中国驻当地使领馆领事保护，以及 110 / 96110 反诈中心。",
                            "5. 把受理编号和上述记录一并提供给警方或使馆。",
                          ].join("\n"),
                          "guide"
                        )
                      }
                      className="btn-ghost flex-1 px-2 py-1.5 text-[11px]"
                    >
                      {copied === "guide" ? "已复制" : "复制家属须知"}
                    </button>
                  </div>

                  <label className="mt-3 flex items-start gap-2 rounded-[3px] border border-[#2a322e] px-3 py-2.5">
                    <input
                      type="checkbox"
                      checked={family.relay}
                      onChange={(e) => setFamily({ ...family, relay: e.target.checked })}
                      className="mt-0.5 accent-[#e0673f]"
                    />
                    <span className="text-[10.5px] leading-relaxed text-[#8b948d]">
                      我无法自己联系家人，请救援团队代为联系（会随下面的求助一起提交姓名、号码和暗号）。
                    </span>
                  </label>

                  <p className="mt-2.5 text-[9.5px] leading-relaxed text-[#6f7a73]">
                    如果是别人逼你发这条消息，故意把家里的事说错一件——家里一听就知道不对。
                  </p>
                </section>

                <section className="mt-6 rounded-[3px] border border-[#2a322e] bg-[#161b19] p-4">
                  <div className="label-mono">提交一条求助</div>
                  <div className="mt-3 space-y-2.5">
                    <label className="block">
                      <span className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-[#8b948d]">
                        你现在大致在
                      </span>
                      <input
                        value={form.region}
                        onChange={(e) => setForm({ ...form, region: e.target.value })}
                        placeholder="国家 / 城市，可只写一个"
                        className="field mt-1"
                      />
                    </label>
                    <label className="block">
                      <span className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-[#8b948d]">
                        情况
                      </span>
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
                      <span className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-[#8b948d]">
                        具体情况（可选）
                      </span>
                      <textarea
                        value={form.note}
                        onChange={(e) => setForm({ ...form, note: e.target.value })}
                        rows={3}
                        placeholder="不要写真实姓名、证件号或银行卡号"
                        className="field mt-1 resize-none leading-relaxed"
                      />
                    </label>
                    <label className="flex items-start gap-2 rounded-[3px] border border-[#2a322e] px-3 py-2.5">
                      <input
                        type="checkbox"
                        checked={form.voluntary}
                        onChange={(e) => setForm({ ...form, voluntary: e.target.checked })}
                        className="mt-0.5 accent-[#e0673f]"
                      />
                      <span className="text-[10.5px] leading-relaxed text-[#8b948d]">
                        我确认现在没有人在旁强迫我操作，并同意把这条信息交给救援团队用于协助。
                      </span>
                    </label>
                    <button
                      onClick={submit}
                      disabled={!form.voluntary}
                      className="btn-primary w-full"
                    >
                      提交求助
                    </button>
                  </div>
                </section>

                <section className="mt-6">
                  <div className="label-mono">可自行联系的渠道</div>
                  <div className="mt-2 space-y-1.5">
                    {helpChannels.map((h) => (
                      <div
                        key={h.id}
                        className="flex items-start justify-between gap-3 border-b border-[#232a27] py-2"
                      >
                        <div className="min-w-0">
                          <div className="text-[11.5px]">{h.name}</div>
                          <div className="mt-0.5 flex items-center gap-1.5 font-mono text-[9.5px] text-[#8b948d]">
                            <Clock3 size={9} /> {h.hours} · {h.region}
                          </div>
                        </div>
                        <span className="shrink-0 font-mono text-[10px] text-[#7f9dd6]">{h.contact}</span>
                      </div>
                    ))}
                  </div>
                </section>

                <p className="mt-6 border-t border-[#232a27] pt-3 text-[10px] leading-relaxed text-[#6f7a73]">
                  演示版本：提交内容只写入本地线索库，不会发送到任何真实机构。正式部署时需接入经核验的救援机构中继，并接受当地法律与机构流程约束。
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
