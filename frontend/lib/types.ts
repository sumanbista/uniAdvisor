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

export type RagFilters = {
  department: string;
  program: string;
  source_type?: SourceType;
  academic_year?: string;
};

export type RagSearchRequest = {
  query: string;
  filters: RagFilters;
  top_k: number;
};

export type RagSearchResult = {
  chunk_id: string;
  document_id: string;
  document_title: string;
  text: string;
  score?: number | null;
  page_number?: number | null;
  section_title?: string | null;
  source_type: SourceType;
  department: string;
  program: string;
  academic_year?: string | null;
};

export type RagSearchResponse = {
  query: string;
  results: RagSearchResult[];
};
