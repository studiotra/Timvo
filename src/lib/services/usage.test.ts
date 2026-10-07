import { describe, expect, it } from "vitest";
import {
  formatServiceInUseMessage,
  isServiceForeignKeyError,
  isServiceInUse,
} from "./usage";

describe("formatServiceInUseMessage", () => {
  it("lists projects, tasks, and logs", () => {
    expect(
      formatServiceInUseMessage({
        taskCount: 2,
        projectCount: 1,
        timeLogCount: 5,
      })
    ).toBe(
      "This service is in use by 1 project, 2 tasks, 5 time logs and cannot be deleted."
    );
  });

  it("uses singular forms", () => {
    expect(
      formatServiceInUseMessage({
        taskCount: 1,
        projectCount: 1,
        timeLogCount: 1,
      })
    ).toBe(
      "This service is in use by 1 project, 1 task, 1 time log and cannot be deleted."
    );
  });
});

describe("isServiceInUse", () => {
  it("is true when any task references the service", () => {
    expect(
      isServiceInUse({ taskCount: 1, projectCount: 1, timeLogCount: 0 })
    ).toBe(true);
    expect(
      isServiceInUse({ taskCount: 0, projectCount: 0, timeLogCount: 0 })
    ).toBe(false);
  });
});

describe("isServiceForeignKeyError", () => {
  it("detects restrict / FK failures", () => {
    expect(
      isServiceForeignKeyError(
        'update or delete on table "services" violates foreign key constraint "tasks_service_id_fkey"'
      )
    ).toBe(true);
    expect(isServiceForeignKeyError("Name is required")).toBe(false);
  });
});
