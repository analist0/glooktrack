"use client";

import { useMemo } from "react";
import {
  Brain,
  TrendingUp,
  TrendingDown,
  Minus,
  Sun,
  Moon,
  Utensils,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Target,
  Sparkles,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { BloodSugarMeasurement } from "@/lib/diabetes-types";

interface InsightsCardProps {
  measurements: BloodSugarMeasurement[];
}

interface Insight {
  id: string;
  type: "success" | "warning" | "info" | "trend";
  icon: React.ElementType;
  title: string;
  description: string;
  priority: number; // Higher = more important
}

function analyzeInsights(measurements: BloodSugarMeasurement[]): Insight[] {
  const insights: Insight[] = [];

  if (measurements.length < 3) {
    return [{
      id: "need-more-data",
      type: "info",
      icon: Sparkles,
      title: "התחל לעקוב",
      description: "הוסף לפחות 3 מדידות כדי לקבל תובנות חכמות על רמות הסוכר שלך.",
      priority: 0,
    }];
  }

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const weekAgoStr = weekAgo.toISOString().split("T")[0];

  // Get last 7 days measurements
  const recentMeasurements = measurements.filter(m => m.date >= weekAgoStr);
  const olderMeasurements = measurements.filter(m => m.date < weekAgoStr);

  // 1. Trend Analysis (7 days)
  if (recentMeasurements.length >= 3) {
    const recentAvg = recentMeasurements.reduce((sum, m) => sum + m.value, 0) / recentMeasurements.length;

    if (olderMeasurements.length >= 3) {
      const olderAvg = olderMeasurements.slice(0, 7).reduce((sum, m) => sum + m.value, 0) / Math.min(olderMeasurements.length, 7);
      const diff = recentAvg - olderAvg;
      const percentChange = Math.abs(diff / olderAvg * 100);

      if (percentChange >= 10) {
        if (diff > 0) {
          insights.push({
            id: "trend-up",
            type: "warning",
            icon: TrendingUp,
            title: "מגמת עלייה",
            description: `הממוצע עלה ב-${Math.round(percentChange)}% בשבוע האחרון (מ-${Math.round(olderAvg)} ל-${Math.round(recentAvg)}).`,
            priority: 9,
          });
        } else {
          insights.push({
            id: "trend-down",
            type: "success",
            icon: TrendingDown,
            title: "מגמת ירידה",
            description: `הממוצע ירד ב-${Math.round(percentChange)}% בשבוע האחרון (מ-${Math.round(olderAvg)} ל-${Math.round(recentAvg)}).`,
            priority: 8,
          });
        }
      } else {
        insights.push({
          id: "trend-stable",
          type: "success",
          icon: Minus,
          title: "רמות יציבות",
          description: `הממוצע נשאר יציב בשבוע האחרון (${Math.round(recentAvg)} מ"ג/ד"ל).`,
          priority: 5,
        });
      }
    }
  }

  // 2. Time of Day Analysis
  const morningMeasurements = measurements.filter(m => {
    const hour = parseInt(m.time.split(":")[0]);
    return hour >= 5 && hour < 12;
  });

  const eveningMeasurements = measurements.filter(m => {
    const hour = parseInt(m.time.split(":")[0]);
    return hour >= 18 && hour <= 23;
  });

  if (morningMeasurements.length >= 2 && eveningMeasurements.length >= 2) {
    const morningAvg = morningMeasurements.reduce((sum, m) => sum + m.value, 0) / morningMeasurements.length;
    const eveningAvg = eveningMeasurements.reduce((sum, m) => sum + m.value, 0) / eveningMeasurements.length;
    const diff = eveningAvg - morningAvg;

    if (Math.abs(diff) >= 20) {
      if (diff > 0) {
        insights.push({
          id: "evening-higher",
          type: "info",
          icon: Moon,
          title: "ערב גבוה מבוקר",
          description: `ממוצע הערב (${Math.round(eveningAvg)}) גבוה ב-${Math.round(diff)} מ"ג/ד"ל מממוצע הבוקר (${Math.round(morningAvg)}).`,
          priority: 7,
        });
      } else {
        insights.push({
          id: "morning-higher",
          type: "info",
          icon: Sun,
          title: "בוקר גבוה מערב",
          description: `ממוצע הבוקר (${Math.round(morningAvg)}) גבוה ב-${Math.round(Math.abs(diff))} מ"ג/ד"ל מממוצע הערב (${Math.round(eveningAvg)}).`,
          priority: 7,
        });
      }
    }
  }

  // 3. Context Analysis (Before/After Meal)
  const beforeMeal = measurements.filter(m => m.context === "before-meal");
  const afterMeal = measurements.filter(m => m.context === "after-meal");

  if (beforeMeal.length >= 2 && afterMeal.length >= 2) {
    const beforeAvg = beforeMeal.reduce((sum, m) => sum + m.value, 0) / beforeMeal.length;
    const afterAvg = afterMeal.reduce((sum, m) => sum + m.value, 0) / afterMeal.length;
    const spike = afterAvg - beforeAvg;

    if (spike > 50) {
      insights.push({
        id: "meal-spike",
        type: "warning",
        icon: Utensils,
        title: "עלייה גבוהה אחרי אוכל",
        description: `הסוכר עולה בממוצע ב-${Math.round(spike)} מ"ג/ד"ל אחרי ארוחות. שקול להתייעץ עם הרופא.`,
        priority: 8,
      });
    } else if (spike > 30) {
      insights.push({
        id: "meal-moderate",
        type: "info",
        icon: Utensils,
        title: "עלייה מתונה אחרי אוכל",
        description: `הסוכר עולה בממוצע ב-${Math.round(spike)} מ"ג/ד"ל אחרי ארוחות.`,
        priority: 5,
      });
    }
  }

  // 4. Distribution Analysis
  const inRange = measurements.filter(m => m.value >= 70 && m.value <= 180);
  const low = measurements.filter(m => m.value < 70);
  const high = measurements.filter(m => m.value > 180);

  const inRangePercent = Math.round((inRange.length / measurements.length) * 100);
  const lowPercent = Math.round((low.length / measurements.length) * 100);
  const highPercent = Math.round((high.length / measurements.length) * 100);

  if (inRangePercent >= 70) {
    insights.push({
      id: "great-control",
      type: "success",
      icon: Target,
      title: "שליטה מצוינת!",
      description: `${inRangePercent}% מהמדידות בטווח התקין. המשך כך!`,
      priority: 10,
    });
  } else if (inRangePercent >= 50) {
    insights.push({
      id: "good-control",
      type: "info",
      icon: Target,
      title: "שליטה טובה",
      description: `${inRangePercent}% מהמדידות בטווח התקין.`,
      priority: 6,
    });
  }

  if (lowPercent >= 15) {
    insights.push({
      id: "too-many-lows",
      type: "warning",
      icon: AlertTriangle,
      title: "ערכים נמוכים תכופים",
      description: `${lowPercent}% מהמדידות מתחת ל-70 מ"ג/ד"ל. שים לב לתסמיני היפוגליקמיה.`,
      priority: 10,
    });
  }

  if (highPercent >= 40) {
    insights.push({
      id: "too-many-highs",
      type: "warning",
      icon: AlertTriangle,
      title: "ערכים גבוהים תכופים",
      description: `${highPercent}% מהמדידות מעל 180 מ"ג/ד"ל. כדאי להתייעץ עם הרופא.`,
      priority: 9,
    });
  }

  // 5. Fasting Analysis
  const fasting = measurements.filter(m => m.context === "fasting");
  if (fasting.length >= 3) {
    const fastingAvg = fasting.reduce((sum, m) => sum + m.value, 0) / fasting.length;

    if (fastingAvg <= 100) {
      insights.push({
        id: "fasting-great",
        type: "success",
        icon: Sun,
        title: "סוכר צום מצוין",
        description: `ממוצע סוכר הצום שלך (${Math.round(fastingAvg)} מ"ג/ד"ל) בטווח האידיאלי.`,
        priority: 7,
      });
    } else if (fastingAvg > 126) {
      insights.push({
        id: "fasting-high",
        type: "warning",
        icon: Sun,
        title: "סוכר צום גבוה",
        description: `ממוצע סוכר הצום שלך (${Math.round(fastingAvg)} מ"ג/ד"ל) גבוה מהמומלץ.`,
        priority: 8,
      });
    }
  }

  // 6. Measurement Consistency
  const uniqueDays = new Set(measurements.map(m => m.date)).size;
  const daysSinceFirst = Math.ceil((now.getTime() - new Date(measurements[measurements.length - 1].date).getTime()) / (24 * 60 * 60 * 1000)) + 1;
  const measurementRate = uniqueDays / daysSinceFirst;

  if (measurementRate >= 0.8) {
    insights.push({
      id: "consistent",
      type: "success",
      icon: CheckCircle2,
      title: "מעקב עקבי",
      description: `מדדת ב-${uniqueDays} ימים. עקביות במעקב עוזרת לזהות דפוסים!`,
      priority: 4,
    });
  } else if (measurementRate < 0.5 && measurements.length >= 5) {
    insights.push({
      id: "inconsistent",
      type: "info",
      icon: Clock,
      title: "שפר את העקביות",
      description: "נסה למדוד באופן קבוע יותר לתובנות מדויקות יותר.",
      priority: 3,
    });
  }

  // Sort by priority (highest first)
  return insights.sort((a, b) => b.priority - a.priority).slice(0, 4);
}

const insightColors = {
  success: {
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
    border: "border-emerald-200 dark:border-emerald-800",
    icon: "text-emerald-600 dark:text-emerald-400",
    iconBg: "bg-emerald-100 dark:bg-emerald-900/50",
  },
  warning: {
    bg: "bg-amber-50 dark:bg-amber-950/30",
    border: "border-amber-200 dark:border-amber-800",
    icon: "text-amber-600 dark:text-amber-400",
    iconBg: "bg-amber-100 dark:bg-amber-900/50",
  },
  info: {
    bg: "bg-blue-50 dark:bg-blue-950/30",
    border: "border-blue-200 dark:border-blue-800",
    icon: "text-blue-600 dark:text-blue-400",
    iconBg: "bg-blue-100 dark:bg-blue-900/50",
  },
  trend: {
    bg: "bg-purple-50 dark:bg-purple-950/30",
    border: "border-purple-200 dark:border-purple-800",
    icon: "text-purple-600 dark:text-purple-400",
    iconBg: "bg-purple-100 dark:bg-purple-900/50",
  },
};

export function InsightsCard({ measurements }: InsightsCardProps) {
  const insights = useMemo(() => analyzeInsights(measurements), [measurements]);

  return (
    <Card className="overflow-hidden border-0 shadow-xl bg-gradient-to-br from-card to-card/80">
      <CardHeader className="bg-gradient-to-l from-purple-500/10 to-transparent pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-purple-500/10 dark:bg-purple-500/20">
            <Brain className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div className="text-right">
            <CardTitle className="text-xl">תובנות חכמות</CardTitle>
            <CardDescription>
              ניתוח אוטומטי של דפוסי הסוכר שלך
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {insights.map((insight) => {
          const colors = insightColors[insight.type];
          const Icon = insight.icon;

          return (
            <div
              key={insight.id}
              className={`flex items-start gap-3 p-3 sm:p-4 rounded-xl border transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 ${colors.bg} ${colors.border}`}
            >
              <div className={`p-2 rounded-lg flex-shrink-0 ${colors.iconBg}`}>
                <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${colors.icon}`} />
              </div>
              <div className="flex-1 min-w-0 text-right">
                <h4 className="font-semibold text-sm sm:text-base text-foreground">
                  {insight.title}
                </h4>
                <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 leading-relaxed">
                  {insight.description}
                </p>
              </div>
            </div>
          );
        })}

        {/* Disclaimer */}
        <p className="text-[10px] sm:text-xs text-muted-foreground text-center pt-2 border-t">
          התובנות מבוססות על הנתונים שהזנת ואינן מהוות ייעוץ רפואי
        </p>
      </CardContent>
    </Card>
  );
}
