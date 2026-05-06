export type AdminResource =
  | "passages"
  | "listening"
  | "questions"
  | "vocabulary"
  | "writing-prompts"
  | "speaking-prompts"
  | "badges"
  | "mock-tests"
  | "missions";

export type AdminFieldType =
  | "text"
  | "textarea"
  | "number"
  | "checkbox"
  | "select"
  | "tags"
  | "json";

export type AdminFieldConfig = {
  name: string;
  label: string;
  type: AdminFieldType;
  required?: boolean;
  placeholder?: string;
  options?: Array<{ label: string; value: string }>;
  description?: string;
};

export type AdminFilterConfig = {
  name: string;
  label: string;
  options: Array<{ label: string; value: string }>;
};

export type AdminResourceConfig = {
  resource: AdminResource;
  title: string;
  description: string;
  singularLabel: string;
  fields: AdminFieldConfig[];
  filters: AdminFilterConfig[];
  columns: Array<{ key: string; label: string }>;
};
