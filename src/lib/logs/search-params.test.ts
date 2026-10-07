import { describe, expect, it } from "vitest";
import {
  buildLogsNavigationParams,
  buildLogsSearchParams,
  parseLogsDisplayMode,
  parseLogsMapGroup,
  parseLogsViewMode,
} from "./search-params";

describe("parseLogsDisplayMode", () => {
  it("accepts calendar and map", () => {
    expect(parseLogsDisplayMode("calendar")).toBe("calendar");
    expect(parseLogsDisplayMode("map")).toBe("map");
  });

  it("defaults to list", () => {
    expect(parseLogsDisplayMode(undefined)).toBe("list");
    expect(parseLogsDisplayMode("other")).toBe("list");
  });
});

describe("parseLogsViewMode", () => {
  it("parses week and month (including calendar month)", () => {
    expect(parseLogsViewMode("month")).toBe("month");
    expect(parseLogsViewMode(undefined)).toBe("week");
    expect(parseLogsViewMode("week")).toBe("week");
  });
});

describe("parseLogsMapGroup", () => {
  it("accepts client and project", () => {
    expect(parseLogsMapGroup("client")).toBe("client");
    expect(parseLogsMapGroup("project")).toBe("project");
  });

  it("defaults to all", () => {
    expect(parseLogsMapGroup(undefined)).toBe("all");
  });
});

describe("buildLogsSearchParams", () => {
  const base = {
    displayMode: "list" as const,
    view: "week" as const,
    offset: 0,
    mapGroup: "all" as const,
  };

  it("returns empty string for defaults", () => {
    expect(buildLogsSearchParams(base)).toBe("");
  });

  it("encodes non-default navigation state", () => {
    expect(
      buildLogsSearchParams({
        ...base,
        displayMode: "calendar",
        view: "month",
        offset: -1,
        mapGroup: "client",
        clientId: "c1",
        fromDate: "2026-10-01",
        toDate: "2026-10-07",
      })
    ).toBe(
      "display=calendar&view=month&offset=-1&group=client&client=c1&from=2026-10-01&to=2026-10-07"
    );
  });

  it("applies updates over current state (including clears)", () => {
    expect(
      buildLogsSearchParams(
        { ...base, view: "month", offset: 2, clientId: "c1" },
        { view: "week", offset: "0", client: "" }
      )
    ).toBe("");
  });

  it("supports week/month toggles without useSearchParams", () => {
    expect(buildLogsSearchParams(base, { view: "month", offset: "0" })).toBe("view=month");
    expect(
      buildLogsSearchParams({ ...base, view: "month", offset: 1 }, { offset: "2" })
    ).toBe("view=month&offset=2");
  });

  it("preserves calendar month when only display updates", () => {
    expect(
      buildLogsSearchParams(
        { ...base, displayMode: "list", view: "month" },
        { display: "calendar" }
      )
    ).toBe("display=calendar&view=month");
  });
});

describe("buildLogsNavigationParams", () => {
  const appliedBase = {
    displayMode: "list" as const,
    view: "week" as const,
    offset: 0,
    mapGroup: "all" as const,
    clientId: "",
    fromDate: "",
    toDate: "",
  };

  it("ignores unapplied draft client on view/offset/display changes", () => {
    // Draft client "abc" must never enter applied state — only updates write filters.
    expect(buildLogsNavigationParams(appliedBase, { view: "month" })).toBe("view=month");
    expect(buildLogsNavigationParams(appliedBase, { offset: "-1" })).toBe("offset=-1");
    expect(buildLogsNavigationParams(appliedBase, { display: "calendar" })).toBe(
      "display=calendar"
    );
    expect(buildLogsNavigationParams(appliedBase, { display: "map" })).toBe("display=map");
  });

  it("preserves applied client/from/to on offset/display/group changes", () => {
    const applied = {
      ...appliedBase,
      clientId: "c1",
      fromDate: "2026-10-01",
      toDate: "2026-10-07",
    };
    expect(buildLogsNavigationParams(applied, { offset: "1" })).toBe(
      "offset=1&client=c1&from=2026-10-01&to=2026-10-07"
    );
    expect(buildLogsNavigationParams(applied, { display: "calendar" })).toBe(
      "display=calendar&client=c1&from=2026-10-01&to=2026-10-07"
    );
    expect(buildLogsNavigationParams(applied, { group: "client" })).toBe(
      "group=client&client=c1&from=2026-10-01&to=2026-10-07"
    );
  });

  it("setViewOffset-style updates clear from/to but keep applied client", () => {
    const applied = {
      ...appliedBase,
      clientId: "c1",
      fromDate: "2026-10-01",
      toDate: "2026-10-07",
    };
    expect(
      buildLogsNavigationParams(applied, {
        view: "month",
        offset: "0",
        from: "",
        to: "",
      })
    ).toBe("view=month&client=c1");
  });

  it("applying filters writes draft client/from/to into the URL", () => {
    expect(
      buildLogsNavigationParams(appliedBase, {
        client: "abc",
        from: "2026-09-01",
        to: "2026-09-30",
      })
    ).toBe("client=abc&from=2026-09-01&to=2026-09-30");
  });
});
