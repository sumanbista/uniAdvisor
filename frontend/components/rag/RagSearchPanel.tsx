"use client";

import { FormEvent, useState } from "react";

import { SearchResultCard } from "@/components/rag/SearchResultCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorMessage } from "@/components/shared/ErrorMessage";
import { InfoNote } from "@/components/shared/InfoNote";
import { LoadingButton } from "@/components/shared/LoadingButton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { searchRag } from "@/lib/api";
import type { ApiError, RagSearchResult, SourceType } from "@/lib/types";

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

export function RagSearchPanel() {
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
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSearching(true);
    try {
      const response = await searchRag({
        query: query.trim(),
        filters: {
          department: "Computer Science",
          program: "Computer Science",
          ...(sourceType ? { source_type: sourceType } : {}),
          ...(academicYear.trim() ? { academic_year: academicYear.trim() } : {}),
        },
        top_k: parsedTopK,
      });
      setResults(response.results);
    } catch (caught) {
      const apiError = caught as Partial<ApiError>;
      setError(apiError.message || "Search failed. Check that the backend is running and try again.");
    } finally {
      setIsSearching(false);
    }
  }

  return (
    <div className="space-y-4">
      <InfoNote title="Evidence retrieval">
        Search retrieves source chunks only. Use the Ask tab later to generate a grounded answer.
      </InfoNote>

      <Card>
        <CardHeader>
          <CardTitle>Search Indexed Chunks</CardTitle>
          <CardDescription>Inspect ranked evidence before answer generation.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSearch}>
            <div className="grid gap-2">
              <label className="text-sm font-medium" htmlFor="rag-query">
                Query
              </label>
              <textarea
                className="min-h-24 rounded-md border border-input bg-background px-3 py-2 text-sm"
                id="rag-query"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="What math courses are required for the Computer Science major?"
                required
                value={query}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-[160px_1fr_1fr]">
              <div className="grid gap-2">
                <label className="text-sm font-medium" htmlFor="top-k">
                  Top k
                </label>
                <input
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                  id="top-k"
                  max={MAX_TOP_K}
                  min={1}
                  onChange={(event) => setTopK(event.target.value)}
                  type="number"
                  value={topK}
                />
              </div>

              <div className="grid gap-2">
                <label className="text-sm font-medium" htmlFor="search-source-type">
                  Source type
                </label>
                <select
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                  id="search-source-type"
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
                <label className="text-sm font-medium" htmlFor="search-academic-year">
                  Academic year
                </label>
                <input
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                  id="search-academic-year"
                  onChange={(event) => setAcademicYear(event.target.value)}
                  placeholder="2025-2026"
                  type="text"
                  value={academicYear}
                />
              </div>
            </div>

            {error ? <ErrorMessage message={error} /> : null}

            <LoadingButton loading={isSearching} loadingLabel="Searching sources..." type="submit">
              Search
            </LoadingButton>
          </form>
        </CardContent>
      </Card>

      {results?.length === 0 ? (
        <EmptyState
          title="No results"
          description="No matching chunks found. Try a different question or confirm the document has been extracted and chunked."
        />
      ) : null}

      {results === null ? (
        <EmptyState
          title="Search indexed evidence"
          description="Search indexed document chunks after at least one document has been extracted and chunked."
        />
      ) : null}

      {results && results.length > 0 ? (
        <div className="space-y-4">
          {results.map((result, index) => (
            <SearchResultCard key={result.chunk_id} rank={index + 1} result={result} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function validateSearch(query: string, topK: number) {
  if (!query.trim()) {
    return "Enter a search query before searching.";
  }
  if (!Number.isInteger(topK) || topK < 1 || topK > MAX_TOP_K) {
    return `Top k must be a whole number between 1 and ${MAX_TOP_K}.`;
  }
  return null;
}
