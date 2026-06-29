import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { RagSearchResult } from "@/lib/types";

type SearchResultCardProps = {
  result: RagSearchResult;
  rank: number;
};

export function SearchResultCard({ result, rank }: SearchResultCardProps) {
  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="leading-6">
              {rank}. {result.document_title}
            </CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">{result.document_id}</p>
          </div>
          {typeof result.score === "number" ? (
            <Badge variant="secondary">Score: {result.score.toFixed(2)}</Badge>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
          <Metadata label="Source type" value={result.source_type} />
          <Metadata label="Page" value={result.page_number ? String(result.page_number) : "Not specified"} />
          <Metadata label="Section" value={result.section_title || "Not specified"} />
          <Metadata label="Academic year" value={result.academic_year || "Not specified"} />
          <Metadata label="Department" value={result.department} />
          <Metadata label="Program" value={result.program} />
        </div>

        <Separator />

        <p className="whitespace-pre-wrap text-sm leading-6 text-foreground">{result.text}</p>
      </CardContent>
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
