"use client";

import { useState } from "react";
import { Trash2, Calendar, Clock, Filter, History, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "./empty-state";
import type { BloodSugarMeasurement } from "@/lib/diabetes-types";
import { CONTEXT_LABELS, getBloodSugarStatus } from "@/lib/diabetes-types";
import { formatDate, formatTime } from "@/lib/diabetes-storage";

interface MeasurementsListProps {
  measurements: BloodSugarMeasurement[];
  onDelete: (id: string) => void;
  onClearAll: () => void;
}

type DateFilter = "all" | "today" | "week" | "month";

const DATE_FILTER_LABELS: Record<DateFilter, string> = {
  all: "כל הזמן",
  today: "היום",
  week: "7 ימים אחרונים",
  month: "30 ימים אחרונים",
};

export function MeasurementsList({
  measurements,
  onDelete,
  onClearAll,
}: MeasurementsListProps) {
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");

  const filteredMeasurements = measurements.filter((m) => {
    if (dateFilter === "all") return true;

    const now = new Date();
    const measurementDate = new Date(m.date);

    if (dateFilter === "today") {
      return m.date === now.toISOString().split("T")[0];
    }

    if (dateFilter === "week") {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return measurementDate >= weekAgo;
    }

    if (dateFilter === "month") {
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      return measurementDate >= monthAgo;
    }

    return true;
  });

  return (
    <Card className="overflow-hidden border-0 shadow-xl bg-gradient-to-br from-card to-card/80">
      <CardHeader className="bg-gradient-to-l from-blue-500/10 to-transparent pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-500/10">
              <History className="w-5 h-5 text-blue-600" />
            </div>
            <div className="text-right">
              <CardTitle className="text-xl">היסטוריית מדידות</CardTitle>
              <CardDescription>
                {measurements.length === 0
                  ? "עדיין לא נרשמו מדידות"
                  : `${filteredMeasurements.length} מתוך ${measurements.length} מדידות`}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Select
              value={dateFilter}
              onValueChange={(val) => setDateFilter(val as DateFilter)}
            >
              <SelectTrigger className="w-36 sm:w-40 h-10 text-right">
                <Filter className="w-4 h-4 ms-2 flex-shrink-0" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.entries(DATE_FILTER_LABELS) as [DateFilter, string][]).map(
                  ([key, label]) => (
                    <SelectItem key={key} value={key} className="text-right">
                      {label}
                    </SelectItem>
                  )
                )}
              </SelectContent>
            </Select>

            {measurements.length > 0 && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10 bg-transparent h-10"
                  >
                    <Trash2 className="w-4 h-4 ms-1" />
                    <span className="hidden sm:inline">מחק הכל</span>
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="text-right">
                  <AlertDialogHeader>
                    <div className="flex items-center gap-3 justify-end">
                      <AlertDialogTitle>למחוק את כל המדידות?</AlertDialogTitle>
                      <div className="p-2 rounded-full bg-destructive/10">
                        <AlertTriangle className="w-5 h-5 text-destructive" />
                      </div>
                    </div>
                    <AlertDialogDescription className="text-right">
                      פעולה זו תמחק לצמיתות את כל {measurements.length}{" "}
                      המדידות מהמכשיר הזה. לא ניתן לבטל פעולה זו.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter className="flex-row gap-2 sm:justify-start">
                    <AlertDialogAction
                      onClick={onClearAll}
                      className="bg-destructive text-white hover:bg-destructive/90"
                    >
                      מחק הכל
                    </AlertDialogAction>
                    <AlertDialogCancel>ביטול</AlertDialogCancel>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {filteredMeasurements.length === 0 ? (
          <EmptyState
            title={
              measurements.length === 0
                ? "עדיין אין מדידות"
                : "לא נמצאו מדידות"
            }
            description={
              measurements.length === 0
                ? "התחל לעקוב אחר רמת הסוכר שלך על ידי הוספת המדידה הראשונה למעלה."
                : "אין מדידות שתואמות למסנן הנוכחי. נסה להתאים את טווח התאריכים."
            }
          />
        ) : (
          <div className="space-y-2 sm:space-y-3">
            {filteredMeasurements.map((measurement) => {
              const status = getBloodSugarStatus(measurement.value);
              return (
                <div
                  key={measurement.id}
                  className={`flex items-center justify-between p-3 sm:p-4 rounded-xl border-2 transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 hover:scale-[1.01] ${status.bgColor} border-transparent`}
                >
                  <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                    {/* ערך סוכר בדם */}
                    <div className="flex-shrink-0 text-center">
                      <div
                        className={`text-2xl sm:text-3xl font-bold tabular-nums ${status.color}`}
                      >
                        {measurement.value}
                      </div>
                      <div className="text-[10px] sm:text-xs text-muted-foreground">מ&quot;ג/ד&quot;ל</div>
                    </div>

                    {/* קו מפריד */}
                    <div className={`w-1 h-12 rounded-full ${status.color.replace('text-', 'bg-')}`} />

                    {/* פרטים */}
                    <div className="flex-1 min-w-0 text-right">
                      <div className="flex flex-wrap items-center gap-x-2 sm:gap-x-3 gap-y-1 text-xs sm:text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                          {formatDate(measurement.date)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                          {formatTime(measurement.time)}
                        </span>
                      </div>
                      <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${status.bgColor} ${status.color}`}>
                          {CONTEXT_LABELS[measurement.context]}
                        </span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${status.bgColor} ${status.color} opacity-75`}>
                          {status.label}
                        </span>
                      </div>
                      {measurement.notes && (
                        <p className="text-xs sm:text-sm text-muted-foreground mt-1.5 truncate">
                          {measurement.notes}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* כפתור מחיקה */}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="flex-shrink-0 w-9 h-9 sm:w-10 sm:h-10 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full"
                        aria-label="מחק מדידה"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="text-right">
                      <AlertDialogHeader>
                        <AlertDialogTitle>למחוק מדידה?</AlertDialogTitle>
                        <AlertDialogDescription className="text-right">
                          פעולה זו תמחק לצמיתות את קריאת הסוכר בדם הזו
                          ({measurement.value} מ&quot;ג/ד&quot;ל מתאריך{" "}
                          {formatDate(measurement.date)}). לא ניתן לבטל פעולה זו.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter className="flex-row gap-2 sm:justify-start">
                        <AlertDialogAction
                          onClick={() => onDelete(measurement.id)}
                          className="bg-destructive text-white hover:bg-destructive/90"
                        >
                          מחק
                        </AlertDialogAction>
                        <AlertDialogCancel>ביטול</AlertDialogCancel>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
