"use client";

import { useEffect, useSyncExternalStore } from "react";
import { seedState } from "./mock-data";
import type {
  Evidence,
  Lead,
  LeadCategory,
  Ticket,
  WorkspaceState,
} from "./types";

const STORAGE_KEY = "seaworkspace.v1";
export const CURRENT_USER = "林澈";

const serverSnapshot: WorkspaceState = seedState();
let state: WorkspaceState = seedState();
let hydrated = false;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function persist(next: WorkspaceState) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* 存储不可用时退化为内存态 */
  }
}

function commit(next: WorkspaceState, persistNow = true) {
  state = next;
  if (persistNow) persist(next);
  emit();
}

function update(mutator: (s: WorkspaceState) => WorkspaceState, persistNow = true) {
  commit(mutator(state), persistNow);
}

export function hydrate() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as WorkspaceState;
      if (parsed && Array.isArray(parsed.conversations)) state = parsed;
    }
  } catch {
    /* 忽略损坏的本地数据，回落到种子数据 */
  }
  emit();
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function getSnapshot() {
  return state;
}

function getServerSnapshot() {
  return serverSnapshot;
}

export function useWorkspace() {
  useEffect(() => {
    hydrate();
  }, []);
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

const now = () => new Date().toISOString();
const uid = (p: string) => `${p}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

function withAudit(
  s: WorkspaceState,
  action: string,
  target: string,
  detail: string
): WorkspaceState {
  return {
    ...s,
    audit: [
      {
        id: uid("au"),
        at: now(),
        actor: CURRENT_USER,
        action,
        target,
        detail,
        ip: "10.8.2.14",
      },
      ...s.audit,
    ],
  };
}

/* ---------------------------------- 收件箱 --------------------------------- */

export function sendMessage(conversationId: string, body: string) {
  const text = body.trim();
  if (!text) return;
  update((s) => {
    const conv = s.conversations.find((c) => c.id === conversationId);
    const next = withAudit(
      s,
      "消息发出",
      conversationId,
      `${conv?.contactName ?? "会话"} · ${text.slice(0, 24)}${text.length > 24 ? "…" : ""}`
    );
    return {
      ...next,
      messages: [
        ...next.messages,
        {
          id: uid("m"),
          conversationId,
          direction: "out",
          author: CURRENT_USER,
          body: text,
          at: now(),
          state: "delivered",
        },
      ],
      conversations: next.conversations.map((c) =>
        c.id === conversationId
          ? { ...c, lastAt: now(), summary: text.slice(0, 60) }
          : c
      ),
    };
  });
}

export function markConversationRead(conversationId: string) {
  update((s) => ({
    ...s,
    conversations: s.conversations.map((c) =>
      c.id === conversationId ? { ...c, unread: 0 } : c
    ),
  }));
}

export function setConversationStatus(
  conversationId: string,
  status: WorkspaceState["conversations"][number]["status"]
) {
  update((s) =>
    withAudit(
      {
        ...s,
        conversations: s.conversations.map((c) =>
          c.id === conversationId ? { ...c, status } : c
        ),
      },
      "会话状态变更",
      conversationId,
      `状态 → ${status}`
    )
  );
}

/* ----------------------------------- 线索 ---------------------------------- */

export function addLead(
  input: {
    source: string;
    region: string;
    category: LeadCategory;
    summary: string;
    priority: Lead["priority"];
    consentOnFile: boolean;
  },
  opts?: { persist?: boolean }
): Lead {
  let created!: Lead;
  update((s) => {
    const seq = 413 + s.leads.length;
    const lead: Lead = {
      id: uid("ld"),
      ref: `LD-2026-${seq}`,
      source: input.source,
      region: input.region,
      category: input.category,
      summary: input.summary,
      status: "new",
      priority: input.priority,
      assignedTo: "未分配",
      reportedAt: now(),
      consentOnFile: input.consentOnFile,
      evidence: [],
    };
    created = lead;
    return withAudit(
      { ...s, leads: [lead, ...s.leads] },
      "线索登记",
      lead.ref,
      `来源 ${input.source}，类别 ${input.category}`
    );
  }, opts?.persist ?? true);
  return created;
}

export function setLeadStatus(leadId: string, status: Lead["status"]) {
  update((s) => {
    const lead = s.leads.find((l) => l.id === leadId);
    return withAudit(
      {
        ...s,
        leads: s.leads.map((l) => (l.id === leadId ? { ...l, status } : l)),
      },
      "线索状态变更",
      lead?.ref ?? leadId,
      `状态 → ${status}`
    );
  });
}

export function assignLead(leadId: string, assignee: string) {
  update((s) => {
    const lead = s.leads.find((l) => l.id === leadId);
    return withAudit(
      {
        ...s,
        leads: s.leads.map((l) => (l.id === leadId ? { ...l, assignedTo: assignee } : l)),
      },
      "线索派发",
      lead?.ref ?? leadId,
      `指派给 ${assignee}`
    );
  });
}

export function addEvidence(leadId: string, kind: Evidence["kind"], name: string) {
  update((s) => {
    const lead = s.leads.find((l) => l.id === leadId);
    const evidence: Evidence = {
      id: uid("ev"),
      kind,
      name,
      hash: `sha256:${Math.random().toString(16).slice(2, 10)}…${Math.random()
        .toString(16)
        .slice(2, 6)}`,
      addedAt: now(),
      addedBy: CURRENT_USER,
    };
    return withAudit(
      {
        ...s,
        leads: s.leads.map((l) =>
          l.id === leadId ? { ...l, evidence: [evidence, ...l.evidence] } : l
        ),
      },
      "证据留存",
      lead?.ref ?? leadId,
      `新增${kind} ${name}`
    );
  });
}

/* ----------------------------------- 工单 ---------------------------------- */

export function setTicketStatus(ticketId: string, status: Ticket["status"]) {
  update((s) => {
    const t = s.tickets.find((x) => x.id === ticketId);
    return withAudit(
      {
        ...s,
        tickets: s.tickets.map((x) => (x.id === ticketId ? { ...x, status } : x)),
      },
      "工单状态变更",
      t?.ref ?? ticketId,
      `状态 → ${status}`
    );
  });
}

export function assignTicket(ticketId: string, assignee: string) {
  update((s) => {
    const t = s.tickets.find((x) => x.id === ticketId);
    return withAudit(
      {
        ...s,
        tickets: s.tickets.map((x) => (x.id === ticketId ? { ...x, assignee } : x)),
      },
      "工单派发",
      t?.ref ?? ticketId,
      `指派给 ${assignee}`
    );
  });
}

export function addTicketReply(ticketId: string, body: string, internal: boolean) {
  const text = body.trim();
  if (!text) return;
  update((s) => {
    const t = s.tickets.find((x) => x.id === ticketId);
    const next = withAudit(
      s,
      internal ? "工单内部备注" : "工单回复",
      t?.ref ?? ticketId,
      text.slice(0, 32)
    );
    return {
      ...next,
      tickets: next.tickets.map((x) =>
        x.id === ticketId
          ? {
              ...x,
              replies: [
                ...x.replies,
                { id: uid("tr"), author: CURRENT_USER, body: text, at: now(), internal },
              ],
            }
          : x
      ),
    };
  });
}

/* --------------------------------- 渠道 / 设置 -------------------------------- */

export function toggleChannel(channelId: string) {
  update((s) => {
    const ch = s.channels.find((c) => c.id === channelId);
    const status = ch?.status === "paused" ? "connected" : "paused";
    return withAudit(
      {
        ...s,
        channels: s.channels.map((c) => (c.id === channelId ? { ...c, status } : c)),
      },
      "渠道状态变更",
      ch?.name ?? channelId,
      `状态 → ${status === "paused" ? "已暂停" : "已连接"}`
    );
  });
}

export function updateSettings(patch: Partial<WorkspaceState["settings"]>) {
  update((s) => withAudit({ ...s, settings: { ...s.settings, ...patch } }, "设置变更", "工作区", Object.keys(patch).join(", ")));
}

export function resetWorkspace() {
  commit(seedState());
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(STORAGE_KEY);
  }
}
