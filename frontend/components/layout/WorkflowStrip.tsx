import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  { key: "uploaded", label: "Upload source", detail: "Add an advising document" },
  { key: "extracted", label: "Prepare text", detail: "Read the source content" },
  { key: "chunked", label: "Index evidence", detail: "Make passages searchable" },
  { key: "search", label: "Verify evidence", detail: "Inspect supporting sources" },
  { key: "ask", label: "Test answer", detail: "Review citations and guidance" },
];

export function WorkflowStrip({ progress }: WorkflowStripProps) {
  return (
    <details className="group rounded-lg border border-[hsl(var(--line))] bg-[hsl(var(--paper))] shadow-sm">
      <summary className="flex cursor-pointer list-none flex-col gap-2 px-5 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--focus-blue))] sm:flex-row sm:items-center sm:justify-between [&::-webkit-details-marker]:hidden">
        <div>
          <p className="text-sm font-semibold text-[hsl(var(--ink-navy))]">How the uniAdvisor workflow works</p>
          <p className="mt-1 text-sm leading-5 text-[hsl(var(--slate))]">
            Documents are processed into searchable evidence before they can be used for grounded answers.
          </p>
        </div>
        <span className="text-sm font-medium text-[hsl(var(--evidence-teal))] group-open:hidden">Show steps</span>
        <span className="hidden text-sm font-medium text-[hsl(var(--evidence-teal))] group-open:inline">Hide steps</span>
      </summary>

      <Card className="rounded-none border-x-0 border-b-0 border-t border-[hsl(var(--line))] bg-transparent shadow-none">
        <CardHeader className="pb-3">
          <CardTitle className="font-serif text-lg text-[hsl(var(--ink-navy))]">Manual source workflow</CardTitle>
        </CardHeader>
        <CardContent>
          <section aria-label="Advising source workflow" className="grid gap-3 min-[900px]:grid-cols-5">
            {steps.map((step, index) => {
              const done = getStepDone(step.key, progress);

              return (
                <div
                  className={cn(
                    "rounded-md border p-3",
                    done
                      ? "border-[hsl(var(--evidence-teal))] bg-[hsl(var(--evidence-teal-tint))]"
                      : "border-[hsl(var(--line))] bg-background"
                  )}
                  key={step.label}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "flex size-8 shrink-0 items-center justify-center rounded-full border text-sm font-semibold",
                        done
                          ? "border-[hsl(var(--evidence-teal))] bg-[hsl(var(--evidence-teal))] text-white"
                          : "border-[hsl(var(--line))] bg-[hsl(var(--paper))] text-[hsl(var(--ink-navy))]"
                      )}
                    >
                      {done ? "✓" : index + 1}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[hsl(var(--ink-navy))]">{step.label}</p>
                      <p className="text-xs text-[hsl(var(--slate))]">{step.detail}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </section>
        </CardContent>
      </Card>
    </details>
  );
}

function getStepDone(stepKey: string, progress: WorkflowProgress) {
  if (stepKey === "uploaded") {
    return progress.uploaded;
  }
  if (stepKey === "extracted") {
    return progress.extracted;
  }
  if (stepKey === "chunked") {
    return progress.chunked;
  }
  if (stepKey === "search" || stepKey === "ask") {
    return stepKey === "search" ? progress.searched : progress.asked;
  }
  return false;
}
