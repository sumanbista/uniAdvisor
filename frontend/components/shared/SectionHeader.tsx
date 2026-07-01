type SectionHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
};

export function SectionHeader({ eyebrow, title, description }: SectionHeaderProps) {
  return (
    <div className="space-y-1">
      {eyebrow ? (
        <p className="text-xs font-semibold uppercase tracking-normal text-[hsl(var(--slate))]">{eyebrow}</p>
      ) : null}
      <h2 className="font-serif text-xl font-semibold tracking-normal text-[hsl(var(--ink-navy))]">{title}</h2>
      {description ? <p className="max-w-3xl text-sm leading-6 text-[hsl(var(--slate))]">{description}</p> : null}
    </div>
  );
}
