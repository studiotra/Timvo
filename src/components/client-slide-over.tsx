"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
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
  onSuccess?: () => void;
  client?: ClientListItem | null;
};

export function ClientSlideOver({ open, onClose, onSuccess, client }: ClientSlideOverProps) {
  const router = useRouter();
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
    onSuccess?.();
    router.refresh();
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
              Address
            </label>
            <textarea
              name="address"
              rows={2}
              defaultValue={client?.address ?? ""}
              placeholder="Street, City, State, ZIP"
              className="w-full px-3 py-2 bg-[var(--bg-app)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] focus:ring-2 focus:ring-accent focus:border-transparent"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                Phone
              </label>
              <input
                name="phone_number"
                type="tel"
                defaultValue={client?.phone_number ?? ""}
                placeholder="(555) 123-4567"
                className="w-full px-3 py-2 bg-[var(--bg-app)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] focus:ring-2 focus:ring-accent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                Business Phone
              </label>
              <input
                name="business_phone"
                type="tel"
                defaultValue={client?.business_phone ?? ""}
                placeholder="(555) 987-6543"
                className="w-full px-3 py-2 bg-[var(--bg-app)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] focus:ring-2 focus:ring-accent"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
              Extension
            </label>
            <input
              name="extension"
              type="text"
              defaultValue={client?.extension ?? ""}
              placeholder="e.g. 101"
              className="w-full max-w-[120px] px-3 py-2 bg-[var(--bg-app)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] focus:ring-2 focus:ring-accent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
              Note
            </label>
            <textarea
              name="note"
              rows={3}
              defaultValue={client?.note ?? ""}
              placeholder="Internal notes about this client..."
              className="w-full px-3 py-2 bg-[var(--bg-app)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] focus:ring-2 focus:ring-accent focus:border-transparent"
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
          {client && (
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                Status
              </label>
              <select
                name="status"
                defaultValue={client?.status ?? "active"}
                className="w-full px-3 py-2 bg-[var(--bg-app)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] focus:ring-2 focus:ring-accent"
              >
                <option value="active">Active</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          )}
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
