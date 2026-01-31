import { describe, it, expect } from "vitest";
import {
  CONTEXT_LABELS,
  BLOOD_SUGAR_RANGES,
  getBloodSugarStatus,
} from "@/lib/diabetes-types";

describe("diabetes-types", () => {
  describe("CONTEXT_LABELS", () => {
    it("has labels for all contexts", () => {
      expect(CONTEXT_LABELS.fasting).toBe("צום");
      expect(CONTEXT_LABELS["before-meal"]).toBe("לפני ארוחה");
      expect(CONTEXT_LABELS["after-meal"]).toBe("אחרי ארוחה");
      expect(CONTEXT_LABELS["before-sleep"]).toBe("לפני שינה");
      expect(CONTEXT_LABELS.other).toBe("אחר");
    });
  });

  describe("BLOOD_SUGAR_RANGES", () => {
    it("defines low range up to 70", () => {
      expect(BLOOD_SUGAR_RANGES.low.max).toBe(70);
    });

    it("defines normal range 70-180", () => {
      expect(BLOOD_SUGAR_RANGES.normal.min).toBe(70);
      expect(BLOOD_SUGAR_RANGES.normal.max).toBe(180);
    });

    it("defines high range from 180", () => {
      expect(BLOOD_SUGAR_RANGES.high.min).toBe(180);
    });
  });

  describe("getBloodSugarStatus", () => {
    it("returns low for values below 70", () => {
      expect(getBloodSugarStatus(50)).toBe(BLOOD_SUGAR_RANGES.low);
      expect(getBloodSugarStatus(69)).toBe(BLOOD_SUGAR_RANGES.low);
    });

    it("returns normal for values 70-180", () => {
      expect(getBloodSugarStatus(70)).toBe(BLOOD_SUGAR_RANGES.normal);
      expect(getBloodSugarStatus(120)).toBe(BLOOD_SUGAR_RANGES.normal);
      expect(getBloodSugarStatus(180)).toBe(BLOOD_SUGAR_RANGES.normal);
    });

    it("returns high for values above 180", () => {
      expect(getBloodSugarStatus(181)).toBe(BLOOD_SUGAR_RANGES.high);
      expect(getBloodSugarStatus(300)).toBe(BLOOD_SUGAR_RANGES.high);
    });

    it("handles boundary values correctly", () => {
      expect(getBloodSugarStatus(70).label).toBe("תקין");
      expect(getBloodSugarStatus(69).label).toBe("נמוך");
      expect(getBloodSugarStatus(180).label).toBe("תקין");
      expect(getBloodSugarStatus(181).label).toBe("גבוה");
    });
  });
});
