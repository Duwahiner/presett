import { describe, expect, it } from "vitest";
import { formatDate, shortenSessionId } from "../formatting";

// Deterministic timezone strategy: pin the runtime timezone to a fixed zone
// (America/New_York = UTC-4 during August daylight saving). Vitest runs each
// test file in its own fork (default pool), so this mutation is isolated to
// this suite. Pinning makes the expected local renderings exact and
// host-independent, so a timestamp with a trailing "Z" must render in that
// local zone rather than being force-formatted as UTC.
process.env.TZ = "America/New_York";

describe("formatDate", () => {
  it("renders a Z (UTC) ISO timestamp in the local runtime timezone, not UTC", () => {
    // 2026-08-26T14:30Z is 10:30 AM in America/New_York (UTC-4), not 2:30 PM UTC.
    expect(formatDate("2026-08-26T14:30:00.000Z")).toBe(
      "26 de agosto de 2026, 10:30 am",
    );
  });

  it("shifts the calendar day when the UTC instant lands on the previous local day", () => {
    // 2026-08-27T01:30Z is 9:30 PM on 2026-08-26 locally.
    expect(formatDate("2026-08-27T01:30:00.000Z")).toBe(
      "26 de agosto de 2026, 9:30 pm",
    );
  });

  it("renders the previous local day for late-night UTC instants", () => {
    // 2026-08-26T00:30Z is 8:30 PM on 2026-08-25 locally.
    expect(formatDate("2026-08-26T00:30:00.000Z")).toBe(
      "25 de agosto de 2026, 8:30 pm",
    );
  });

  it("handles the 12-hour noon boundary (12:00 pm)", () => {
    // 2026-08-26T16:00Z is exactly 12:00 PM locally.
    expect(formatDate("2026-08-26T16:00:00.000Z")).toBe(
      "26 de agosto de 2026, 12:00 pm",
    );
  });

  it("always renders in the runtime's own local timezone regardless of host default", () => {
    // TZ-independence guard: derive the expected string from the runtime's own
    // Date instance so this test stays correct on any machine/CI even if the
    // process.env.TZ pin above were ever ignored. Under the old UTC-forcing
    // implementation this fails because formatDate returns the UTC hour.
    const iso = "2026-08-26T14:30:00.000Z";
    const local = new Date(iso);
    const meridiem = local.getHours() >= 12 ? "pm" : "am";
    const hour12 = local.getHours() % 12 || 12;
    const month = local.toLocaleString("es-ES", { month: "long" });
    const expected = `${local.getDate()} de ${month} de ${local.getFullYear()}, ${hour12}:${String(
      local.getMinutes(),
    ).padStart(2, "0")} ${meridiem}`;
    expect(formatDate(iso)).toBe(expected);
  });
});

describe("shortenSessionId", () => {
  it("strips the ses_ prefix and truncates long ids to a compact, recognizable form", () => {
    // ses_fbeeb882cffe9uHXh1t55uPkOq -> "fbeeb882cf" (10 chars after the prefix).
    expect(shortenSessionId("ses_fbeeb882cffe9uHXh1t55uPkOq")).toBe("fbeeb882cf");
  });

  it("keeps short ids unchanged when already under the limit", () => {
    expect(shortenSessionId("abc123")).toBe("abc123");
  });

  it("handles an id without the ses_ prefix", () => {
    expect(shortenSessionId("fbeeb882cffe9uHXh1t55uPkOq")).toBe("fbeeb882cf");
  });

  it("returns an empty string for an empty id", () => {
    expect(shortenSessionId("")).toBe("");
  });
});