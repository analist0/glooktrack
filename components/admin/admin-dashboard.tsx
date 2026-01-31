/**
 * Admin Dashboard - לוח בקרה מתקדם
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import {
  useAdminAuth,
  useModules,
  useUsers,
  useConversations,
  useAlerts,
  useAIAnalytics,
} from "@/lib/admin/use-admin";
import type {
  ModuleName,
  AccessType,
  UserSummary,
  UserDetail,
  AIConversation,
  HealthAlert,
} from "@/lib/admin/types";
import { MODULE_DEFINITIONS } from "@/lib/admin/types";
import {
  Shield,
  Users,
  Bot,
  BarChart3,
  AlertTriangle,
  Settings,
  Eye,
  ToggleLeft,
  ToggleRight,
  Clock,
  MessageSquare,
  Flag,
  CheckCircle,
  XCircle,
  ChevronRight,
  ChevronLeft,
  LogIn,
  LogOut,
  RefreshCw,
  Search,
  Activity,
  TrendingUp,
  ArrowLeft,
  Zap,
} from "lucide-react";

type Tab =
  | "modules"
  | "users"
  | "alerts"
  | "ai-analytics"
  | "conversations"
  | "user-detail";

export default function AdminDashboard() {
  const { isAuthenticated, error: authError, login, logout } = useAdminAuth();
  const [adminKey, setAdminKeyInput] = useState("");
  const [activeTab, setActiveTab] = useState<Tab>("modules");
  const [previousTab, setPreviousTab] = useState<Tab>("users");

  if (!isAuthenticated) {
    return (
      <div
        dir="rtl"
        className="min-h-screen bg-background flex items-center justify-center p-4"
      >
        <div className="w-full max-w-sm bg-card rounded-xl border shadow-lg p-6 space-y-4">
          <div className="text-center space-y-2">
            <Shield className="w-12 h-12 text-primary mx-auto" />
            <h1 className="text-xl font-bold">כניסה לממשק ניהול</h1>
            <p className="text-sm text-muted-foreground">
              הזן את מפתח הניהול לגישה
            </p>
          </div>
          <input
            type="password"
            value={adminKey}
            onChange={(e) => setAdminKeyInput(e.target.value)}
            placeholder="מפתח ניהול..."
            className="w-full px-3 py-2 border rounded-lg bg-background text-sm"
            onKeyDown={(e) => e.key === "Enter" && login(adminKey)}
          />
          {authError && (
            <p className="text-sm text-red-500 text-center">{authError}</p>
          )}
          <button
            onClick={() => login(adminKey)}
            className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-lg py-2 text-sm font-medium hover:opacity-90"
          >
            <LogIn className="w-4 h-4" />
            כניסה
          </button>
        </div>
      </div>
    );
  }

  const navigateToUser = (userId: string) => {
    setPreviousTab(activeTab);
    setActiveTab("user-detail");
  };

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "modules", label: "מודולים", icon: <Settings className="w-4 h-4" /> },
    { id: "users", label: "משתמשים", icon: <Users className="w-4 h-4" /> },
    {
      id: "alerts",
      label: "התראות",
      icon: <AlertTriangle className="w-4 h-4" />,
    },
    {
      id: "ai-analytics",
      label: "אנליטיקס AI",
      icon: <BarChart3 className="w-4 h-4" />,
    },
    {
      id: "conversations",
      label: "שיחות AI",
      icon: <MessageSquare className="w-4 h-4" />,
    },
  ];

  return (
    <div dir="rtl" className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="w-6 h-6 text-primary" />
            <h1 className="text-lg font-bold">ניהול GlucoTrack</h1>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <LogOut className="w-4 h-4" />
            יציאה
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto flex">
        {/* Sidebar */}
        <nav className="w-52 border-l min-h-[calc(100vh-56px)] bg-card p-2 space-y-1 sticky top-14 self-start">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition ${
                activeTab === tab.id
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-accent text-foreground"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>

        {/* Content */}
        <main className="flex-1 p-6">
          {activeTab === "modules" && <ModulesPanel />}
          {activeTab === "users" && (
            <UsersPanel onSelectUser={navigateToUser} />
          )}
          {activeTab === "alerts" && <AlertsPanel />}
          {activeTab === "ai-analytics" && <AIAnalyticsPanel />}
          {activeTab === "conversations" && <ConversationsPanel />}
          {activeTab === "user-detail" && (
            <UserDetailPanel
              onBack={() => setActiveTab(previousTab)}
            />
          )}
        </main>
      </div>
    </div>
  );
}

