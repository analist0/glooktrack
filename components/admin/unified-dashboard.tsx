"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowLeft,
  BarChart3,
  CheckCircle2,
  Cpu,
  Database,
  DollarSign,
  Download,
  HardDrive,
  Hash,
  Heart,
  RefreshCw,
  Server,
  Settings,
  Shield,
  TrendingUp,
  Upload,
  Users,
  Wifi,
  WifiOff,
  Zap,
  AlertTriangle,
  XCircle,
  Calendar,
  Clock,
  FileJson,
  Trash2,
  Home,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { loadMeasurements, calculateStats } from "@/lib/diabetes-storage";
import {
  exportAllData,
  importAllData,
  getStorageUsage,
} from "@/lib/settings-storage";
import type { BloodSugarMeasurement, MeasurementStats } from "@/lib/diabetes-types";
import { ThemeToggle } from "@/components/theme-toggle";

// ============= Types =============

interface ProviderStats {
  total: number;
  available: number;
  totalCalls: number;
  totalTokens: number;
}

interface AIStats {
  totalCalls: number;
  totalTokens: number;
  totalCostUSD: number;
  callsByProvider: Record<string, number>;
  tokensByProvider: Record<string, number>;
  lastUpdated: number;
}

interface AIGatewayData {
  ok: boolean;
  availableProviders: string[];
  status: string;
  stats?: {
    global: AIStats;
    today: AIStats | null;
    providers: Record<string, ProviderStats>;
  };
}

type AdminTab = "ai-gateway" | "user-metrics" | "data-management" | "system-health" | "settings";

interface TabConfig {
  id: AdminTab;
  label: string;
  icon: React.ElementType;
  description: string;
}

// ============= Constants =============

const TABS: TabConfig[] = [
  { id: "ai-gateway", label: "AI Gateway", icon: Cpu, description: "מעקב שימוש ב-AI" },
  { id: "user-metrics", label: "מדדי משתמש", icon: Users, description: "סטטיסטיקות מדידות" },
  { id: "data-management", label: "ניהול נתונים", icon: Database, description: "גיבוי וייבוא" },
  { id: "system-health", label: "בריאות המערכת", icon: Activity, description: "סטטוס ואחסון" },
  { id: "settings", label: "הגדרות", icon: Settings, description: "הגדרות מערכת" },
];

const PROVIDER_NAMES: Record<string, string> = {
  gemini: "Google Gemini",
  xai: "xAI Grok",
  perplexity: "Perplexity",
};

const PROVIDER_COLORS: Record<string, string> = {
  gemini: "from-blue-500 to-blue-600",
  xai: "from-purple-500 to-purple-600",
  perplexity: "from-teal-500 to-teal-600",
};

// ============= Helper Functions =============

const formatCost = (cost: number): string => {
  if (cost < 0.01) return `$${(cost * 100).toFixed(2)}c`;
  return `$${cost.toFixed(4)}`;
};

const formatNumber = (num: number): string => {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
};

const formatTime = (timestamp: number): string => {
  if (!timestamp) return "N/A";
  return new Date(timestamp).toLocaleString("he-IL");
};

