import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SourceTypeBadge } from "@/components/shared/SourceTypeBadge";
import { Separator } from "@/components/ui/separator";
import type { RagSearchResult } from "@/lib/types";

type SearchResultCardProps = {
  result: RagSearchResult;
  rank: number;
};

export function SearchResultCard({ result, rank }: SearchResultCardProps) {
  return (
    <Card className="border-[hsl(var(--line))] border-l-[3px] border-l-[hsl(var(--evidence-teal))] bg-white shadow-none">
      <CardHeader className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-normal text-[hsl(var(--slate))]">
              Evidence {rank}
            </p>
            <CardTitle className="mt-1 text-lg font-semibold leading-6 text-[hsl(var(--ink-navy))]">
              {result.document_title}
            </CardTitle>
          </div>
          <div className="flex flex-wrap gap-2">
            <SourceTypeBadge sourceType={result.source_type} />
            {typeof result.score === "number" ? (
              <Badge className="bg-[hsl(var(--secondary))] text-[hsl(var(--focus-blue))]" variant="secondary">
                Evidence match: {formatEvidenceMatch(result.score)}
              </Badge>
            ) : null}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
          {result.page_number ? <Metadata label="Page" value={String(result.page_number)} /> : null}
          {result.section_title ? <Metadata label="Section" value={result.section_title} /> : null}
          {result.academic_year ? <Metadata label="Academic year" value={result.academic_year} /> : null}
          <Metadata label="Department" value={result.department} />
          <Metadata label="Program" value={result.program} />
        </div>

        <Separator />

        <blockquote className="rounded-md bg-[hsl(var(--muted))] px-4 py-3 text-sm leading-7 text-foreground">
          <p className="whitespace-pre-wrap">{result.text}</p>
        </blockquote>
      </CardContent>
    </Card>
  );
}

function formatEvidenceMatch(score: number) {
  const percent = score <= 1 ? score * 100 : score;
  return `${Math.max(0, Math.min(100, Math.round(percent)))}%`;
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
