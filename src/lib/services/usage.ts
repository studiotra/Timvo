/**
 * Pure helpers for service delete / archive messaging.
 */

export type ServiceUsage = {
  taskCount: number;
  projectCount: number;
  timeLogCount: number;
};

export function formatServiceInUseMessage(usage: ServiceUsage): string {
  const parts: string[] = [];
  if (usage.projectCount > 0) {
    parts.push(
      `${usage.projectCount} project${usage.projectCount === 1 ? "" : "s"}`
    );
  }
  if (usage.taskCount > 0) {
    parts.push(`${usage.taskCount} task${usage.taskCount === 1 ? "" : "s"}`);
  }
  if (usage.timeLogCount > 0) {
    parts.push(
      `${usage.timeLogCount} time log${usage.timeLogCount === 1 ? "" : "s"}`
    );
  }
  if (parts.length === 0) {
    return "This service is in use and cannot be deleted.";
  }
  return `This service is in use by ${parts.join(", ")} and cannot be deleted.`;
}

export function isServiceInUse(usage: ServiceUsage): boolean {
  return usage.taskCount > 0;
}

/** Detect FK / restrict errors when deleting a service still linked to tasks. */
export function isServiceForeignKeyError(
  message: string | null | undefined
): boolean {
  if (!message) return false;
  const m = message.toLowerCase();
  return (
    m.includes("foreign key") ||
    m.includes("violates") ||
    m.includes("tasks_service_id") ||
    m.includes("23503")
  );
}

export function isMissingStatusColumnError(
  message: string | null | undefined
): boolean {
  if (!message) return false;
  const m = message.toLowerCase();
  return (
    (m.includes("status") &&
      (m.includes("does not exist") ||
        m.includes("could not find") ||
        m.includes("schema cache"))) ||
    m.includes("services_status")
  );
}
