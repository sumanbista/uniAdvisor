"use client";

import { FormEvent, useMemo, useState } from "react";

import { DocumentStatusHelp } from "@/components/documents/DocumentStatusHelp";
import { DocumentWorkflowCard } from "@/components/documents/DocumentWorkflowCard";
import { ErrorMessage } from "@/components/shared/ErrorMessage";
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

export function DocumentUploadForm() {
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
      setSuccess("Document uploaded. Run extraction to continue.");
    } catch (caught) {
      const apiError = caught as Partial<ApiError>;
      setError(apiError.message || "Upload failed. Check that the backend is running and try again.");
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.9fr)]">
      <div className="space-y-4">
        <DocumentStatusHelp />
        <Card>
          <CardHeader>
            <CardTitle>Upload Document</CardTitle>
            <CardDescription>Supported files: .pdf, .txt, and .md</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="grid gap-2">
                <label className="text-sm font-medium" htmlFor="document-file">
                  File
                </label>
                <input
                  accept=".pdf,.txt,.md"
                  className="block w-full rounded-md border border-input bg-background px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-secondary-foreground"
                  id="document-file"
                  onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                  type="file"
                />
                <p className="text-xs text-muted-foreground">{selectedFileName}</p>
              </div>

              <TextInput id="document-title" label="Title" onChange={setTitle} required value={title} />

              <div className="grid gap-2">
                <label className="text-sm font-medium" htmlFor="source-type">
                  Source type
                </label>
                <select
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                  id="source-type"
                  onChange={(event) => setSourceType(event.target.value as SourceType)}
                  required
                  value={sourceType}
                >
                  {sourceTypes.map((source) => (
                    <option key={source.value} value={source.value}>
                      {source.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <TextInput id="department" label="Department" onChange={setDepartment} value={department} />
                <TextInput id="program" label="Program" onChange={setProgram} value={program} />
              </div>

              <TextInput
                id="academic-year"
                label="Academic year"
                onChange={setAcademicYear}
                placeholder="2025-2026"
                value={academicYear}
              />

              {error ? <ErrorMessage message={error} /> : null}
              {success ? <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">{success}</p> : null}

              <LoadingButton loading={isUploading} type="submit">
                Upload Document
              </LoadingButton>
            </form>
          </CardContent>
        </Card>
      </div>

      <div>
        {document ? (
          <DocumentWorkflowCard document={document} onDocumentChange={setDocument} />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Workflow Card</CardTitle>
              <CardDescription>Uploaded document metadata appears here.</CardDescription>
            </CardHeader>
            <CardContent className="text-sm leading-6 text-muted-foreground">
              Upload a supported academic document to run extraction and chunking manually.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

type TextInputProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
};

function TextInput({ id, label, value, onChange, placeholder, required = false }: TextInputProps) {
  return (
    <div className="grid gap-2">
      <label className="text-sm font-medium" htmlFor={id}>
        {label}
      </label>
      <input
        className="h-10 rounded-md border border-input bg-background px-3 text-sm"
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

function validateForm(file: File | null, title: string, sourceType: SourceType) {
  if (!file) {
    return "Select a .pdf, .txt, or .md file before uploading.";
  }
  if (!title.trim()) {
    return "Enter a document title before uploading.";
  }
  if (!sourceType) {
    return "Choose a source type before uploading.";
  }
  const lowerName = file.name.toLowerCase();
  if (!supportedExtensions.some((extension) => lowerName.endsWith(extension))) {
    return "Unsupported file type. Upload a .pdf, .txt, or .md file.";
  }
  return null;
}
