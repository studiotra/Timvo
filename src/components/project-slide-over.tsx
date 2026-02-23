"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { SlideOver } from "./slide-over";
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
              Hourly Rate
            </label>
            <input
              name="hourly_rate"
              type="number"
              step="0.01"
              min="0"
              defaultValue={project?.hourly_rate ?? ""}
              className="w-full px-3 py-2 bg-[var(--bg-app)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] font-mono focus:ring-2 focus:ring-accent focus:border-transparent"
              placeholder="150"
            />
          </div>
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
