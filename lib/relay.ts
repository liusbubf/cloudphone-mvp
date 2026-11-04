import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

export type RelayStatus = "received" | "reviewing" | "referred" | "closed";

export interface RelayFamily {
  name?: string;
  contact?: string;
  channel?: "sms" | "whatsapp" | "email";
  verify?: string;
  status?: string;
  place?: string;
}

export interface RelayRecord {
  ref: string;
  createdAt: string;
  updatedAt: string;
  status: RelayStatus;
  region: string;
  category: string;
  priority: "P0" | "P1";
  summary: string;
  family?: RelayFamily;
  notifiedAt?: string;
}

const DIR = path.join(process.cwd(), ".data");
const FILE = path.join(DIR, "relay.json");
const AUDIT_FILE = path.join(DIR, "relay-audit.json");
const RETENTION_DAYS = Number(process.env.RELAY_RETENTION_DAYS ?? "90");

async function readAll(): Promise<RelayRecord[]> {
  try {
    const raw = await fs.readFile(FILE, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as RelayRecord[]) : [];
  } catch {
    return [];
  }
}

async function writeAll(rows: RelayRecord[]) {
  await fs.mkdir(DIR, { recursive: true });
  await fs.writeFile(FILE, JSON.stringify(rows, null, 2), "utf8");
}

function nextSeq(rows: RelayRecord[]) {
  const max = rows.reduce((n, r) => {
    const part = Number(r.ref.split("-")[2]);
    return Number.isFinite(part) ? Math.max(n, part) : n;
  }, 400);
  return max + 1;
}

function makeRef(seq: number) {
  const suffix = crypto.randomBytes(3).toString("hex").toUpperCase().slice(0, 5);
  return `LD-${new Date().getFullYear()}-${seq}-${suffix}`;
}

async function notify(record: RelayRecord) {
  const url = process.env.RELAY_WEBHOOK_URL;
  if (!url) return;
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "help_request", ...record }),
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    // 中继失败不影响本地受理，接应端会通过定时拉取补偿
  }
}

export async function createRecord(input: {
  region: string;
  category: string;
  summary: string;
  priority: "P0" | "P1";
  family?: RelayFamily;
}): Promise<RelayRecord> {
  const now = new Date();
  const rows = (await readAll()).filter(
    (r) => (now.getTime() - new Date(r.createdAt).getTime()) / 86_400_000 <= RETENTION_DAYS
  );
  const family = input.family
    ? {
        name: input.family.name?.slice(0, 40),
        contact: input.family.contact?.slice(0, 60),
        channel: input.family.channel ?? "sms",
        verify: input.family.verify?.slice(0, 80),
        status: input.family.status?.slice(0, 40),
        place: input.family.place?.slice(0, 80),
      }
    : undefined;
  const record: RelayRecord = {
    ref: makeRef(nextSeq(rows)),
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    status: "received",
    region: input.region.slice(0, 80),
    category: input.category.slice(0, 40),
    priority: input.priority,
    summary: input.summary.slice(0, 1200),
    family,
  };
  await writeAll([record, ...rows]);
  void notify(record);
  return record;
}

export async function getRecord(ref: string): Promise<RelayRecord | null> {
  const want = ref.trim().toUpperCase();
  if (!want) return null;
  const rows = await readAll();
  return rows.find((r) => r.ref.toUpperCase() === want) ?? null;
}

export const relayTransitions: Record<RelayStatus, RelayStatus[]> = {
  received: ["reviewing", "referred", "closed"],
  reviewing: ["referred", "closed"],
  referred: ["closed"],
  closed: [],
};

export async function listRecords(status?: string, limit = 30): Promise<RelayRecord[]> {
  const rows = await readAll();
  const filtered =
    status && status in relayTransitions
      ? rows.filter((r) => r.status === status)
      : rows;
  return filtered
    .slice()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, Math.min(Math.max(limit, 1), 100));
}

export async function markNotified(ref: string): Promise<void> {
  const want = ref.trim().toUpperCase();
  const rows = await readAll();
  const index = rows.findIndex((r) => r.ref.toUpperCase() === want);
  if (index < 0) return;
  rows[index] = { ...rows[index], notifiedAt: new Date().toISOString() };
  await writeAll(rows);
}
export type UpdateResult =
  | { ok: true; record: RelayRecord }
  | { ok: false; reason: "not_found" | "invalid_transition" };

export async function updateStatus(
  ref: string,
  next: RelayStatus,
  actor = "console"
): Promise<UpdateResult> {
  const want = ref.trim().toUpperCase();
  const rows = await readAll();
  const index = rows.findIndex((r) => r.ref.toUpperCase() === want);
  if (index < 0) return { ok: false, reason: "not_found" };

  const current = rows[index];
  if (!relayTransitions[current.status].includes(next)) {
    return { ok: false, reason: "invalid_transition" };
  }

  const updatedAt = new Date().toISOString();
  const record: RelayRecord = { ...current, status: next, updatedAt };
  rows[index] = record;
  await writeAll(rows);

  try {
    const auditRaw = await fs.readFile(AUDIT_FILE, "utf8");
    const audit = JSON.parse(auditRaw);
    if (Array.isArray(audit)) {
      audit.unshift({ at: updatedAt, ref: record.ref, from: current.status, to: next, actor });
      await fs.writeFile(AUDIT_FILE, JSON.stringify(audit.slice(0, 500), null, 2), "utf8");
    }
  } catch {
    await fs.writeFile(
      AUDIT_FILE,
      JSON.stringify(
        [{ at: updatedAt, ref: record.ref, from: current.status, to: next, actor }],
        null,
        2
      ),
      "utf8"
    );
  }

  return { ok: true, record };
}
