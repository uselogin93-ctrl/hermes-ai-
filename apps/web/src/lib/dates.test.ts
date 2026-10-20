import { describe, expect, it } from "vitest";
import { dayBounds, formatTime, localDate, nextScheduledRun, relativeTime } from "@/lib/dates";

describe("localDate", () => {
  it("returns the calendar date in the given timezone", () => {
    const instant = new Date("2026-10-20T18:30:00.000Z");
    expect(localDate(instant, "UTC")).toBe("2026-10-20");
    expect(localDate(instant, "Asia/Kolkata")).toBe("2026-10-21");
  });
});

describe("dayBounds", () => {
  it("covers a full local day in UTC", () => {
    const { start, end } = dayBounds("2026-10-20", "UTC");
    expect(start.toISOString()).toBe("2026-10-20T00:00:00.000Z");
    expect(end.toISOString()).toBe("2026-10-21T00:00:00.000Z");
  });

  it("shifts the window for a non UTC timezone", () => {
    const { start, end } = dayBounds("2026-10-20", "Asia/Kolkata");
    expect(start.toISOString()).toBe("2026-10-19T18:30:00.000Z");
    expect(end.getTime() - start.getTime()).toBe(24 * 60 * 60 * 1000);
  });
});

describe("nextScheduledRun", () => {
  it("returns today when the time has not passed yet", () => {
    const from = new Date("2026-10-20T05:00:00.000Z");
    const next = nextScheduledRun("07:00", "UTC", from);
    expect(next.toISOString()).toBe("2026-10-20T07:00:00.000Z");
  });

  it("rolls over to tomorrow when the time has passed", () => {
    const from = new Date("2026-10-20T09:00:00.000Z");
    const next = nextScheduledRun("07:00", "UTC", from);
    expect(next.toISOString()).toBe("2026-10-21T07:00:00.000Z");
  });
});

describe("relativeTime", () => {
  it("describes recent instants", () => {
    const now = new Date("2026-10-20T12:00:00.000Z");
    expect(relativeTime(new Date("2026-10-20T11:00:00.000Z"), now)).toBe("1 hour ago");
    expect(relativeTime(new Date("2026-10-20T11:59:30.000Z"), now)).toBe("just now");
    expect(relativeTime(new Date("2026-10-20T11:30:00.000Z"), now)).toBe("30 minutes ago");
  });
});

describe("formatTime", () => {
  it("formats a 24 hour clock time in the target timezone", () => {
    expect(formatTime(new Date("2026-10-20T18:30:00.000Z"), "UTC")).toBe("18:30");
  });
});
