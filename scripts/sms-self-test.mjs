#!/usr/bin/env node
// 短信通道自检：向指定号码发一条测试短信，确认配置可用。
// 用法：node scripts/sms-self-test.mjs +8613xxxxxxxxx

import crypto from "node:crypto";

const to = process.argv[2];
if (!to) {
  console.error("用法：node scripts/sms-self-test.mjs +8613xxxxxxxxx");
  process.exit(1);
}

const message = "【海隅自检】短信通道可用，收到即表示配置成功，无需回复。";

const sid = process.env.TWILIO_ACCOUNT_SID;
const token = process.env.TWILIO_AUTH_TOKEN;
const from = process.env.TWILIO_FROM;
const webhook = process.env.SMS_WEBHOOK_URL;
const base = process.env.TWILIO_API_BASE || "https://api.twilio.com";

const ak = process.env.ALIYUN_SMS_ACCESS_KEY_ID;
const sk = process.env.ALIYUN_SMS_ACCESS_KEY_SECRET;
const signName = process.env.ALIYUN_SMS_SIGN_NAME;
const tpl = process.env.ALIYUN_SMS_TEMPLATE_CODE;

const enc = (v) =>
  encodeURIComponent(v).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);

function aliyunSign(params, secret) {
  const canonical = Object.keys(params)
    .sort()
    .map((k) => `${enc(k)}=${enc(params[k])}`)
    .join("&");
  return crypto.createHmac("sha1", `${secret}&`).update(`POST&${enc("/")}&${enc(canonical)}`).digest("base64");
}

if (ak && sk && signName && tpl) {
  console.log(`provider: aliyun → ${to}`);
  const mapping = (() => {
    try {
      return JSON.parse(process.env.ALIYUN_SMS_TEMPLATE_PARAMS || "{}");
    } catch {
      return {};
    }
  })();
  const filled = Object.keys(mapping).length
    ? Object.fromEntries(Object.keys(mapping).map((k) => [k, "自检"]))
    : { ref: "TEST-SELFTEST", name: "自检", verify: "无", place: "自检", state: "自检" };
  const params = {
    AccessKeyId: ak,
    Action: "SendSms",
    Format: "JSON",
    PhoneNumbers: to,
    RegionId: process.env.ALIYUN_SMS_REGION || "cn-hangzhou",
    SignName: signName,
    SignatureMethod: "HMAC-SHA1",
    SignatureNonce: crypto.randomUUID(),
    SignatureVersion: "1.0",
    TemplateCode: tpl,
    TemplateParam: JSON.stringify(filled),
    Timestamp: new Date().toISOString().replace(/\.\d{3}Z$/, "Z"),
    Version: "2017-05-25",
  };
  params.Signature = aliyunSign(params, sk);
  try {
    const res = await fetch(`${process.env.ALIYUN_SMS_API_BASE || "https://dysmsapi.aliyuncs.com"}/`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(params).toString(),
      signal: AbortSignal.timeout(10_000),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.Code === "OK") {
      console.log("OK: sent", data.RequestId ? `request=${data.RequestId}` : "");
      process.exit(0);
    }
    console.error(`FAIL: aliyun ${data.Code ?? res.status} ${data.Message ?? ""}`);
    process.exit(2);
  } catch (error) {
    console.error("FAIL: network", error?.message ?? error);
    process.exit(2);
  }
}

if (sid && token && from) {
  console.log(`provider: twilio → ${to}`);
  try {
    const res = await fetch(`${base}/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: to, From: from, Body: message }).toString(),
      signal: AbortSignal.timeout(10_000),
    });
    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      console.log("OK: sent", data.sid ? `sid=${data.sid}` : "");
      process.exit(0);
    }
    const body = await res.text().catch(() => "");
    console.error(`FAIL: Twilio ${res.status} ${body.slice(0, 200)}`);
    process.exit(2);
  } catch (error) {
    console.error("FAIL: network", error?.message ?? error);
    process.exit(2);
  }
}

if (webhook) {
  console.log(`provider: webhook → ${to}`);
  try {
    const res = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to,
        channel: "sms",
        message,
        ref: "TEST-SELFTEST",
        segments: [message],
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (res.ok) {
      console.log("OK: accepted by gateway");
      process.exit(0);
    }
    console.error(`FAIL: gateway ${res.status}`);
    process.exit(2);
  } catch (error) {
    console.error("FAIL: network", error?.message ?? error);
    process.exit(2);
  }
}

console.error("未配置任何短信通道：请在 .env.local 设置 TWILIO_* 或 SMS_WEBHOOK_URL");
process.exit(1);
