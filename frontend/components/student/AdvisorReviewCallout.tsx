"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

type AdvisorReviewCalloutProps = {
  reasons: string[];
};

export function AdvisorReviewCallout({ reasons }: AdvisorReviewCalloutProps) {
  const [showFutureNote, setShowFutureNote] = useState(false);

  return (
    <div className="rounded-md border border-[hsl(var(--verify-amber))]/40 bg-[hsl(var(--verify-amber-tint))] p-4 text-sm leading-6 text-[hsl(var(--ink-navy))]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <p className="font-semibold">Advisor review recommended</p>
          <ul className="list-disc space-y-1 pl-5 text-[hsl(var(--slate))]">
            {reasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        </div>
        <Button
          className="shrink-0 border-[hsl(var(--verify-amber))]/50 bg-white/70 text-[hsl(var(--ink-navy))] hover:bg-white"
          onClick={() => setShowFutureNote(true)}
          type="button"
          variant="outline"
        >
          Request Advisor Review
        </Button>
      </div>
      {showFutureNote ? (
        <p className="mt-3 border-t border-[hsl(var(--verify-amber))]/30 pt-3 text-[hsl(var(--slate))]">
          Advisor review workflow is planned for a future version. For now, please contact your academic
          advisor with this question and the listed sources.
        </p>
      ) : null}
    </div>
  );
}
