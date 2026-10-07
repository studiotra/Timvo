"use client";

import { useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { SlideOver } from "./slide-over";
import { RichTextEditor } from "./rich-text-editor";
import { addProject, updateProject } from "@/app/actions/projects";
import {
  ESTIMATED_HOURS_MAX,
  isDuplicateProjectName,
  parseEstimatedHours,
} from "@/lib/projects/validation";
import type { ProjectListItem } from "@/types/database";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="px-4 py-2 bg-accent hover:bg-accent-hover text-white font-semibold rounded-lg disabled:opacity-50"
    >
      {pending ? "Saving..." : "Save"}
    </button>
  );
}

type ProjectSlideOverProps = {
  open: boolean;
  onClose: () => void;
  clientId: string;
  project?: ProjectListItem | null;
  /** Other project names on this client (for duplicate warning). */
  existingNames?: string[];
};

type FormState = {
  name: string;
  description: string;
  billingType: "hourly" | "fixed";
  hourlyRate: string;
  retainerAmount: string;
  retainerHours: string;
  taxRate: string;
  agreedFee: string;
  estimatedHours: string;
  status: "active" | "archived";
};

function emptyForm(): FormState {
  return {
    name: "",
    description: "",
    billingType: "hourly",
    hourlyRate: "",
    retainerAmount: "",
    retainerHours: "",
    taxRate: "",
    agreedFee: "",
    estimatedHours: "",
    status: "active",
  };
}

function formFromProject(project: ProjectListItem): FormState {
  return {
    name: project.name ?? "",
    description: project.description ?? "",
    billingType: project.billing_type ?? "hourly",
    hourlyRate:
      project.hourly_rate != null ? String(project.hourly_rate) : "",
    retainerAmount:
      project.retainer_amount != null ? String(project.retainer_amount) : "",
    retainerHours:
      project.retainer_hours != null ? String(project.retainer_hours) : "",
    taxRate: project.tax_rate != null ? String(project.tax_rate) : "",
    agreedFee: project.agreed_fee != null ? String(project.agreed_fee) : "",
    estimatedHours:
      project.estimated_hours != null ? String(project.estimated_hours) : "",
    status: project.status ?? "active",
  };
}

