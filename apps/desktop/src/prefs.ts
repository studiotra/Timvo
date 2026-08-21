export type LastTimerSelection = {
  clientId: string;
  projectId: string;
  serviceId?: string;
  taskId?: string;
  description?: string;
};

const KEY = "timvo-desktop-last-timer";

export function loadLastSelection(): LastTimerSelection | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LastTimerSelection;
    if (!parsed.projectId) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveLastSelection(selection: LastTimerSelection) {
  localStorage.setItem(KEY, JSON.stringify(selection));
}
