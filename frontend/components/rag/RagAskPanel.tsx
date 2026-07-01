"use client";

import { FormEvent, useState } from "react";

import { AnswerCard } from "@/components/rag/AnswerCard";
import { ErrorMessage } from "@/components/shared/ErrorMessage";
import { LoadingButton } from "@/components/shared/LoadingButton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { askRag } from "@/lib/api";
import type { ApiError, RagAskResponse, SourceType } from "@/lib/types";

const DEFAULT_TOP_K = 5;
const MAX_TOP_K = 20;

const sourceTypes: Array<{ value: SourceType; label: string }> = [
  { value: "course_catalog", label: "Course catalog" },
  { value: "four_year_plan", label: "Four-year plan" },
  { value: "major_checksheet", label: "Major checksheet" },
  { value: "degree_audit", label: "Degree audit" },
  { value: "degree_requirements", label: "Degree requirements" },
  { value: "department_advising", label: "Department advising" },
  { value: "other", label: "Other" },
];

const examples: Array<{ label: string; question: string }> = [
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
    question: "What does the checksheet say about electives?",
  },
];

type RagAskPanelProps = {
  onAskComplete?: () => void;
};

export function RagAskPanel({ onAskComplete }: RagAskPanelProps) {
  const [question, setQuestion] = useState("");
  const [topK, setTopK] = useState(String(DEFAULT_TOP_K));
  const [sourceType, setSourceType] = useState<SourceType | "">("");
  const [academicYear, setAcademicYear] = useState("");
  const [answer, setAnswer] = useState<RagAskResponse | null>(null);
  const [isAsking, setIsAsking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAsk(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const parsedTopK = Number(topK);
    const validationError = validateAsk(question, parsedTopK);
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsAsking(true);
    try {
      const response = await askRag({
        question: question.trim(),
        filters: {
          department: "Computer Science",
          program: "Computer Science",
          ...(sourceType ? { source_type: sourceType } : {}),
          ...(academicYear.trim() ? { academic_year: academicYear.trim() } : {}),
        },
        top_k: parsedTopK,
      });
      setAnswer(response);
      onAskComplete?.();
    } catch (caught) {
      const apiError = caught as Partial<ApiError>;
      setError(apiError.message || "Ask request failed. Check that the backend and LLM provider are available.");
    } finally {
      setIsAsking(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card className="border-[hsl(var(--line))] bg-[hsl(var(--paper))] shadow-sm">
        <CardHeader>
          <CardTitle className="font-serif text-xl text-[hsl(var(--ink-navy))]">Ask a grounded question</CardTitle>
          <CardDescription>Submit one question against indexed Computer Science advising documents.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleAsk}>
            <div className="grid gap-2">
              <label className="text-sm font-medium" htmlFor="rag-question">
                Question
              </label>
              <textarea
                className="min-h-24 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--focus-blue))]"
                id="rag-question"
                onChange={(event) => setQuestion(event.target.value)}
                placeholder="What math courses are required for the Computer Science major?"
                required
                value={question}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-[160px_1fr_1fr]">
              <div className="grid gap-2">
                <label className="text-sm font-medium" htmlFor="ask-top-k">
                  Top k
                </label>
                <input
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                  id="ask-top-k"
                  max={MAX_TOP_K}
                  min={1}
                  onChange={(event) => setTopK(event.target.value)}
                  type="number"
                  value={topK}
                />
              </div>

              <div className="grid gap-2">
                <label className="text-sm font-medium" htmlFor="ask-source-type">
                  Source type
                </label>
                <select
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                  id="ask-source-type"
                  onChange={(event) => setSourceType(event.target.value as SourceType | "")}
                  value={sourceType}
                >
                  <option value="">Any source type</option>
                  {sourceTypes.map((source) => (
                    <option key={source.value} value={source.value}>
                      {source.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-2">
                <label className="text-sm font-medium" htmlFor="ask-academic-year">
                  Academic year
                </label>
                <input
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                  id="ask-academic-year"
                  onChange={(event) => setAcademicYear(event.target.value)}
                  placeholder="2025-2026"
                  type="text"
                  value={academicYear}
                />
              </div>
            </div>

            {error ? <ErrorMessage message={error} /> : null}

            <LoadingButton loading={isAsking} loadingLabel="Generating grounded answer..." type="submit">
              Generate grounded answer
            </LoadingButton>
          </form>
        </CardContent>
      </Card>

      {!answer ? (
        <QuestionStarters onSelect={setQuestion} />
      ) : (
        <AnswerCard answer={answer} />
      )}
    </div>
  );
}

type QuestionStartersProps = {
  onSelect: (question: string) => void;
};

function QuestionStarters({ onSelect }: QuestionStartersProps) {
  return (
    <Card className="border-[hsl(var(--line))] bg-[hsl(var(--paper))] shadow-sm">
      <CardHeader>
        <CardTitle className="font-serif text-xl text-[hsl(var(--ink-navy))]">Ask about advising documents</CardTitle>
        <CardDescription>
          Start with one of these common Computer Science advising questions.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2">
          {examples.map((example) => (
            <button
              className="rounded-md border border-[hsl(var(--line))] bg-background p-4 text-left transition-colors hover:border-[hsl(var(--evidence-teal))] hover:bg-[hsl(var(--evidence-teal-tint))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--focus-blue))]"
              key={example.question}
              onClick={() => onSelect(example.question)}
              type="button"
            >
              <span className="text-sm font-semibold text-foreground">{example.label}</span>
              <span className="mt-2 block text-sm leading-6 text-muted-foreground">{example.question}</span>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function validateAsk(question: string, topK: number) {
  if (!question.trim()) {
    return "Enter a question before asking.";
  }
  if (!Number.isInteger(topK) || topK < 1 || topK > MAX_TOP_K) {
    return `Top k must be a whole number between 1 and ${MAX_TOP_K}.`;
  }
  return null;
}
