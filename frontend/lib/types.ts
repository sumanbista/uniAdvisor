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
