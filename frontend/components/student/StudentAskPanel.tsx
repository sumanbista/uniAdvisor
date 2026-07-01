"use client";

import { FormEvent, useState } from "react";

import { StudentAnswerCard } from "@/components/student/StudentAnswerCard";
import { ErrorMessage } from "@/components/shared/ErrorMessage";
import { LoadingButton } from "@/components/shared/LoadingButton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { askStudentRag } from "@/lib/api";
import type { ApiError, StudentRagAskResponse } from "@/lib/types";

const DEFAULT_TOP_K = 5;

const starters = [
  {
    label: "Major requirements",
    question: "What are the CS major requirements?",
  },
  {
    label: "Math requirements",
    question: "What math courses are required?",
  },
  {
    label: "First year plan",
    question: "What does the four-year plan recommend for first year?",
  },
  {
    label: "Electives",
    question: "What electives are listed for the CS major?",
  },
  {
    label: "Advisor questions",
    question: "What should I confirm with my advisor?",
  },
];

export function StudentAskPanel() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<StudentRagAskResponse | null>(null);
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
      const response = await askStudentRag({
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
    <div className="grid min-w-0 gap-4 min-[900px]:grid-cols-[340px_minmax(0,1fr)] min-[900px]:items-start">
      <div className="min-w-0 min-[900px]:sticky min-[900px]:top-4">
        <Card className="border-[hsl(var(--line))] bg-[hsl(var(--paper))] shadow-sm">
          <CardHeader>
            <CardTitle className="font-serif text-xl text-[hsl(var(--ink-navy))]">Start with a question</CardTitle>
            <CardDescription>
              Choose a starter or ask your own advising question. The answer is generated only after you submit it.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2 overflow-x-auto pb-1 min-[900px]:grid min-[900px]:gap-2 min-[900px]:overflow-visible min-[900px]:pb-0">
              {starters.map((starter) => (
                <button
                  className="shrink-0 rounded-md border border-[hsl(var(--line))] bg-background px-3 py-2 text-left text-sm font-medium text-[hsl(var(--ink-navy))] transition-colors hover:border-[hsl(var(--evidence-teal))] hover:bg-[hsl(var(--evidence-teal-tint))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--focus-blue))] min-[900px]:w-full"
                  key={starter.label}
                  onClick={() => setQuestion(starter.question)}
                  type="button"
                >
                  {starter.label}
                </button>
              ))}
            </div>

            <form className="space-y-4" onSubmit={handleAsk}>
              <div className="grid gap-2">
                <label className="text-sm font-medium" htmlFor="student-question">
                  Your question
                </label>
                <textarea
                  className="min-h-32 resize-y rounded-md border border-input bg-background px-3 py-2 text-sm leading-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--focus-blue))]"
                  id="student-question"
                  onChange={(event) => setQuestion(event.target.value)}
                  placeholder="What does this requirement mean?"
                  required
                  value={question}
                />
              </div>

              {error ? <ErrorMessage message={error} /> : null}

              <LoadingButton className="w-full" loading={isAsking} loadingLabel="Finding grounded guidance..." type="submit">
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
          <Card className="border-dashed border-[hsl(var(--line))] bg-white/70 shadow-sm">
            <CardHeader>
              <CardTitle className="font-serif text-xl text-[hsl(var(--ink-navy))]">Answer and sources</CardTitle>
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
