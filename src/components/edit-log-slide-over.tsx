"use client";

import { useState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import { SlideOver } from "./slide-over";
import { updateTimeLog } from "@/app/actions/time-logs";
import { type TimeLogRow } from "@/app/actions/time-logs";
import { getClientsForSelect, getProjectsByClient } from "@/app/actions/clients-projects";

type ClientOpt = { id: string; name: string };
type ProjectOpt = { id: string; name: string; client_id: string };

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

export function EditLogSlideOver({
  log,
  open,
  onClose,
}: {
  log: TimeLogRow | null;
  open: boolean;
  onClose: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [clients, setClients] = useState<ClientOpt[]>([]);
  const [projects, setProjects] = useState<ProjectOpt[]>([]);
  const [clientId, setClientId] = useState(log?.client_id ?? "");

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
    if (log && open) {
      setClientId(log.client_id);
      setError(null);
    }
  }, [log, open]);

  async function handleSubmit(formData: FormData) {
    if (!log) return;
    const projectId = formData.get("project_id") as string;
    if (!projectId) {
      setError("Select client and project.");
      return;
    }
    setError(null);
    const date = formData.get("date") as string;
    const startTime = formData.get("start_time") as string;
    const endTime = formData.get("end_time") as string;
    const description = (formData.get("description") as string)?.trim() || null;
    const isBillable = formData.get("is_billable") === "true";

    const startedAt = new Date(`${date}T${startTime}`);
    const endedAt = new Date(`${date}T${endTime}`);
    const durationMinutes = Math.round((endedAt.getTime() - startedAt.getTime()) / 60000);
    if (durationMinutes <= 0) {
      setError("End time must be after start time.");
      return;
    }

    const result = await updateTimeLog(log.id, {
      project_id: projectId,
      date,
      duration_minutes: durationMinutes,
      description: description ?? undefined,
      is_billable: isBillable,
    });
    if (result.error) {
      setError(result.error);
      return;
    }
    onClose();
  }

  if (!log) return null;

  const dateStr = log.started_at ? new Date(log.started_at).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
  const startDate = log.started_at ? new Date(log.started_at) : new Date();
  const endDate = log.ended_at ? new Date(log.ended_at) : new Date(startDate.getTime() + (log.duration_minutes ?? 0) * 60000);
  const startTimeStr = startDate.toTimeString().slice(0, 5);
  const endTimeStr = endDate.toTimeString().slice(0, 5);

  return (
    <SlideOver open={open} onClose={onClose} title="Edit Log">
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
              defaultValue={log.project_id}
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
              defaultValue={dateStr}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-app)] px-3 py-2 text-[var(--text-primary)] focus:ring-2 focus:ring-accent"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--text-secondary)]">
              Time *
            </label>
            <div className="flex items-center gap-2">
              <input
                name="start_time"
                type="time"
                required
                defaultValue={startTimeStr}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-app)] px-3 py-2 font-mono text-[var(--text-primary)] focus:ring-2 focus:ring-accent"
              />
              <span className="text-[var(--text-muted)]">–</span>
              <input
                name="end_time"
                type="time"
                required
                defaultValue={endTimeStr}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-app)] px-3 py-2 font-mono text-[var(--text-primary)] focus:ring-2 focus:ring-accent"
              />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--text-secondary)]">
              Description
            </label>
            <input
              name="description"
              defaultValue={log.description ?? ""}
              placeholder="e.g. Logo concepts"
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-app)] px-3 py-2 text-[var(--text-primary)] focus:ring-2 focus:ring-accent"
            />
          </div>
          <div>
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="radio"
                name="is_billable"
                value="true"
                defaultChecked={log.is_billable}
                className="accent-accent"
              />
              <span className="text-sm">Billable</span>
            </label>
            <label className="mt-2 flex cursor-pointer items-center gap-2">
              <input
                type="radio"
                name="is_billable"
                value="false"
                defaultChecked={!log.is_billable}
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
