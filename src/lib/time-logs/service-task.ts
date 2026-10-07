/**
 * Service is stored on tasks, not time_logs. When a log has a service but no
 * task, reuse or create a project task for that service so edit can reload it.
 */

export type ServiceTaskCandidate = { id: string; name: string };

export type ResolveServiceTaskResult =
  | { kind: "task"; taskId: string }
  | { kind: "none" }
  | { kind: "create"; name: string };

/**
 * Decide how to attach a service to a time log without a schema change.
 * Explicit task wins; otherwise reuse a project task for the service (prefer
 * one named like the service); otherwise create a task named after the service.
 */
export function resolveServiceTask(args: {
  taskId?: string | null;
  serviceId?: string | null;
  candidates?: ServiceTaskCandidate[];
  serviceName?: string | null;
}): ResolveServiceTaskResult {
  const taskId = args.taskId?.trim() || null;
  if (taskId) return { kind: "task", taskId };

  const serviceId = args.serviceId?.trim() || null;
  if (!serviceId) return { kind: "none" };

  const candidates = args.candidates ?? [];
  if (candidates.length > 0) {
    const serviceName = args.serviceName?.trim() || null;
    const byName = serviceName
      ? candidates.find((t) => t.name === serviceName)
      : undefined;
    return { kind: "task", taskId: (byName ?? candidates[0]).id };
  }

  const name = args.serviceName?.trim() || "General";
  return { kind: "create", name };
}
