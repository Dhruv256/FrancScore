"use client";

import { useMemo, useState } from "react";
import { Edit2, Plus, Save, Search, Trash2, Upload, X } from "lucide-react";
import { ADMIN_RESOURCE_CONFIGS } from "@/lib/admin/config";
import type { AdminFieldConfig, AdminResource } from "@/lib/admin/types";

type Props = {
  resource: AdminResource;
  initialRecords: Array<Record<string, unknown>>;
};

export function AdminResourcePageClient({ resource, initialRecords }: Props) {
  const config = ADMIN_RESOURCE_CONFIGS[resource];
  const [records, setRecords] = useState(initialRecords);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [editingRecord, setEditingRecord] = useState<Record<string, unknown> | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formState, setFormState] = useState<Record<string, unknown>>(buildInitialForm(config.fields));
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audioUploading, setAudioUploading] = useState(false);

  const visibleRecords = useMemo(() => {
    return records.filter((record) => {
      const haystack = JSON.stringify(record).toLowerCase();
      if (search && !haystack.includes(search.toLowerCase())) {
        return false;
      }
      for (const [key, value] of Object.entries(filters)) {
        if (!value) continue;
        if (String(record[key] ?? "") !== value) {
          return false;
        }
      }
      return true;
    });
  }, [filters, records, search]);

  function openCreate() {
    setEditingRecord(null);
    setFormState(buildInitialForm(config.fields));
    setError(null);
    setIsFormOpen(true);
  }

  function openEdit(record: Record<string, unknown>) {
    setEditingRecord(record);
    setFormState(buildFormFromRecord(config.fields, record));
    setError(null);
    setIsFormOpen(true);
  }

  async function handleDelete(recordId: string) {
    if (!confirm(`Delete this ${config.singularLabel.toLowerCase()}?`)) {
      return;
    }

    const response = await fetch(`/api/admin/cms/${resource}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "delete",
        recordId,
      }),
    });

    const payload = (await response.json()) as { error?: string };
    if (!response.ok) {
      setError(payload.error ?? "Unable to delete record.");
      return;
    }

    setRecords((current) => current.filter((record) => String(record.id) !== recordId));
  }

  async function handleSubmit() {
    setIsSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/cms/${resource}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: editingRecord ? "update" : "create",
          recordId: editingRecord ? String(editingRecord.id) : undefined,
          payload: formState,
        }),
      });
      const payload = (await response.json()) as { error?: string; record?: Record<string, unknown> };
      if (!response.ok || !payload.record) {
        throw new Error(payload.error ?? "Unable to save record.");
      }

      setRecords((current) => {
        const next = editingRecord
          ? current.map((record) =>
              String(record.id) === String(payload.record?.id) ? payload.record! : record,
            )
          : [payload.record!, ...current];
        return next;
      });
      setIsFormOpen(false);
      setEditingRecord(null);
      setFormState(buildInitialForm(config.fields));
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save record.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleAudioUpload(file: File) {
    setAudioUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/admin/upload-audio", {
        method: "POST",
        body: formData,
      });
      const payload = (await response.json()) as { error?: string; publicUrl?: string };
      if (!response.ok || !payload.publicUrl) {
        throw new Error(payload.error ?? "Unable to upload audio.");
      }
      setFormState((current) => ({ ...current, audio_url: payload.publicUrl }));
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Unable to upload audio.");
    } finally {
      setAudioUploading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold mb-1">{config.title}</h1>
          <p className="text-sm text-text-secondary">{config.description}</p>
        </div>
        <button onClick={openCreate} className="btn btn-primary">
          <Plus className="w-4 h-4" />
          Add {config.singularLabel}
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="input pl-10"
            placeholder={`Search ${config.title.toLowerCase()}...`}
          />
        </div>
        {config.filters.map((filter) => (
          <select
            key={filter.name}
            className="input w-auto"
            value={filters[filter.name] ?? ""}
            onChange={(event) =>
              setFilters((current) => ({ ...current, [filter.name]: event.target.value }))
            }
          >
            {filter.options.map((option) => (
              <option key={option.value || "all"} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        ))}
      </div>

      {isFormOpen ? (
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold">
              {editingRecord ? `Edit ${config.singularLabel}` : `Add ${config.singularLabel}`}
            </h2>
            <button
              onClick={() => setIsFormOpen(false)}
              className="text-text-muted hover:text-text-primary"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {config.fields.map((field) => (
              <div
                key={field.name}
                className={field.type === "textarea" ? "md:col-span-2" : ""}
              >
                {field.type === "checkbox" ? (
                  <label className="flex items-center gap-2 text-sm text-text-secondary mt-6">
                    <input
                      type="checkbox"
                      checked={Boolean(formState[field.name])}
                      onChange={(event) =>
                        setFormState((current) => ({
                          ...current,
                          [field.name]: event.target.checked,
                        }))
                      }
                    />
                    {field.label}
                  </label>
                ) : (
                  <>
                    <label className="text-xs text-text-muted mb-1 block">{field.label}</label>
                    {renderField(field, formState[field.name], (value) =>
                      setFormState((current) => ({ ...current, [field.name]: value })),
                    )}
                    {field.description ? (
                      <p className="text-[11px] text-text-muted mt-1">{field.description}</p>
                    ) : null}
                  </>
                )}
              </div>
            ))}
          </div>

          {resource === "listening" ? (
            <div className="mt-4">
              <label className="text-xs text-text-muted mb-2 block">Upload Audio</label>
              <label className="btn btn-secondary btn-sm inline-flex cursor-pointer">
                <Upload className="w-4 h-4" />
                {audioUploading ? "Uploading..." : "Upload audio"}
                <input
                  type="file"
                  accept="audio/*"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) {
                      void handleAudioUpload(file);
                    }
                  }}
                />
              </label>
            </div>
          ) : null}

          {error ? (
            <div className="mt-4 p-3 rounded-lg bg-accent-rose/10 border border-accent-rose/20 text-xs text-accent-rose">
              {error}
            </div>
          ) : null}

          <div className="flex justify-end gap-3 mt-6">
            <button onClick={() => setIsFormOpen(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button onClick={() => void handleSubmit()} className="btn btn-primary" disabled={isSaving}>
              <Save className="w-4 h-4" />
              {isSaving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      ) : null}

      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-default bg-bg-input">
                {config.columns.map((column) => (
                  <th
                    key={column.key}
                    className="text-left p-4 text-xs font-medium text-text-muted uppercase tracking-wider"
                  >
                    {column.label}
                  </th>
                ))}
                <th className="text-right p-4 text-xs font-medium text-text-muted uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {visibleRecords.map((record) => (
                <tr
                  key={String(record.id)}
                  className="border-b border-border-subtle hover:bg-bg-card-hover transition-colors"
                >
                  {config.columns.map((column) => (
                    <td key={column.key} className="p-4 text-text-secondary align-top">
                      {formatCellValue(record[column.key])}
                    </td>
                  ))}
                  <td className="p-4">
                    <div className="flex items-center justify-end gap-2">
                      <button className="btn btn-icon btn-ghost" onClick={() => openEdit(record)}>
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        className="btn btn-icon btn-ghost text-accent-rose"
                        onClick={() => void handleDelete(String(record.id))}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!visibleRecords.length ? (
                <tr>
                  <td
                    colSpan={config.columns.length + 1}
                    className="p-6 text-center text-sm text-text-muted"
                  >
                    No records found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function renderField(
  field: AdminFieldConfig,
  value: unknown,
  onChange: (value: unknown) => void,
) {
  const commonProps = {
    className: "input",
    value: toFieldString(value),
    onChange: (
      event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
    ) => onChange(event.target.value),
    placeholder: field.placeholder,
  };

  if (field.type === "textarea" || field.type === "json") {
    return <textarea {...commonProps} className="input min-h-32" />;
  }
  if (field.type === "select") {
    return (
      <select
        className="input"
        value={typeof value === "string" ? value : ""}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">Select...</option>
        {field.options?.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    );
  }
  if (field.type === "number") {
    return <input {...commonProps} type="number" />;
  }
  return <input {...commonProps} type="text" />;
}

function buildInitialForm(fields: AdminFieldConfig[]): Record<string, unknown> {
  return Object.fromEntries(
    fields.map((field) => [
      field.name,
      field.type === "checkbox" ? false : field.type === "number" ? 0 : "",
    ]),
  );
}

function buildFormFromRecord(fields: AdminFieldConfig[], record: Record<string, unknown>) {
  const next = buildInitialForm(fields);
  for (const field of fields) {
    next[field.name] =
      field.type === "tags" && Array.isArray(record[field.name])
        ? (record[field.name] as string[]).join(", ")
        : field.name === "sections"
        ? JSON.stringify(record.sections ?? [], null, 2)
        : record[field.name] ?? next[field.name];
  }
  if ("correct_option" in record) {
    next.correct_option = record.correct_option;
  }
  return next;
}

function formatCellValue(value: unknown) {
  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }
  if (Array.isArray(value)) {
    return value.join(", ");
  }
  if (value === null || value === undefined || value === "") {
    return "—";
  }
  return String(value);
}

function toFieldString(value: unknown) {
  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }
  if (Array.isArray(value)) {
    return value.join(", ");
  }
  if (value && typeof value === "object") {
    return JSON.stringify(value, null, 2);
  }
  return "";
}
