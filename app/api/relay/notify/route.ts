import { NextResponse } from "next/server";
import { consoleGuard } from "@/lib/console-auth";
import { getRecord, markNotified } from "@/lib/relay";
import { notifyFamily } from "@/lib/notify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const blocked = consoleGuard(request);
  if (blocked) return blocked;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const ref = String(body.ref ?? "").trim();
  if (!ref) return NextResponse.json({ error: "ref_required" }, { status: 400 });

  const record = await getRecord(ref);
  if (!record) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (!record.family?.contact) {
    return NextResponse.json({ error: "no_family_contact" }, { status: 422 });
  }
  if (record.notifiedAt) {
    return NextResponse.json(
      { error: "already_notified", notifiedAt: record.notifiedAt },
      { status: 409 }
    );
  }

  const result = await notifyFamily(record);
  if (result.status !== "failed") await markNotified(record.ref);

  return NextResponse.json(
    {
      ref: record.ref,
      status: result.status,
      channel: record.family.channel ?? "sms",
      to: record.family.contact,
      message: result.message,
      segments: result.segments ?? [result.message],
      provider: result.provider ?? "none",
      queued: result.status === "queued",
    },
    { status: result.status === "failed" ? 502 : 200 }
  );
}