export function ProjectSlideOver({
  open,
  onClose,
  clientId,
  project,
  existingNames = [],
}: ProjectSlideOverProps) {
  const [error, setError] = useState<string | null>(null);
  const [duplicateWarn, setDuplicateWarn] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [editorKey, setEditorKey] = useState(0);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setDuplicateWarn(false);
    setForm(project ? formFromProject(project) : emptyForm());
    setEditorKey((k) => k + 1);
  }, [open, project]);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(formData: FormData) {
    setError(null);

    const estCheck = parseEstimatedHours(form.estimatedHours);
    if (!estCheck.ok) {
      setError(estCheck.error);
      return;
    }

    const name = form.name.trim();
    if (
      isDuplicateProjectName(name, existingNames, {
        excludeName: project?.name,
      })
    ) {
      const ok = window.confirm(
        `A project named "${name}" already exists for this client. Save anyway?`
      );
      if (!ok) {
        setDuplicateWarn(true);
        return;
      }
    }

    // Sync controlled values into FormData (description comes from RichTextEditor hidden input)
    formData.set("name", form.name);
    formData.set("billing_type", form.billingType);
    formData.set("hourly_rate", form.hourlyRate);
    formData.set("retainer_amount", form.retainerAmount);
    formData.set("retainer_hours", form.retainerHours);
    formData.set("tax_rate", form.taxRate);
    formData.set("agreed_fee", form.agreedFee);
    formData.set("estimated_hours", form.estimatedHours);
    formData.set("status", form.status);

    const result = project
      ? await updateProject(project.id, clientId, formData)
      : await addProject(clientId, formData);
    if (result.error) {
      setError(result.error);
      return;
    }
    onClose();
  }

  return (
    <SlideOver
      open={open}
      onClose={onClose}
      title={project ? "Edit Project" : "Add Project"}
    >
      <form action={handleSubmit} className="flex h-full min-h-0 flex-col">
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
              Project Name *
            </label>
            <input
              name="name"
              value={form.name}
              onChange={(e) => {
                updateField("name", e.target.value);
                setDuplicateWarn(
                  isDuplicateProjectName(e.target.value, existingNames, {
                    excludeName: project?.name,
                  })
                );
              }}
              required
              className="w-full px-3 py-2 bg-[var(--bg-app)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] focus:ring-2 focus:ring-accent focus:border-transparent"
              placeholder="Brand Refresh"
            />
            {duplicateWarn && (
              <p className="mt-1 text-xs text-amber-400">
                Another project on this client already uses this name.
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
              Description
            </label>
            <RichTextEditor
              key={editorKey}
              name="description"
              value={form.description}
              placeholder="Scope, deliverables, notes..."
              minHeight="140px"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
              Billing Type
            </label>
            <select
              name="billing_type"
              value={form.billingType}
              onChange={(e) =>
                updateField(
                  "billingType",
                  e.target.value === "fixed" ? "fixed" : "hourly"
                )
              }
              className="w-full px-3 py-2 bg-[var(--bg-app)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] focus:ring-2 focus:ring-accent"
            >
              <option value="hourly">Hourly</option>
              <option value="fixed">Fixed</option>
            </select>
          </div>
          {form.billingType === "hourly" && (
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                Project hourly rate (optional)
              </label>
              <input
                name="hourly_rate"
                type="number"
                min="0"
                step="0.01"
                value={form.hourlyRate}
                onChange={(e) => updateField("hourlyRate", e.target.value)}
                placeholder="e.g. 85"
                className="w-full px-3 py-2 bg-[var(--bg-app)] border border-[var(--border)] rounded-lg text-[var(--text-primary)]"
              />
              <p className="mt-1 text-xs text-[var(--text-muted)]">
                When set, this overrides the{" "}
                <Link href="/services" className="text-accent hover:underline">
                  service rate
                </Link>
                . Leave empty to use the service rate on each log.
              </p>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
              Retainer (optional)
            </label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <input
                  name="retainer_amount"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Monthly $"
                  value={form.retainerAmount}
                  onChange={(e) =>
                    updateField("retainerAmount", e.target.value)
                  }
                  className="w-full px-3 py-2 bg-[var(--bg-app)] border border-[var(--border)] rounded-lg text-[var(--text-primary)]"
                />
              </div>
              <div>
                <input
                  name="retainer_hours"
                  type="number"
                  min="0"
                  step="0.1"
                  placeholder="Hours/mo"
                  value={form.retainerHours}
                  onChange={(e) =>
                    updateField("retainerHours", e.target.value)
                  }
                  className="w-full px-3 py-2 bg-[var(--bg-app)] border border-[var(--border)] rounded-lg text-[var(--text-primary)]"
                />
              </div>
            </div>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              Monthly agreed amount and hours for utilization tracking
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
              Tax Rate (%)
            </label>
            <input
              name="tax_rate"
              type="number"
              min="0"
              max="100"
              step="0.01"
              placeholder="e.g. 8.5"
              value={form.taxRate}
              onChange={(e) => updateField("taxRate", e.target.value)}
              className="w-full px-3 py-2 bg-[var(--bg-app)] border border-[var(--border)] rounded-lg text-[var(--text-primary)]"
            />
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              Leave empty to use profile default
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
              Agreed Fee / Estimated Hours
            </label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <input
                  name="agreed_fee"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Fixed $ (if fixed)"
                  value={form.agreedFee}
                  onChange={(e) => updateField("agreedFee", e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--bg-app)] border border-[var(--border)] rounded-lg text-[var(--text-primary)]"
                />
              </div>
              <div>
                <input
                  name="estimated_hours"
                  type="number"
                  min="0"
                  max={ESTIMATED_HOURS_MAX}
                  step="0.1"
                  placeholder="Est. hours"
                  value={form.estimatedHours}
                  onChange={(e) =>
                    updateField("estimatedHours", e.target.value)
                  }
                  className="w-full px-3 py-2 bg-[var(--bg-app)] border border-[var(--border)] rounded-lg text-[var(--text-primary)]"
                />
              </div>
            </div>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              Est. hours max {ESTIMATED_HOURS_MAX.toLocaleString("en-CA")}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
              Status
            </label>
            <select
              name="status"
              value={form.status}
              onChange={(e) =>
                updateField(
                  "status",
                  e.target.value === "archived" ? "archived" : "active"
                )
              }
              className="w-full px-3 py-2 bg-[var(--bg-app)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] focus:ring-2 focus:ring-accent"
            >
              <option value="active">Active</option>
              <option value="archived">Archived</option>
            </select>
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
        </div>
        <div className="flex shrink-0 justify-end gap-3 border-t border-[var(--border)] p-5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-[var(--border)] rounded-lg text-[var(--text-primary)] hover:bg-[var(--bg-card)]"
          >
            Cancel
          </button>
          <SubmitButton />
        </div>
      </form>
    </SlideOver>
  );
}