// ===== Modules Panel =====

function ModulesPanel() {
  const { modules, loading, fetchModules, updateModule } = useModules();

  useEffect(() => {
    fetchModules();
  }, [fetchModules]);

  const handleToggle = async (
    moduleName: ModuleName,
    currentEnabled: boolean,
    currentType: AccessType
  ) => {
    const newEnabled = !currentEnabled;
    await updateModule(
      moduleName,
      newEnabled ? (currentType === "disabled" ? "all_users" : currentType) : "disabled",
      newEnabled
    );
  };

  const handleAccessTypeChange = async (
    moduleName: ModuleName,
    accessType: AccessType
  ) => {
    await updateModule(moduleName, accessType, accessType !== "disabled");
  };

  const handleSetExpiry = async (moduleName: ModuleName, days: number) => {
    const expiresAt = new Date(
      Date.now() + days * 24 * 60 * 60 * 1000
    ).toISOString();
    await updateModule(moduleName, "all_users", true, { expiresAt });
  };

  const allModules: ModuleName[] = ["ai_assistant", "ai_analytics", "ai_insights"];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Settings className="w-5 h-5" />
          ניהול מודולים
        </h2>
        <button
          onClick={fetchModules}
          disabled={loading}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          רענון
        </button>
      </div>

      <div className="grid gap-4">
        {allModules.map((moduleName) => {
          const def = MODULE_DEFINITIONS[moduleName];
          const mod = modules.find((m) => m.module_name === moduleName);
          const enabled = mod?.enabled || false;
          const accessType = mod?.access_type || "disabled";
          const expiresAt = mod?.expires_at;

          return (
            <div
              key={moduleName}
              className="bg-card border rounded-xl p-5 space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Bot className="w-8 h-8 text-primary" />
                  <div>
                    <h3 className="font-semibold">{def.label}</h3>
                    <p className="text-sm text-muted-foreground">
                      {def.description}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() =>
                    handleToggle(moduleName, enabled, accessType as AccessType)
                  }
                  className={`transition ${
                    enabled ? "text-green-500" : "text-muted-foreground"
                  }`}
                >
                  {enabled ? (
                    <ToggleRight className="w-10 h-10" />
                  ) : (
                    <ToggleLeft className="w-10 h-10" />
                  )}
                </button>
              </div>

              {enabled && (
                <div className="space-y-3 pt-2 border-t">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">סוג גישה:</span>
                    <select
                      value={accessType}
                      onChange={(e) =>
                        handleAccessTypeChange(
                          moduleName,
                          e.target.value as AccessType
                        )
                      }
                      className="text-sm border rounded-lg px-2 py-1 bg-background"
                    >
                      <option value="all_users">כל המשתמשים</option>
                      <option value="specific_users">
                        משתמשים ספציפיים
                      </option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">פתח לתקופה:</span>
                    <div className="flex gap-1">
                      {[1, 7, 14, 30].map((days) => (
                        <button
                          key={days}
                          onClick={() => handleSetExpiry(moduleName, days)}
                          className="text-xs border rounded-lg px-2 py-1 hover:bg-accent"
                        >
                          {days === 1
                            ? "יום"
                            : days === 7
                            ? "שבוע"
                            : days === 14
                            ? "שבועיים"
                            : "חודש"}
                        </button>
                      ))}
                    </div>
                  </div>

                  {expiresAt && (
                    <div className="flex items-center gap-1 text-xs text-amber-600">
                      <Clock className="w-3 h-3" />
                      פג תוקף:{" "}
                      {new Date(expiresAt).toLocaleDateString("he-IL")}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ===== Users Panel =====

function UsersPanel({
  onSelectUser,
}: {
  onSelectUser: (userId: string) => void;
}) {
  const { users, loading, fetchUsers, fetchUserDetail } = useUsers();
  const { updateUserAccess } = useModules();
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const filtered = users.filter(
    (u) =>
      (u.email || "").includes(searchQuery) ||
      (u.full_name || "").includes(searchQuery)
  );

  const handleSelectUser = (userId: string) => {
    fetchUserDetail(userId);
    onSelectUser(userId);
  };

  const handleToggleAI = async (userId: string, currentAccess: boolean) => {
    await updateUserAccess(userId, "ai_assistant", !currentAccess);
    await fetchUsers();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Users className="w-5 h-5" />
          משתמשים ({users.length})
        </h2>
        <button
          onClick={fetchUsers}
          disabled={loading}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="relative">
        <Search className="absolute right-3 top-2.5 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="חפש לפי שם או אימייל..."
          className="w-full pr-9 pl-3 py-2 border rounded-lg bg-background text-sm"
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-muted-foreground">
              <th className="text-right py-2 px-3">משתמש</th>
              <th className="text-center py-2 px-3">מדידות</th>
              <th className="text-center py-2 px-3">ממוצע</th>
              <th className="text-center py-2 px-3">שיחות AI</th>
              <th className="text-center py-2 px-3">התראות</th>
              <th className="text-center py-2 px-3">AI</th>
              <th className="text-center py-2 px-3">פעולות</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((user) => (
              <UserRow
                key={user.id}
                user={user}
                onSelect={() => handleSelectUser(user.id)}
                onToggleAI={() => handleToggleAI(user.id, user.ai_access)}
              />
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-8 text-muted-foreground">
                  {loading ? "טוען..." : "לא נמצאו משתמשים"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function UserRow({
  user,
  onSelect,
  onToggleAI,
}: {
  user: UserSummary;
  onSelect: () => void;
  onToggleAI: () => void;
}) {
  const avgColor =
    user.avg_value === null
      ? "text-muted-foreground"
      : user.avg_value > 180
      ? "text-red-500"
      : user.avg_value < 70
      ? "text-blue-500"
      : "text-green-500";

  return (
    <tr className="border-b hover:bg-accent/50 transition">
      <td className="py-2 px-3">
        <div>
          <p className="font-medium">{user.full_name || "ללא שם"}</p>
          <p className="text-xs text-muted-foreground">{user.email}</p>
        </div>
      </td>
      <td className="text-center py-2 px-3">{user.measurement_count}</td>
      <td className={`text-center py-2 px-3 font-medium ${avgColor}`}>
        {user.avg_value ?? "—"}
      </td>
      <td className="text-center py-2 px-3">{user.ai_conversations_count}</td>
      <td className="text-center py-2 px-3">
        {user.unresolved_alerts > 0 ? (
          <span className="inline-flex items-center gap-1 text-red-500 font-medium">
            <AlertTriangle className="w-3 h-3" />
            {user.unresolved_alerts}
          </span>
        ) : (
          <span className="text-green-500">0</span>
        )}
      </td>
      <td className="text-center py-2 px-3">
        <button onClick={onToggleAI}>
          {user.ai_access ? (
            <ToggleRight className="w-6 h-6 text-green-500 mx-auto" />
          ) : (
            <ToggleLeft className="w-6 h-6 text-muted-foreground mx-auto" />
          )}
        </button>
      </td>
      <td className="text-center py-2 px-3">
        <button
          onClick={onSelect}
          className="flex items-center gap-1 mx-auto text-primary hover:underline text-xs"
        >
          <Eye className="w-3 h-3" />
          צפייה
        </button>
      </td>
    </tr>
  );
}

// ===== Alerts Panel =====

function AlertsPanel() {
  const { alerts, loading, fetchAlerts, resolve, generateAlerts } = useAlerts();
  const [filter, setFilter] = useState<"all" | "critical" | "warning" | "info">("all");

  useEffect(() => {
    fetchAlerts({ unresolvedOnly: true });
  }, [fetchAlerts]);

  const handleGenerate = async () => {
    const count = await generateAlerts();
    alert(`נוצרו ${count} התראות חדשות`);
    await fetchAlerts({ unresolvedOnly: true });
  };

  const handleResolve = async (alertId: string) => {
    await resolve(alertId);
    await fetchAlerts({ unresolvedOnly: true });
  };

  const filtered =
    filter === "all" ? alerts : alerts.filter((a) => a.severity === filter);

  const severityColors: Record<string, string> = {
    critical: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    warning:
      "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
    info: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" />
          התראות בריאות ({alerts.length})
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={handleGenerate}
            className="flex items-center gap-1 text-sm bg-primary text-primary-foreground rounded-lg px-3 py-1.5 hover:opacity-90"
          >
            <Zap className="w-3 h-3" />
            סרוק התראות
          </button>
          <button
            onClick={() => fetchAlerts({ unresolvedOnly: true })}
            disabled={loading}
          >
            <RefreshCw
              className={`w-4 h-4 text-muted-foreground ${
                loading ? "animate-spin" : ""
              }`}
            />
          </button>
        </div>
      </div>

      <div className="flex gap-2">
        {(["all", "critical", "warning", "info"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`text-xs px-3 py-1 rounded-full border transition ${
              filter === f ? "bg-primary text-primary-foreground" : "hover:bg-accent"
            }`}
          >
            {f === "all"
              ? "הכל"
              : f === "critical"
              ? "קריטי"
              : f === "warning"
              ? "אזהרה"
              : "מידע"}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map((alert) => (
          <div
            key={alert.id}
            className="bg-card border rounded-xl p-4 flex items-start justify-between gap-4"
          >
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    severityColors[alert.severity]
                  }`}
                >
                  {alert.severity === "critical"
                    ? "קריטי"
                    : alert.severity === "warning"
                    ? "אזהרה"
                    : "מידע"}
                </span>
                <span className="font-semibold text-sm">{alert.title}</span>
              </div>
              {alert.description && (
                <p className="text-sm text-muted-foreground">
                  {alert.description}
                </p>
              )}
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span>{alert.user_email || alert.user_name || alert.user_id.slice(0, 8)}</span>
                <span>
                  {new Date(alert.created_at).toLocaleString("he-IL")}
                </span>
              </div>
            </div>
            <button
              onClick={() => handleResolve(alert.id)}
              className="flex items-center gap-1 text-xs text-green-600 hover:text-green-700 border border-green-200 rounded-lg px-2 py-1"
            >
              <CheckCircle className="w-3 h-3" />
              טופל
            </button>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <CheckCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>אין התראות פתוחות</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ===== AI Analytics Panel =====

function AIAnalyticsPanel() {
  const { analytics, loading, fetchAnalytics } = useAIAnalytics();

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  if (loading || !analytics) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <BarChart3 className="w-5 h-5" />
          אנליטיקס AI
        </h2>
        <button onClick={fetchAnalytics}>
          <RefreshCw className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="סה״כ שיחות"
          value={analytics.total_conversations.toLocaleString()}
          icon={<MessageSquare className="w-5 h-5" />}
        />
        <StatCard
          label="היום"
          value={analytics.conversations_today.toLocaleString()}
          icon={<Activity className="w-5 h-5" />}
        />
        <StatCard
          label="משתמשים פעילים"
          value={analytics.active_users.toLocaleString()}
          icon={<Users className="w-5 h-5" />}
        />
        <StatCard
          label="מסומנות לבדיקה"
          value={analytics.flagged_count.toLocaleString()}
          icon={<Flag className="w-5 h-5" />}
          danger={analytics.flagged_count > 0}
        />
      </div>

      {/* Tokens & Cost */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-card border rounded-xl p-4">
          <h3 className="text-sm font-medium text-muted-foreground mb-1">
            סה״כ טוקנים
          </h3>
          <p className="text-2xl font-bold">
            {analytics.total_tokens.toLocaleString()}
          </p>
        </div>
        <div className="bg-card border rounded-xl p-4">
          <h3 className="text-sm font-medium text-muted-foreground mb-1">
            עלות מוערכת
          </h3>
          <p className="text-2xl font-bold">
            ${analytics.total_cost.toFixed(4)}
          </p>
        </div>
      </div>

      {/* Provider Usage */}
      <div className="bg-card border rounded-xl p-5">
        <h3 className="font-semibold mb-3">שימוש לפי ספק</h3>
        <div className="space-y-3">
          {analytics.provider_usage.map((pu) => (
            <div key={pu.provider} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bot className="w-4 h-4 text-primary" />
                <span className="font-medium text-sm capitalize">
                  {pu.provider}
                </span>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <span>{pu.count} שיחות</span>
                <span className="text-muted-foreground">
                  {pu.tokens.toLocaleString()} טוקנים
                </span>
                <span className="text-muted-foreground">
                  ${pu.cost.toFixed(4)}
                </span>
              </div>
            </div>
          ))}
          {analytics.provider_usage.length === 0 && (
            <p className="text-sm text-muted-foreground">אין נתונים עדיין</p>
          )}
        </div>
      </div>

      {/* Top Topics */}
      <div className="bg-card border rounded-xl p-5">
        <h3 className="font-semibold mb-3">נושאים נפוצים</h3>
        <div className="space-y-2">
          {analytics.top_topics.map((t) => (
            <div key={t.topic} className="flex items-center justify-between">
              <span className="text-sm">{t.topic}</span>
              <div className="flex items-center gap-2">
                <div className="w-32 bg-accent rounded-full h-2">
                  <div
                    className="bg-primary rounded-full h-2"
                    style={{
                      width: `${Math.min(
                        100,
                        (t.count /
                          Math.max(
                            1,
                            analytics.top_topics[0]?.count || 1
                          )) *
                          100
                      )}%`,
                    }}
                  />
                </div>
                <span className="text-xs text-muted-foreground w-8 text-left">
                  {t.count}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Daily Usage Chart (Simple) */}
      {analytics.daily_usage.length > 0 && (
        <div className="bg-card border rounded-xl p-5">
          <h3 className="font-semibold mb-3">שיחות יומיות (30 יום אחרונים)</h3>
          <div className="flex items-end gap-1 h-32">
            {analytics.daily_usage.map((d) => {
              const maxConvs = Math.max(
                ...analytics.daily_usage.map((x) => x.conversations)
              );
              const height = maxConvs
                ? (d.conversations / maxConvs) * 100
                : 0;
              return (
                <div
                  key={d.date}
                  className="flex-1 bg-primary/20 hover:bg-primary/40 rounded-t transition relative group"
                  style={{ height: `${Math.max(4, height)}%` }}
                  title={`${d.date}: ${d.conversations} שיחות`}
                >
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-popover text-popover-foreground text-xs px-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap">
                    {d.conversations}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  danger,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <div className="bg-card border rounded-xl p-4">
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className={danger ? "text-red-500" : "text-primary"}>
          {icon}
        </span>
      </div>
      <p className={`text-2xl font-bold ${danger ? "text-red-500" : ""}`}>
        {value}
      </p>
    </div>
  );
}

// ===== Conversations Panel =====

function ConversationsPanel() {
  const { conversations, total, loading, fetchConversations, toggleFlag } =
    useConversations();
  const [page, setPage] = useState(0);
  const [flaggedOnly, setFlaggedOnly] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const limit = 20;

  useEffect(() => {
    fetchConversations({ flaggedOnly, limit, offset: page * limit });
  }, [fetchConversations, flaggedOnly, page]);

  const handleFlag = async (conv: AIConversation) => {
    await toggleFlag(conv.id, !conv.flagged, conv.flagged ? undefined : "manual review");
    await fetchConversations({ flaggedOnly, limit, offset: page * limit });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <MessageSquare className="w-5 h-5" />
          שיחות AI ({total})
        </h2>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={flaggedOnly}
              onChange={(e) => {
                setFlaggedOnly(e.target.checked);
                setPage(0);
              }}
              className="rounded"
            />
            מסומנות בלבד
          </label>
          <button
            onClick={() =>
              fetchConversations({ flaggedOnly, limit, offset: page * limit })
            }
            disabled={loading}
          >
            <RefreshCw
              className={`w-4 h-4 text-muted-foreground ${
                loading ? "animate-spin" : ""
              }`}
            />
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {conversations.map((conv) => (
          <div
            key={conv.id}
            className={`bg-card border rounded-xl p-4 transition ${
              conv.flagged ? "border-red-300 dark:border-red-800" : ""
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <span>{conv.user_email || conv.user_name || conv.user_id.slice(0, 8)}</span>
                  <span>•</span>
                  <span>{conv.provider || "?"}</span>
                  <span>•</span>
                  <span>
                    {new Date(conv.created_at).toLocaleString("he-IL")}
                  </span>
                  {conv.tokens_used > 0 && (
                    <>
                      <span>•</span>
                      <span>{conv.tokens_used} טוקנים</span>
                    </>
                  )}
                </div>
                <p
                  className="text-sm font-medium cursor-pointer"
                  onClick={() =>
                    setExpandedId(expandedId === conv.id ? null : conv.id)
                  }
                >
                  {conv.user_message.length > 120 && expandedId !== conv.id
                    ? conv.user_message.slice(0, 120) + "..."
                    : conv.user_message}
                </p>
                {expandedId === conv.id && conv.ai_response && (
                  <div className="mt-2 p-3 bg-accent rounded-lg text-sm whitespace-pre-wrap">
                    <p className="text-xs font-medium text-primary mb-1">
                      תשובת AI:
                    </p>
                    {conv.ai_response}
                  </div>
                )}
              </div>
              <button
                onClick={() => handleFlag(conv)}
                className={`shrink-0 ${
                  conv.flagged
                    ? "text-red-500"
                    : "text-muted-foreground hover:text-red-500"
                }`}
                title={conv.flagged ? "הסר סימון" : "סמן לבדיקה"}
              >
                <Flag className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}

        {conversations.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>אין שיחות</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {total > limit && (
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={() => setPage(Math.max(0, page - 1))}
            disabled={page === 0}
            className="p-1 disabled:opacity-30"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
          <span className="text-sm text-muted-foreground">
            עמוד {page + 1} מתוך {Math.ceil(total / limit)}
          </span>
          <button
            onClick={() => setPage(page + 1)}
            disabled={(page + 1) * limit >= total}
            className="p-1 disabled:opacity-30"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
}

// ===== User Detail Panel =====

function UserDetailPanel({ onBack }: { onBack: () => void }) {
  const { selectedUser, loading } = useUsers();
  const { updateUserAccess } = useModules();
  const [convExpanded, setConvExpanded] = useState<string | null>(null);

  if (loading || !selectedUser) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const user = selectedUser;

  const handleToggleModule = async (
    moduleName: ModuleName,
    currentEnabled: boolean
  ) => {
    await updateUserAccess(user.id, moduleName, !currentEnabled);
  };

  return (
    <div className="space-y-6">
      <button
        onClick={onBack}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="w-4 h-4" />
        חזרה
      </button>

      {/* User Header */}
      <div className="bg-card border rounded-xl p-5 flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xl font-bold">
          {(user.full_name || user.email || "?")[0].toUpperCase()}
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-bold">
            {user.full_name || "ללא שם"}
          </h2>
          <p className="text-sm text-muted-foreground">{user.email}</p>
          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
            <span>סוג סוכרת: {user.diabetes_type || "לא צוין"}</span>
            <span>
              נרשם: {new Date(user.created_at).toLocaleDateString("he-IL")}
            </span>
          </div>
        </div>
      </div>

      {/* Measurements Summary */}
      <div className="bg-card border rounded-xl p-5">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <Activity className="w-4 h-4" />
          סיכום מדידות
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MiniStat label="סה״כ" value={user.measurements.total} />
          <MiniStat
            label="ממוצע"
            value={user.measurements.avg ?? "—"}
            color={
              user.measurements.avg
                ? user.measurements.avg > 180
                  ? "text-red-500"
                  : user.measurements.avg < 70
                  ? "text-blue-500"
                  : "text-green-500"
                : ""
            }
          />
          <MiniStat
            label="בטווח"
            value={
              user.measurements.in_range_pct !== null
                ? `${user.measurements.in_range_pct}%`
                : "—"
            }
          />
          <MiniStat label="7 ימים" value={user.measurements.last_7_days} />
          <MiniStat label="נמוך" value={user.measurements.min ?? "—"} />
          <MiniStat label="גבוה" value={user.measurements.max ?? "—"} />
          <MiniStat
            label="גבוהים"
            value={user.measurements.high_count}
            color="text-red-500"
          />
          <MiniStat
            label="נמוכים"
            value={user.measurements.low_count}
            color="text-blue-500"
          />
        </div>
      </div>

      {/* Module Access */}
      <div className="bg-card border rounded-xl p-5">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <Settings className="w-4 h-4" />
          גישה למודולים
        </h3>
        <div className="space-y-2">
          {(Object.keys(MODULE_DEFINITIONS) as ModuleName[]).map(
            (moduleName) => {
              const def = MODULE_DEFINITIONS[moduleName];
              const access = user.module_access.find(
                (a) => a.module_name === moduleName
              );
              const enabled = access?.enabled || false;

              return (
                <div
                  key={moduleName}
                  className="flex items-center justify-between py-1"
                >
                  <span className="text-sm">{def.label}</span>
                  <button onClick={() => handleToggleModule(moduleName, enabled)}>
                    {enabled ? (
                      <ToggleRight className="w-6 h-6 text-green-500" />
                    ) : (
                      <ToggleLeft className="w-6 h-6 text-muted-foreground" />
                    )}
                  </button>
                </div>
              );
            }
          )}
        </div>
      </div>

      {/* Alerts */}
      {user.alerts.length > 0 && (
        <div className="bg-card border rounded-xl p-5">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            התראות ({user.alerts.length})
          </h3>
          <div className="space-y-2">
            {user.alerts.slice(0, 10).map((alert) => (
              <div
                key={alert.id}
                className="flex items-center justify-between text-sm py-1 border-b last:border-0"
              >
                <div className="flex items-center gap-2">
                  {alert.severity === "critical" ? (
                    <XCircle className="w-4 h-4 text-red-500" />
                  ) : alert.severity === "warning" ? (
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                  ) : (
                    <Activity className="w-4 h-4 text-blue-500" />
                  )}
                  <span>{alert.title}</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(alert.created_at).toLocaleDateString("he-IL")}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Conversations */}
      <div className="bg-card border rounded-xl p-5">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <MessageSquare className="w-4 h-4" />
          שיחות AI ({user.conversations.length})
        </h3>
        {user.conversations.length === 0 ? (
          <p className="text-sm text-muted-foreground">אין שיחות</p>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {user.conversations.map((conv) => (
              <div key={conv.id} className="border-b last:border-0 py-2">
                <div
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() =>
                    setConvExpanded(
                      convExpanded === conv.id ? null : conv.id
                    )
                  }
                >
                  <p className="text-sm truncate max-w-md">
                    {conv.user_message}
                  </p>
                  <span className="text-xs text-muted-foreground shrink-0 mr-2">
                    {new Date(conv.created_at).toLocaleString("he-IL")}
                  </span>
                </div>
                {convExpanded === conv.id && conv.ai_response && (
                  <div className="mt-2 p-3 bg-accent rounded-lg text-sm whitespace-pre-wrap">
                    {conv.ai_response}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function MiniStat({
  label,
  value,
  color,
}: {
  label: string;
  value: string | number;
  color?: string;
}) {
  return (
    <div className="text-center p-2 bg-accent/50 rounded-lg">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-lg font-bold ${color || ""}`}>{value}</p>
    </div>
  );
}
