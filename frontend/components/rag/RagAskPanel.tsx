"use client";

import { FormEvent, useState } from "react";

import { AnswerCard } from "@/components/rag/AnswerCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorMessage } from "@/components/shared/ErrorMessage";
import { LoadingButton } from "@/components/shared/LoadingButton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { askRag } from "@/lib/api";
import type { ApiError, RagAskResponse, SourceType } from "@/lib/types";

const DEFAULT_TOP_K = 5;
const MAX_TOP_K = 20;
const sourceTypes: Array<{ value: SourceType; label: string }> = [
  { value: "course_catalog", label: "Course catalog" }, { value: "four_year_plan", label: "Four-year plan" },
  { value: "major_checksheet", label: "Major checksheet" }, { value: "degree_audit", label: "Degree audit" },
  { value: "degree_requirements", label: "Degree requirements" }, { value: "department_advising", label: "Department advising" },
  { value: "other", label: "Other" },
];
const examples = [
  "What are the CS major requirements?",
  "What math courses are required?",
  "What does the four-year plan recommend for first year?",
  "What does the checksheet say about electives?",
];

export function RagAskPanel({ onAskComplete }: { onAskComplete?: () => void }) {
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
    if (validationError) { setError(validationError); return; }
    setIsAsking(true);
    setAnswer(null);
    try {
      const response = await askRag({
        question: question.trim(),
        filters: { department: "Computer Science", program: "Computer Science", ...(sourceType ? { source_type: sourceType } : {}), ...(academicYear.trim() ? { academic_year: academicYear.trim() } : {}) },
        top_k: parsedTopK,
      });
      setAnswer(response);
      onAskComplete?.();
    } catch (caught) {
      const apiError = caught as Partial<ApiError>;
      setError(apiError.message || "The test could not be completed. Check that the backend and answer provider are available.");
    } finally { setIsAsking(false); }
  }

  return (
    <div className="flex flex-col gap-5">
      <Card className="border-[hsl(var(--line))] bg-white surface-shadow">
        <CardHeader className="border-b border-[hsl(var(--line))] pb-5">
          <CardTitle className="text-lg font-semibold text-[hsl(var(--ink-navy))]">Ask as a student would</CardTitle>
          <CardDescription className="leading-6">Use a realistic question, then review the answer, source match, guidance, and evidence.</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <form className="flex flex-col gap-4" onSubmit={handleAsk}>
            <label className="text-sm font-medium text-[hsl(var(--ink-navy))]" htmlFor="rag-question">Student-style question</label>
            <textarea
              className="min-h-28 resize-y rounded-md border border-input bg-white px-4 py-3 text-sm leading-6 shadow-sm placeholder:text-[hsl(var(--slate))]/75"
              id="rag-question"
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="What math courses are required for the Computer Science major?"
              required
              value={question}
            />

            <div aria-label="Question starters" className="flex flex-wrap gap-2">
              {examples.map((example) => <button className="min-h-10 rounded-md border border-[hsl(var(--line))] bg-white px-3 py-2 text-left text-xs font-medium text-[hsl(var(--ink-navy))] hover:border-[hsl(var(--focus-blue))] hover:bg-[hsl(var(--secondary))]" key={example} onClick={() => setQuestion(example)} type="button">{example}</button>)}
            </div>

            <details className="rounded-md border border-[hsl(var(--line))] bg-[hsl(var(--muted))]">
              <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-[hsl(var(--ink-navy))]">Test settings</summary>
              <div className="grid gap-4 border-t border-[hsl(var(--line))] p-4 sm:grid-cols-3">
                <Field label="Evidence limit" htmlFor="ask-top-k"><input className="min-h-11 rounded-md border border-input bg-white px-3 text-sm" id="ask-top-k" max={MAX_TOP_K} min={1} onChange={(event) => setTopK(event.target.value)} type="number" value={topK} /></Field>
                <Field label="Source type" htmlFor="ask-source-type"><select className="min-h-11 rounded-md border border-input bg-white px-3 text-sm" id="ask-source-type" onChange={(event) => setSourceType(event.target.value as SourceType | "")} value={sourceType}><option value="">Any source type</option>{sourceTypes.map((source) => <option key={source.value} value={source.value}>{source.label}</option>)}</select></Field>
                <Field label="Academic year" htmlFor="ask-academic-year"><input className="min-h-11 rounded-md border border-input bg-white px-3 text-sm" id="ask-academic-year" onChange={(event) => setAcademicYear(event.target.value)} placeholder="2025–2026" type="text" value={academicYear} /></Field>
              </div>
            </details>

            <div aria-live="polite">{error ? <ErrorMessage message={error} title="Answer test could not be completed" /> : null}</div>
            <LoadingButton className="min-h-11 self-start px-5" loading={isAsking} loadingLabel="Testing answer…" type="submit">Test Answer</LoadingButton>
          </form>
        </CardContent>
      </Card>

      {isAsking ? <div aria-live="polite" className="min-h-40 rounded-lg border border-[hsl(var(--line))] bg-white p-6"><p className="text-sm font-semibold text-[hsl(var(--ink-navy))]">Reviewing source evidence…</p><p className="mt-2 text-sm text-[hsl(var(--slate))]">The answer, confidence, and sources will appear here.</p></div> : null}
      {!answer && !isAsking ? <EmptyState title="No answer tested yet" description="Ask a realistic advising question to check whether the knowledge base supports a clear, trustworthy response." /> : null}
      {answer ? <AnswerCard answer={answer} /> : null}
    </div>
  );
}

function Field({ children, htmlFor, label }: { children: React.ReactNode; htmlFor: string; label: string }) { return <div className="flex flex-col gap-2"><label className="text-sm font-medium text-[hsl(var(--ink-navy))]" htmlFor={htmlFor}>{label}</label>{children}</div>; }
function validateAsk(question: string, topK: number) { if (!question.trim()) return "Enter a question before testing."; if (!Number.isInteger(topK) || topK < 1 || topK > MAX_TOP_K) return `Evidence limit must be a whole number between 1 and ${MAX_TOP_K}.`; return null; }
