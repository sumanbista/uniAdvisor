import type { RagConfidence } from "@/lib/types";
import { cn } from "@/lib/utils";

type ConfidenceRibbonProps = {
  confidence?: RagConfidence | null;
  confidenceScore?: number | null;
};

export function ConfidenceRibbon({ confidence, confidenceScore }: ConfidenceRibbonProps) {
  const hasScore = typeof confidenceScore === "number" && !Number.isNaN(confidenceScore);
  const percent = hasScore ? normalizePercent(confidenceScore) : 0;
  const display = displayForPercent(percent, confidence, hasScore);
  const scoreLabel = hasScore ? `${percent}% match` : "Score unavailable";

  return (
    <section
      aria-label={`Confidence: ${display.label}, ${scoreLabel}`}
      className="rounded-md border border-[hsl(var(--line))] bg-[hsl(var(--paper))] p-4 shadow-sm"
    >
      <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
        <p className={cn("text-sm font-semibold", display.tone)}>{display.label}</p>
        <p className="font-mono text-sm font-semibold text-[hsl(var(--ink-navy))]">{scoreLabel}</p>
      </div>

      <div className="mt-4" aria-hidden="true">
        <div className="relative h-3 rounded-full bg-[hsl(var(--evidence-teal-tint))]">
          <div className="absolute inset-y-0 left-1/3 w-px bg-white/90" />
          <div className="absolute inset-y-0 left-2/3 w-px bg-white/90" />
          <div
            className="absolute top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-[hsl(var(--evidence-teal))] shadow"
            style={{ left: `${percent}%` }}
          />
        </div>
        <div className="mt-2 grid grid-cols-3 gap-2 text-xs text-[hsl(var(--slate))]">
          <span>Needs advisor</span>
          <span className="text-center">Partial</span>
          <span className="text-right">Strong match</span>
        </div>
      </div>
    </section>
  );
}

function normalizePercent(value?: number | null) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return 0;
  }
  return Math.max(0, Math.min(100, Math.round(value)));
}

function displayForPercent(percent: number, confidence?: RagConfidence | null, hasScore = true) {
  if (!hasScore && confidence) {
    return {
      label: `Returned confidence: ${confidence}`,
      tone: confidence === "low" ? "text-[hsl(var(--verify-amber))]" : "text-[hsl(var(--ink-navy-70))]",
    };
  }
  if (percent >= 75) {
    return {
      label: "Strong source match",
      tone: "text-[hsl(var(--evidence-teal))]",
    };
  }
  if (percent >= 35) {
    return {
      label: "Partial source match",
      tone: "text-[hsl(var(--ink-navy-70))]",
    };
  }
  return {
    label: "Needs advisor review",
    tone: "text-[hsl(var(--verify-amber))]",
  };
}
