import { describe, expect, it } from "vitest";
import {
  INVOICE_TIME_PLACEHOLDER,
  buildInvoiceLogLabel,
  groupLogsByTask,
  polishSourceText,
} from "./line-labels";

describe("polishSourceText", () => {
  it("prefers a trimmed description over the task name", () => {
    expect(polishSourceText("  wrote copy  ", "Homepage")).toBe("wrote copy");
  });

  it("falls back to the task name when the description is empty", () => {
    expect(polishSourceText("", "Homepage")).toBe("Homepage");
    expect(polishSourceText("   ", "Homepage")).toBe("Homepage");
    expect(polishSourceText(null, "Homepage")).toBe("Homepage");
  });

  it("returns null when there is nothing real to polish", () => {
    expect(polishSourceText(null, null)).toBeNull();
    expect(polishSourceText("", "")).toBeNull();
    expect(polishSourceText("  ", null)).toBeNull();
  });
});

describe("buildInvoiceLogLabel", () => {
  it("uses the task name when the description is empty", () => {
    const built = buildInvoiceLogLabel({
      taskId: "task-1",
      taskName: "Design homepage",
      description: "",
    });
    expect(built.label).toBe("Design homepage");
    expect(built.prePolishLabel).toBe("Design homepage");
    expect(built.groupKey).toBe("task-1");
    expect(built.polishInput).toBe("Design homepage");
  });

  it("does not let a Time placeholder beat a task name (polish unavailable)", () => {
    const built = buildInvoiceLogLabel({
      taskId: "task-1",
      taskName: "Design homepage",
      description: "",
      polished: INVOICE_TIME_PLACEHOLDER,
    });
    expect(built.label).toBe("Design homepage");
    expect(built.groupKey).toBe("task-1");
  });

  it("keeps the original label when polish returns the same text", () => {
    const built = buildInvoiceLogLabel({
      taskId: "task-1",
      taskName: "Design homepage",
      description: "Design homepage",
      polished: "Design homepage",
    });
    expect(built.label).toBe("Design homepage");
  });

  it("uses polished text only when it actually changed the input", () => {
    const built = buildInvoiceLogLabel({
      taskId: "task-1",
      taskName: "Design homepage",
      description: "fixed the hero",
      polished: "Homepage hero revisions",
    });
    expect(built.label).toBe("Homepage hero revisions");
    expect(built.groupKey).toBe("task-1");
    expect(built.prePolishLabel).toBe("Design homepage");
  });

  it("uses a real description when there is no task name", () => {
    const built = buildInvoiceLogLabel({
      taskId: null,
      taskName: null,
      description: "  research  ",
    });
    expect(built.label).toBe("research");
    expect(built.groupKey).toBe("research");
  });

  it("falls back to Time only when there is no task or description", () => {
    const built = buildInvoiceLogLabel({
      taskId: null,
      taskName: null,
      description: "  ",
    });
    expect(built.label).toBe(INVOICE_TIME_PLACEHOLDER);
    expect(built.groupKey).toBe(INVOICE_TIME_PLACEHOLDER);
    expect(built.polishInput).toBeNull();
  });
});

describe("groupLogsByTask", () => {
  it("groups by task_id so empty descriptions do not collapse into Time", () => {
    const groups = groupLogsByTask([
      { taskId: "a", taskName: "Design", description: "", polished: "Time" },
      { taskId: "a", taskName: "Design", description: "", polished: "Time" },
      { taskId: "b", taskName: "Research", description: "", polished: "Time" },
    ]);
    expect(groups).toHaveLength(2);
    expect(groups.map((g) => g.groupKey).sort()).toEqual(["a", "b"]);
    expect(groups.find((g) => g.groupKey === "a")?.label).toBe("Design");
    expect(groups.find((g) => g.groupKey === "b")?.label).toBe("Research");
    expect(groups.find((g) => g.groupKey === "a")?.logs).toHaveLength(2);
  });

  it("keeps mixed tasks separate when polish is unavailable", () => {
    const groups = groupLogsByTask([
      { taskId: "a", taskName: "Design", description: "" },
      { taskId: "b", taskName: "Research", description: "" },
    ]);
    expect(groups).toHaveLength(2);
    expect(groups.map((g) => g.label).sort()).toEqual(["Design", "Research"]);
  });

  it("does not group different tasks that share a polished placeholder", () => {
    const groups = groupLogsByTask([
      { taskId: "a", taskName: "Alpha", description: "", polished: "Time" },
      { taskId: "b", taskName: "Beta", description: "", polished: "Time" },
    ]);
    expect(groups).toHaveLength(2);
  });

  it("falls back to the pre-polish label when there is no task_id", () => {
    const groups = groupLogsByTask([
      { taskId: null, taskName: null, description: "support call", polished: "Client support" },
      { taskId: null, taskName: null, description: "support call", polished: "Client support" },
      { taskId: null, taskName: null, description: "other work" },
    ]);
    expect(groups).toHaveLength(2);
    expect(groups.map((g) => g.groupKey).sort()).toEqual(["other work", "support call"]);
    expect(groups.find((g) => g.groupKey === "support call")?.label).toBe("Client support");
    expect(groups.find((g) => g.groupKey === "support call")?.logs).toHaveLength(2);
  });
});
