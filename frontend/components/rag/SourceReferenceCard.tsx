import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SourceTypeBadge } from "@/components/shared/SourceTypeBadge";
import type { RagAnswerSource } from "@/lib/types";

type SourceReferenceCardProps = {
  source: RagAnswerSource;
};

export function SourceReferenceCard({ source }: SourceReferenceCardProps) {
  return (
    <Card className="border-l-4 border-l-teal-700">
      <CardHeader className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="leading-6">
              Source {source.source_number}: {source.document_title}
            </CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">{source.document_id}</p>
          </div>
          <SourceTypeBadge sourceType={source.source_type} />
        </div>
      </CardHeader>
      <CardContent>
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          {source.page_number ? <Metadata label="Page" value={String(source.page_number)} /> : null}
          {source.section_title ? <Metadata label="Section" value={source.section_title} /> : null}
          <Metadata className="sm:col-span-2" label="Chunk ID" value={source.chunk_id} />
        </dl>
      </CardContent>
    </Card>
  );
}

type MetadataProps = {
  label: string;
  value: string;
  className?: string;
};

function Metadata({ label, value, className }: MetadataProps) {
  return (
    <div className={className}>
      <dt className="font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-1 break-words text-foreground">{value}</dd>
    </div>
  );
}
