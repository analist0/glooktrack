/**
 * Admin Service - שירות ניהול (צד שרת)
 * Uses Supabase service role for admin operations
 */

import { createClient } from "@supabase/supabase-js";
import type {
  ModuleName,
  AccessType,
  UserSummary,
  UserDetail,
  AIConversation,
  HealthAlert,
  AIAnalyticsSummary,
  ModuleAccess,
  UserModuleAccess,
  AdminAction,
} from "./types";
import { ALERT_THRESHOLDS } from "./types";

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase admin credentials");
  return createClient(url, key);
}

// ===== Module Management =====

export async function getModules(): Promise<ModuleAccess[]> {
  const sb = getAdminClient();
  const { data, error } = await sb
    .from("module_access")
    .select("*")
    .order("module_name");
  if (error) throw error;
  return data || [];
}

export async function setModuleAccess(
  moduleName: ModuleName,
  accessType: AccessType,
  enabled: boolean,
  options?: { startsAt?: string; expiresAt?: string; adminId?: string }
): Promise<ModuleAccess> {
  const sb = getAdminClient();
  const { data, error } = await sb
    .from("module_access")
    .upsert(
      {
        module_name: moduleName,
        access_type: accessType,
        enabled,
        starts_at: options?.startsAt || null,
        expires_at: options?.expiresAt || null,
        created_by: options?.adminId || null,
      },
      { onConflict: "module_name" }
    )
    .select()
    .single();
  if (error) throw error;

  if (options?.adminId) {
    await logAdminAction(options.adminId, "module_toggle", null, {
      module: moduleName,
      access_type: accessType,
      enabled,
    });
  }
  return data;
}

export async function setUserModuleAccess(
  userId: string,
  moduleName: ModuleName,
  enabled: boolean,
  options?: { startsAt?: string; expiresAt?: string; adminId?: string }
): Promise<UserModuleAccess> {
  const sb = getAdminClient();
  const { data, error } = await sb
    .from("user_module_access")
    .upsert(
      {
        user_id: userId,
        module_name: moduleName,
        enabled,
        starts_at: options?.startsAt || null,
        expires_at: options?.expiresAt || null,
        granted_by: options?.adminId || null,
      },
      { onConflict: "user_id,module_name" }
    )
    .select()
    .single();
  if (error) throw error;

  if (options?.adminId) {
    await logAdminAction(options.adminId, "user_access_change", userId, {
      module: moduleName,
      enabled,
    });
  }
  return data;
}

export async function getUserModuleAccess(
  userId: string
): Promise<UserModuleAccess[]> {
  const sb = getAdminClient();
  const { data, error } = await sb
    .from("user_module_access")
    .select("*")
    .eq("user_id", userId);
  if (error) throw error;
  return data || [];
}

// ===== Users =====

export async function getUsers(): Promise<UserSummary[]> {
  const sb = getAdminClient();

  const { data: profiles, error: profilesErr } = await sb
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });
  if (profilesErr) throw profilesErr;

  const users: UserSummary[] = [];
  for (const p of profiles || []) {
    const { count: mCount } = await sb
      .from("measurements")
      .select("*", { count: "exact", head: true })
      .eq("user_id", p.id);

    const { data: lastM } = await sb
      .from("measurements")
      .select("created_at, value")
      .eq("user_id", p.id)
      .order("created_at", { ascending: false })
      .limit(1);

    const { data: avgData } = await sb
      .from("measurements")
      .select("value")
      .eq("user_id", p.id);

    const avgValue =
      avgData && avgData.length > 0
        ? avgData.reduce((s: number, m: { value: number }) => s + m.value, 0) /
          avgData.length
        : null;

    const { count: convCount } = await sb
      .from("ai_conversations")
      .select("*", { count: "exact", head: true })
      .eq("user_id", p.id);

    const { count: alertCount } = await sb
      .from("health_alerts")
      .select("*", { count: "exact", head: true })
      .eq("user_id", p.id)
      .eq("is_resolved", false);

    const { data: access } = await sb
      .from("user_module_access")
      .select("enabled")
      .eq("user_id", p.id)
      .eq("module_name", "ai_assistant")
      .eq("enabled", true);

    users.push({
      id: p.id,
      email: p.email,
      full_name: p.full_name,
      avatar_url: p.avatar_url,
      diabetes_type: p.diabetes_type,
      created_at: p.created_at,
      measurement_count: mCount || 0,
      last_measurement_at: lastM?.[0]?.created_at || null,
      avg_value: avgValue ? Math.round(avgValue) : null,
      ai_conversations_count: convCount || 0,
      unresolved_alerts: alertCount || 0,
      ai_access: (access && access.length > 0) || false,
    });
  }

  return users;
}

