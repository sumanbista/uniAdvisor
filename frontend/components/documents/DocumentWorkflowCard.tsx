"use client";

import { useState } from "react";

import { ErrorMessage } from "@/components/shared/ErrorMessage";
import { InfoNote } from "@/components/shared/InfoNote";
import { LoadingButton } from "@/components/shared/LoadingButton";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { SourceTypeBadge } from "@/components/shared/SourceTypeBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { chunkDocument, extractDocument } from "@/lib/api";
import type { ApiError, DocumentRecord } from "@/lib/types";
import type { WorkflowProgress } from "@/components/layout/WorkflowStrip";

type DocumentWorkflowCardProps = {
  document: DocumentRecord;
  onDocumentChange: (document: DocumentRecord) => void;
  onWorkflowProgress?: (progress: Partial<WorkflowProgress>) => void;
};

type WorkflowStep = "extract" | "chunk" | null;

export function DocumentWorkflowCard({ document, onDocumentChange, onWorkflowProgress }: DocumentWorkflowCardProps) {
  const [activeStep, setActiveStep] = useState<WorkflowStep>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [extractComplete, setExtractComplete] = useState(false);
  const [chunkComplete, setChunkComplete] = useState(false);
  const isProcessing = activeStep !== null || document.status === "processing";
  const canChunk = document.status === "ready";

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
      setSuccess("Text extraction completed.");
    } catch (caught) {
      const message = getErrorMessage(caught, "Extract failed.");
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
      setSuccess(`Chunking completed. Created ${response.chunks_created} chunk${response.chunks_created === 1 ? "" : "s"}.`);
    } catch (caught) {
      const message = getErrorMessage(caught, "Chunking failed.");
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
          <DocumentField label="Status" value={document.status} />
        </dl>

        {document.error_message ? <ErrorMessage message={document.error_message} title="Document error" /> : null}
        {error ? <ErrorMessage message={error} /> : null}
        {success ? <InfoNote title="Workflow update" tone="success">{success}</InfoNote> : null}

        <Separator />

        <div className="grid gap-2 text-sm">
          <ChecklistItem done label="Upload" />
          <ChecklistItem done={extractComplete} label="Extract text" />
          <ChecklistItem done={chunkComplete} label="Chunk document" />
          <ChecklistItem done={chunkComplete} label="Search or ask with evidence" />
        </div>

        <Separator />

        <div className="flex flex-col gap-3 sm:flex-row">
          <LoadingButton
            loading={activeStep === "extract"}
            loadingLabel="Extracting text..."
            disabled={isProcessing}
            onClick={handleExtract}
          >
            Extract Text
          </LoadingButton>
          <LoadingButton
            loading={activeStep === "chunk"}
            loadingLabel="Chunking document..."
            disabled={isProcessing || !canChunk}
            onClick={handleChunk}
            variant="outline"
          >
            Chunk Document
          </LoadingButton>
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
