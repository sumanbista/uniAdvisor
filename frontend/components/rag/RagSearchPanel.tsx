"use client";

import { FormEvent, useState } from "react";

import { SearchResultCard } from "@/components/rag/SearchResultCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorMessage } from "@/components/shared/ErrorMessage";
import { LoadingButton } from "@/components/shared/LoadingButton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { searchRag } from "@/lib/api";
import type { ApiError, RagSearchResult, SourceType } from "@/lib/types";

const DEFAULT_TOP_K = 5;
const MAX_TOP_K = 20;
const sourceTypes: Array<{ value: SourceType; label: string }> = [
  { value: "course_catalog", label: "Course catalog" }, { value: "four_year_plan", label: "Four-year plan" },
  { value: "major_checksheet", label: "Major checksheet" }, { value: "degree_audit", label: "Degree audit" },
  { value: "degree_requirements", label: "Degree requirements" }, { value: "department_advising", label: "Department advising" },
  { value: "other", label: "Other" },
];

export function RagSearchPanel({ onSearchComplete }: { onSearchComplete?: () => void }) {
  const [query, setQuery] = useState("");
  const [topK, setTopK] = useState(String(DEFAULT_TOP_K));
  const [sourceType, setSourceType] = useState<SourceType | "">("");
  const [academicYear, setAcademicYear] = useState("");
  const [results, setResults] = useState<RagSearchResult[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const parsedTopK = Number(topK);
    const validationError = validateSearch(query, parsedTopK);
    if (validationError) { setError(validationError); return; }
    setIsSearching(true);
    setResults(null);
    try {
      const response = await searchRag({
        query: query.trim(),
        filters: { department: "Computer Science", program: "Computer Science", ...(sourceType ? { source_type: sourceType } : {}), ...(academicYear.trim() ? { academic_year: academicYear.trim() } : {}) },
        top_k: parsedTopK,
      });
      setResults(response.results);
      onSearchComplete?.();
    } catch (caught) {
      const apiError = caught as Partial<ApiError>;
      setError(apiError.message || "Evidence search failed. Check that the backend is running and try again.");
    } finally { setIsSearching(false); }
  }

  return (
    <div className="flex flex-col gap-5">
      <Card className="border-[hsl(var(--line))] bg-white surface-shadow">
        <CardHeader className="border-b border-[hsl(var(--line))] pb-5">
          <CardTitle className="text-lg font-semibold text-[hsl(var(--ink-navy))]">Search your advising evidence</CardTitle>
          <CardDescription className="leading-6">Use a student-style question or topic to inspect the most relevant indexed passages.</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <form className="flex flex-col gap-4" onSubmit={handleSearch}>
            <label className="sr-only" htmlFor="rag-query">Evidence search</label>
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
              <input
                className="min-h-12 rounded-md border border-input bg-white px-4 text-sm shadow-sm placeholder:text-[hsl(var(--slate))]/75"
                id="rag-query"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search a requirement, policy, or student question"
                required
                value={query}
              />
              <LoadingButton className="min-h-12 px-5" loading={isSearching} loadingLabel="Searching…" type="submit">Search Evidence</LoadingButton>
            </div>

            <details className="rounded-md border border-[hsl(var(--line))] bg-[hsl(var(--muted))]">
              <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-[hsl(var(--ink-navy))]">Narrow the search</summary>
              <div className="grid gap-4 border-t border-[hsl(var(--line))] p-4 sm:grid-cols-3">
                <Field label="Evidence limit" htmlFor="top-k"><input className="min-h-11 rounded-md border border-input bg-white px-3 text-sm" id="top-k" max={MAX_TOP_K} min={1} onChange={(event) => setTopK(event.target.value)} type="number" value={topK} /></Field>
                <Field label="Source type" htmlFor="search-source-type"><select className="min-h-11 rounded-md border border-input bg-white px-3 text-sm" id="search-source-type" onChange={(event) => setSourceType(event.target.value as SourceType | "")} value={sourceType}><option value="">Any source type</option>{sourceTypes.map((source) => <option key={source.value} value={source.value}>{source.label}</option>)}</select></Field>
                <Field label="Academic year" htmlFor="search-academic-year"><input className="min-h-11 rounded-md border border-input bg-white px-3 text-sm" id="search-academic-year" onChange={(event) => setAcademicYear(event.target.value)} placeholder="2025–2026" type="text" value={academicYear} /></Field>
              </div>
            </details>
            <div aria-live="polite">{error ? <ErrorMessage message={error} title="Evidence search could not be completed" /> : null}</div>
          </form>
        </CardContent>
      </Card>

      {results?.length === 0 ? <EmptyState title="No matching evidence" description="Try broader wording, remove a filter, or confirm that the source has finished processing." /> : null}
      {results === null && !isSearching ? <EmptyState title="No evidence search yet" description="Search the indexed knowledge base to review the real passages available for student answers." /> : null}
      {isSearching ? <div aria-live="polite" className="min-h-36 rounded-lg border border-[hsl(var(--line))] bg-white p-6"><p className="text-sm font-semibold text-[hsl(var(--ink-navy))]">Searching indexed sources…</p><p className="mt-2 text-sm text-[hsl(var(--slate))]">Relevant evidence will appear here.</p></div> : null}
      {results && results.length > 0 ? <section aria-label="Evidence results" className="flex flex-col gap-4">{results.map((result, index) => <SearchResultCard key={result.chunk_id} rank={index + 1} result={result} />)}</section> : null}
    </div>
  );
}

function Field({ children, htmlFor, label }: { children: React.ReactNode; htmlFor: string; label: string }) { return <div className="flex flex-col gap-2"><label className="text-sm font-medium text-[hsl(var(--ink-navy))]" htmlFor={htmlFor}>{label}</label>{children}</div>; }
function validateSearch(query: string, topK: number) { if (!query.trim()) return "Enter a topic or question before searching."; if (!Number.isInteger(topK) || topK < 1 || topK > MAX_TOP_K) return `Evidence limit must be a whole number between 1 and ${MAX_TOP_K}.`; return null; }