const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("he-IL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

// ============= Main Component =============

export function UnifiedAdminDashboard() {
  const [activeTab, setActiveTab] = useState<AdminTab>("ai-gateway");
  const [aiData, setAiData] = useState<AIGatewayData | null>(null);
  const [measurements, setMeasurements] = useState<BloodSugarMeasurement[]>([]);
  const [stats, setStats] = useState<MeasurementStats | null>(null);
  const [storageInfo, setStorageInfo] = useState({ used: "0 KB", items: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch AI Gateway data
  const fetchAIData = useCallback(async () => {
    try {
      const response = await fetch("/api/ai?stats=true");
      const result = await response.json();
      setAiData(result);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch AI data");
    }
  }, []);

  // Load local data
  const loadLocalData = useCallback(() => {
    try {
      const storedMeasurements = loadMeasurements();
      setMeasurements(storedMeasurements);
      setStats(calculateStats(storedMeasurements));
      setStorageInfo(getStorageUsage());
    } catch (err) {
      console.error("Error loading local data:", err);
    }
  }, []);

  // Refresh all data
  const refreshData = useCallback(async () => {
    setLoading(true);
    await fetchAIData();
    loadLocalData();
    setLastRefresh(new Date());
    setLoading(false);
  }, [fetchAIData, loadLocalData]);

  // Initial load and auto-refresh
  useEffect(() => {
    refreshData();
    const interval = setInterval(refreshData, 30000);
    return () => clearInterval(interval);
  }, [refreshData]);

  // Online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    setIsOnline(navigator.onLine);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Export handler
  const handleExport = () => {
    const data = exportAllData();
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `glucotrack-backup-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Import handler
  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportError(null);
    setImportSuccess(false);

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const success = importAllData(content);
      if (success) {
        setImportSuccess(true);
        loadLocalData();
        setTimeout(() => setImportSuccess(false), 3000);
      } else {
        setImportError("The file is invalid. Please select a valid backup file.");
      }
    };
    reader.readAsText(file);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Clear all GlucoTrack data (not all localStorage)
  const handleClearAll = () => {
    const appKeys = ["diabetesMeasurements", "glucotrackSettings", "diabetesProfileImage", "diabetesPatientName", "pwa-banner-dismissed"];
    appKeys.forEach((key) => localStorage.removeItem(key));
    loadLocalData();
    setShowClearConfirm(false);
  };

  // Calculate measurement activity by context
  const getMeasurementsByContext = () => {
    const contextCounts: Record<string, number> = {
      fasting: 0,
      "before-meal": 0,
      "after-meal": 0,
      "before-sleep": 0,
      other: 0,
    };

    measurements.forEach((m) => {
      if (contextCounts[m.context] !== undefined) {
        contextCounts[m.context]++;
      }
    });

    return contextCounts;
  };

  // Calculate measurements by day of week
  const getMeasurementsByDayOfWeek = () => {
    const days = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
    const dayCounts = new Array(7).fill(0);

    measurements.forEach((m) => {
      const date = new Date(m.date);
      dayCounts[date.getDay()]++;
    });

    return days.map((day, index) => ({
      day,
      count: dayCounts[index],
    }));
  };

  // Get recent activity (last 7 days)
  const getRecentActivity = () => {
    const today = new Date();
    const last7Days: { date: string; count: number }[] = [];

    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];
      const count = measurements.filter((m) => m.date === dateStr).length;
      last7Days.push({
        date: date.toLocaleDateString("he-IL", { weekday: "short", day: "numeric" }),
        count,
      });
    }

    return last7Days;
  };

  // Render tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case "ai-gateway":
        return <AIGatewayTab data={aiData} loading={loading} error={error} />;
      case "user-metrics":
        return (
          <UserMetricsTab
            measurements={measurements}
            stats={stats}
            contextCounts={getMeasurementsByContext()}
            dayOfWeekCounts={getMeasurementsByDayOfWeek()}
            recentActivity={getRecentActivity()}
          />
        );
      case "data-management":
        return (
          <DataManagementTab
            storageInfo={storageInfo}
            importError={importError}
            importSuccess={importSuccess}
            fileInputRef={fileInputRef}
            onExport={handleExport}
            onImport={handleImport}
            onClearData={() => setShowClearConfirm(true)}
            measurementCount={measurements.length}
          />
        );
      case "system-health":
        return (
          <SystemHealthTab
            isOnline={isOnline}
            storageInfo={storageInfo}
            aiData={aiData}
            lastRefresh={lastRefresh}
          />
        );
      case "settings":
        return <SettingsTab />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30" dir="rtl">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-gradient-to-l from-violet-600 to-purple-500 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                aria-label="Back to home"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div className="p-2 rounded-xl bg-white/10">
                <Shield className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Admin Dashboard</h1>
                <p className="text-sm text-white/70">ניהול מערכת גלוקוטרק</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* Online status indicator */}
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10">
                {isOnline ? (
                  <>
                    <Wifi className="w-4 h-4 text-emerald-300" />
                    <span className="text-xs">מחובר</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="w-4 h-4 text-red-300" />
                    <span className="text-xs">לא מחובר</span>
                  </>
                )}
              </div>
              {lastRefresh && (
                <span className="hidden sm:block text-sm text-white/70">
                  עדכון: {lastRefresh.toLocaleTimeString("he-IL")}
                </span>
              )}
              <ThemeToggle />
              <Button
                variant="secondary"
                size="sm"
                onClick={refreshData}
                disabled={loading}
                className="gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                <span className="hidden sm:inline">רענן</span>
              </Button>
              <Link href="/">
                <Button variant="secondary" size="sm" className="gap-2">
                  <Home className="w-4 h-4" />
                  <span className="hidden sm:inline">חזרה לאפליקציה</span>
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <div className="sticky top-[72px] z-40 bg-background/95 backdrop-blur border-b">
        <div className="max-w-7xl mx-auto px-4">
          <nav className="flex overflow-x-auto scrollbar-hide -mb-px gap-1 py-2">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                  activeTab === tab.id
                    ? "bg-gradient-to-l from-violet-500/10 to-purple-500/10 text-violet-700 dark:text-violet-300 shadow-sm"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                }`}
              >
                <tab.icon className="w-4 h-4 flex-shrink-0" />
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6 sm:py-8">
        {renderTabContent()}
      </main>

      {/* Footer */}
      <footer className="border-t py-6 text-center text-sm text-muted-foreground">
        <p>GlucoTrack Admin Dashboard</p>
        <p className="mt-1">נתונים מתעדכנים אוטומטית כל 30 שניות</p>
      </footer>

      {/* Clear data confirmation */}
      <AlertDialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader className="text-right">
            <div className="flex items-center gap-2 justify-end">
              <AlertDialogTitle>מחיקת כל הנתונים</AlertDialogTitle>
              <AlertTriangle className="w-5 h-5 text-destructive" />
            </div>
            <AlertDialogDescription className="text-right">
              <strong className="text-destructive">פעולה זו היא בלתי הפיכה!</strong>{" "}
              כל הנתונים שלך יימחקו לצמיתות, כולל כל המדידות, ההגדרות, ותמונת הפרופיל.
              מומלץ לגבות את הנתונים לפני המחיקה.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogAction
              onClick={handleClearAll}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              מחק הכל
            </AlertDialogAction>
            <AlertDialogCancel>ביטול</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ============= Tab Components =============

// AI Gateway Tab
function AIGatewayTab({
  data,
  loading,
  error,
}: {
  data: AIGatewayData | null;
  loading: boolean;
  error: string | null;
}) {
  if (loading && !data) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center gap-3">
          <RefreshCw className="w-6 h-6 animate-spin text-primary" />
          <span className="text-lg">Loading AI data...</span>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <Card className="max-w-md mx-auto">
        <CardContent className="pt-6 text-center">
          <AlertTriangle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <p className="text-destructive">{error}</p>
        </CardContent>
      </Card>
    );
  }

  const stats = data?.stats;
  const globalStats = stats?.global;
  const todayStats = stats?.today;
  const providerStats = stats?.providers;

  return (
    <div className="space-y-6">
      {/* Status Banner */}
      <div
        className={`p-4 rounded-xl flex items-center justify-between flex-wrap gap-4 ${
          data?.status === "operational"
            ? "bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800"
            : "bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800"
        }`}
      >
        <div className="flex items-center gap-3">
          {data?.status === "operational" ? (
            <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-400" />
          )}
          <div>
            <p className="font-semibold">
              {data?.status === "operational" ? "המערכת פעילה" : "אין מפתחות מוגדרים"}
            </p>
            <p className="text-sm text-muted-foreground">
              {data?.availableProviders?.length || 0} ספקים זמינים
            </p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {data?.availableProviders?.map((provider) => (
            <span
              key={provider}
              className="px-3 py-1 rounded-full text-xs font-medium bg-white dark:bg-gray-800 shadow-sm"
            >
              {PROVIDER_NAMES[provider] || provider}
            </span>
          ))}
        </div>
      </div>

      {/* Global Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={Hash}
          label='סה"כ קריאות'
          value={formatNumber(globalStats?.totalCalls || 0)}
          iconBgClass="bg-blue-100 dark:bg-blue-900/30"
          iconClass="text-blue-600 dark:text-blue-400"
        />
        <StatCard
          icon={Zap}
          label='סה"כ טוקנים'
          value={formatNumber(globalStats?.totalTokens || 0)}
          iconBgClass="bg-purple-100 dark:bg-purple-900/30"
          iconClass="text-purple-600 dark:text-purple-400"
        />
        <StatCard
          icon={DollarSign}
          label="עלות כוללת"
          value={formatCost(globalStats?.totalCostUSD || 0)}
          iconBgClass="bg-emerald-100 dark:bg-emerald-900/30"
          iconClass="text-emerald-600 dark:text-emerald-400"
        />
        <StatCard
          icon={TrendingUp}
          label="קריאות היום"
          value={formatNumber(todayStats?.totalCalls || 0)}
          iconBgClass="bg-amber-100 dark:bg-amber-900/30"
          iconClass="text-amber-600 dark:text-amber-400"
        />
      </div>

      {/* Provider Cards */}
      <div>
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2 justify-end">
          <span>ספקי AI</span>
          <Server className="w-5 h-5" />
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(["gemini", "xai", "perplexity"] as const).map((provider) => {
            const pStats = providerStats?.[provider];
            const isAvailable = data?.availableProviders?.includes(provider);

            return (
              <Card
                key={provider}
                className={`border-0 shadow-lg overflow-hidden ${
                  !isAvailable ? "opacity-60" : ""
                }`}
              >
                <div className={`h-2 bg-gradient-to-r ${PROVIDER_COLORS[provider]}`} />
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {isAvailable ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                      ) : (
                        <XCircle className="w-5 h-5 text-gray-400" />
                      )}
                      <CardTitle className="text-lg">{PROVIDER_NAMES[provider]}</CardTitle>
                    </div>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        isAvailable
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                          : "bg-gray-100 text-gray-500 dark:bg-gray-800"
                      }`}
                    >
                      {isAvailable ? "Active" : "Not Configured"}
                    </span>
                  </div>
                  <CardDescription>
                    {pStats?.available || 0} of {pStats?.total || 0} keys available
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-muted/50 rounded-lg">
                      <p className="text-2xl font-bold text-primary">
                        {formatNumber(pStats?.totalCalls || 0)}
                      </p>
                      <p className="text-xs text-muted-foreground">Calls</p>
                    </div>
                    <div className="text-center p-3 bg-muted/50 rounded-lg">
                      <p className="text-2xl font-bold text-primary">
                        {formatNumber(pStats?.totalTokens || 0)}
                      </p>
                      <p className="text-xs text-muted-foreground">Tokens</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Today vs All Time */}
      {todayStats && (
        <div>
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2 justify-end">
            <span>היום לעומת כל הזמנים</span>
            <Cpu className="w-5 h-5" />
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg">היום</CardTitle>
                <CardDescription>עדכון אחרון: {formatTime(todayStats.lastUpdated)}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-xl">{formatNumber(todayStats.totalCalls)}</span>
                    <span className="text-muted-foreground">קריאות</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-xl">{formatNumber(todayStats.totalTokens)}</span>
                    <span className="text-muted-foreground">טוקנים</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-xl text-emerald-600">
                      {formatCost(todayStats.totalCostUSD)}
                    </span>
                    <span className="text-muted-foreground">עלות</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg">כל הזמנים</CardTitle>
                <CardDescription>
                  עדכון אחרון: {formatTime(globalStats?.lastUpdated || 0)}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-xl">
                      {formatNumber(globalStats?.totalCalls || 0)}
                    </span>
                    <span className="text-muted-foreground">קריאות</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-xl">
                      {formatNumber(globalStats?.totalTokens || 0)}
                    </span>
                    <span className="text-muted-foreground">טוקנים</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-xl text-emerald-600">
                      {formatCost(globalStats?.totalCostUSD || 0)}
                    </span>
                    <span className="text-muted-foreground">עלות</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

// User Metrics Tab
function UserMetricsTab({
  measurements,
  stats,
  contextCounts,
  dayOfWeekCounts,
  recentActivity,
}: {
  measurements: BloodSugarMeasurement[];
  stats: MeasurementStats | null;
  contextCounts: Record<string, number>;
  dayOfWeekCounts: { day: string; count: number }[];
  recentActivity: { date: string; count: number }[];
}) {
  const contextLabels: Record<string, string> = {
    fasting: "צום",
    "before-meal": "לפני ארוחה",
    "after-meal": "אחרי ארוחה",
    "before-sleep": "לפני שינה",
    other: "אחר",
  };

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={BarChart3}
          label='סה"כ מדידות'
          value={measurements.length.toString()}
          iconBgClass="bg-violet-100 dark:bg-violet-900/30"
          iconClass="text-violet-600 dark:text-violet-400"
        />
        <StatCard
          icon={Calendar}
          label="ממוצע היום"
          value={stats?.todayAverage?.toString() || "--"}
          subtitle='מ"ג/ד"ל'
          iconBgClass="bg-blue-100 dark:bg-blue-900/30"
          iconClass="text-blue-600 dark:text-blue-400"
        />
        <StatCard
          icon={TrendingUp}
          label="ממוצע שבועי"
          value={stats?.weekAverage?.toString() || "--"}
          subtitle='מ"ג/ד"ל'
          iconBgClass="bg-emerald-100 dark:bg-emerald-900/30"
          iconClass="text-emerald-600 dark:text-emerald-400"
        />
        <StatCard
          icon={Heart}
          label="ממוצע חודשי"
          value={stats?.monthAverage?.toString() || "--"}
          subtitle='מ"ג/ד"ל'
          iconBgClass="bg-rose-100 dark:bg-rose-900/30"
          iconClass="text-rose-600 dark:text-rose-400"
        />
      </div>

      {/* Recent Activity */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2 justify-end">
            <span>פעילות ב-7 ימים אחרונים</span>
            <Clock className="w-5 h-5" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end justify-between gap-2 h-32">
            {recentActivity.map((day, index) => (
              <div key={index} className="flex flex-col items-center flex-1">
                <div
                  className="w-full bg-gradient-to-t from-violet-500 to-purple-400 rounded-t transition-all duration-500"
                  style={{
                    height: `${Math.max(day.count * 20, 4)}px`,
                    maxHeight: "80px",
                  }}
                />
                <span className="text-xs text-muted-foreground mt-2">{day.date}</span>
                <span className="text-xs font-bold">{day.count}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* By Context */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2 justify-end">
              <span>מדידות לפי הקשר</span>
              <Activity className="w-5 h-5" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(contextCounts).map(([context, count]) => (
                <div key={context} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold">{count}</span>
                    <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-violet-500 to-purple-400 rounded-full transition-all duration-500"
                        style={{
                          width: `${measurements.length ? (count / measurements.length) * 100 : 0}%`,
                        }}
                      />
                    </div>
                  </div>
                  <span className="text-sm">{contextLabels[context]}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* By Day of Week */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2 justify-end">
              <span>מדידות לפי יום בשבוע</span>
              <Calendar className="w-5 h-5" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {dayOfWeekCounts.map((item) => (
                <div key={item.day} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold">{item.count}</span>
                    <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
                        style={{
                          width: `${measurements.length ? (item.count / measurements.length) * 100 : 0}%`,
                        }}
                      />
                    </div>
                  </div>
                  <span className="text-sm">{item.day}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Extreme Values */}
      {stats && (stats.highest || stats.lowest) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {stats.highest && (
            <Card className="border-0 shadow-lg bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-950/30 dark:to-orange-950/30">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-red-100 dark:bg-red-900/50">
                    <TrendingUp className="w-6 h-6 text-red-600 dark:text-red-400" />
                  </div>
                  <div className="flex-1 text-right">
                    <p className="text-sm text-muted-foreground">הערך הגבוה ביותר</p>
                    <p className="text-3xl font-bold text-red-600 dark:text-red-400">
                      {stats.highest.value}
                      <span className="text-sm font-normal mr-1">מ"ג/ד"ל</span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDate(stats.highest.date)} | {stats.highest.time}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          {stats.lowest && (
            <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-blue-100 dark:bg-blue-900/50">
                    <TrendingUp className="w-6 h-6 text-blue-600 dark:text-blue-400 rotate-180" />
                  </div>
                  <div className="flex-1 text-right">
                    <p className="text-sm text-muted-foreground">הערך הנמוך ביותר</p>
                    <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                      {stats.lowest.value}
                      <span className="text-sm font-normal mr-1">מ"ג/ד"ל</span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDate(stats.lowest.date)} | {stats.lowest.time}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

// Data Management Tab
function DataManagementTab({
  storageInfo,
  importError,
  importSuccess,
  fileInputRef,
  onExport,
  onImport,
  onClearData,
  measurementCount,
}: {
  storageInfo: { used: string; items: number };
  importError: string | null;
  importSuccess: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onExport: () => void;
  onImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClearData: () => void;
  measurementCount: number;
}) {
  return (
    <div className="space-y-6">
      {/* Storage Overview */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2 justify-end">
            <span>סיכום אחסון</span>
            <HardDrive className="w-5 h-5" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-muted/50 rounded-xl">
              <p className="text-2xl font-bold text-primary">{storageInfo.used}</p>
              <p className="text-sm text-muted-foreground">נפח מנוצל</p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-xl">
              <p className="text-2xl font-bold text-primary">{storageInfo.items}</p>
              <p className="text-sm text-muted-foreground">פריטים מאוחסנים</p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-xl">
              <p className="text-2xl font-bold text-primary">{measurementCount}</p>
              <p className="text-sm text-muted-foreground">מדידות</p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-xl">
              <p className="text-2xl font-bold text-emerald-600">~5MB</p>
              <p className="text-sm text-muted-foreground">נפח זמין</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Export Section */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2 justify-end">
            <span>גיבוי נתונים</span>
            <Download className="w-5 h-5" />
          </CardTitle>
          <CardDescription className="text-right">
            הורד את כל הנתונים שלך כקובץ JSON לגיבוי
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={onExport} className="w-full sm:w-auto gap-2" size="lg">
            <Download className="w-5 h-5" />
            הורד קובץ גיבוי
          </Button>
          <p className="text-xs text-muted-foreground mt-3 text-right">
            הקובץ יכלול את כל המדידות, ההגדרות ותמונת הפרופיל
          </p>
        </CardContent>
      </Card>

      {/* Import Section */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2 justify-end">
            <span>שחזור מגיבוי</span>
            <Upload className="w-5 h-5" />
          </CardTitle>
          <CardDescription className="text-right">
            ייבא נתונים מקובץ גיבוי קודם
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="w-full sm:w-auto gap-2"
              size="lg"
            >
              <FileJson className="w-5 h-5" />
              בחר קובץ JSON
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={onImport}
              className="hidden"
            />
            {importError && (
              <div className="flex items-center gap-2 text-destructive text-right">
                <span className="text-sm">{importError}</span>
                <AlertTriangle className="w-4 h-4" />
              </div>
            )}
            {importSuccess && (
              <div className="flex items-center gap-2 text-emerald-600 text-right">
                <span className="text-sm font-medium">הנתונים יובאו בהצלחה!</span>
                <CheckCircle2 className="w-4 h-4" />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-destructive/30 border-2 shadow-lg">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2 justify-end text-destructive">
            <span>אזור מסוכן</span>
            <AlertTriangle className="w-5 h-5" />
          </CardTitle>
          <CardDescription className="text-right">
            פעולות אלו הן בלתי הפיכות. אנא גבה את הנתונים לפני ביצוען.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="destructive"
            onClick={onClearData}
            className="w-full sm:w-auto gap-2"
            size="lg"
          >
            <Trash2 className="w-5 h-5" />
            מחק את כל הנתונים
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// System Health Tab
function SystemHealthTab({
  isOnline,
  storageInfo,
  aiData,
  lastRefresh,
}: {
  isOnline: boolean;
  storageInfo: { used: string; items: number };
  aiData: AIGatewayData | null;
  lastRefresh: Date | null;
}) {
  const healthChecks = [
    {
      name: "חיבור לאינטרנט",
      status: isOnline ? "operational" : "down",
      icon: isOnline ? Wifi : WifiOff,
    },
    {
      name: "אחסון מקומי",
      status: "operational",
      icon: HardDrive,
    },
    {
      name: "AI Gateway",
      status: aiData?.status === "operational" ? "operational" : "degraded",
      icon: Cpu,
    },
    {
      name: "PWA Service Worker",
      status: "operational",
      icon: Shield,
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "operational":
        return "text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30";
      case "degraded":
        return "text-amber-600 bg-amber-100 dark:bg-amber-900/30";
      case "down":
        return "text-red-600 bg-red-100 dark:bg-red-900/30";
      default:
        return "text-gray-600 bg-gray-100 dark:bg-gray-800";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "operational":
        return "פעיל";
      case "degraded":
        return "מופחת";
      case "down":
        return "לא פעיל";
      default:
        return "לא ידוע";
    }
  };

  return (
    <div className="space-y-6">
      {/* Overall Status */}
      <Card className="border-0 shadow-lg bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
              <div>
                <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300">
                  המערכת פעילה
                </p>
                <p className="text-sm text-emerald-600 dark:text-emerald-400">
                  כל השירותים עובדים כמצופה
                </p>
              </div>
            </div>
            {lastRefresh && (
              <div className="text-right">
                <p className="text-xs text-muted-foreground">עדכון אחרון</p>
                <p className="text-sm font-medium">
                  {lastRefresh.toLocaleTimeString("he-IL")}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Health Checks */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2 justify-end">
            <span>בדיקות מערכת</span>
            <Activity className="w-5 h-5" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {healthChecks.map((check) => (
              <div
                key={check.name}
                className="flex items-center justify-between p-4 rounded-xl bg-muted/30"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                      check.status
                    )}`}
                  >
                    {getStatusLabel(check.status)}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-medium">{check.name}</span>
                  <check.icon className="w-5 h-5 text-muted-foreground" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Storage Details */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2 justify-end">
            <span>פרטי אחסון</span>
            <Database className="w-5 h-5" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-4 bg-muted/30 rounded-xl">
              <span className="font-bold">{storageInfo.used}</span>
              <span className="text-muted-foreground">נפח מנוצל</span>
            </div>
            <div className="flex justify-between items-center p-4 bg-muted/30 rounded-xl">
              <span className="font-bold">{storageInfo.items}</span>
              <span className="text-muted-foreground">פריטים מאוחסנים</span>
            </div>
            <div className="flex justify-between items-center p-4 bg-muted/30 rounded-xl">
              <span className="font-bold">~5MB</span>
              <span className="text-muted-foreground">מגבלת אחסון מקומי</span>
            </div>

            {/* Storage Usage Bar */}
            <div className="mt-4">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">~5MB</span>
                <span className="font-medium">{storageInfo.used}</span>
              </div>
              <div className="h-3 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-violet-500 to-purple-500 rounded-full transition-all duration-500"
                  style={{ width: "10%" }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-2 text-right">
                הנתונים נשמרים באחסון מקומי של הדפדפן
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* API Status */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2 justify-end">
            <span>סטטוס API</span>
            <Server className="w-5 h-5" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl">
              <span
                className={`px-3 py-1 rounded-full text-xs font-medium ${
                  aiData?.status === "operational"
                    ? "text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30"
                    : "text-amber-600 bg-amber-100 dark:bg-amber-900/30"
                }`}
              >
                {aiData?.status === "operational" ? "פעיל" : "לא מוגדר"}
              </span>
              <span className="font-medium">AI Gateway</span>
            </div>
            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl">
              <span className="font-bold">{aiData?.availableProviders?.length || 0}</span>
              <span className="text-muted-foreground">ספקי AI זמינים</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Settings Tab
function SettingsTab() {
  return (
    <div className="space-y-6">
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2 justify-end">
            <span>הגדרות מערכת</span>
            <Settings className="w-5 h-5" />
          </CardTitle>
          <CardDescription className="text-right">
            לגישה להגדרות המלאות, השתמש בכפתור ההגדרות בעמוד הראשי
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-6 rounded-xl bg-gradient-to-l from-teal-50 to-emerald-50 dark:from-teal-950/30 dark:to-emerald-950/30 border border-teal-100 dark:border-teal-800 text-right">
            <div className="flex items-center gap-3 justify-end mb-4">
              <h3 className="font-bold text-lg">הגדרות זמינות</h3>
              <Settings className="w-6 h-6 text-teal-600" />
            </div>
            <ul className="space-y-2 text-sm text-teal-700 dark:text-teal-300">
              <li className="flex items-center gap-2 justify-end">
                <span>פרטי פרופיל ותמונה</span>
                <CheckCircle2 className="w-4 h-4" />
              </li>
              <li className="flex items-center gap-2 justify-end">
                <span>טווחי סוכר מותאמים אישית</span>
                <CheckCircle2 className="w-4 h-4" />
              </li>
              <li className="flex items-center gap-2 justify-end">
                <span>הגדרות תצוגה ונושא</span>
                <CheckCircle2 className="w-4 h-4" />
              </li>
              <li className="flex items-center gap-2 justify-end">
                <span>הגדרות מדידה ויחידות</span>
                <CheckCircle2 className="w-4 h-4" />
              </li>
              <li className="flex items-center gap-2 justify-end">
                <span>תזכורות למדידות</span>
                <CheckCircle2 className="w-4 h-4" />
              </li>
            </ul>
          </div>

          <Link href="/" className="block">
            <Button className="w-full gap-2" size="lg">
              <Settings className="w-5 h-5" />
              עבור להגדרות מלאות
            </Button>
          </Link>

          <p className="text-xs text-muted-foreground text-center">
            לחץ על אייקון ההגדרות בעמוד הראשי לגישה להגדרות המלאות
          </p>
        </CardContent>
      </Card>

      {/* Quick Info */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2 justify-end">
            <span>אודות המערכת</span>
            <Heart className="w-5 h-5 text-red-500" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <InfoRow label="גרסה" value="1.0.0" />
            <InfoRow label="פיתוח" value="Yosef Elishar" />
            <InfoRow label="טכנולוגיה" value="Next.js + React" />
            <InfoRow label="סוג אפליקציה" value="PWA" />
            <InfoRow label="נגישות" value="WCAG 2.1" />
            <InfoRow label="שפה" value="Hebrew (RTL)" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============= Utility Components =============

function StatCard({
  icon: Icon,
  label,
  value,
  subtitle,
  iconBgClass,
  iconClass,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  subtitle?: string;
  iconBgClass: string;
  iconClass: string;
}) {
  return (
    <Card className="border-0 shadow-lg">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div className={`p-3 rounded-xl ${iconBgClass}`}>
            <Icon className={`w-6 h-6 ${iconClass}`} />
          </div>
          <div className="text-left">
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-2xl sm:text-3xl font-bold">{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 text-sm">
      <span className="text-muted-foreground">{value}</span>
      <span className="font-medium">{label}</span>
    </div>
  );
}

export default UnifiedAdminDashboard;
