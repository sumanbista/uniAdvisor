const steps = [
  { label: "Upload", detail: "Add documents" },
  { label: "Extract", detail: "Read text" },
  { label: "Chunk", detail: "Index evidence" },
  { label: "Search", detail: "Inspect sources" },
  { label: "Ask", detail: "Answer with citations" },
];

export function WorkflowStrip() {
  return (
    <section aria-label="Document workflow" className="rounded-lg border bg-card p-4 shadow-sm">
      <div className="grid gap-3 md:grid-cols-5">
        {steps.map((step, index) => (
          <div className="flex items-center gap-3" key={step.label}>
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
              {index + 1}
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">{step.label}</p>
              <p className="text-xs text-muted-foreground">{step.detail}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
