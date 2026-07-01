import { SourceTypeBadge } from "@/components/shared/SourceTypeBadge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import type { StudentRagAnswerSource } from "@/lib/types";

type StudentSourceCardProps = {
  source: StudentRagAnswerSource;
};

export function StudentSourceCard({ source }: StudentSourceCardProps) {
  return (
    <Card className="border-[hsl(var(--line))] bg-[hsl(var(--paper))] shadow-sm">
      <CardHeader className="space-y-3 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <CardTitle className="flex min-w-0 gap-3 text-base leading-6 text-[hsl(var(--ink-navy))]">
              <span className="font-mono text-sm text-[hsl(var(--evidence-teal))]">[{source.source_number}]</span>
              <span className="min-w-0 break-words">{source.document_title}</span>
            </CardTitle>
            <dl className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm text-[hsl(var(--slate))]">
              {source.page_number ? <InlineMetadata label="Page" value={String(source.page_number)} /> : null}
              {source.section_title ? <InlineMetadata label="Section" value={source.section_title} /> : null}
            </dl>
          </div>
          <SourceTypeBadge sourceType={source.source_type} />
        </div>
      </CardHeader>
    </Card>
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
      <dd className="min-w-0 break-words font-mono">{value}</dd>
    </div>
  );
}
