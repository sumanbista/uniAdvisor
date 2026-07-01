import { Badge } from "@/components/ui/badge";
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
  { key: "uploaded", label: "Upload", detail: "Add document" },
  { key: "extracted", label: "Extract", detail: "Read text" },
  { key: "chunked", label: "Chunk", detail: "Index evidence" },
  { key: "search", label: "Search", detail: "Inspect sources" },
  { key: "ask", label: "Ask", detail: "Answer with citations" },
];

const modules = ["Foundation", "Documents UI", "Search UI", "Ask UI", "Student View"];

export function WorkflowStrip({ progress }: WorkflowStripProps) {
  return (
    <Card className="border-[hsl(var(--line))] bg-[hsl(var(--paper))] shadow-sm">
      <CardHeader className="space-y-3">
        <CardTitle className="font-serif text-xl text-[hsl(var(--ink-navy))]">Pipeline status</CardTitle>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {modules.map((module) => (
            <Badge
              className="shrink-0 bg-[hsl(var(--evidence-teal-tint))] text-[hsl(var(--evidence-teal))]"
              key={module}
            >
              {module}
            </Badge>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        <section aria-label="Document workflow" className="grid gap-3 min-[900px]:grid-cols-5">
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
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm font-semibold",
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
