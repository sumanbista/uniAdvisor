"use client";

import { useState } from "react";

import { ErrorMessage } from "@/components/shared/ErrorMessage";
import { InfoNote } from "@/components/shared/InfoNote";
import { LoadingButton } from "@/components/shared/LoadingButton";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { SourceTypeBadge } from "@/components/shared/SourceTypeBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { chunkDocument, extractDocument, processDocument } from "@/lib/api";
import type { ApiError, DocumentRecord, DocumentStatus } from "@/lib/types";
import type { WorkflowProgress } from "@/components/layout/WorkflowStrip";

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
  const [extractComplete, setExtractComplete] = useState(false);
  const [chunkComplete, setChunkComplete] = useState(false);
  const isProcessing = activeStep !== null || document.status === "processing";
  const isReady = document.status === "ready" || chunkComplete;
  const canProcess = !isProcessing && document.status !== "archived";
  const canChunk = document.status === "ready";

  async function handleProcess() {
    setActiveStep("process");
    setError(null);
    setSuccess(null);
    onDocumentChange({ ...document, status: "processing", error_message: null });

    try {
      const response = await processDocument(document.id);
      onDocumentChange({ ...document, status: response.status, error_message: null });
      setExtractComplete(true);
      setChunkComplete(response.status === "ready");
      onWorkflowProgress?.({ extracted: true, chunked: response.status === "ready", searched: false, asked: false });
      setSuccess(`Ready for evidence search. Created ${response.chunk_count} source passage${response.chunk_count === 1 ? "" : "s"}.`);
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
    onDocumentChange({ ...document, status: "processing", error_message: null });

    try {
      const response = await extractDocument(document.id);
      onDocumentChange({ ...document, status: response.status, error_message: null });
      setExtractComplete(true);
      setChunkComplete(false);
      onWorkflowProgress?.({ extracted: true, chunked: false, searched: false, asked: false });
      setSuccess("Text preparation completed.");
    } catch (caught) {
      const message = getErrorMessage(caught, "Text preparation failed.");
      onDocumentChange({ ...document, status: "failed", error_message: message });
      setError(message);
    } finally {
      setActiveStep(null);
    }
  }

  async function handleChunk() {
    setActiveStep("chunk");
    setError(null);
    setSuccess(null);
    onDocumentChange({ ...document, status: "processing", error_message: null });

    try {
      const response = await chunkDocument(document.id);
      onDocumentChange({ ...document, status: response.status, error_message: null });
      setChunkComplete(true);
      onWorkflowProgress?.({ chunked: true, searched: false, asked: false });
      setSuccess(`Ready for evidence search. Created ${response.chunks_created} source passage${response.chunks_created === 1 ? "" : "s"}.`);
    } catch (caught) {
      const message = getErrorMessage(caught, "Evidence indexing failed.");
      onDocumentChange({ ...document, status: "failed", error_message: message });
      setError(message);
    } finally {
      setActiveStep(null);
    }
  }

  return (
    <Card className="border-[hsl(var(--line))] bg-[hsl(var(--paper))] shadow-sm">
      <CardHeader className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="font-serif text-xl text-[hsl(var(--ink-navy))]">{document.title}</CardTitle>
            <p className="mt-1 text-sm text-[hsl(var(--slate))]">{document.file_name}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <SourceTypeBadge sourceType={document.source_type} />
            <StatusBadge status={document.status} />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <DocumentField label="Department" value={document.department} />
          <DocumentField label="Program" value={document.program} />
          <DocumentField label="Academic year" value={document.academic_year || "Not specified"} />
          <DocumentField label="Status" value={getStatusLabel(document.status)} />
        </dl>

        {document.error_message ? <ErrorMessage message={document.error_message} title="Document error" /> : null}
        {error ? <ErrorMessage message={error} /> : null}
        {success ? <InfoNote title="Workflow update" tone="success">{success}</InfoNote> : null}

        <Separator />

        <div className="grid gap-2 text-sm">
          <ChecklistItem done label="Upload source" />
          <ChecklistItem done={extractComplete || isReady} label="Process source" />
          <ChecklistItem done={isReady} label="Ready for evidence search" />
          <ChecklistItem done={isReady} label="Verify evidence or test an answer" />
        </div>

        <Separator />

        <div className="space-y-3">
          <LoadingButton
            className="w-full sm:w-auto"
            loading={activeStep === "process"}
            loadingLabel="Processing Source..."
            disabled={!canProcess}
            onClick={handleProcess}
          >
            {isReady ? "Process Source Again" : "Process Source"}
          </LoadingButton>

          <details className="rounded-md border border-[hsl(var(--line))] bg-background">
            <summary className="cursor-pointer px-3 py-2 text-sm font-medium text-[hsl(var(--ink-navy))]">
              Advanced processing actions
            </summary>
            <div className="flex flex-col gap-3 border-t border-[hsl(var(--line))] p-3 sm:flex-row">
              <LoadingButton
                loading={activeStep === "extract"}
                loadingLabel="Preparing text..."
                disabled={isProcessing}
                onClick={handleExtract}
                variant="outline"
              >
                Prepare Text
              </LoadingButton>
              <LoadingButton
                loading={activeStep === "chunk"}
                loadingLabel="Indexing evidence..."
                disabled={isProcessing || !canChunk}
                onClick={handleChunk}
                variant="outline"
              >
                Index Evidence
              </LoadingButton>
            </div>
          </details>
        </div>
      </CardContent>
    </Card>
  );
}

type DocumentFieldProps = {
  label: string;
  value: string;
  className?: string;
};

function DocumentField({ label, value, className }: DocumentFieldProps) {
  return (
    <div className={className}>
      <dt className="font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-1 break-words text-foreground">{value}</dd>
    </div>
  );
}

function ChecklistItem({ done, label }: { done: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-[hsl(var(--line))] bg-background px-3 py-2">
      <span
        className={
          done
            ? "flex h-5 w-5 items-center justify-center rounded-full bg-[hsl(var(--evidence-teal))] text-xs font-semibold text-white"
            : "flex h-5 w-5 items-center justify-center rounded-full border border-[hsl(var(--line))] text-xs font-semibold text-[hsl(var(--slate))]"
        }
      >
        {done ? "✓" : "-"}
      </span>
      <span className={done ? "text-[hsl(var(--ink-navy))]" : "text-[hsl(var(--slate))]"}>{label}</span>
    </div>
  );
}

function getErrorMessage(caught: unknown, fallback: string) {
  const error = caught as Partial<ApiError>;
  return typeof error?.message === "string" && error.message ? error.message : fallback;
}

function getStatusLabel(status: DocumentStatus) {
  const labels: Record<DocumentStatus, string> = {
    uploaded: "Uploaded",
    processing: "Processing source",
    ready: "Ready for evidence search",
    failed: "Processing failed",
    archived: "Archived",
  };
  return labels[status];
}
