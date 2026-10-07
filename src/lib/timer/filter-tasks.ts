/** Task shape used by the sidebar / timer selectors. */
export type TimerTaskFilterable = {
  id: string;
  name: string;
  serviceId?: string | null;
};

/**
 * Filter project tasks for the selected service.
 * Tasks with no service stay visible for every service (optional / untyped tasks).
 */
export function filterTasksForService<T extends TimerTaskFilterable>(
  tasks: T[],
  serviceId: string | undefined | null
): T[] {
  if (!serviceId) return tasks;
  return tasks.filter((t) => !t.serviceId || t.serviceId === serviceId);
}
