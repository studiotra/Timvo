/**
 * Optional task columns (is_done, due_date, sort_order) land in a later migration.
 * Helpers keep UI/actions working when those columns are absent.
 */

export type TaskExtraFields = {
  isDone: boolean;
  dueDate: string | null;
  sortOrder: number;
};

export type TaskFeatures = {
  /** True when is_done / due_date / sort_order can be read and written. */
  extras: boolean;
};

export const DEFAULT_TASK_EXTRAS: TaskExtraFields = {
  isDone: false,
  dueDate: null,
  sortOrder: 0,
};

/** YYYY-MM-DD or empty/null. Rejects other shapes. */
export function normalizeDueDate(
  value: string | null | undefined
): { ok: true; dueDate: string | null } | { ok: false; error: string } {
  if (value == null || value === "") return { ok: true, dueDate: null };
  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return { ok: false, error: "Due date must be YYYY-MM-DD." };
  }
  const [y, m, d] = trimmed.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (
    dt.getUTCFullYear() !== y ||
    dt.getUTCMonth() !== m - 1 ||
    dt.getUTCDate() !== d
  ) {
    return { ok: false, error: "Due date is not a valid calendar day." };
  }
  return { ok: true, dueDate: trimmed };
}

export type SortableTask = {
  id: string | null;
  name: string;
  isDone?: boolean;
  dueDate?: string | null;
  sortOrder?: number;
};

/**
 * Real tasks first by sort_order, then name; done tasks after open ones;
 * derived (id null) rows always last, alphabetical.
 */
export function sortTaskRows<T extends SortableTask>(tasks: T[]): T[] {
  return [...tasks].sort((a, b) => {
    const aDerived = a.id == null;
    const bDerived = b.id == null;
    if (aDerived !== bDerived) return aDerived ? 1 : -1;

    const aDone = a.isDone ? 1 : 0;
    const bDone = b.isDone ? 1 : 0;
    if (aDone !== bDone) return aDone - bDone;

    const ao = a.sortOrder ?? 0;
    const bo = b.sortOrder ?? 0;
    if (ao !== bo) return ao - bo;

    return a.name.localeCompare(b.name);
  });
}

/** Assign contiguous sort_order values (0..n-1) for a reorder payload. */
export function buildSortOrderUpdates(
  orderedIds: string[]
): { id: string; sortOrder: number }[] {
  return orderedIds.map((id, index) => ({ id, sortOrder: index }));
}

/** Detect PostgREST / Postgres "column does not exist" style errors. */
export function isMissingColumnError(message: string | null | undefined): boolean {
  if (!message) return false;
  const m = message.toLowerCase();
  return (
    m.includes("does not exist") ||
    m.includes("could not find") ||
    m.includes("schema cache")
  );
}
