/**
 * Supabase Data Service - שירות נתונים מאוחד
 * מסנכרן בין localStorage ל-Supabase
 */

"use client";

import { getSupabaseClient } from "./client";
import type { BloodSugarMeasurement } from "@/lib/diabetes-types";
import {
  loadMeasurements,
  saveMeasurementsBatch,
} from "@/lib/diabetes-storage";

/**
 * סנכרון מדידות מקומיות ל-Supabase
 */
export async function syncMeasurementsToCloud(userId: string): Promise<{
  uploaded: number;
  downloaded: number;
  errors: string[];
}> {
  const supabase = getSupabaseClient();
  const result = { uploaded: 0, downloaded: 0, errors: [] as string[] };

  try {
    const localMeasurements = loadMeasurements();

    const { data: cloudMeasurements, error: fetchError } = await supabase
      .from("measurements")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (fetchError) {
      result.errors.push(`שגיאה בטעינת נתונים מהענן: ${fetchError.message}`);
      return result;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cloudIds = new Set((cloudMeasurements || []).map((m: any) => m.id));
    const localIds = new Set(localMeasurements.map((m) => m.id));

    // Upload local measurements not in cloud
    const toUpload = localMeasurements.filter((m) => !cloudIds.has(m.id));

    if (toUpload.length > 0) {
      const { error: uploadError } = await supabase
        .from("measurements")
        .upsert(
          toUpload.map((m) => ({
            id: m.id,
            user_id: userId,
            date: m.date,
            time: m.time,
            value: m.value,
            context: m.context,
            notes: m.notes || null,
            created_at: new Date(m.createdAt).toISOString(),
          })),
          { onConflict: "id" }
        );

      if (uploadError) {
        result.errors.push(`שגיאה בהעלאת נתונים: ${uploadError.message}`);
      } else {
        result.uploaded = toUpload.length;
      }
    }

    // Download cloud measurements not in local
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const toDownload = (cloudMeasurements || []).filter((m: any) => !localIds.has(m.id));

    // Batch save all downloaded measurements at once (avoids O(n²) localStorage ops)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const newMeasurements: BloodSugarMeasurement[] = (toDownload as any[]).map((cloudM) => ({
      id: cloudM.id,
      date: cloudM.date,
      time: cloudM.time,
      value: cloudM.value,
      context: cloudM.context,
      notes: cloudM.notes || undefined,
      createdAt: new Date(cloudM.created_at).getTime(),
    }));

    if (newMeasurements.length > 0) {
      saveMeasurementsBatch(newMeasurements);
      result.downloaded = newMeasurements.length;
    }
  } catch (err) {
    result.errors.push(
      `שגיאת סנכרון: ${err instanceof Error ? err.message : "שגיאה לא ידועה"}`
    );
  }

  return result;
}

/**
 * שמירת מדידה ל-Supabase
 */
export async function saveMeasurementToCloud(
  userId: string,
  measurement: BloodSugarMeasurement
): Promise<boolean> {
  try {
    const supabase = getSupabaseClient();
    const { error } = await supabase.from("measurements").upsert({
      id: measurement.id,
      user_id: userId,
      date: measurement.date,
      time: measurement.time,
      value: measurement.value,
      context: measurement.context,
      notes: measurement.notes || null,
      created_at: new Date(measurement.createdAt).toISOString(),
    }, { onConflict: "id" });

    return !error;
  } catch {
    return false;
  }
}

/**
 * מחיקת מדידה מ-Supabase
 */
export async function deleteMeasurementFromCloud(
  measurementId: string
): Promise<boolean> {
  try {
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from("measurements")
      .delete()
      .eq("id", measurementId);

    return !error;
  } catch {
    return false;
  }
}

/**
 * שמירת הגדרות ל-Supabase
 */
export async function saveSettingsToCloud(
  userId: string,
  settings: Record<string, unknown>
): Promise<boolean> {
  try {
    const supabase = getSupabaseClient();
    const { error } = await supabase.from("settings").upsert(
      {
        user_id: userId,
        settings_json: settings,
      },
      { onConflict: "user_id" }
    );

    return !error;
  } catch {
    return false;
  }
}

/**
 * טעינת הגדרות מ-Supabase
 */
export async function loadSettingsFromCloud(
  userId: string
// eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any | null> {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("settings")
      .select("settings_json")
      .eq("user_id", userId)
      .single();

    if (error || !data) return null;
    return data.settings_json;
  } catch {
    return null;
  }
}

/**
 * עדכון פרופיל משתמש
 */
export async function updateProfile(
  userId: string,
  profile: Record<string, string | undefined>
): Promise<boolean> {
  try {
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from("profiles")
      .update(profile)
      .eq("id", userId);

    return !error;
  } catch {
    return false;
  }
}