export async function getUserDetail(userId: string): Promise<UserDetail> {
  const sb = getAdminClient();

  const { data: profile, error: pErr } = await sb
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();
  if (pErr) throw pErr;

  // Measurements summary
  const { data: allM } = await sb
    .from("measurements")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  const measurements = allM || [];
  const now = new Date();
  const d7 = new Date(now.getTime() - 7 * 86400000);
  const d30 = new Date(now.getTime() - 30 * 86400000);
  const values = measurements.map((m: { value: number }) => m.value);

  const measurementSummary = {
    total: measurements.length,
    avg: values.length ? Math.round(values.reduce((a: number, b: number) => a + b, 0) / values.length) : null,
    min: values.length ? Math.min(...values) : null,
    max: values.length ? Math.max(...values) : null,
    in_range_pct: values.length
      ? Math.round((values.filter((v: number) => v >= 70 && v <= 180).length / values.length) * 100)
      : null,
    last_7_days: measurements.filter((m: { created_at: string }) => new Date(m.created_at) >= d7).length,
    last_30_days: measurements.filter((m: { created_at: string }) => new Date(m.created_at) >= d30).length,
    high_count: values.filter((v: number) => v > 180).length,
    low_count: values.filter((v: number) => v < 70).length,
  };

  // Conversations
  const { data: convs } = await sb
    .from("ai_conversations")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(100);

  // Alerts
  const { data: alerts } = await sb
    .from("health_alerts")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  // Module access
  const { data: access } = await sb
    .from("user_module_access")
    .select("*")
    .eq("user_id", userId);

  // User summary counts
  const { count: convCount } = await sb
    .from("ai_conversations")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);

  const { count: alertCount } = await sb
    .from("health_alerts")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("is_resolved", false);

  return {
    id: profile.id,
    email: profile.email,
    full_name: profile.full_name,
    avatar_url: profile.avatar_url,
    diabetes_type: profile.diabetes_type,
    created_at: profile.created_at,
    measurement_count: measurements.length,
    last_measurement_at: measurements[0]?.created_at || null,
    avg_value: measurementSummary.avg,
    ai_conversations_count: convCount || 0,
    unresolved_alerts: alertCount || 0,
    ai_access: access?.some((a: { module_name: string; enabled: boolean }) => a.module_name === "ai_assistant" && a.enabled) || false,
    measurements: measurementSummary,
    conversations: convs || [],
    alerts: alerts || [],
    module_access: access || [],
  };
}

// ===== AI Conversations =====

export async function getConversations(options?: {
  userId?: string;
  flaggedOnly?: boolean;
  limit?: number;
  offset?: number;
}): Promise<{ data: AIConversation[]; total: number }> {
  const sb = getAdminClient();
  let query = sb
    .from("ai_conversations")
    .select("*, profiles!ai_conversations_user_id_fkey(email, full_name)", {
      count: "exact",
    });

  if (options?.userId) query = query.eq("user_id", options.userId);
  if (options?.flaggedOnly) query = query.eq("flagged", true);

  query = query
    .order("created_at", { ascending: false })
    .range(
      options?.offset || 0,
      (options?.offset || 0) + (options?.limit || 50) - 1
    );

  const { data, count, error } = await query;
  if (error) throw error;

  return {
    data: (data || []).map((d: Record<string, unknown>) => {
      const profiles = d.profiles as { email?: string; full_name?: string } | null;
      return {
        ...d,
        user_email: profiles?.email || null,
        user_name: profiles?.full_name || null,
        profiles: undefined,
      };
    }) as unknown as AIConversation[],
    total: count || 0,
  };
}

export async function flagConversation(
  conversationId: string,
  flagged: boolean,
  reason?: string
): Promise<void> {
  const sb = getAdminClient();
  const { error } = await sb
    .from("ai_conversations")
    .update({ flagged, flag_reason: reason || null })
    .eq("id", conversationId);
  if (error) throw error;
}

// ===== Health Alerts =====

