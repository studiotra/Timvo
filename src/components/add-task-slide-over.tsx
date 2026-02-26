"use client";

import { useState, useEffect } from "react";
import { SlideOver } from "./slide-over";
import { createTask } from "@/app/actions/clients-projects";
import { addTimeLogForTask } from "@/app/actions/time-logs";
import { getServicesForSelect } from "@/app/actions/services";

type ServiceOpt = { id: string; name: string };

type AddTaskSlideOverProps = {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  projectId: string;
  clientId?: string; // optional, for future use
};

export function AddTaskSlideOver({
  open,
  onClose,
  onSuccess,
  projectId,
}: AddTaskSlideOverProps) {
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [taskName, setTaskName] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [services, setServices] = useState<ServiceOpt[]>([]);
  const [date, setDate] = useState("");
  const [duration, setDuration] = useState("");
  const [description, setDescription] = useState("");
  const [isBillable, setIsBillable] = useState(true);

  useEffect(() => {
    if (open) getServicesForSelect().then(setServices);
  }, [open]);

  useEffect(() => {
    if (open) {
      const today = new Date().toISOString().slice(0, 10);
      setDate(today);
      setDuration("");
      setDescription("");
      setIsBillable(true);
    }
  }, [open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!taskName.trim() || !serviceId) {
      setError("Task name and service are required.");
      return;
    }
    setError(null);
    setSaving(true);

    const taskResult = await createTask(projectId, serviceId, taskName.trim());
    if (taskResult?.error) {
      setError(taskResult.error);
      setSaving(false);
      return;
    }

    const addTimeEntry = duration.trim() && parseInt(duration, 10) > 0;
    if (addTimeEntry && taskResult?.task?.id) {
      const logResult = await addTimeLogForTask(projectId, taskResult.task.id, {
        date: date || new Date().toISOString().slice(0, 10),
        durationMinutes: parseInt(duration, 10) || 0,
        description: description.trim() || null,
        isBillable: isBillable,
      });
      if (logResult?.error) {
        setError(logResult.error);
        setSaving(false);
        return;
      }
    }

    setSaving(false);
    setTaskName("");
    setServiceId("");
    onSuccess?.();
    onClose();
  }

  return (
    <SlideOver open={open} onClose={onClose} title="Add Task">
      <form onSubmit={handleSubmit} className="flex flex-col h-full">
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-5">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--text-secondary)]">
              Task name *
            </label>
            <input
              type="text"
              value={taskName}
              onChange={(e) => setTaskName(e.target.value)}
              placeholder="e.g. Logo concepts"
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-app)] px-3 py-2 text-[var(--text-primary)] focus:ring-2 focus:ring-accent"
              required
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--text-secondary)]">
              Service *
            </label>
            <select
              value={serviceId}
              onChange={(e) => setServiceId(e.target.value)}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-app)] px-3 py-2 text-[var(--text-primary)] focus:ring-2 focus:ring-accent"
              required
            >
              <option value="">Select service</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div className="border-t border-[var(--border)] pt-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
              Optional: Add time entry now
            </p>
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[var(--text-secondary)]">
                  Date
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-app)] px-3 py-2 text-[var(--text-primary)] focus:ring-2 focus:ring-accent"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[var(--text-secondary)]">
                  Duration (minutes)
                </label>
                <input
                  type="number"
                  min="1"
                  placeholder="e.g. 60"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-app)] px-3 py-2 font-mono text-[var(--text-primary)] focus:ring-2 focus:ring-accent"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[var(--text-secondary)]">
                  Description
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Logo concepts"
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-app)] px-3 py-2 text-[var(--text-primary)] focus:ring-2 focus:ring-accent"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[var(--text-secondary)]">
                  Billable / Non-billable
                </label>
                <div className="flex gap-4">
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="radio"
                      name="is_billable"
                      checked={isBillable}
                      onChange={() => setIsBillable(true)}
                      className="accent-accent"
                    />
                    <span className="text-sm">Billable</span>
                  </label>
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="radio"
                      name="is_billable"
                      checked={!isBillable}
                      onChange={() => setIsBillable(false)}
                      className="accent-accent"
                    />
                    <span className="text-sm">Non-billable</span>
                  </label>
                </div>
              </div>
            </div>
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
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-accent px-4 py-2 font-semibold text-white hover:bg-accent-hover disabled:opacity-50"
          >
            {saving ? "Saving..." : "Add Task"}
          </button>
        </div>
      </form>
    </SlideOver>
  );
}
