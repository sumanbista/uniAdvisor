type EmptyStateProps = {
  title: string;
  description: string;
};

export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <div className="min-h-40 rounded-lg border border-dashed border-[hsl(var(--line))] bg-white p-8 text-center">
      <h3 className="text-base font-semibold text-[hsl(var(--ink-navy))]">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">{description}</p>
    </div>
  );
}
