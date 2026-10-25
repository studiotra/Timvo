import { describe, expect, it } from "vitest";
import {
  UNCATEGORIZED_GROUP_NAME,
  groupLogsByTaskCategory,
  isOptionalTaskFieldEnabled,
  timeLogActionFlags,
  uncategorizedGroupName,
} from "./task-groups";

function log(
  overrides: Partial<{
    id: string;
    task_id: string | null;
    task_name: string | null;
    description: string | null;
    duration_minutes: number;
    is_billed: boolean;
  }> = {}
) {
  return {
    id: "log-1",
    task_id: null as string | null,
    task_name: null as string | null,
    description: null as string | null,
    duration_minutes: 30,
    is_billed: false,
    ...overrides,
  };
}

describe("uncategorizedGroupName", () => {
  it("uses Uncategorized when description is empty", () => {
    expect(uncategorizedGroupName(null)).toBe(UNCATEGORIZED_GROUP_NAME);
    expect(uncategorizedGroupName("  ")).toBe(UNCATEGORIZED_GROUP_NAME);
  });

  it("keeps a real description as the derived group name", () => {
    expect(uncategorizedGroupName(" support call ")).toBe("support call");
  });
});

describe("groupLogsByTaskCategory", () => {
  it("keeps individual Uncategorized logs so Edit/Delete can target them", () => {
    const groups = groupLogsByTaskCategory([
      log({ id: "u1", duration_minutes: 30 }),
      log({
        id: "t1",
        task_id: "task-design",
        task_name: "Design",
        duration_minutes: 60,
      }),
    ]);

    const uncategorized = groups.find((g) => g.taskId === null);
    expect(uncategorized?.name).toBe("Uncategorized");
    expect(uncategorized?.totalMinutes).toBe(30);
    expect(uncategorized?.logs.map((l) => l.id)).toEqual(["u1"]);

    const design = groups.find((g) => g.taskId === "task-design");
    expect(design?.name).toBe("Design");
    expect(design?.logs.map((l) => l.id)).toEqual(["t1"]);
  });

  it("does not collapse two no-task logs into a row without ids", () => {
    const groups = groupLogsByTaskCategory([
      log({ id: "a", description: "", duration_minutes: 15 }),
      log({ id: "b", description: "", duration_minutes: 15 }),
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0].name).toBe("Uncategorized");
    expect(groups[0].logs.map((l) => l.id)).toEqual(["a", "b"]);
    expect(groups[0].totalMinutes).toBe(30);
  });
});

describe("timeLogActionFlags", () => {
  it("gives Uncategorized logs the same edit and billed-lock delete as tasked logs", () => {
    expect(timeLogActionFlags({ task_id: null, is_billed: false })).toEqual({
      canEdit: true,
      canDelete: true,
    });
    expect(timeLogActionFlags({ task_id: "task-1", is_billed: false })).toEqual({
      canEdit: true,
      canDelete: true,
    });
    expect(timeLogActionFlags({ task_id: null, is_billed: true })).toEqual({
      canEdit: true,
      canDelete: false,
    });
    expect(timeLogActionFlags({ task_id: "task-1", is_billed: true })).toEqual({
      canEdit: true,
      canDelete: false,
    });
  });
});

describe("isOptionalTaskFieldEnabled", () => {
  it("allows assigning or clearing a task once a project is set", () => {
    expect(isOptionalTaskFieldEnabled("proj-1")).toBe(true);
    expect(isOptionalTaskFieldEnabled("")).toBe(false);
    expect(isOptionalTaskFieldEnabled(null)).toBe(false);
  });
});
