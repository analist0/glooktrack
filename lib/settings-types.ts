export interface BloodSugarRangeSettings {
  lowMax: number; // Below this = low (default 70)
  highMin: number; // Above this = high (default 180)
}

export interface ProfileSettings {
  patientName: string;
  doctorName: string;
  diabetesType: "type1" | "type2" | "gestational" | "other" | "";
  birthDate: string;
}

export interface DisplaySettings {
  theme: "light" | "dark" | "system";
  chartPoints: number; // How many data points to show in chart (default 30)
  showTips: boolean;
}

export interface MeasurementSettings {
  defaultContext: "" | "fasting" | "before-meal" | "after-meal" | "before-sleep" | "other";
  unit: "mgdl" | "mmol";
}

export interface ReminderSettings {
  enabled: boolean;
  morningTime: string; // HH:MM
  afternoonTime: string; // HH:MM
  eveningTime: string; // HH:MM
  morningEnabled: boolean;
  afternoonEnabled: boolean;
  eveningEnabled: boolean;
}

export interface AppSettings {
  profile: ProfileSettings;
  bloodSugarRange: BloodSugarRangeSettings;
  display: DisplaySettings;
  measurement: MeasurementSettings;
  reminders: ReminderSettings;
}

export const DEFAULT_SETTINGS: AppSettings = {
  profile: {
    patientName: "",
    doctorName: "",
    diabetesType: "",
    birthDate: "",
  },
  bloodSugarRange: {
    lowMax: 70,
    highMin: 180,
  },
  display: {
    theme: "light",
    chartPoints: 30,
    showTips: true,
  },
  measurement: {
    defaultContext: "",
    unit: "mgdl",
  },
  reminders: {
    enabled: false,
    morningTime: "07:00",
    afternoonTime: "13:00",
    eveningTime: "20:00",
    morningEnabled: true,
    afternoonEnabled: true,
    eveningEnabled: true,
  },
};

export const DIABETES_TYPE_LABELS: Record<string, string> = {
  type1: "סוכרת סוג 1",
  type2: "סוכרת סוג 2",
  gestational: "סוכרת הריונית",
  other: "אחר",
};
