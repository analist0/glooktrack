import type { AppSettings } from "./settings-types";
import { DEFAULT_SETTINGS } from "./settings-types";

const SETTINGS_KEY = "glucotrackSettings";

export function loadSettings(): AppSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;

  try {
    const data = localStorage.getItem(SETTINGS_KEY);
    if (!data) return DEFAULT_SETTINGS;

    const parsed = JSON.parse(data);
    // Merge with defaults to handle new fields added in updates
    return {
      profile: { ...DEFAULT_SETTINGS.profile, ...parsed.profile },
      bloodSugarRange: { ...DEFAULT_SETTINGS.bloodSugarRange, ...parsed.bloodSugarRange },
      display: { ...DEFAULT_SETTINGS.display, ...parsed.display },
      measurement: { ...DEFAULT_SETTINGS.measurement, ...parsed.measurement },
      reminders: { ...DEFAULT_SETTINGS.reminders, ...parsed.reminders },
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: AppSettings): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function resetSettings(): AppSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  localStorage.removeItem(SETTINGS_KEY);
  return DEFAULT_SETTINGS;
}

export function exportAllData(): string {
  if (typeof window === "undefined") return "{}";

  const data: Record<string, unknown> = {};

  const keys = [
    "diabetesMeasurements",
    "glucotrackSettings",
    "diabetesProfileImage",
    "diabetesPatientName",
  ];

  for (const key of keys) {
    const value = localStorage.getItem(key);
    if (value) {
      try {
        data[key] = JSON.parse(value);
      } catch {
        data[key] = value;
      }
    }
  }

  return JSON.stringify(data, null, 2);
}

export function importAllData(jsonString: string): boolean {
  if (typeof window === "undefined") return false;

  try {
    const data = JSON.parse(jsonString);

    if (typeof data !== "object" || data === null) return false;

    for (const [key, value] of Object.entries(data)) {
      if (typeof value === "string") {
        localStorage.setItem(key, value);
      } else {
        localStorage.setItem(key, JSON.stringify(value));
      }
    }

    return true;
  } catch {
    return false;
  }
}

export function getStorageUsage(): { used: string; items: number } {
  if (typeof window === "undefined") return { used: "0 KB", items: 0 };

  let totalSize = 0;
  let items = 0;

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key) {
      const value = localStorage.getItem(key) || "";
      totalSize += key.length + value.length;
      items++;
    }
  }

  const sizeInBytes = totalSize * 2;

  if (sizeInBytes < 1024) {
    return { used: `${sizeInBytes} B`, items };
  } else if (sizeInBytes < 1024 * 1024) {
    return { used: `${(sizeInBytes / 1024).toFixed(1)} KB`, items };
  } else {
    return { used: `${(sizeInBytes / (1024 * 1024)).toFixed(1)} MB`, items };
  }
}
