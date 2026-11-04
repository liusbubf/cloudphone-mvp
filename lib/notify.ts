import { promises as fs } from "node:fs";
import path from "node:path";
import type { RelayRecord } from "@/lib/relay";
import { sendSms, smsProvider } from "@/lib/sms";

export type NoticeStatus = "sent" | "queued" | "failed";

export interface OutboxEntry {
  at: string;
  ref: string;
  channel: string;
  to: string;
  message: string;
  status: NoticeStatus;
  error?: string;
  provider?: string;
}

const DIR = path.join(process.cwd(), ".data");
const OUTBOX = path.join(DIR, "relay-outbox.json");

export function buildSmsSegments(record: RelayRecord): string[] {
  const f = record.family ?? {};
  const who = (f.name || "家人").slice(0, 8);
  const verify = f.verify ? `核对：「${f.verify.slice(0, 12)}」` : "核对：未留信息";
  const place = (f.place || record.region).slice(0, 10);
  const state = (f.status || "情况不明").slice(0, 8);
  const head = `【求助转达 ${record.ref}】${who}自称本人，${verify}。自述${state}，在${place}。`;
  const tail = "请回拨熟悉的号码核实，核实前不要转账。确认后可拨 +86-10-12308。志愿者转达，非官方。";
  return [head.slice(0, 70), tail.slice(0, 70)];
}

export function buildFamilyNotice(record: RelayRecord): string {
  const f = record.family ?? {};
  const who = f.name || "你的家人";
  const verify = f.verify ? `对方留下的可核对信息：「${f.verify}」。` : "对方未留下可核对的信息。";
  const place = f.place || record.region;
  const state = f.status || "情况不明";
  const quote = record.summary.replace(/\s+/g, " ").trim().slice(0, 280);
  const quoted = /[。！？.!?]$/.test(quote) ? quote : `${quote}。`;

  return [
    `【求助转达 · ${record.ref}】`,
    `我们收到一条求助信息，当事人自称「${who}」。${verify}`,
    `对方自述情况：${state}；所在位置：${place}。`,
    `原话：${quoted}`,
    "请先自行核实：回拨你熟悉的号码，或让对方说出只有家里人才知道的事；",
    "核实之前，不要向任何人转账或汇款。",
    "如确认是本人并需要协助，可联系外交部全球领事保护热线 +86-10-12308 或 110。",
    "本条由志愿者转达，不代表官方结论。",
  ].join("");
}

async function readOutbox(): Promise<OutboxEntry[]> {
  try {
    const raw = await fs.readFile(OUTBOX, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function appendOutbox(entry: OutboxEntry) {
  const rows = await readOutbox();
  rows.unshift(entry);
  await fs.mkdir(DIR, { recursive: true });
  await fs.writeFile(OUTBOX, JSON.stringify(rows.slice(0, 500), null, 2), "utf8");
}

export async function notifyFamily(record: RelayRecord): Promise<{
  status: NoticeStatus;
  message: string;
  segments?: string[];
  provider?: string;
}> {
  const to = record.family?.contact?.trim();
  const channel = record.family?.channel ?? "sms";
  const segments = channel === "sms" ? buildSmsSegments(record) : undefined;
  const message = segments ? segments.join("\n") : buildFamilyNotice(record);
  if (!to) {
    return { status: "failed", message, segments };
  }

  const provider = smsProvider();
  const params = {
    ref: record.ref,
    name: record.family?.name ?? "",
    verify: record.family?.verify ?? "",
    place: record.family?.place || record.region,
    state: record.family?.status ?? "",
  };
  const result = await sendSms({
    to,
    message,
    ref: record.ref,
    channel,
    segments,
    params,
  });
  const status = result.status;
  const error = result.error;

  await appendOutbox({
    at: new Date().toISOString(),
    ref: record.ref,
    channel,
    to,
    message,
    status,
    error,
    provider,
  });

  return { status, message, segments, provider };
}
