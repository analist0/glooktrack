import { describe, it, expect, beforeEach } from "vitest";
import {
  loadMeasurements,
  saveMeasurement,
  deleteMeasurement,
  clearAllMeasurements,
  generateId,
  calculateStats,
  formatDate,
  formatTime,
} from "@/lib/diabetes-storage";
import type { BloodSugarMeasurement } from "@/lib/diabetes-types";

function makeMeasurement(overrides: Partial<BloodSugarMeasurement> = {}): BloodSugarMeasurement {
  return {
    id: generateId(),
    date: "2025-01-15",
    time: "08:30",
    value: 120,
    context: "fasting",
    createdAt: Date.now(),
    ...overrides,
  };
}

describe("diabetes-storage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe("loadMeasurements", () => {
    it("returns empty array when no data exists", () => {
      expect(loadMeasurements()).toEqual([]);
    });

    it("returns empty array for invalid JSON", () => {
      localStorage.setItem("diabetesMeasurements", "not-json");
      expect(loadMeasurements()).toEqual([]);
    });

    it("returns empty array for non-array JSON", () => {
      localStorage.setItem("diabetesMeasurements", '{"key": "value"}');
      expect(loadMeasurements()).toEqual([]);
    });

    it("loads and sorts measurements by createdAt descending", () => {
      const older = makeMeasurement({ id: "old", createdAt: 1000 });
      const newer = makeMeasurement({ id: "new", createdAt: 2000 });
      localStorage.setItem("diabetesMeasurements", JSON.stringify([older, newer]));

      const result = loadMeasurements();
      expect(result[0].id).toBe("new");
      expect(result[1].id).toBe("old");
    });
  });

  describe("saveMeasurement", () => {
    it("saves a measurement and returns updated list", () => {
      const m = makeMeasurement();
      const result = saveMeasurement(m);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(m.id);
    });

    it("prepends new measurement to existing list", () => {
      const first = makeMeasurement({ id: "first", createdAt: 1000 });
      saveMeasurement(first);

      const second = makeMeasurement({ id: "second", createdAt: 2000 });
      const result = saveMeasurement(second);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe("second");
    });

    it("persists to localStorage", () => {
      const m = makeMeasurement();
      saveMeasurement(m);

      const stored = JSON.parse(localStorage.getItem("diabetesMeasurements")!);
      expect(stored).toHaveLength(1);
    });
  });

  describe("deleteMeasurement", () => {
    it("removes the measurement with given id", () => {
      const m1 = makeMeasurement({ id: "keep" });
      const m2 = makeMeasurement({ id: "delete" });
      localStorage.setItem("diabetesMeasurements", JSON.stringify([m1, m2]));

      const result = deleteMeasurement("delete");
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("keep");
    });

    it("returns all measurements if id not found", () => {
      const m = makeMeasurement({ id: "exists" });
      localStorage.setItem("diabetesMeasurements", JSON.stringify([m]));

      const result = deleteMeasurement("nonexistent");
      expect(result).toHaveLength(1);
    });
  });

  describe("clearAllMeasurements", () => {
    it("removes only diabetes measurements key", () => {
      localStorage.setItem("diabetesMeasurements", "[]");
      localStorage.setItem("otherKey", "keep");

      clearAllMeasurements();

      expect(localStorage.getItem("diabetesMeasurements")).toBeNull();
      expect(localStorage.getItem("otherKey")).toBe("keep");
    });
  });

  describe("generateId", () => {
    it("generates unique ids", () => {
      const ids = new Set(Array.from({ length: 100 }, () => generateId()));
      expect(ids.size).toBe(100);
    });

    it("contains timestamp prefix", () => {
      const before = Date.now();
      const id = generateId();
      const timestamp = parseInt(id.split("-")[0], 10);
      expect(timestamp).toBeGreaterThanOrEqual(before);
    });
  });

  describe("calculateStats", () => {
    it("returns nulls for empty array", () => {
      const stats = calculateStats([]);
      expect(stats.todayAverage).toBeNull();
      expect(stats.weekAverage).toBeNull();
      expect(stats.monthAverage).toBeNull();
      expect(stats.highest).toBeNull();
      expect(stats.lowest).toBeNull();
      expect(stats.totalCount).toBe(0);
    });

    it("calculates correct averages and extremes", () => {
      const today = new Date().toISOString().split("T")[0];
      const measurements: BloodSugarMeasurement[] = [
        makeMeasurement({ value: 100, date: today }),
        makeMeasurement({ value: 200, date: today }),
        makeMeasurement({ value: 50, date: today }),
      ];

      const stats = calculateStats(measurements);
      expect(stats.todayAverage).toBe(117); // Math.round(350/3)
      expect(stats.highest?.value).toBe(200);
      expect(stats.lowest?.value).toBe(50);
      expect(stats.totalCount).toBe(3);
    });

    it("correctly filters by time ranges", () => {
      const today = new Date().toISOString().split("T")[0];
      const twoMonthsAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];

      const measurements: BloodSugarMeasurement[] = [
        makeMeasurement({ value: 100, date: today }),
        makeMeasurement({ value: 200, date: twoMonthsAgo }),
      ];

      const stats = calculateStats(measurements);
      expect(stats.todayAverage).toBe(100);
      expect(stats.monthAverage).toBe(100); // only today's measurement
      expect(stats.totalCount).toBe(2);
    });
  });

  describe("formatDate", () => {
    it("formats date string to Hebrew locale", () => {
      const result = formatDate("2025-01-15");
      expect(result).toBeTruthy();
      expect(typeof result).toBe("string");
    });
  });

  describe("formatTime", () => {
    it("formats time string", () => {
      expect(formatTime("08:30")).toBe("08:30");
      expect(formatTime("14:05")).toBe("14:05");
    });
  });
});
