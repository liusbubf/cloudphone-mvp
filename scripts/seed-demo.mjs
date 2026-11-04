#!/usr/bin/env node
// 演示数据：写入几条带「演示」标记的求助记录，用于首次打开时查看界面。
// 用法：node scripts/seed-demo.mjs [--if-empty]
// 只在本地/演示环境使用；所有内容均为虚构，不含真实联系方式。

import fs from "node:fs";
import path from "node:path";

const ifEmpty = process.argv.includes("--if-empty");
const dir = path.join(process.cwd(), ".data");
const file = path.join(dir, "relay.json");

if (ifEmpty) {
  try {
    const existing = JSON.parse(fs.readFileSync(file, "utf8"));
    if (Array.isArray(existing) && existing.length > 0) {
      console.log(`演示数据：已有 ${existing.length} 条记录，跳过`);
      process.exit(0);
    }
  } catch {
    // 文件不存在或为空，继续写入
  }
}

const now = Date.now();
const hoursAgo = (h) => new Date(now - h * 3_600_000).toISOString();

const rows = [
  {
    ref: "LD-2026-901-DEMO1",
    createdAt: hoursAgo(6),
    updatedAt: hoursAgo(3),
    status: "received",
    region: "（演示）缅甸 妙瓦底",
    category: "演示 · 拘禁求助",
    priority: "P0",
    summary: "【演示数据】当事人称被扣押在园区，请求把消息带给家人。此记录为虚构，用于展示接应端界面。",
  },
  {
    ref: "LD-2026-902-DEMO2",
    createdAt: hoursAgo(20),
    updatedAt: hoursAgo(4),
    status: "reviewing",
    region: "（演示）柬埔寨 西港",
    category: "演示 · 转达家属",
    priority: "P1",
    summary: "【演示数据】请求代为转达平安信息，家属联系方式已收到但未发送。此记录为虚构。",
  },
  {
    ref: "LD-2026-903-DEMO3",
    createdAt: hoursAgo(40),
    updatedAt: hoursAgo(12),
    status: "referred",
    region: "（演示）老挝 金三角",
    category: "演示 · 已转介",
    priority: "P0",
    summary: "【演示数据】已转介给合作机构，等待回执。此记录为虚构。",
  },
  {
    ref: "LD-2026-904-DEMO4",
    createdAt: hoursAgo(72),
    updatedAt: hoursAgo(48),
    status: "closed",
    region: "（演示）泰国 湄索",
    category: "演示 · 已结案",
    priority: "P1",
    summary: "【演示数据】当事人已与家属取得联系，案件关闭。此记录为虚构。",
  },
];

fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(file, JSON.stringify(rows, null, 2));
console.log(`演示数据：已写入 ${rows.length} 条到 .data/relay.json（全部为虚构内容）`);
