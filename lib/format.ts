import type {
  ChannelType,
  ConversationStatus,
  LeadCategory,
  LeadStatus,
  TicketStatus,
} from "./types";

export const channelMeta: Record<
  ChannelType,
  { label: string; short: string; color: string; glyph: string }
> = {
  telegram: { label: "Telegram", short: "TG", color: "#7f9dd6", glyph: "✈" },
  whatsapp: { label: "WhatsApp", short: "WA", color: "#8fbf8a", glyph: "◍" },
  line: { label: "LINE", short: "LI", color: "#b6c96a", glyph: "▤" },
  webchat: { label: "在线咨询", short: "WEB", color: "#d9a3a0", glyph: "◇" },
  email: { label: "邮箱", short: "MAIL", color: "#b3aca0", glyph: "✉" },
  sms: { label: "短信", short: "SMS", color: "#c8a15f", glyph: "▦" },
};

export const conversationStatusMeta: Record<
  ConversationStatus,
  { label: string; tone: "oxide" | "sage" | "muted" | "cobalt" }
> = {
  open: { label: "处理中", tone: "cobalt" },
  pending: { label: "待跟进", tone: "oxide" },
  closed: { label: "已归档", tone: "muted" },
  flagged: { label: "高风险", tone: "oxide" },
};

export const leadStatusMeta: Record<LeadStatus, { label: string; tone: "oxide" | "sage" | "muted" | "cobalt" }> = {
  new: { label: "待分级", tone: "oxide" },
  triage: { label: "分级中", tone: "cobalt" },
  evidence: { label: "取证中", tone: "oxide" },
  referred: { label: "已转介", tone: "sage" },
  closed: { label: "已结案", tone: "muted" },
};

export const ticketStatusMeta: Record<TicketStatus, { label: string; tone: "oxide" | "sage" | "muted" | "cobalt" }> = {
  open: { label: "进行中", tone: "cobalt" },
  waiting: { label: "等待中", tone: "oxide" },
  resolved: { label: "已解决", tone: "sage" },
};

export const leadCategories: LeadCategory[] = [
  "虚假招聘",
  "园区线索",
  "护照扣押",
  "资金诈骗",
  "人员失联",
];

const SHANGHAI_OFFSET_MS = 8 * 3600 * 1000;

/** 统一按 UTC+8 计算，避免服务端与浏览器时区不同造成水合不一致 */
function shifted(iso: string): Date | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return new Date(d.getTime() + SHANGHAI_OFFSET_MS);
}

export function formatTime(iso: string): string {
  const d = shifted(iso);
  if (!d) return "—";
  return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
}

export function formatDate(iso: string): string {
  const d = shifted(iso);
  if (!d) return "—";
  return `${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

export function formatWhen(iso: string): string {
  const d = shifted(iso);
  if (!d) return "—";
  const today = shifted("2026-11-04T00:00:00+08:00")!;
  const dayDiff = Math.round(
    (Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) -
      Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())) /
      86400000
  );
  if (dayDiff === 0) return `今天 ${formatTime(iso)}`;
  if (dayDiff === -1) return `昨天 ${formatTime(iso)}`;
  return `${formatDate(iso)} ${formatTime(iso)}`;
}

export function initials(name: string): string {
  return name
    .replace(/[^\p{L}\p{N}]/gu, "")
    .slice(0, 2)
    .toUpperCase();
}

export function riskBand(score: number): "high" | "mid" | "low" {
  if (score >= 75) return "high";
  if (score >= 45) return "mid";
  return "low";
}
