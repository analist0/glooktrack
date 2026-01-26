export type MeasurementContext =
  | "fasting"
  | "before-meal"
  | "after-meal"
  | "before-sleep"
  | "other";

export interface BloodSugarMeasurement {
  id: string;
  date: string; // ISO date string (YYYY-MM-DD)
  time: string; // HH:MM format
  value: number; // mg/dL
  context: MeasurementContext;
  notes?: string;
  createdAt: number; // timestamp for sorting
}

export interface MeasurementStats {
  todayAverage: number | null;
  weekAverage: number | null;
  monthAverage: number | null;
  highest: { value: number; date: string; time: string } | null;
  lowest: { value: number; date: string; time: string } | null;
  totalCount: number;
}

export const CONTEXT_LABELS: Record<MeasurementContext, string> = {
  fasting: "צום",
  "before-meal": "לפני ארוחה",
  "after-meal": "אחרי ארוחה",
  "before-sleep": "לפני שינה",
  other: "אחר",
};

export const BLOOD_SUGAR_RANGES = {
  low: { max: 70, color: "text-blue-600", bgColor: "bg-blue-50", label: "נמוך" },
  normal: {
    min: 70,
    max: 180,
    color: "text-emerald-600",
    bgColor: "bg-emerald-50",
    label: "תקין",
  },
  high: {
    min: 180,
    color: "text-red-600",
    bgColor: "bg-red-50",
    label: "גבוה",
  },
} as const;

export function getBloodSugarStatus(value: number) {
  if (value < 70) return BLOOD_SUGAR_RANGES.low;
  if (value <= 180) return BLOOD_SUGAR_RANGES.normal;
  return BLOOD_SUGAR_RANGES.high;
}
