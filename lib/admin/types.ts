/**
 * Admin System Types - טיפוסי מערכת ניהול
 */

// ===== Module Management =====

export type ModuleName = "ai_assistant" | "ai_analytics" | "ai_insights";
export type AccessType = "disabled" | "all_users" | "specific_users";
export type AlertSeverity = "info" | "warning" | "critical";
export type AlertType =
  | "critical_high"
  | "critical_low"
  | "trend_worsening"
  | "no_data"
  | "irregular_pattern";

export interface ModuleAccess {
  id: string;
  module_name: ModuleName;
  access_type: AccessType;
  enabled: boolean;
  starts_at: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserModuleAccess {
  id: string;
  user_id: string;
  module_name: ModuleName;
  enabled: boolean;
  starts_at: string | null;
  expires_at: string | null;
  granted_by: string | null;
  created_at: string;
}

// ===== AI Conversations =====

export interface AIConversation {
  id: string;
  user_id: string;
  provider: string | null;
  user_message: string;
  ai_response: string | null;
  task_type: string;
  tokens_used: number;
  cost_estimate: number;
  flagged: boolean;
  flag_reason: string | null;
  created_at: string;
  // joined fields
  user_email?: string;
  user_name?: string;
}

// ===== Health Alerts =====

export interface HealthAlert {
  id: string;
  user_id: string;
  alert_type: AlertType;
  severity: AlertSeverity;
  title: string;
  description: string | null;
  measurement_value: number | null;
  is_read: boolean;
  is_resolved: boolean;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
  // joined
  user_email?: string;
  user_name?: string;
}

// ===== User Analytics =====

export interface UserSummary {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  diabetes_type: string | null;
  created_at: string;
  measurement_count: number;
  last_measurement_at: string | null;
  avg_value: number | null;
  ai_conversations_count: number;
  unresolved_alerts: number;
  ai_access: boolean;
}

export interface UserDetail extends UserSummary {
  measurements: UserMeasurementSummary;
  conversations: AIConversation[];
  alerts: HealthAlert[];
  module_access: UserModuleAccess[];
}

export interface UserMeasurementSummary {
  total: number;
  avg: number | null;
  min: number | null;
  max: number | null;
  in_range_pct: number | null;
  last_7_days: number;
  last_30_days: number;
  high_count: number;
  low_count: number;
}

// ===== AI Analytics =====

export interface AIAnalyticsSummary {
  total_conversations: number;
  total_tokens: number;
  total_cost: number;
  conversations_today: number;
  conversations_this_week: number;
  active_users: number;
  top_topics: TopicCount[];
  provider_usage: ProviderUsage[];
  flagged_count: number;
  daily_usage: DailyUsage[];
}

export interface TopicCount {
  topic: string;
  count: number;
}

export interface ProviderUsage {
  provider: string;
  count: number;
  tokens: number;
  cost: number;
}

export interface DailyUsage {
  date: string;
  conversations: number;
  tokens: number;
  cost: number;
}

// ===== Admin Actions =====

export interface AdminAction {
  id: string;
  admin_id: string;
  action: string;
  target_user_id: string | null;
  details: Record<string, unknown>;
  created_at: string;
}

// ===== Module Definitions =====

export const MODULE_DEFINITIONS: Record<
  ModuleName,
  { label: string; description: string; icon: string }
> = {
  ai_assistant: {
    label: "עוזר AI חכם",
    description: "צ'אט עם AI לניתוח מדידות סוכר",
    icon: "Bot",
  },
  ai_analytics: {
    label: "אנליטיקס AI",
    description: "ניתוח מתקדם של דפוסים ומגמות",
    icon: "BarChart3",
  },
  ai_insights: {
    label: "תובנות AI",
    description: "התראות ותובנות אוטומטיות מבוססות AI",
    icon: "Lightbulb",
  },
};

// ===== Alert Thresholds =====

export const ALERT_THRESHOLDS = {
  critical_high: 300,  // mg/dL
  critical_low: 54,    // mg/dL
  high: 180,
  low: 70,
  no_data_days: 3,     // days without measurement
};
