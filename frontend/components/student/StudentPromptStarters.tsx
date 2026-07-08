type PromptStarterGroup = {
  title: string;
  prompts: string[];
};

type StudentPromptStartersProps = {
  groups: PromptStarterGroup[];
  onSelect: (prompt: string) => void;
};

export function StudentPromptStarters({ groups, onSelect }: StudentPromptStartersProps) {
  return (
    <section className="grid gap-3" aria-label="Prompt starters">
      {groups.map((group) => (
        <div
          className="min-w-0 overflow-hidden rounded-lg border border-[hsl(var(--line))] bg-white/75 p-3 sm:p-4"
          key={group.title}
        >
          <h3 className="text-sm font-semibold text-[hsl(var(--ink-navy))]">{group.title}</h3>
          <div className="mt-3 flex min-w-0 max-w-full gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible sm:pb-0">
            {group.prompts.map((prompt) => (
              <button
                className="min-h-10 max-w-[78vw] shrink-0 whitespace-normal rounded-md border border-[hsl(var(--line))] bg-[hsl(var(--paper))] px-3 py-2 text-left text-sm font-medium leading-5 text-[hsl(var(--ink-navy))] transition-colors hover:border-[hsl(var(--evidence-teal))] hover:bg-[hsl(var(--evidence-teal-tint))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--focus-blue))] sm:max-w-none sm:shrink"
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
    </section>
  );
}
