"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { SlideOver } from "./slide-over";
import { addClient, updateClient } from "@/app/actions/clients";
import type { ClientListItem } from "@/types/database";

const CURRENCIES = ["USD", "EUR", "GBP", "JPY", "CAD", "AUD"];

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

type ClientSlideOverProps = {
  open: boolean;
  onClose: () => void;
  client?: ClientListItem | null;
};

export function ClientSlideOver({ open, onClose, client }: ClientSlideOverProps) {
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    setError(null);
    const result = client
      ? await updateClient(client.id, formData)
      : await addClient(formData);
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
      title={client ? "Edit Client" : "Add Client"}
    >
      <form action={handleSubmit} className="flex flex-col h-full">
        <div className="p-5 space-y-4 flex-1">
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
              Name *
            </label>
            <input
              name="name"
              defaultValue={client?.name}
              required
              className="w-full px-3 py-2 bg-[var(--bg-app)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] focus:ring-2 focus:ring-accent focus:border-transparent"
              placeholder="Acme Corp"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
              Email
            </label>
            <input
              name="email"
              type="email"
              defaultValue={client?.email ?? ""}
              className="w-full px-3 py-2 bg-[var(--bg-app)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] focus:ring-2 focus:ring-accent focus:border-transparent"
              placeholder="billing@acme.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
              Tax ID
            </label>
            <input
              name="tax_id"
              defaultValue={client?.tax_id ?? ""}
              className="w-full px-3 py-2 bg-[var(--bg-app)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] focus:ring-2 focus:ring-accent focus:border-transparent"
              placeholder="Optional"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
              Currency
            </label>
            <select
              name="currency"
              defaultValue={client?.currency ?? "USD"}
              className="w-full px-3 py-2 bg-[var(--bg-app)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] focus:ring-2 focus:ring-accent"
            >
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          {error && (
            <p className="text-sm text-red-400">{error}</p>
          )}
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