export async function getAlerts(options?: {
  unresolvedOnly?: boolean;
  severity?: string;
  limit?: number;
}): Promise<HealthAlert[]> {
  const sb = getAdminClient();
  let query = sb
    .from("health_alerts")
    .select("*, profiles!health_alerts_user_id_fkey(email, full_name)");

  if (options?.unresolvedOnly) query = query.eq("is_resolved", false);
  if (options?.severity) query = query.eq("severity", options.severity);

  query = query
    .order("created_at", { ascending: false })
    .limit(options?.limit || 100);

  const { data, error } = await query;
  if (error) throw error;

  return (data || []).map((d: Record<string, unknown>) => {
    const profiles = d.profiles as { email?: string; full_name?: string } | null;
    return {
      ...d,
      user_email: profiles?.email || null,
      user_name: profiles?.full_name || null,
      profiles: undefined,
    };
  }) as unknown as HealthAlert[];
}

export async function resolveAlert(
  alertId: string,
  adminId: string
): Promise<void> {
  const sb = getAdminClient();
  const { error } = await sb
    .from("health_alerts")
    .update({
      is_resolved: true,
      resolved_by: adminId,
      resolved_at: new Date().toISOString(),
    })
    .eq("id", alertId);
  if (error) throw error;

  await logAdminAction(adminId, "alert_resolve", null, { alert_id: alertId });
}

// ===== AI Analytics =====

export async function getAIAnalytics(): Promise<AIAnalyticsSummary> {
  const sb = getAdminClient();
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const weekStart = new Date(now.getTime() - 7 * 86400000).toISOString();

  const { data: allConvs } = await sb
    .from("ai_conversations")
    .select("provider, tokens_used, cost_estimate, user_id, user_message, created_at, flagged")
    .order("created_at", { ascending: false })
    .limit(10000);

  const convs = allConvs || [];

  const total_conversations = convs.length;
  const total_tokens = convs.reduce((s, c: { tokens_used: number }) => s + (c.tokens_used || 0), 0);
  const total_cost = convs.reduce((s, c: { cost_estimate: number }) => s + (c.cost_estimate || 0), 0);
  const conversations_today = convs.filter((c: { created_at: string }) => c.created_at >= todayStart).length;
  const conversations_this_week = convs.filter((c: { created_at: string }) => c.created_at >= weekStart).length;
  const active_users = new Set(convs.map((c: { user_id: string }) => c.user_id)).size;

  // Provider usage
  const providerMap = new Map<string, { count: number; tokens: number; cost: number }>();
  for (const c of convs as Array<{ provider: string | null; tokens_used: number; cost_estimate: number }>) {
    const p = c.provider || "unknown";
    const existing = providerMap.get(p) || { count: 0, tokens: 0, cost: 0 };
    existing.count++;
    existing.tokens += c.tokens_used || 0;
    existing.cost += c.cost_estimate || 0;
    providerMap.set(p, existing);
  }
  const provider_usage = Array.from(providerMap.entries()).map(([provider, stats]) => ({
    provider,
    ...stats,
  }));

  // Topic extraction (simple keyword-based)
  const topicKeywords: Record<string, string[]> = {
    "ניתוח מגמות": ["מגמ", "trend", "שינוי"],
    "ערכים גבוהים": ["גבוה", "high", "עלי"],
    "ערכים נמוכים": ["נמוך", "low", "היפו"],
    "תזונה": ["אוכל", "ארוח", "diet", "food"],
    "תרופות": ["תרופ", "אינסולין", "insulin"],
    "כללי": [],
  };
  const topicCounts = new Map<string, number>();
  for (const c of convs as Array<{ user_message: string }>) {
    let matched = false;
    for (const [topic, keywords] of Object.entries(topicKeywords)) {
      if (topic === "כללי") continue;
      if (keywords.some((kw) => c.user_message.toLowerCase().includes(kw))) {
        topicCounts.set(topic, (topicCounts.get(topic) || 0) + 1);
        matched = true;
        break;
      }
    }
    if (!matched) topicCounts.set("כללי", (topicCounts.get("כללי") || 0) + 1);
  }
  const top_topics = Array.from(topicCounts.entries())
    .map(([topic, count]) => ({ topic, count }))
    .sort((a, b) => b.count - a.count);

  // Daily usage (last 30 days)
  const dailyMap = new Map<string, { conversations: number; tokens: number; cost: number }>();
  for (const c of convs as Array<{ created_at: string; tokens_used: number; cost_estimate: number }>) {
    const date = c.created_at.slice(0, 10);
    const existing = dailyMap.get(date) || { conversations: 0, tokens: 0, cost: 0 };
    existing.conversations++;
    existing.tokens += c.tokens_used || 0;
    existing.cost += c.cost_estimate || 0;
    dailyMap.set(date, existing);
  }
  const daily_usage = Array.from(dailyMap.entries())
    .map(([date, stats]) => ({ date, ...stats }))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-30);

  // Flagged count
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const flagged_count = convs.filter((c: any) => c.flagged).length;

  return {
    total_conversations,
    total_tokens,
    total_cost,
    conversations_today,
    conversations_this_week,
    active_users,
    top_topics,
    provider_usage,
    flagged_count,
    daily_usage,
  };
}

