import { SourceReferenceCard } from "@/components/rag/SourceReferenceCard";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { RagAskResponse, RagConfidence } from "@/lib/types";
import { cn } from "@/lib/utils";

type AnswerCardProps = {
  answer: RagAskResponse;
};

const confidenceStyles: Record<RagConfidence, string> = {
  high: "bg-emerald-700 text-white",
  medium: "bg-secondary text-secondary-foreground",
  low: "bg-amber-100 text-amber-900",
};

export function AnswerCard({ answer }: AnswerCardProps) {
  const refusalMessage = answer.refusal_reason || answer.answer;

  return (
    <div className="space-y-4">
      <Card className={answer.refused ? "border-amber-300 bg-amber-50" : undefined}>
        <CardHeader className="space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle>{answer.refused ? "Answer Refused" : "Grounded Answer"}</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">{answer.question}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge className={cn(confidenceStyles[answer.confidence])}>Confidence: {answer.confidence}</Badge>
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
              <div className="rounded-md border bg-background px-3 py-2 text-sm text-muted-foreground">
                {answer.advisor_note}
              </div>
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
