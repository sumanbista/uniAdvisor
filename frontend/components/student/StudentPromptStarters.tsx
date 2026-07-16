type PromptStarterGroup = { title: string; prompts: string[] };

export function StudentPromptStarters({ groups, onSelect }: { groups: PromptStarterGroup[]; onSelect: (prompt: string) => void }) {
  return (
    <section aria-labelledby="prompt-starters-title" className="py-6 sm:py-8">
      <div className="mb-4 flex items-baseline justify-between gap-4">
        <h2 className="text-sm font-semibold text-[hsl(var(--ink-navy))]" id="prompt-starters-title">Start with a common question</h2>
        <p className="hidden text-xs text-[hsl(var(--slate))] sm:block">Selecting one fills the question box</p>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {groups.map((group) => (
          <div className="rounded-lg border border-[hsl(var(--line))] bg-white p-4" key={group.title}>
            <h3 className="text-xs font-bold uppercase tracking-[0.08em] text-[hsl(var(--slate))]">{group.title}</h3>
            <div className="mt-3 flex flex-col gap-1">
              {group.prompts.map((prompt) => (
                <button
                  className="rounded-md px-2 py-2 text-left text-sm font-medium leading-5 text-[hsl(var(--ink-navy))] transition-colors hover:bg-[hsl(var(--secondary))] hover:text-[hsl(var(--focus-blue))]"
                  key={prompt}
                  onClick={() => onSelect(prompt)}
                  type="button"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
