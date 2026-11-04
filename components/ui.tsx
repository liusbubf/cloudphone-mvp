"use client";

import type { ReactNode } from "react";
import clsx from "clsx";
import type { ChannelType, Lead } from "@/lib/types";
import { channelMeta, initials, riskBand } from "@/lib/format";

export type Tone = "oxide" | "sage" | "muted" | "cobalt";

const toneClass: Record<Tone, string> = {
  oxide: "border-oxide/40 bg-oxide-soft text-oxide",
  sage: "border-sage/40 bg-sage-soft text-sage",
  muted: "border-ink-700 bg-ink-850 text-muted",
  cobalt: "border-cobalt/35 bg-[rgba(127,157,214,0.12)] text-cobalt",
};

export function Pill({
  tone = "muted",
  children,
  className,
}: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
}) {
  return <span className={clsx("tag", toneClass[tone], className)}>{children}</span>;
}

export function ChannelGlyph({ type, size = 18 }: { type: ChannelType; size?: number }) {
  const meta = channelMeta[type];
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-[2px] border font-mono"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.52,
        color: meta.color,
        borderColor: `${meta.color}44`,
        background: `${meta.color}11`,
      }}
      title={meta.label}
    >
      {meta.glyph}
    </span>
  );
}

export function Avatar({ name, size = 34 }: { name: string; size?: number }) {
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full border border-ink-700 bg-ink-800 font-mono text-bone"
      style={{ width: size, height: size, fontSize: size * 0.34 }}
    >
      {initials(name)}
    </span>
  );
}

export function RiskMeter({ score, compact }: { score: number; compact?: boolean }) {
  const band = riskBand(score);
  const color = band === "high" ? "var(--oxide)" : band === "mid" ? "#c8a15f" : "var(--sage)";
  const label = band === "high" ? "高" : band === "mid" ? "中" : "低";
  return (
    <span className="inline-flex items-center gap-2">
      <span className="relative block h-[3px] w-14 bg-ink-700">
        <span
          className="absolute inset-y-0 left-0"
          style={{ width: `${Math.min(100, score)}%`, background: color }}
        />
      </span>
      {!compact && (
        <span className="font-mono text-[10px] tabular-nums" style={{ color }}>
          {label} · {score}
        </span>
      )}
    </span>
  );
}

export function SectionHeading({
  index,
  title,
  meta,
  action,
}: {
  index: string;
  title: string;
  meta?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-4 border-b border-ink-700 pb-3">
      <div className="flex items-baseline gap-3">
        <span className="font-mono text-[10px] text-muted/70">{index}</span>
        <h2 className="font-display text-[26px] leading-none tracking-[-0.01em] text-bone">{title}</h2>
        {meta && <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">{meta}</span>}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center">
      <div className="font-display text-[18px] text-muted">{title}</div>
      {hint && <div className="max-w-sm text-[12px] leading-relaxed text-muted/70">{hint}</div>}
    </div>
  );
}

export function LeadPriority({ priority }: { priority: Lead["priority"] }) {
  const tone: Tone =
    priority === "P0" ? "oxide" : priority === "P1" ? "cobalt" : "muted";
  return (
    <Pill tone={tone} className="tracking-[0.16em]">
      {priority}
    </Pill>
  );
}

export function Hairline({ className }: { className?: string }) {
  return <div className={clsx("h-px w-full bg-ink-700", className)} />;
}

export function KpiCard({
  label,
  value,
  unit,
  delta,
  hint,
  accent,
}: {
  label: string;
  value: string | number;
  unit?: string;
  delta?: string;
  hint?: string;
  accent?: boolean;
}) {
  return (
    <div className="panel relative overflow-hidden p-5">
      <div className="flex items-start justify-between">
        <span className="label-mono">{label}</span>
        {delta && (
          <span
            className={clsx(
              "font-mono text-[10px] tabular-nums",
              delta.startsWith("-") ? "text-sage" : "text-oxide"
            )}
          >
            {delta}
          </span>
        )}
      </div>
      <div className="mt-5 flex items-baseline gap-1.5">
        <span
          className="font-display text-[38px] leading-none tabular-nums tracking-[-0.02em]"
          style={accent ? { color: "var(--oxide)" } : undefined}
        >
          {value}
        </span>
        {unit && <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">{unit}</span>}
      </div>
      {hint && <div className="mt-2 text-[11px] leading-snug text-muted/80">{hint}</div>}
    </div>
  );
}
