import { describe, expect, it } from "vitest";
import { filterTasksForService } from "./filter-tasks";

describe("filterTasksForService", () => {
  const tasks = [
    { id: "1", name: "Design home", serviceId: "svc-design" },
    { id: "2", name: "Build API", serviceId: "svc-dev" },
    { id: "3", name: "General", serviceId: null },
    { id: "4", name: "Legacy", serviceId: undefined },
  ];

  it("returns all tasks when no service is selected", () => {
    expect(filterTasksForService(tasks, "")).toEqual(tasks);
    expect(filterTasksForService(tasks, null)).toEqual(tasks);
    expect(filterTasksForService(tasks, undefined)).toEqual(tasks);
  });

  it("keeps matching service tasks and tasks without a service", () => {
    expect(filterTasksForService(tasks, "svc-design").map((t) => t.id)).toEqual([
      "1",
      "3",
      "4",
    ]);
  });

  it("filters to another service", () => {
    expect(filterTasksForService(tasks, "svc-dev").map((t) => t.id)).toEqual([
      "2",
      "3",
      "4",
    ]);
  });
});
