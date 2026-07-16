import { SourceTypeBadge } from "@/components/shared/SourceTypeBadge";
import type { StudentRagAnswerSource } from "@/lib/types";

type StudentSourceCardProps = {
  source: StudentRagAnswerSource;
};

export function StudentSourceCard({ source }: StudentSourceCardProps) {
  const snippet = getSourceSnippet(source);

  return (
    <article className="rounded-lg border border-[hsl(var(--line))] bg-[hsl(var(--muted))] p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h4 className="flex min-w-0 gap-3 text-sm font-semibold leading-6 text-[hsl(var(--ink-navy))]">
            <span className="text-xs text-[hsl(var(--evidence-teal))]">Source {source.source_number}</span>
            <span className="min-w-0 break-words">{source.document_title}</span>
          </h4>
          <dl className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-sm text-[hsl(var(--slate))]">
            {source.page_number ? <InlineMetadata label="Page" value={String(source.page_number)} /> : null}
            {source.section_title ? <InlineMetadata label="Section" value={source.section_title} /> : null}
          </dl>
        </div>
        <SourceTypeBadge sourceType={source.source_type} />
      </div>
      {snippet ? <blockquote className="mt-3 border-l-2 border-[hsl(var(--evidence-teal))]/35 pl-3 text-sm leading-6 text-[hsl(var(--slate))]">{snippet}</blockquote> : null}
    </article>
  );
}

type MetadataProps = {
  label: string;
  value: string;
};

function InlineMetadata({ label, value }: MetadataProps) {
  return (
    <div className="flex min-w-0 gap-1">
      <dt className="font-medium">{label}:</dt>
      <dd className="min-w-0 break-words">{value}</dd>
    </div>
  );
}

function getSourceSnippet(source: StudentRagAnswerSource) {
  const rawSnippet = source.snippet || source.text;
  if (!rawSnippet?.trim()) {
    return null;
  }

  const compact = rawSnippet.replace(/\s+/g, " ").trim();
  return compact.length > 220 ? `${compact.slice(0, 217)}...` : compact;
}
