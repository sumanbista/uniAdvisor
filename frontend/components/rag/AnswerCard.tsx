import { SourceReferenceCard } from "@/components/rag/SourceReferenceCard";
import { Badge } from "@/components/ui/badge";
import { ConfidenceBadge } from "@/components/shared/ConfidenceBadge";
import { InfoNote } from "@/components/shared/InfoNote";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { RagAskResponse } from "@/lib/types";

type AnswerCardProps = {
  answer: RagAskResponse;
};

export function AnswerCard({ answer }: AnswerCardProps) {
  const refusalMessage = answer.refusal_reason || answer.answer;

  return (
    <div className="space-y-4">
      <Card className={answer.refused ? "border-amber-300 bg-amber-50" : "border-l-4 border-l-primary"}>
        <CardHeader className="space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
                {answer.refused ? "Careful refusal" : "Generated from retrieved evidence"}
              </p>
              <CardTitle>{answer.refused ? "The system is being careful" : "Grounded Answer"}</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">{answer.question}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <ConfidenceBadge confidence={answer.confidence} />
              {answer.refused ? <Badge className="bg-amber-200 text-amber-950">Refused</Badge> : null}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="whitespace-pre-wrap text-sm leading-6 text-foreground">
            {answer.refused ? refusalMessage : answer.answer}
          </p>

          {answer.advisor_note ? (
            <>
              <Separator />
              <InfoNote title="Advisor note">{answer.advisor_note}</InfoNote>
            </>
          ) : null}
        </CardContent>
      </Card>

      {answer.sources.length > 0 ? (
        <section className="space-y-3">
          <h3 className="text-base font-semibold">Source References</h3>
          <div className="grid gap-4 lg:grid-cols-2">
            {answer.sources.map((source) => (
              <SourceReferenceCard key={`${source.source_number}-${source.chunk_id}`} source={source} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
