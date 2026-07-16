import { SourceTypeBadge } from "@/components/shared/SourceTypeBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { RagAnswerSource } from "@/lib/types";

export function SourceReferenceCard({ source }: { source: RagAnswerSource }) {
  const snippet = source.snippet || source.text;
  return (
    <Card className="border-[hsl(var(--line))] bg-[hsl(var(--muted))] shadow-none">
      <CardHeader className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-[hsl(var(--evidence-teal))]">Source {source.source_number}</p>
            <CardTitle className="mt-1 break-words text-base leading-6 text-[hsl(var(--ink-navy))]">{source.document_title}</CardTitle>
          </div>
          <SourceTypeBadge sourceType={source.source_type} />
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {source.page_number || source.section_title ? (
          <dl className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-[hsl(var(--slate))]">
            {source.page_number ? <Metadata label="Page" value={String(source.page_number)} /> : null}
            {source.section_title ? <Metadata label="Section" value={source.section_title} /> : null}
          </dl>
        ) : null}
        {snippet ? <blockquote className="border-l-2 border-[hsl(var(--evidence-teal))]/35 pl-3 text-sm leading-6 text-[hsl(var(--slate))]">{compactSnippet(snippet)}</blockquote> : null}
      </CardContent>
    </Card>
  );
}

function Metadata({ label, value }: { label: string; value: string }) { return <div className="flex gap-1"><dt className="font-medium">{label}:</dt><dd>{value}</dd></div>; }
function compactSnippet(value: string) { const compact = value.replace(/\s+/g, " ").trim(); return compact.length > 260 ? `${compact.slice(0, 257)}…` : compact; }
