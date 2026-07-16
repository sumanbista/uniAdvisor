"use client";

import { useState } from "react";

import type { WorkflowProgress } from "@/components/layout/WorkflowStrip";
import { ErrorMessage } from "@/components/shared/ErrorMessage";
import { InfoNote } from "@/components/shared/InfoNote";
import { LoadingButton } from "@/components/shared/LoadingButton";
import { SourceTypeBadge } from "@/components/shared/SourceTypeBadge";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { chunkDocument, extractDocument, processDocument } from "@/lib/api";
import type { ApiError, DocumentRecord } from "@/lib/types";

type DocumentWorkflowCardProps = {
  document: DocumentRecord;
  onDocumentChange: (document: DocumentRecord) => void;
  onWorkflowProgress?: (progress: Partial<WorkflowProgress>) => void;
};

type WorkflowStep = "process" | "extract" | "chunk" | null;

export function DocumentWorkflowCard({ document, onDocumentChange, onWorkflowProgress }: DocumentWorkflowCardProps) {
  const [activeStep, setActiveStep] = useState<WorkflowStep>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const isProcessing = activeStep !== null || document.status === "processing";
  const isReady = document.status === "ready";

  async function handleProcess() {
    setActiveStep("process");
    setError(null);
    setSuccess(null);
    onDocumentChange({ ...document, status: "processing", error_message: null });
    try {
      const response = await processDocument(document.id);
      onDocumentChange({ ...document, status: response.status, error_message: null });
      onWorkflowProgress?.({ extracted: true, chunked: response.status === "ready", searched: false, asked: false });
      setSuccess(`Ready for evidence search. ${response.chunk_count} source passage${response.chunk_count === 1 ? " is" : "s are"} available to search.`);
    } catch (caught) {
      const message = getErrorMessage(caught, "Source processing failed.");
      onDocumentChange({ ...document, status: "failed", error_message: message });
      setError(message);
    } finally {
      setActiveStep(null);
    }
  }

  async function handleExtract() {
    setActiveStep("extract");
    setError(null);
    setSuccess(null);
    try {
      const response = await extractDocument(document.id);
      onDocumentChange({ ...document, status: response.status, error_message: null });
      onWorkflowProgress?.({ extracted: true, chunked: false, searched: false, asked: false });
      setSuccess("Text preparation completed. Index the evidence when you are ready.");
    } catch (caught) {
      setError(getErrorMessage(caught, "Text preparation failed."));
    } finally {
      setActiveStep(null);
    }
  }

  async function handleChunk() {
    setActiveStep("chunk");
    setError(null);
    setSuccess(null);
    try {
      const response = await chunkDocument(document.id);
      onDocumentChange({ ...document, status: response.status, error_message: null });
      onWorkflowProgress?.({ chunked: true, searched: false, asked: false });
      setSuccess(`Ready for evidence search. ${response.chunks_created} source passage${response.chunks_created === 1 ? " is" : "s are"} available to search.`);
    } catch (caught) {
      setError(getErrorMessage(caught, "Evidence indexing failed."));
    } finally {
      setActiveStep(null);
    }
  }

  return (
    <Card className="border-[hsl(var(--line))] bg-white shadow-none">
      <CardHeader className="pb-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <CardTitle className="break-words text-base font-semibold text-[hsl(var(--ink-navy))]">{document.title}</CardTitle>
            <p className="mt-1 break-all text-xs leading-5 text-[hsl(var(--slate))]">{document.file_name}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <SourceTypeBadge sourceType={document.source_type} />
            <StatusBadge status={document.status} />
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 border-t border-[hsl(var(--line))] pt-4">
        <dl className="grid gap-3 text-sm sm:grid-cols-3">
          <Metadata label="Department" value={document.department} />
          <Metadata label="Program" value={document.program} />
          <Metadata label="Academic year" value={document.academic_year || "Not specified"} />
        </dl>

        <div aria-live="polite" className="flex flex-col gap-3">
          {document.error_message ? <ErrorMessage message={document.error_message} title="Source error" /> : null}
          {error ? <ErrorMessage message={error} title="Action could not be completed" /> : null}
          {success ? <InfoNote title="Source updated" tone="success">{success}</InfoNote> : null}
        </div>

        <div className="flex flex-col gap-3 border-t border-[hsl(var(--line))] pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm leading-6 text-[hsl(var(--slate))]">
            {isReady ? "This source is ready. Verify its indexed evidence before testing answers." : "Process this source to prepare it for evidence search."}
          </p>
          <LoadingButton className="min-h-11 shrink-0" disabled={isProcessing || document.status === "archived"} loading={activeStep === "process"} loadingLabel="Processing source…" onClick={handleProcess}>
            {isReady ? "Process Source Again" : "Process Source"}
          </LoadingButton>
        </div>

        <details className="rounded-md border border-[hsl(var(--line))] bg-[hsl(var(--muted))]">
          <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-[hsl(var(--ink-navy))]">Advanced source actions</summary>
          <div className="flex flex-col gap-3 border-t border-[hsl(var(--line))] p-4 sm:flex-row">
            <LoadingButton disabled={isProcessing} loading={activeStep === "extract"} loadingLabel="Preparing text…" onClick={handleExtract} variant="outline">Prepare Text</LoadingButton>
            <LoadingButton disabled={isProcessing || document.status !== "ready"} loading={activeStep === "chunk"} loadingLabel="Indexing evidence…" onClick={handleChunk} variant="outline">Index Evidence</LoadingButton>
          </div>
        </details>
      </CardContent>
    </Card>
  );
}

function Metadata({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-xs font-semibold uppercase tracking-wide text-[hsl(var(--slate))]">{label}</dt><dd className="mt-1 break-words text-[hsl(var(--ink-navy))]">{value}</dd></div>;
}

function getErrorMessage(caught: unknown, fallback: string) {
  const error = caught as Partial<ApiError>;
  return typeof error?.message === "string" && error.message ? error.message : fallback;
}
