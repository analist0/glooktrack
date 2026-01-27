"use client";

import React from "react";
import {
  TrendingDown,
  TrendingUp,
  CalendarDays,
  Calendar,
  CalendarRange,
  BarChart3,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { MeasurementStats } from "@/lib/diabetes-types";
import { getBloodSugarStatus } from "@/lib/diabetes-types";
import { formatDate, formatTime } from "@/lib/diabetes-storage";

interface StatisticsCardProps {
  stats: MeasurementStats;
}

function StatBox({
  label,
  value,
  unit,
  icon: Icon,
}: {
  label: string;
  value: number | null;
  unit?: string;
  icon: React.ElementType;
}) {
  const status = value !== null ? getBloodSugarStatus(value) : null;

  return (
    <div className="flex flex-col items-center p-3 sm:p-4 rounded-xl bg-gradient-to-b from-muted/50 to-muted/30 text-center">
      <div className="flex items-center gap-2 text-muted-foreground mb-2">
        <Icon className="w-4 h-4" />
        <span className="text-xs font-semibold uppercase tracking-wide">
          {label}
        </span>
      </div>
      {value !== null ? (
        <>
          <div className={`text-2xl sm:text-3xl font-bold tabular-nums ${status?.color}`}>
            {value}
          </div>
          {unit && (
            <div className="text-xs text-muted-foreground mt-0.5">{unit}</div>
          )}
        </>
      ) : (
        <div className="text-xl text-muted-foreground font-medium">--</div>
      )}
    </div>
  );
}

function ExtremeStat({
  label,
  measurement,
  icon: Icon,
  iconColor,
  bgColor,
}: {
  label: string;
  measurement: { value: number; date: string; time: string } | null;
  icon: React.ElementType;
  iconColor: string;
  bgColor: string;
}) {
  const status = measurement ? getBloodSugarStatus(measurement.value) : null;

  return (
    <div className={`flex items-center gap-3 p-3 sm:p-4 rounded-xl ${bgColor} text-right`}>
      <div className={`p-2.5 rounded-full ${iconColor}`}>
        <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          {label}
        </div>
        {measurement ? (
          <div className="flex items-baseline gap-2 flex-wrap mt-1">
            <span className={`text-xl sm:text-2xl font-bold tabular-nums ${status?.color}`}>
              {measurement.value}
            </span>
            <span className="text-xs text-muted-foreground">מ&quot;ג/ד&quot;ל</span>
            <span className="text-xs text-muted-foreground me-auto">
              {formatDate(measurement.date)} • {formatTime(measurement.time)}
            </span>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground mt-1">אין נתונים</div>
        )}
      </div>
    </div>
  );
}

export function StatisticsCard({ stats }: StatisticsCardProps) {
  return (
    <Card className="overflow-hidden border-0 shadow-xl bg-gradient-to-br from-card to-card/80">
      <CardHeader className="bg-gradient-to-l from-emerald-500/10 to-transparent pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20">
            <BarChart3 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-right">
            <CardTitle className="text-xl">סטטיסטיקות</CardTitle>
            <CardDescription>
              {stats.totalCount === 0
                ? "הוסף מדידות כדי לראות את הסטטיסטיקות שלך"
                : `מבוסס על ${stats.totalCount} מדידות`}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 sm:space-y-6">
        {/* ממוצעים */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <StatBox
            label="היום"
            value={stats.todayAverage}
            unit="מ״ג/ד״ל"
            icon={CalendarDays}
          />
          <StatBox
            label="7 ימים"
            value={stats.weekAverage}
            unit="מ״ג/ד״ל"
            icon={Calendar}
          />
          <StatBox
            label="30 ימים"
            value={stats.monthAverage}
            unit="מ״ג/ד״ל"
            icon={CalendarRange}
          />
        </div>

        {/* הגבוה והנמוך ביותר */}
        <div className="space-y-2 sm:space-y-3">
          <ExtremeStat
            label="הגבוה ביותר"
            measurement={stats.highest}
            icon={TrendingUp}
            iconColor="bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-400"
            bgColor="bg-red-50/50 dark:bg-red-950/30"
          />
          <ExtremeStat
            label="הנמוך ביותר"
            measurement={stats.lowest}
            icon={TrendingDown}
            iconColor="bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400"
            bgColor="bg-blue-50/50 dark:bg-blue-950/30"
          />
        </div>
      </CardContent>
    </Card>
  );
}
