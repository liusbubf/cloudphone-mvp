import { NextResponse } from "next/server";
import { smsProvider } from "@/lib/sms";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "sea-desk",
    time: new Date().toISOString(),
    smsProvider: smsProvider(),
    demoMode: process.env.DEMO_MODE === "1",
    consoleConfigured: Boolean(process.env.RELAY_CONSOLE_TOKEN),
  });
}
