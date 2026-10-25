/** Group header used when a time log has no task and no description. */
export const UNCATEGORIZED_GROUP_NAME = "Uncategorized";

export type ProjectLog = {
  id: string;
  task_id: string | null;
  task_name: string | null;
  service_id: string | null;
  service_name?: string | null;
  description: string | null;
  duration_minutes: number;
  started_at: string;
  ended_at: string | null;
  is_billable: boolean;
  is_billed: boolean;
};

export type TimeLogActionFlags = {
  canEdit: boolean;
  canDelete: boolean;
};

/**
 * Same rules as the Logs list: edit is always offered, delete is locked when
 * billed. Actions belong to the log, not the task — Uncategorized (null task)
 * rows get the same flags as categorized ones.
 */
export function timeLogActionFlags(log: {
  is_billed?: boolean | null;
  task_id?: string | null;
}): TimeLogActionFlags {
  return {
    canEdit: true,
    canDelete: !log.is_billed,
  };
}

/** Task is optional. The dropdown is enabled once a project is chosen. */
export function isOptionalTaskFieldEnabled(
  projectId?: string | null
): boolean {
  return Boolean(projectId?.trim());
}

export function uncategorizedGroupName(description?: string | null): string {
  return description?.trim() || UNCATEGORIZED_GROUP_NAME;
}

export type TaskLogGroup<T extends { id: string; duration_minutes?: number | null }> = {
  taskId: string | null;
  groupKey: string;
  name: string;
  logs: T[];
  totalMinutes: number;
};

/**
 * Group logs by task id, or by description / Uncategorized when task is null.
 * Each group keeps the individual logs so Edit/Delete can target them.
 */
export function groupLogsByTaskCategory<
  T extends {
    id: string;
    task_id?: string | null;
    task_name?: string | null;
    description?: string | null;
    duration_minutes?: number | null;
  },
>(logs: T[], taskNames?: Record<string, string>): TaskLogGroup<T>[] {
  const groups = new Map<string, TaskLogGroup<T>>();
  for (const log of logs) {
    const taskId = log.task_id ?? null;
    const name = taskId
      ? (taskNames?.[taskId] ?? log.task_name?.trim() ?? "Task")
      : uncategorizedGroupName(log.description);
    const groupKey = taskId ?? `derived:${name}`;
    const mins = log.duration_minutes ?? 0;
    const existing = groups.get(groupKey);
    if (existing) {
      existing.logs.push(log);
      existing.totalMinutes += mins;
    } else {
      groups.set(groupKey, {
        taskId,
        groupKey,
        name,
        logs: [log],
        totalMinutes: mins,
      });
    }
  }
  return [...groups.values()];
}
