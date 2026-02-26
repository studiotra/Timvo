"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { SlideOver } from "./slide-over";
import { RichTextEditor } from "./rich-text-editor";
import { addProject, updateProject } from "@/app/actions/projects";
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
};

export function ProjectSlideOver({
  open,
  onClose,
  clientId,
  project,
}: ProjectSlideOverProps) {
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    setError(null);
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
      <form action={handleSubmit} className="flex flex-col h-full">
        <div className="p-5 space-y-4 flex-1">
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
              Project Name *
            </label>
            <input
              name="name"
              defaultValue={project?.name}
              required
              className="w-full px-3 py-2 bg-[var(--bg-app)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] focus:ring-2 focus:ring-accent focus:border-transparent"
              placeholder="Brand Refresh"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
              Description
            </label>
            <RichTextEditor
              key={project?.id ?? "new"}
              name="description"
              value={project?.description ?? ""}
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
              defaultValue={project?.billing_type ?? "hourly"}
              className="w-full px-3 py-2 bg-[var(--bg-app)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] focus:ring-2 focus:ring-accent"
            >
              <option value="hourly">Hourly</option>
              <option value="fixed">Fixed</option>
            </select>
          </div>
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
                  defaultValue={project?.retainer_amount ?? ""}
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
                  defaultValue={project?.retainer_hours ?? ""}
                  className="w-full px-3 py-2 bg-[var(--bg-app)] border border-[var(--border)] rounded-lg text-[var(--text-primary)]"
                />
              </div>
            </div>
            <p className="mt-1 text-xs text-[var(--text-muted)]">Monthly agreed amount and hours for utilization tracking</p>
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
              defaultValue={project?.tax_rate ?? ""}
              className="w-full px-3 py-2 bg-[var(--bg-app)] border border-[var(--border)] rounded-lg text-[var(--text-primary)]"
            />
            <p className="mt-1 text-xs text-[var(--text-muted)]">Leave empty to use profile default</p>
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
                  defaultValue={project?.agreed_fee ?? ""}
                  className="w-full px-3 py-2 bg-[var(--bg-app)] border border-[var(--border)] rounded-lg text-[var(--text-primary)]"
                />
              </div>
              <div>
                <input
                  name="estimated_hours"
                  type="number"
                  min="0"
                  step="0.1"
                  placeholder="Est. hours"
                  defaultValue={project?.estimated_hours ?? ""}
                  className="w-full px-3 py-2 bg-[var(--bg-app)] border border-[var(--border)] rounded-lg text-[var(--text-primary)]"
                />
              </div>
            </div>
          </div>
          <p className="text-xs text-[var(--text-muted)]">
            Rates come from Service settings
          </p>
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
              Status
            </label>
            <select
              name="status"
              defaultValue={project?.status ?? "active"}
              className="w-full px-3 py-2 bg-[var(--bg-app)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] focus:ring-2 focus:ring-accent"
            >
              <option value="active">Active</option>
              <option value="archived">Archived</option>
            </select>
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
        </div>
        <div className="p-5 border-t border-[var(--border)] flex gap-3 justify-end">
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
