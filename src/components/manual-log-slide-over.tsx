"use client";

import { useState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import { SlideOver } from "./slide-over";
import { addManualLog } from "@/app/actions/time-logs";
import { createClient } from "@/lib/supabase/client";
import { getClientsForSelect, getProjectsByClient } from "@/app/actions/clients-projects";

type ClientOpt = { id: string; name: string };
type ProjectOpt = { id: string; name: string; client_id: string };
type ServiceOpt = { id: string; name: string };

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

export function ManualLogSlideOver({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [clients, setClients] = useState<ClientOpt[]>([]);
  const [projects, setProjects] = useState<ProjectOpt[]>([]);
  const [clientId, setClientId] = useState("");
  const [services, setServices] = useState<ServiceOpt[]>([]);

  useEffect(() => {
    if (!open) return;
    getClientsForSelect().then(setClients);
  }, [open]);

  useEffect(() => {
    if (!clientId) {
      setProjects([]);
      return;
    }
    getProjectsByClient(clientId).then(setProjects);
  }, [clientId]);

  useEffect(() => {
    if (!open) return;
    async function loadServices() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("services")
        .select("id, name")
        .eq("user_id", user.id);
      setServices((data ?? []).map((s) => ({ id: s.id, name: s.name })));
    }
    loadServices();
  }, [open]);

  useEffect(() => {
    if (open) {
      setClientId("");
    }
  }, [open]);

  async function handleSubmit(formData: FormData) {
    const projectId = formData.get("project_id") as string;
    if (!projectId) {
      setError("Select client and project.");
      return;
    }
    setError(null);
    const result = await addManualLog(formData);
    if (result.error) {
      setError(result.error);
      return;
    }
    onClose();
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <SlideOver open={open} onClose={onClose} title="Add Manual Log">
      <form action={handleSubmit} className="flex flex-col h-full">
        <div className="p-5 space-y-4 flex-1">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--text-secondary)]">
              Client *
            </label>
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              required
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-app)] px-3 py-2 text-[var(--text-primary)] focus:ring-2 focus:ring-accent"
            >
              <option value="">Select client</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--text-secondary)]">
              Project *
            </label>
            <select
              name="project_id"
              required
              disabled={!clientId}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-app)] px-3 py-2 text-[var(--text-primary)] focus:ring-2 focus:ring-accent disabled:opacity-50"
            >
              <option value="">Select project</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--text-secondary)]">
              Date *
            </label>
            <input
              name="date"
              type="date"
              required
              defaultValue={today}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-app)] px-3 py-2 text-[var(--text-primary)] focus:ring-2 focus:ring-accent"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--text-secondary)]">
              Duration (minutes) *
            </label>
            <input
              name="duration"
              type="number"
              required
              min="1"
              placeholder="60"
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-app)] px-3 py-2 font-mono text-[var(--text-primary)] focus:ring-2 focus:ring-accent"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--text-secondary)]">
              Description
            </label>
            <input
              name="description"
              list="services-list"
              placeholder="e.g. Logo concepts"
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-app)] px-3 py-2 text-[var(--text-primary)] focus:ring-2 focus:ring-accent"
            />
            {services.length > 0 && (
              <datalist id="services-list">
                {services.map((s) => (
                  <option key={s.id} value={s.name} />
                ))}
              </datalist>
            )}
          </div>
          <div>
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="radio"
                name="is_billable"
                value="true"
                defaultChecked
                className="accent-accent"
              />
              <span className="text-sm">Billable</span>
            </label>
            <label className="mt-2 flex cursor-pointer items-center gap-2">
              <input
                type="radio"
                name="is_billable"
                value="false"
                className="accent-accent"
              />
              <span className="text-sm">Non-billable</span>
            </label>
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
        </div>
        <div className="flex justify-end gap-3 border-t border-[var(--border)] p-5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[var(--border)] px-4 py-2 text-[var(--text-primary)] hover:bg-[var(--bg-card)]"
          >
            Cancel
          </button>
          <SubmitButton />
        </div>
      </form>
    </SlideOver>
  );
}
