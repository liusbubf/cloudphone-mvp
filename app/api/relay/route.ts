import { NextResponse } from "next/server";
import { createRecord, getRecord } from "@/lib/relay";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const hits = new Map<string, number[]>();

function tooMany(ip: string) {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < 3_600_000);
  if (recent.length >= 8) {
    hits.set(ip, recent);
    return true;
  }
  recent.push(now);
  hits.set(ip, recent);
  return false;
}

function clean(value: unknown, max: number) {
  return String(value ?? "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .trim()
    .slice(0, max);
}

export async function POST(request: Request) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "local";
  if (tooMany(ip)) {
    return NextResponse.json({ error: "too_many_requests" }, { status: 429 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const summary = clean(body.summary, 1200);
  if (summary.length < 4) {
    return NextResponse.json({ error: "summary_too_short" }, { status: 400 });
  }

  const raw = body.family as Record<string, unknown> | undefined;
  const contact = raw ? clean(raw.contact, 60) : "";
  const family =
    raw && contact.length >= 5
      ? {
          name: clean(raw.name, 40),
          contact,
          channel:
            raw.channel === "whatsapp" || raw.channel === "email"
              ? (raw.channel as "whatsapp" | "email")
              : ("sms" as const),
          verify: clean(raw.verify, 80),
          status: clean(raw.status, 40),
          place: clean(raw.place, 80),
        }
      : undefined;

  const record = await createRecord({
    region: clean(body.region, 80) || "未知",
    category: clean(body.category, 40) || "园区线索",
    summary,
    priority: body.priority === "P1" ? "P1" : "P0",
    family,
  });

  return NextResponse.json({ ref: record.ref, status: record.status }, { status: 201 });
}

export async function GET(request: Request) {
  const ref = new URL(request.url).searchParams.get("ref") ?? "";
  if (!ref) {
    return NextResponse.json({ error: "ref_required" }, { status: 400 });
  }
  const record = await getRecord(ref);
  if (!record) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  return NextResponse.json({
    ref: record.ref,
    status: record.status,
    region: record.region,
    category: record.category,
    priority: record.priority,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  });
}
