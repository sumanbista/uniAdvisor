type WorkspaceGuideProps = {
  titleId: string;
};

export function WorkspaceGuide({ titleId }: WorkspaceGuideProps) {
  return (
    <aside className="h-fit xl:sticky xl:top-24" aria-labelledby={titleId}>
      <details className="rounded-lg border border-[hsl(var(--line))] bg-white p-4 text-sm xl:p-5">
        <summary className="cursor-pointer text-base font-semibold text-[hsl(var(--ink-navy))]" id={titleId}>
          Workspace guide
        </summary>
        <p className="mt-3 leading-6 text-[hsl(var(--slate))]">Build a trustworthy knowledge base in four clear steps.</p>
        <ol className="mt-5 flex flex-col gap-5">
          <GuideStep number="1" title="Add official sources">Use current catalogs, checksheets, policies, and advising guides.</GuideStep>
          <GuideStep number="2" title="Process the source">Prepare the content so it can be searched as evidence.</GuideStep>
          <GuideStep number="3" title="Verify the evidence">Search for key requirements and confirm the passages are accurate.</GuideStep>
          <GuideStep number="4" title="Test an answer">Ask a realistic student question and review its sources.</GuideStep>
        </ol>
      </details>
    </aside>
  );
}

function GuideStep({ children, number, title }: { children: string; number: string; title: string }) {
  return (
    <li className="flex gap-3">
      <span aria-hidden="true" className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--secondary))] text-xs font-bold text-[hsl(var(--focus-blue))]">{number}</span>
      <span>
        <span className="block text-sm font-semibold text-[hsl(var(--ink-navy))]">{title}</span>
        <span className="mt-1 block text-xs leading-5 text-[hsl(var(--slate))]">{children}</span>
      </span>
    </li>
  );
}
