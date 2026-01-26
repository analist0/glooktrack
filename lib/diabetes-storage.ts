import type { BloodSugarMeasurement, MeasurementStats } from "./diabetes-types";

const STORAGE_KEY = "diabetesMeasurements";

export function loadMeasurements(): BloodSugarMeasurement[] {
  if (typeof window === "undefined") return [];
  
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    
    const parsed = JSON.parse(data);
    if (!Array.isArray(parsed)) return [];
    
    // Sort by date and time (newest first)
    return parsed.sort((a, b) => b.createdAt - a.createdAt);
  } catch {
    return [];
  }
}

export function saveMeasurement(measurement: BloodSugarMeasurement): BloodSugarMeasurement[] {
  const measurements = loadMeasurements();
  measurements.unshift(measurement);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(measurements));
  return measurements;
}

export function deleteMeasurement(id: string): BloodSugarMeasurement[] {
  const measurements = loadMeasurements();
  const filtered = measurements.filter((m) => m.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  return filtered;
}

export function clearAllMeasurements(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function calculateStats(measurements: BloodSugarMeasurement[]): MeasurementStats {
  if (measurements.length === 0) {
    return {
      todayAverage: null,
      weekAverage: null,
      monthAverage: null,
      highest: null,
      lowest: null,
      totalCount: 0,
    };
  }

  const now = new Date();
  const today = now.toISOString().split("T")[0];
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  const todayMeasurements = measurements.filter((m) => m.date === today);
  const weekMeasurements = measurements.filter((m) => m.date >= weekAgo);
  const monthMeasurements = measurements.filter((m) => m.date >= monthAgo);

  const calculateAverage = (arr: BloodSugarMeasurement[]) => {
    if (arr.length === 0) return null;
    const sum = arr.reduce((acc, m) => acc + m.value, 0);
    return Math.round(sum / arr.length);
  };

  // Find highest and lowest
  let highest: BloodSugarMeasurement | null = null;
  let lowest: BloodSugarMeasurement | null = null;

  for (const m of measurements) {
    if (!highest || m.value > highest.value) highest = m;
    if (!lowest || m.value < lowest.value) lowest = m;
  }

  return {
    todayAverage: calculateAverage(todayMeasurements),
    weekAverage: calculateAverage(weekMeasurements),
    monthAverage: calculateAverage(monthMeasurements),
    highest: highest ? { value: highest.value, date: highest.date, time: highest.time } : null,
    lowest: lowest ? { value: lowest.value, date: lowest.date, time: lowest.time } : null,
    totalCount: measurements.length,
  };
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("he-IL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatTime(timeStr: string): string {
  const [hours, minutes] = timeStr.split(":");
  return `${hours}:${minutes}`;
}
