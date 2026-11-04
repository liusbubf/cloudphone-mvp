export type ChannelType = "telegram" | "whatsapp" | "line" | "webchat" | "email" | "sms";

export type ChannelStatus = "connected" | "paused" | "needs_auth";

export interface Channel {
  id: string;
  name: string;
  type: ChannelType;
  handle: string;
  status: ChannelStatus;
  owner: string;
  region: string;
  messagesToday: number;
  lastSync: string;
  /** 所有渠道当前均为 mock 适配器，未接入任何真实平台 */
  adapter: "mock";
}

export type ConversationStatus = "open" | "pending" | "closed" | "flagged";

export interface Conversation {
  id: string;
  channelId: string;
  contactName: string;
  handle: string;
  region: string;
  tags: string[];
  unread: number;
  status: ConversationStatus;
  assignedTo: string;
  riskScore: number;
  lastAt: string;
  summary: string;
}

export interface Message {
  id: string;
  conversationId: string;
  direction: "in" | "out";
  author: string;
  body: string;
  at: string;
  state: "sent" | "delivered" | "read";
}

export interface Template {
  id: string;
  name: string;
  category: string;
  lang: string;
  body: string;
}

export type LeadStatus = "new" | "triage" | "evidence" | "referred" | "closed";
export type LeadCategory =
  | "虚假招聘"
  | "园区线索"
  | "护照扣押"
  | "资金诈骗"
  | "人员失联";

export interface Evidence {
  id: string;
  kind: "截图" | "录音" | "文本" | "链接";
  name: string;
  hash: string;
  addedAt: string;
  addedBy: string;
}

export interface Lead {
  id: string;
  ref: string;
  source: string;
  region: string;
  category: LeadCategory;
  summary: string;
  status: LeadStatus;
  priority: "P0" | "P1" | "P2";
  assignedTo: string;
  reportedAt: string;
  consentOnFile: boolean;
  referral?: string;
  evidence: Evidence[];
}

export type TicketStatus = "open" | "waiting" | "resolved";
export type TicketPriority = "高" | "中" | "低";

export interface TicketReply {
  id: string;
  author: string;
  body: string;
  at: string;
  internal: boolean;
}

export interface Ticket {
  id: string;
  ref: string;
  subject: string;
  requester: string;
  channel: ChannelType;
  assignee: string;
  priority: TicketPriority;
  status: TicketStatus;
  slaDue: string;
  createdAt: string;
  replies: TicketReply[];
}

export interface AuditEvent {
  id: string;
  at: string;
  actor: string;
  action: string;
  target: string;
  detail: string;
  ip: string;
}

export interface Agent {
  id: string;
  name: string;
  role: "管理员" | "组长" | "客服" | "审核员" | "只读";
  scope: string;
  status: "online" | "offline";
  load: number;
}

export interface HelpChannel {
  id: string;
  name: string;
  region: string;
  contact: string;
  hours: string;
  note: string;
}

export interface Settings {
  dataRetentionDays: number;
  requireConsent: boolean;
  maskPii: boolean;
  outboundRateLimit: number;
  workspaceName: string;
}

export interface WorkspaceState {
  channels: Channel[];
  conversations: Conversation[];
  messages: Message[];
  templates: Template[];
  leads: Lead[];
  tickets: Ticket[];
  audit: AuditEvent[];
  agents: Agent[];
  helpChannels: HelpChannel[];
  settings: Settings;
}
