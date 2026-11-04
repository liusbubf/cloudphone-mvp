import { NextResponse } from "next/server";
import { consoleGuard } from "@/lib/console-auth";
import { listRecords, relayTransitions, updateStatus, type RelayStatus } from "@/lib/relay";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const hits = new Map<string, number[]>();

function throttled(ip: string) {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < 3_600_000);
  if (recent.length >= 60) {
    hits.set(ip, recent);
    return true;
  }
  recent.push(now);
  hits.set(ip, recent);
  return false;
}

function guard(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (throttled(ip)) {
    return NextResponse.json({ error: "too_many_requests" }, { status: 429 });
  }
  return consoleGuard(request);
}

export async function GET(request: Request) {
  const blocked = guard(request);
  if (blocked) return blocked;

  const url = new URL(request.url);
  const status = url.searchParams.get("status") ?? "";
  const limit = Number(url.searchParams.get("limit") ?? "30");
  const rows = await listRecords(status || undefined, Number.isFinite(limit) ? limit : 30);

  return NextResponse.json({
    total: rows.length,
    items: rows.map((r) => ({
      ref: r.ref,
      status: r.status,
      category: r.category,
      region: r.region,
      priority: r.priority,
      summary: r.summary,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      notifiedAt: r.notifiedAt ?? null,
      family: r.family ?? null,
      next: relayTransitions[r.status],
    })),
  });
}

export async function PATCH(request: Request) {
  const blocked = guard(request);
  if (blocked) return blocked;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const ref = String(body.ref ?? "").trim();
  const next = String(body.status ?? "").trim() as RelayStatus;
  const actor = String(body.actor ?? "").replace(/[\u0000-\u001f]/g, " ").trim().slice(0, 40) || "console";

  if (!ref) return NextResponse.json({ error: "ref_required" }, { status: 400 });
  if (!(next in relayTransitions)) {
    return NextResponse.json({ error: "invalid_status" }, { status: 400 });
  }

  const result = await updateStatus(ref, next, actor);
  if (!result.ok) {
    if (result.reason === "not_found") {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    return NextResponse.json({ error: "invalid_transition" }, { status: 409 });
  }

  return NextResponse.json({
    ref: result.record.ref,
    status: result.record.status,
    updatedAt: result.record.updatedAt,
  });
}
