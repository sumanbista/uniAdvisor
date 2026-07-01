import { SourceTypeBadge } from "@/components/shared/SourceTypeBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { RagAnswerSource } from "@/lib/types";

type StudentSourceCardProps = {
  source: RagAnswerSource;
};

export function StudentSourceCard({ source }: StudentSourceCardProps) {
  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="text-base leading-6">
              Source {source.source_number}: {source.document_title}
            </CardTitle>
          </div>
          <SourceTypeBadge sourceType={source.source_type} />
        </div>
      </CardHeader>
      {(source.page_number || source.section_title) ? (
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
      <dd className="mt-1 text-foreground">{value}</dd>
    </div>
  );
}
