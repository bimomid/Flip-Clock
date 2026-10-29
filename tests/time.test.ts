import { describe, expect, it } from "vitest";
import { formatClockTime, formatLapTime, formatSplitTime, pad2 } from "@/utils/time";

describe("pad2", () => {
  it("pads single digits", () => {
    expect(pad2(0)).toBe("00");
    expect(pad2(7)).toBe("07");
  });

  it("keeps numbers with two or more digits", () => {
    expect(pad2(42)).toBe("42");
    expect(pad2(123)).toBe("123");
  });
});

describe("formatClockTime", () => {
  it("formats zero", () => {
    expect(formatClockTime(0)).toBe("00:00:00");
  });

  it("formats hours, minutes and seconds", () => {
    expect(formatClockTime(3_661_000)).toBe("01:01:01");
  });

  it("drops sub-second precision", () => {
    expect(formatClockTime(59_999)).toBe("00:00:59");
  });

  it("does not wrap at 100 hours", () => {
    expect(formatClockTime(360_000_000)).toBe("100:00:00");
  });
});

describe("formatLapTime", () => {
  it("omits hours below one hour", () => {
    expect(formatLapTime(1_500)).toBe("00:01.50");
  });

  it("includes hours from one hour up", () => {
    expect(formatLapTime(3_600_000)).toBe("1:00:00.00");
  });

  it("formats centiseconds", () => {
    expect(formatLapTime(10)).toBe("00:00.01");
  });
});

describe("formatSplitTime", () => {
  it("prefixes positive splits with a plus sign", () => {
    expect(formatSplitTime(5_000)).toBe("+5.00");
  });

  it("includes minutes when needed", () => {
    expect(formatSplitTime(65_000)).toBe("+1:05.00");
  });

  it("prefixes negative splits with a minus sign", () => {
    expect(formatSplitTime(-65_000)).toBe("-1:05.00");
  });

  it("treats zero as positive", () => {
    expect(formatSplitTime(0)).toBe("+0.00");
  });
});
