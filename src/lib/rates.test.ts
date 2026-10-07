import { describe, expect, it } from "vitest";
import {
  hourlyLogAmount,
  rateSourceLabel,
  resolveHourlyRate,
} from "./rates";

describe("resolveHourlyRate", () => {
  it("prefers project rate over service and default", () => {
    expect(
      resolveHourlyRate({
        projectRate: 80,
        serviceRate: 60,
        defaultRate: 40,
      })
    ).toEqual({ rate: 80, source: "project", missing: false });
  });

  it("falls back to service when project has no rate", () => {
    expect(
      resolveHourlyRate({
        projectRate: null,
        serviceRate: 60,
        defaultRate: 40,
      })
    ).toEqual({ rate: 60, source: "service", missing: false });
  });

  it("falls back to default when project and service have no rate", () => {
    expect(
      resolveHourlyRate({
        projectRate: 0,
        serviceRate: null,
        defaultRate: 45,
      })
    ).toEqual({ rate: 45, source: "default", missing: false });
  });

  it("marks missing when no rate exists anywhere", () => {
    expect(
      resolveHourlyRate({
        projectRate: null,
        serviceRate: null,
        defaultRate: null,
      })
    ).toEqual({ rate: 0, source: "none", missing: true });
  });

  it("ignores zero and negative rates", () => {
    expect(
      resolveHourlyRate({
        projectRate: -10,
        serviceRate: 0,
        defaultRate: 50,
      })
    ).toEqual({ rate: 50, source: "default", missing: false });
  });
});

describe("hourlyLogAmount", () => {
  it("bills hours × rate to cents", () => {
    const resolved = resolveHourlyRate({ serviceRate: 60 });
    expect(hourlyLogAmount(90, resolved)).toBe(90);
  });

  it("returns 0 when rate is missing", () => {
    const resolved = resolveHourlyRate({});
    expect(hourlyLogAmount(120, resolved)).toBe(0);
  });
});

describe("rateSourceLabel", () => {
  it("labels sources for UI", () => {
    expect(rateSourceLabel("service")).toBe("service rate");
    expect(rateSourceLabel("none")).toBe("no rate");
  });
});
