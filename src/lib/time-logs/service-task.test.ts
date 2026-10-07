import { describe, expect, it } from "vitest";
import { resolveServiceTask } from "./service-task";

describe("resolveServiceTask", () => {
  it("keeps an explicit task id", () => {
    expect(
      resolveServiceTask({
        taskId: "task-1",
        serviceId: "svc-admin",
        candidates: [{ id: "task-2", name: "Admin" }],
        serviceName: "Admin",
      })
    ).toEqual({ kind: "task", taskId: "task-1" });
  });

  it("returns none when neither task nor service is set", () => {
    expect(resolveServiceTask({})).toEqual({ kind: "none" });
    expect(resolveServiceTask({ taskId: "", serviceId: "" })).toEqual({
      kind: "none",
    });
  });

  it("reuses a project task for the selected service (prefer matching name)", () => {
    expect(
      resolveServiceTask({
        serviceId: "svc-admin",
        serviceName: "Admin",
        candidates: [
          { id: "t-other", name: "Misc" },
          { id: "t-admin", name: "Admin" },
        ],
      })
    ).toEqual({ kind: "task", taskId: "t-admin" });
  });

  it("falls back to the first candidate when names do not match", () => {
    expect(
      resolveServiceTask({
        serviceId: "svc-admin",
        serviceName: "Admin",
        candidates: [{ id: "t-only", name: "Something else" }],
      })
    ).toEqual({ kind: "task", taskId: "t-only" });
  });

  it("requests create when service is set but no task exists yet", () => {
    expect(
      resolveServiceTask({
        serviceId: "svc-admin",
        serviceName: "Admin",
        candidates: [],
      })
    ).toEqual({ kind: "create", name: "Admin" });
  });

  it("uses General when creating without a service name", () => {
    expect(
      resolveServiceTask({
        serviceId: "svc-admin",
        candidates: [],
      })
    ).toEqual({ kind: "create", name: "General" });
  });
});
