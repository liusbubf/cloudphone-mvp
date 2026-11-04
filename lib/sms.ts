import crypto from "node:crypto";
import type { NoticeStatus } from "@/lib/notify";

export type SmsProvider = "aliyun" | "twilio" | "webhook" | "none";

export interface SmsResult {
  status: NoticeStatus;
  provider: SmsProvider;
  error?: string;
}

function aliyunReady(): boolean {
  return Boolean(
    process.env.ALIYUN_SMS_ACCESS_KEY_ID &&
      process.env.ALIYUN_SMS_ACCESS_KEY_SECRET &&
      process.env.ALIYUN_SMS_SIGN_NAME &&
      process.env.ALIYUN_SMS_TEMPLATE_CODE
  );
}

export function smsProvider(): SmsProvider {
  if (aliyunReady()) return "aliyun";
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM) {
    return "twilio";
  }
  if (process.env.SMS_WEBHOOK_URL) return "webhook";
  return "none";
}

function percentEncode(value: string): string {
  return encodeURIComponent(value).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
}

function aliyunSign(params: Record<string, string>, secret: string): string {
  const canonical = Object.keys(params)
    .sort()
    .map((key) => `${percentEncode(key)}=${percentEncode(params[key])}`)
    .join("&");
  const stringToSign = `POST&${percentEncode("/")}&${percentEncode(canonical)}`;
  return crypto.createHmac("sha1", `${secret}&`).update(stringToSign).digest("base64");
}

function templateMapping(): Record<string, string> {
  const raw = process.env.ALIYUN_SMS_TEMPLATE_PARAMS;
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as Record<string, string>;
      if (parsed && typeof parsed === "object") return parsed;
    } catch {
      // 配置写错时退回默认映射，不阻断发送
    }
  }
  return { ref: "ref", name: "name", verify: "verify", place: "place", state: "state" };
}

export async function sendSms(input: {
  to: string;
  message: string;
  ref: string;
  channel: string;
  segments?: string[];
  params?: Record<string, string>;
}): Promise<SmsResult> {
  const provider = smsProvider();

  if (provider === "aliyun" && input.channel === "sms") {
    const base = process.env.ALIYUN_SMS_API_BASE || "https://dysmsapi.aliyuncs.com";
    const mapping = templateMapping();
    const template = Object.fromEntries(
      Object.entries(mapping).map(([variable, source]) => [
        variable,
        (input.params?.[source] ?? "").slice(0, 40),
      ])
    );
    const params: Record<string, string> = {
      AccessKeyId: process.env.ALIYUN_SMS_ACCESS_KEY_ID as string,
      Action: "SendSms",
      Format: "JSON",
      PhoneNumbers: input.to,
      RegionId: process.env.ALIYUN_SMS_REGION || "cn-hangzhou",
      SignName: process.env.ALIYUN_SMS_SIGN_NAME as string,
      SignatureMethod: "HMAC-SHA1",
      SignatureNonce: crypto.randomUUID(),
      SignatureVersion: "1.0",
      TemplateCode: process.env.ALIYUN_SMS_TEMPLATE_CODE as string,
      TemplateParam: JSON.stringify(template),
      Timestamp: new Date().toISOString().replace(/\.\d{3}Z$/, "Z"),
      Version: "2017-05-25",
    };
    params.Signature = aliyunSign(params, process.env.ALIYUN_SMS_ACCESS_KEY_SECRET as string);

    try {
      const res = await fetch(`${base}/`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams(params).toString(),
        signal: AbortSignal.timeout(10_000),
      });
      const data = (await res.json().catch(() => ({}))) as { Code?: string; Message?: string };
      if (res.ok && data.Code === "OK") return { status: "sent", provider };
      return {
        status: "failed",
        provider,
        error: `aliyun_${data.Code ?? res.status}`,
      };
    } catch {
      return { status: "failed", provider, error: "network" };
    }
  }

  if (provider === "twilio" && input.channel === "sms") {
    const sid = process.env.TWILIO_ACCOUNT_SID as string;
    const token = process.env.TWILIO_AUTH_TOKEN as string;
    const base = process.env.TWILIO_API_BASE || "https://api.twilio.com";
    try {
      const res = await fetch(`${base}/2010-04-01/Accounts/${sid}/Messages.json`, {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          To: input.to,
          From: process.env.TWILIO_FROM as string,
          Body: input.message,
        }).toString(),
        signal: AbortSignal.timeout(10_000),
      });
      if (res.ok) return { status: "sent", provider };
      return { status: "failed", provider, error: `twilio_${res.status}` };
    } catch {
      return { status: "failed", provider, error: "network" };
    }
  }

  if (provider === "webhook") {
    try {
      const res = await fetch(process.env.SMS_WEBHOOK_URL as string, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: input.to,
          channel: input.channel,
          message: input.message,
          ref: input.ref,
          segments: input.segments,
        }),
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok) return { status: "sent", provider };
      return { status: "failed", provider, error: `provider_${res.status}` };
    } catch {
      return { status: "failed", provider, error: "network" };
    }
  }

  return { status: "queued", provider };
}
