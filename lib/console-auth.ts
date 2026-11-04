import crypto from "node:crypto";
import { NextResponse } from "next/server";

export type AuthState = "ok" | "unauthorized" | "not_configured";

export function checkConsole(request: Request): AuthState {
  const token = process.env.RELAY_CONSOLE_TOKEN ?? "";
  if (!token) return "not_configured";
  const header = request.headers.get("authorization") ?? "";
  const provided = header.startsWith("Bearer ")
    ? header.slice(7).trim()
    : (request.headers.get("x-console-token") ?? "").trim();
  if (!provided) return "unauthorized";
  const a = Buffer.from(provided);
  const b = Buffer.from(token);
  if (a.length !== b.length) return "unauthorized";
  return crypto.timingSafeEqual(a, b) ? "ok" : "unauthorized";
}

export function consoleGuard(request: Request): NextResponse | null {
  const state = checkConsole(request);
  if (state === "not_configured") {
    return NextResponse.json(
      { error: "console_not_configured", hint: "请设置环境变量 RELAY_CONSOLE_TOKEN" },
      { status: 503 }
    );
  }
  if (state === "unauthorized") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return null;
}
