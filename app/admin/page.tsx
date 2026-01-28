"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Activity,
  Cpu,
  DollarSign,
  Hash,
  RefreshCw,
  Server,
  TrendingUp,
  Zap,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

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

interface DashboardData {
  ok: boolean;
  availableProviders: string[];
  status: string;
  stats?: {
    global: AIStats;
    today: AIStats | null;
    providers: Record<string, ProviderStats>;
  };
}

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

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/ai?stats=true");
      const result = await response.json();
      setData(result);
      setLastRefresh(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const formatCost = (cost: number) => {
    if (cost < 0.01) return `$${(cost * 100).toFixed(2)}¢`;
    return `$${cost.toFixed(4)}`;
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatTime = (timestamp: number) => {
    if (!timestamp) return "לא זמין";
    return new Date(timestamp).toLocaleString("he-IL");
  };

  if (loading && !data) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex items-center justify-center">
        <div className="flex items-center gap-3">
          <RefreshCw className="w-6 h-6 animate-spin text-primary" />
          <span className="text-lg">טוען נתונים...</span>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <p className="text-destructive">{error}</p>
            <Button onClick={fetchData} className="mt-4">
              נסה שוב
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const stats = data?.stats;
  const globalStats = stats?.global;
  const todayStats = stats?.today;
  const providerStats = stats?.providers;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30" dir="rtl">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-gradient-to-l from-violet-600 to-purple-500 text-white shadow-lg">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="p-2 rounded-lg hover:bg-white/10 transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="p-2 rounded-xl bg-white/10">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold">AI Gateway Dashboard</h1>
              <p className="text-sm text-white/70">ניהול ומעקב שימוש</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-white/70">
              {lastRefresh && `עדכון: ${lastRefresh.toLocaleTimeString("he-IL")}`}
            </span>
            <Button
              variant="secondary"
              size="sm"
              onClick={fetchData}
              disabled={loading}
              className="gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              רענן
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Status Banner */}
        <div
          className={`mb-6 p-4 rounded-xl flex items-center justify-between ${
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
          <div className="flex gap-2">
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="border-0 shadow-lg">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="p-3 rounded-xl bg-blue-100 dark:bg-blue-900/30">
                  <Hash className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="text-left">
                  <p className="text-sm text-muted-foreground">סה"כ קריאות</p>
                  <p className="text-3xl font-bold">
                    {formatNumber(globalStats?.totalCalls || 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="p-3 rounded-xl bg-purple-100 dark:bg-purple-900/30">
                  <Zap className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="text-left">
                  <p className="text-sm text-muted-foreground">סה"כ טוקנים</p>
                  <p className="text-3xl font-bold">
                    {formatNumber(globalStats?.totalTokens || 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="p-3 rounded-xl bg-emerald-100 dark:bg-emerald-900/30">
                  <DollarSign className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="text-left">
                  <p className="text-sm text-muted-foreground">עלות כוללת</p>
                  <p className="text-3xl font-bold">
                    {formatCost(globalStats?.totalCostUSD || 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="p-3 rounded-xl bg-amber-100 dark:bg-amber-900/30">
                  <TrendingUp className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="text-left">
                  <p className="text-sm text-muted-foreground">קריאות היום</p>
                  <p className="text-3xl font-bold">
                    {formatNumber(todayStats?.totalCalls || 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Provider Cards */}
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Server className="w-5 h-5" />
          ספקי AI
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
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
                      <CardTitle className="text-lg">
                        {PROVIDER_NAMES[provider]}
                      </CardTitle>
                    </div>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        isAvailable
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                          : "bg-gray-100 text-gray-500 dark:bg-gray-800"
                      }`}
                    >
                      {isAvailable ? "פעיל" : "לא מוגדר"}
                    </span>
                  </div>
                  <CardDescription>
                    {pStats?.available || 0} מתוך {pStats?.total || 0} מפתחות זמינים
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-muted/50 rounded-lg">
                      <p className="text-2xl font-bold text-primary">
                        {formatNumber(pStats?.totalCalls || 0)}
                      </p>
                      <p className="text-xs text-muted-foreground">קריאות</p>
                    </div>
                    <div className="text-center p-3 bg-muted/50 rounded-lg">
                      <p className="text-2xl font-bold text-primary">
                        {formatNumber(pStats?.totalTokens || 0)}
                      </p>
                      <p className="text-xs text-muted-foreground">טוקנים</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Today vs All Time */}
        {todayStats && (
          <>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Cpu className="w-5 h-5" />
              היום לעומת כל הזמנים
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="text-lg">היום</CardTitle>
                  <CardDescription>
                    עדכון אחרון: {formatTime(todayStats.lastUpdated)}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">קריאות</span>
                      <span className="font-bold text-xl">
                        {formatNumber(todayStats.totalCalls)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">טוקנים</span>
                      <span className="font-bold text-xl">
                        {formatNumber(todayStats.totalTokens)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">עלות</span>
                      <span className="font-bold text-xl text-emerald-600">
                        {formatCost(todayStats.totalCostUSD)}
                      </span>
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
                      <span className="text-muted-foreground">קריאות</span>
                      <span className="font-bold text-xl">
                        {formatNumber(globalStats?.totalCalls || 0)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">טוקנים</span>
                      <span className="font-bold text-xl">
                        {formatNumber(globalStats?.totalTokens || 0)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">עלות</span>
                      <span className="font-bold text-xl text-emerald-600">
                        {formatCost(globalStats?.totalCostUSD || 0)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground">
          <p>GlucoTrack AI Gateway Dashboard</p>
          <p className="mt-1">נתונים מתעדכנים אוטומטית כל 30 שניות</p>
        </div>
      </main>
    </div>
  );
}
