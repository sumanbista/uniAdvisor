"use client";

import { FormEvent, useMemo, useState } from "react";

import { DocumentWorkflowCard } from "@/components/documents/DocumentWorkflowCard";
import { WorkspaceGuide } from "@/components/layout/WorkspaceGuide";
import type { WorkflowProgress } from "@/components/layout/WorkflowStrip";
import { ErrorMessage } from "@/components/shared/ErrorMessage";
import { InfoNote } from "@/components/shared/InfoNote";
import { LoadingButton } from "@/components/shared/LoadingButton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { uploadDocument } from "@/lib/api";
import type { ApiError, DocumentRecord, SourceType } from "@/lib/types";

const sourceTypes: Array<{ value: SourceType; label: string }> = [
  { value: "course_catalog", label: "Course catalog" },
  { value: "four_year_plan", label: "Four-year plan" },
  { value: "major_checksheet", label: "Major checksheet" },
  { value: "degree_audit", label: "Degree audit" },
  { value: "degree_requirements", label: "Degree requirements" },
  { value: "department_advising", label: "Department advising" },
  { value: "other", label: "Other" },
];

const supportedExtensions = [".pdf", ".txt", ".md"];

type DocumentUploadFormProps = {
  onProgressChange?: (progress: Partial<WorkflowProgress>) => void;
};

export function DocumentUploadForm({ onProgressChange }: DocumentUploadFormProps) {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [sourceType, setSourceType] = useState<SourceType>("major_checksheet");
  const [department, setDepartment] = useState("Computer Science");
  const [program, setProgram] = useState("Computer Science");
  const [academicYear, setAcademicYear] = useState("");
  const [document, setDocument] = useState<DocumentRecord | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const selectedFileName = useMemo(() => file?.name ?? "No file selected", [file]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    const validationError = validateForm(file, title, sourceType);
    if (validationError) {
      setError(validationError);
      return;
    }

    const formData = new FormData();
    formData.append("file", file as File);
    formData.append("title", title.trim());
    formData.append("source_type", sourceType);
    formData.append("department", department.trim() || "Computer Science");
    formData.append("program", program.trim() || "Computer Science");
    if (academicYear.trim()) {
      formData.append("academic_year", academicYear.trim());
    }

    setIsUploading(true);
    try {
      const uploadedDocument = await uploadDocument(formData);
      setDocument(uploadedDocument);
      onProgressChange?.({ uploaded: true, extracted: false, chunked: false, searched: false, asked: false });
      setSuccess("Source added. Process it next to make its evidence searchable.");
    } catch (caught) {
      const apiError = caught as Partial<ApiError>;
      setError(apiError.message || "Upload failed. Check that the backend is running and try again.");
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_280px]">
      <div className="min-w-0">
        <Card className="border-[hsl(var(--line))] bg-white surface-shadow">
          <CardHeader className="border-b border-[hsl(var(--line))] pb-5">
            <CardTitle className="text-lg font-semibold text-[hsl(var(--ink-navy))]">Add an advising source</CardTitle>
            <CardDescription className="leading-6">Upload an official PDF, text, or Markdown document and describe where it belongs.</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
              <div className="rounded-lg border border-dashed border-[hsl(var(--input))] bg-[hsl(var(--muted))] p-5">
                <label className="text-sm font-semibold text-[hsl(var(--ink-navy))]" htmlFor="document-file">
                  Choose a source file
                </label>
                <p className="mt-1 text-xs leading-5 text-[hsl(var(--slate))]">PDF, TXT, or MD. Use current, official advising materials.</p>
                <input
                  accept=".pdf,.txt,.md"
                  className="mt-4 block w-full text-sm text-[hsl(var(--slate))] file:mr-4 file:min-h-10 file:cursor-pointer file:rounded-md file:border file:border-[hsl(var(--input))] file:bg-white file:px-4 file:text-sm file:font-semibold file:text-[hsl(var(--ink-navy))] hover:file:bg-[hsl(var(--secondary))]"
                  id="document-file"
                  onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                  type="file"
                />
                <p aria-live="polite" className="mt-3 text-xs font-medium text-[hsl(var(--slate))]">{selectedFileName}</p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <TextInput id="document-title" label="Source title" onChange={setTitle} placeholder="CS degree requirements" required value={title} />
                <SelectInput id="source-type" label="Source type" onChange={setSourceType} value={sourceType} />
                <TextInput id="department" label="Department" onChange={setDepartment} value={department} />
                <TextInput id="program" label="Program" onChange={setProgram} value={program} />
                <TextInput id="academic-year" label="Academic year (optional)" onChange={setAcademicYear} placeholder="2025–2026" value={academicYear} />
              </div>

              <div aria-live="polite" className="flex flex-col gap-3">
                {error ? <ErrorMessage message={error} title="Source could not be added" /> : null}
                {success ? <InfoNote title="Source added" tone="success">{success}</InfoNote> : null}
              </div>

              <LoadingButton className="min-h-11 self-start px-5" loading={isUploading} loadingLabel="Adding source…" type="submit">
                Add Advising Source
              </LoadingButton>
            </form>
          </CardContent>
        </Card>

        <section aria-labelledby="uploaded-source-title" className="mt-5">
          <div className="mb-3 flex items-baseline justify-between gap-4">
            <h3 className="text-sm font-semibold text-[hsl(var(--ink-navy))]" id="uploaded-source-title">Current source</h3>
            <p className="text-xs text-[hsl(var(--slate))]">Shows the source added in this session</p>
          </div>
          {document ? (
            <DocumentWorkflowCard document={document} onDocumentChange={setDocument} onWorkflowProgress={onProgressChange} />
          ) : (
            <div className="rounded-lg border border-dashed border-[hsl(var(--line))] bg-white p-6 text-center">
              <p className="text-sm font-semibold text-[hsl(var(--ink-navy))]">No source added in this session</p>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[hsl(var(--slate))]">Choose an official file above. After it uploads, you can process it and verify its evidence.</p>
            </div>
          )}
        </section>
      </div>

      <WorkspaceGuide titleId="advising-sources-workspace-guide-title" />
    </div>
  );
}

function TextInput({ id, label, value, onChange, placeholder, required = false }: { id: string; label: string; value: string; onChange: (value: string) => void; placeholder?: string; required?: boolean }) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-[hsl(var(--ink-navy))]" htmlFor={id}>{label}</label>
      <input
        className="min-h-11 rounded-md border border-input bg-white px-3 text-sm shadow-sm placeholder:text-[hsl(var(--slate))]/70 disabled:cursor-not-allowed disabled:bg-muted"
        id={id}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required={required}
        type="text"
        value={value}
      />
    </div>
  );
}

function SelectInput({ id, label, value, onChange }: { id: string; label: string; value: SourceType; onChange: (value: SourceType) => void }) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-[hsl(var(--ink-navy))]" htmlFor={id}>{label}</label>
      <select className="min-h-11 rounded-md border border-input bg-white px-3 text-sm shadow-sm" id={id} onChange={(event) => onChange(event.target.value as SourceType)} value={value}>
        {sourceTypes.map((source) => <option key={source.value} value={source.value}>{source.label}</option>)}
      </select>
    </div>
  );
}

function validateForm(file: File | null, title: string, sourceType: SourceType) {
  if (!file) return "Select a .pdf, .txt, or .md file before uploading.";
  if (!title.trim()) return "Enter a source title before uploading.";
  if (!sourceType) return "Choose a source type before uploading.";
  if (!supportedExtensions.some((extension) => file.name.toLowerCase().endsWith(extension))) return "Unsupported file type. Upload a .pdf, .txt, or .md file.";
  return null;
}