// ===== Health Alert Generation =====

export async function generateHealthAlerts(): Promise<number> {
  const sb = getAdminClient();
  let alertsCreated = 0;

  const { data: profiles } = await sb.from("profiles").select("id");

  for (const profile of profiles || []) {
    const { data: recentM } = await sb
      .from("measurements")
      .select("value, created_at")
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (!recentM || recentM.length === 0) {
      // No data alert
      const { count } = await sb
        .from("health_alerts")
        .select("*", { count: "exact", head: true })
        .eq("user_id", profile.id)
        .eq("alert_type", "no_data")
        .eq("is_resolved", false);

      if (!count || count === 0) {
        await sb.from("health_alerts").insert({
          user_id: profile.id,
          alert_type: "no_data",
          severity: "info",
          title: "אין נתונים",
          description: "המשתמש לא הזין מדידות",
        });
        alertsCreated++;
      }
      continue;
    }

    const latest = recentM[0];

    // Critical high
    if (latest.value >= ALERT_THRESHOLDS.critical_high) {
      await sb.from("health_alerts").insert({
        user_id: profile.id,
        alert_type: "critical_high",
        severity: "critical",
        title: `ערך קריטי גבוה: ${latest.value} mg/dL`,
        description: `נמדד ערך ${latest.value} mg/dL שחורג מהרף הקריטי (${ALERT_THRESHOLDS.critical_high})`,
        measurement_value: latest.value,
      });
      alertsCreated++;
    }

    // Critical low
    if (latest.value <= ALERT_THRESHOLDS.critical_low) {
      await sb.from("health_alerts").insert({
        user_id: profile.id,
        alert_type: "critical_low",
        severity: "critical",
        title: `ערך קריטי נמוך: ${latest.value} mg/dL`,
        description: `נמדד ערך ${latest.value} mg/dL שמתחת לרף הקריטי (${ALERT_THRESHOLDS.critical_low})`,
        measurement_value: latest.value,
      });
      alertsCreated++;
    }

    // Trend worsening (last 7 measurements trending up above normal)
    if (recentM.length >= 7) {
      const last7 = recentM.slice(0, 7).map((m: { value: number }) => m.value);
      const avg = last7.reduce((a: number, b: number) => a + b, 0) / last7.length;
      const highPct = last7.filter((v: number) => v > ALERT_THRESHOLDS.high).length / last7.length;

      if (avg > ALERT_THRESHOLDS.high && highPct > 0.7) {
        const { count } = await sb
          .from("health_alerts")
          .select("*", { count: "exact", head: true })
          .eq("user_id", profile.id)
          .eq("alert_type", "trend_worsening")
          .eq("is_resolved", false);

        if (!count || count === 0) {
          await sb.from("health_alerts").insert({
            user_id: profile.id,
            alert_type: "trend_worsening",
            severity: "warning",
            title: "מגמת החמרה",
            description: `ממוצע 7 מדידות אחרונות: ${Math.round(avg)} mg/dL. ${Math.round(highPct * 100)}% מעל הטווח.`,
            measurement_value: Math.round(avg),
          });
          alertsCreated++;
        }
      }
    }
  }

  return alertsCreated;
}

// ===== Admin Activity Log =====

async function logAdminAction(
  adminId: string,
  action: string,
  targetUserId: string | null,
  details: Record<string, unknown>
): Promise<void> {
  const sb = getAdminClient();
  await sb.from("admin_activity_log").insert({
    admin_id: adminId,
    action,
    target_user_id: targetUserId,
    details,
  });
}

export async function getAdminLog(limit = 50): Promise<AdminAction[]> {
  const sb = getAdminClient();
  const { data, error } = await sb
    .from("admin_activity_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}
