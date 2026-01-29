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

// Blood sugar threshold constants (mg/dL)
export const BLOOD_SUGAR_THRESHOLDS = {
  LOW: 70,          // Below this is hypoglycemia
  HIGH: 180,        // Above this is hyperglycemia
  VERY_HIGH: 250,   // Dangerous high level
  FASTING_MAX: 100, // Upper limit for normal fasting
  TARGET_MIN: 70,   // Lower target range
  TARGET_MAX: 130,  // Upper target range (before meals)
} as const;

export const BLOOD_SUGAR_RANGES = {
  low: { max: BLOOD_SUGAR_THRESHOLDS.LOW, color: "text-blue-600", bgColor: "bg-blue-50", label: "נמוך" },
  normal: {
    min: BLOOD_SUGAR_THRESHOLDS.LOW,
    max: BLOOD_SUGAR_THRESHOLDS.HIGH,
    color: "text-emerald-600",
    bgColor: "bg-emerald-50",
    label: "תקין",
  },
  high: {
    min: BLOOD_SUGAR_THRESHOLDS.HIGH,
    color: "text-red-600",
    bgColor: "bg-red-50",
    label: "גבוה",
  },
} as const;

export function getBloodSugarStatus(value: number) {
  if (value < BLOOD_SUGAR_THRESHOLDS.LOW) return BLOOD_SUGAR_RANGES.low;
  if (value <= BLOOD_SUGAR_THRESHOLDS.HIGH) return BLOOD_SUGAR_RANGES.normal;
  return BLOOD_SUGAR_RANGES.high;
}
