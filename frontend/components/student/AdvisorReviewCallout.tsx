type AdvisorReviewCalloutProps = {
  reasons: string[];
};

export function AdvisorReviewCallout({ reasons }: AdvisorReviewCalloutProps) {
  return (
    <aside className="rounded-lg border border-[hsl(var(--verify-amber))]/35 bg-[hsl(var(--verify-amber-tint))] p-4 text-sm leading-6 text-[hsl(var(--ink-navy))]">
      <p className="font-semibold">Confirm this with an academic advisor</p>
      <ul className="mt-2 list-disc pl-5 text-[hsl(var(--slate))]">
        {reasons.map((reason) => <li key={reason}>{reason}</li>)}
      </ul>
      <p className="mt-3 border-t border-[hsl(var(--verify-amber))]/20 pt-3 text-[hsl(var(--slate))]">
        uniAdvisor cannot contact an advisor for you. Bring this question and the listed sources to your academic advisor or registrar.
      </p>
    </aside>
  );
}
