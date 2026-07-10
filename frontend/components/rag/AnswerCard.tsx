import { SourceReferenceCard } from "@/components/rag/SourceReferenceCard";
import { Badge } from "@/components/ui/badge";
import { ConfidenceRibbon } from "@/components/shared/ConfidenceRibbon";
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
      <ConfidenceRibbon confidence={answer.confidence} confidenceScore={answer.confidence_score} />

      <Card
        className={
          answer.refused
            ? "border-[hsl(var(--verify-amber))] bg-[hsl(var(--verify-amber-tint))]"
            : "border-l-4 border-l-[hsl(var(--evidence-teal))] bg-[hsl(var(--paper))]"
        }
      >
        <CardHeader className="space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-normal text-[hsl(var(--slate))]">
                {answer.refused ? "Careful academic boundary" : "Generated from source evidence"}
              </p>
              <CardTitle className="font-serif text-xl text-[hsl(var(--ink-navy))]">
                {answer.refused ? "uniAdvisor cannot determine that from documents alone" : "Grounded answer"}
              </CardTitle>
              <p className="mt-1 text-sm leading-6 text-[hsl(var(--slate))]">{answer.question}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {answer.refused ? (
                <Badge className="bg-[hsl(var(--verify-amber))] text-white">Needs advisor review</Badge>
              ) : null}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="whitespace-pre-wrap text-sm leading-7 text-foreground">
            {answer.refused ? refusalMessage : answer.answer}
          </p>
        </CardContent>
      </Card>

      {answer.sources.length > 0 ? (
        <section className="space-y-3">
          <h3 className="font-serif text-lg font-semibold text-[hsl(var(--ink-navy))]">Source references</h3>
          <div className="grid gap-4 lg:grid-cols-2">
            {answer.sources.map((source) => (
              <SourceReferenceCard key={`${source.source_number}-${source.chunk_id}`} source={source} />
            ))}
          </div>
        </section>
      ) : null}

      {answer.advisor_note || answer.refused ? (
        <>
          <Separator />
          <InfoNote title="Advisor note" tone="warning">
            {answer.advisor_note || refusalMessage}
          </InfoNote>
        </>
      ) : null}
    </div>
  );
}
