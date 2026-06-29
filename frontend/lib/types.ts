export type DocumentStatus = "uploaded" | "processing" | "ready" | "failed" | "archived";

export type SourceType =
  | "course_catalog"
  | "four_year_plan"
  | "major_checksheet"
  | "degree_audit"
  | "degree_requirements"
  | "department_advising"
  | "other";

export type ApiError = {
  message: string;
  status?: number;
  details?: unknown;
};

export type DocumentRecord = {
  id: string;
  title: string;
  file_name: string;
  source_type: SourceType;
  department: string;
  program: string;
  academic_year?: string | null;
  status: DocumentStatus;
  error_message?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type DocumentUploadResponse = DocumentRecord;

export type DocumentExtractionResponse = {
  document_id: string;
  status: DocumentStatus;
  extracted_text_path?: string;
  character_count?: number;
};

export type DocumentChunkResponse = {
  document_id: string;
  chunks_created: number;
  status: DocumentStatus;
};
