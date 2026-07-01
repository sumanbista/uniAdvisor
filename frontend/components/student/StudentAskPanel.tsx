"use client";

import { FormEvent, useState } from "react";

import { StudentAnswerCard } from "@/components/student/StudentAnswerCard";
import { ErrorMessage } from "@/components/shared/ErrorMessage";
import { InfoNote } from "@/components/shared/InfoNote";
import { LoadingButton } from "@/components/shared/LoadingButton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { askRag } from "@/lib/api";
import type { ApiError, RagAskResponse } from "@/lib/types";

const DEFAULT_TOP_K = 5;

const starters = [
  "What are the CS major requirements?",
  "What math courses are required?",
  "What does the four-year plan recommend for first year?",
  "What electives are listed for the CS major?",
  "What should I confirm with my advisor?",
];

export function StudentAskPanel() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<RagAskResponse | null>(null);
  const [isAsking, setIsAsking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAsk(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!question.trim()) {
      setError("Enter a question before asking.");
      return;
    }

    setIsAsking(true);
    try {
      const response = await askRag({
        question: question.trim(),
        filters: {
          department: "Computer Science",
          program: "Computer Science",
        },
        top_k: DEFAULT_TOP_K,
      });
      setAnswer(response);
    } catch (caught) {
      const apiError = caught as Partial<ApiError>;
      setError(apiError.message || "Ask request failed. Check that the backend and LLM provider are available.");
    } finally {
      setIsAsking(false);
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
      <div className="space-y-4">
        <InfoNote title="Source-backed guidance">
          uniAdvisor answers from uploaded advising documents. Use the source cards and advisor note to decide what to verify next.
        </InfoNote>

        <Card>
          <CardHeader>
            <CardTitle>Start with a question</CardTitle>
            <CardDescription>Choose a starter or ask your own advising question.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3">
              {starters.map((starter) => (
                <button
                  className="rounded-lg border bg-background p-3 text-left text-sm leading-6 transition-colors hover:border-primary hover:bg-secondary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  key={starter}
                  onClick={() => setQuestion(starter)}
                  type="button"
                >
                  {starter}
                </button>
              ))}
            </div>

            <form className="space-y-4" onSubmit={handleAsk}>
              <div className="grid gap-2">
                <label className="text-sm font-medium" htmlFor="student-question">
                  Your question
                </label>
                <textarea
                  className="min-h-28 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  id="student-question"
                  onChange={(event) => setQuestion(event.target.value)}
                  placeholder="What does this requirement mean?"
                  required
                  value={question}
                />
              </div>

              {error ? <ErrorMessage message={error} /> : null}

              <LoadingButton loading={isAsking} loadingLabel="Finding grounded guidance..." type="submit">
                Ask uniAdvisor
              </LoadingButton>
            </form>
          </CardContent>
        </Card>
      </div>

      <div>
        {answer ? (
          <StudentAnswerCard answer={answer} />
        ) : (
          <Card className="border-dashed bg-white/70">
            <CardHeader>
              <CardTitle>Answer and sources</CardTitle>
              <CardDescription>
                Ask a question about uploaded Computer Science advising documents.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-sm leading-6 text-muted-foreground">
              The answer will appear with confidence, advisor guidance, and simple source references.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
