"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { SlideOver } from "./slide-over";
import { addService, updateService } from "@/app/actions/services";
import type { ServiceListItem } from "@/types/database";

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

type ServiceSlideOverProps = {
  open: boolean;
  onClose: () => void;
  service?: ServiceListItem | null;
};

export function ServiceSlideOver({
  open,
  onClose,
  service,
}: ServiceSlideOverProps) {
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    setError(null);
    const result = service
      ? await updateService(service.id, formData)
      : await addService(formData);
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
      title={service ? "Edit Service" : "Add Service"}
    >
      <form action={handleSubmit} className="flex flex-col h-full">
        <div className="p-5 space-y-4 flex-1">
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
              Service Name *
            </label>
            <input
              name="name"
              defaultValue={service?.name}
              required
              className="w-full px-3 py-2 bg-[var(--bg-app)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] focus:ring-2 focus:ring-accent focus:border-transparent"
              placeholder="e.g. Design, Development"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
              Default Rate ($/hr)
            </label>
            <input
              name="default_rate"
              type="number"
              step="0.01"
              min="0"
              defaultValue={service?.default_rate ?? ""}
              className="w-full px-3 py-2 bg-[var(--bg-app)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] font-mono focus:ring-2 focus:ring-accent focus:border-transparent"
              placeholder="150"
            />
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
