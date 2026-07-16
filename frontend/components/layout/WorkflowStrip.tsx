import { cn } from "@/lib/utils";

export type WorkflowProgress = {
  uploaded: boolean;
  extracted: boolean;
  chunked: boolean;
  searched: boolean;
  asked: boolean;
};

type WorkflowStripProps = {
  progress: WorkflowProgress;
};

const steps = [
  { key: "uploaded", label: "Add advising sources", detail: "Upload official materials." },
  { key: "chunked", label: "Process source", detail: "Prepare it for evidence search." },
  { key: "searched", label: "Verify indexed evidence", detail: "Review the passages students may rely on." },
  { key: "asked", label: "Test student-style questions", detail: "Check answers, confidence, and sources." },
] as const;

export function WorkflowStrip({ progress }: WorkflowStripProps) {
  return (
    <aside aria-label="Advising workflow" className="lg:sticky lg:top-24 lg:self-start">
      <details className="rounded-lg border border-[hsl(var(--line))] bg-white p-3 text-sm lg:hidden">
        <summary className="cursor-pointer font-semibold text-[hsl(var(--ink-navy))]">
          Advising workflow
        </summary>
        <WorkflowSteps progress={progress} />
      </details>

      <div className="hidden lg:block">
        <h2 className="text-xs font-bold uppercase tracking-[0.12em] text-[hsl(var(--slate))]">
          Advising workflow
        </h2>
        <WorkflowSteps progress={progress} />
      </div>

      <details className="mt-4 rounded-lg border border-[hsl(var(--line))] bg-white p-3 text-sm lg:mt-8 lg:p-4">
        <summary className="cursor-pointer font-semibold text-[hsl(var(--ink-navy))]">How processing works</summary>
        <p className="mt-3 leading-6 text-[hsl(var(--slate))]">
          Processing prepares source text and makes its passages searchable. Advanced controls are available after upload when troubleshooting is needed.
        </p>
      </details>
    </aside>
  );
}

function WorkflowSteps({ progress }: WorkflowStripProps) {
  return (
    <ol className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-1 lg:gap-0">
      {steps.map((step, index) => {
        const done = progress[step.key];
        const active = isCurrentStep(index, progress);
        return (
          <li
            className={cn(
              "relative flex gap-2 rounded-lg px-2 py-3 sm:gap-3 sm:px-3 lg:rounded-none lg:px-0 lg:py-4",
              active && "bg-[hsl(var(--secondary))] lg:-mx-3 lg:rounded-lg lg:px-3",
            )}
            key={step.key}
          >
            {index < steps.length - 1 ? (
              <span aria-hidden="true" className="absolute left-[1.45rem] top-11 hidden h-[calc(100%-1.75rem)] border-l border-dashed border-[hsl(var(--input))] lg:block" />
            ) : null}
            <span
              aria-hidden="true"
              className={cn(
                "relative flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-bold",
                done
                  ? "border-[hsl(var(--evidence-teal))] bg-[hsl(var(--evidence-teal))] text-white"
                  : active
                    ? "border-[hsl(var(--focus-blue))] bg-[hsl(var(--focus-blue))] text-white"
                    : "border-[hsl(var(--input))] bg-white text-[hsl(var(--slate))]",
              )}
            >
              {done ? "✓" : index + 1}
            </span>
            <span>
              <span className="block text-sm font-semibold leading-5 text-[hsl(var(--ink-navy))]">{step.label}</span>
              <span className="mt-1 block text-xs leading-5 text-[hsl(var(--slate))]">{step.detail}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function isCurrentStep(index: number, progress: WorkflowProgress) {
  const values = [progress.uploaded, progress.chunked, progress.searched, progress.asked];
  const firstIncomplete = values.findIndex((value) => !value);
  return index === (firstIncomplete === -1 ? values.length - 1 : firstIncomplete);
}
