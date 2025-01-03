import { describe, it, expect } from "vitest";
import { getUTCTime, getUTCTimestamp } from "../../src/utils";

describe("utils", () => {
  describe("getUTCTime", () => {
    it("should be the same as the UTC date", () => {
      const date = new Date("2024-01-01T00:00:00.000Z");
      const time = getUTCTime(date);
      expect(date.getTime()).toEqual(new Date(time).getTime());
    });
  });

  describe("getUTCTimestamp", () => {
    it("should return the current timestamp in Pacific Time", () => {
      const date = new Date("2024-01-01T00:00:00.000Z");
      const utcDateString = getUTCTime(date);
      const timestamp = getUTCTimestamp(utcDateString);
      expect(date.getTime()).toEqual(timestamp);
    });
  });
});
