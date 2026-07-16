type PromptStarterGroup = { title: string; prompts: string[] };

export function StudentPromptStarters({ groups, onSelect }: { groups: PromptStarterGroup[]; onSelect: (prompt: string) => void }) {
  return (
    <section aria-labelledby="prompt-starters-title" className="mt-7 sm:mt-9">
      <h2 className="text-center font-serif text-lg font-semibold text-[hsl(var(--ink-navy))] sm:text-xl" id="prompt-starters-title">
        Start with a common question
      </h2>
      <p className="mt-1 text-center text-xs text-[hsl(var(--slate))]">Selecting one fills the question box</p>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {groups.flatMap((group) =>
          group.prompts.map((prompt) => (
            <button
              className="group flex min-h-14 items-center gap-3 rounded-lg border border-[hsl(var(--line))] bg-white px-4 py-3 text-left transition-[border-color,background-color,transform] duration-200 hover:-translate-y-0.5 hover:border-[hsl(var(--focus-blue))]/35 hover:bg-[hsl(var(--secondary))]/55 focus-visible:border-[hsl(var(--focus-blue))]"
              key={prompt}
              onClick={() => onSelect(prompt)}
              type="button"
            >
              <span className="shrink-0 text-[0.625rem] font-bold uppercase tracking-[0.08em] text-[hsl(var(--slate))]">
                {group.title}
              </span>
              <span aria-hidden="true" className="h-5 w-px shrink-0 bg-[hsl(var(--line))]" />
              <span className="text-sm font-medium leading-5 text-[hsl(var(--ink-navy))] transition-colors group-hover:text-[hsl(var(--focus-blue))]">
                {prompt}
              </span>
            </button>
          ))
        )}
      </div>
    </section>
  );
}
