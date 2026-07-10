import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SourceTypeBadge } from "@/components/shared/SourceTypeBadge";
import type { RagAnswerSource } from "@/lib/types";

type SourceReferenceCardProps = {
  source: RagAnswerSource;
};

export function SourceReferenceCard({ source }: SourceReferenceCardProps) {
  const hasSourceLocation = Boolean(source.page_number || source.section_title);

  return (
    <Card className="border-l-4 border-l-teal-700">
      <CardHeader className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="leading-6">
              Source {source.source_number}: {source.document_title}
            </CardTitle>
          </div>
          <SourceTypeBadge sourceType={source.source_type} />
        </div>
      </CardHeader>
      {hasSourceLocation ? (
        <CardContent>
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            {source.page_number ? <Metadata label="Page" value={String(source.page_number)} /> : null}
            {source.section_title ? <Metadata label="Section" value={source.section_title} /> : null}
          </dl>
        </CardContent>
      ) : null}
    </Card>
  );
}

type MetadataProps = {
  label: string;
  value: string;
};

function Metadata({ label, value }: MetadataProps) {
  return (
    <div>
      <dt className="font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-1 break-words text-foreground">{value}</dd>
    </div>
  );
}
