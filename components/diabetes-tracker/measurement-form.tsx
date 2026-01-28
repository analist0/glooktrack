"use client";

import React from "react";
import { useState, useCallback } from "react";
import { Plus, Sparkles, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { VoiceInput } from "./voice-input";
import type { MeasurementContext, BloodSugarMeasurement } from "@/lib/diabetes-types";
import { CONTEXT_LABELS, getBloodSugarStatus } from "@/lib/diabetes-types";
import { generateId } from "@/lib/diabetes-storage";

interface MeasurementFormProps {
  onSave: (measurement: BloodSugarMeasurement) => void;
}

export function MeasurementForm({ onSave }: MeasurementFormProps) {
  const now = new Date();
  const todayDate = now.toISOString().split("T")[0];
  const currentTime = now.toTimeString().slice(0, 5);

  const [date, setDate] = useState(todayDate);
  const [time, setTime] = useState(currentTime);
  const [value, setValue] = useState("");
  const [context, setContext] = useState<MeasurementContext | "">("");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showSuccess, setShowSuccess] = useState(false);

  const numValue = Number(value);
  const currentStatus = value && !Number.isNaN(numValue) && numValue >= 20 && numValue <= 600 
    ? getBloodSugarStatus(numValue) 
    : null;

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!date) {
      newErrors.date = "נדרש תאריך";
    }

    if (!time) {
      newErrors.time = "נדרשת שעה";
    }

    if (!value || Number.isNaN(numValue)) {
      newErrors.value = "אנא הזן מספר תקין";
    } else if (numValue < 20 || numValue > 600) {
      newErrors.value = "הערך חייב להיות בין 20-600";
    }

    if (!context) {
      newErrors.context = "אנא בחר את הקשר המדידה";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    const measurement: BloodSugarMeasurement = {
      id: generateId(),
      date,
      time,
      value: Number(value),
      context: context as MeasurementContext,
      notes: notes.trim() || undefined,
      createdAt: Date.now(),
    };

    onSave(measurement);

    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 2500);

    setValue("");
    setContext("");
    setNotes("");
    setErrors({});
    const newNow = new Date();
    setTime(newNow.toTimeString().slice(0, 5));
  };

  const handleVoiceData = useCallback((data: {
    value?: number;
    time?: string;
    context?: MeasurementContext;
    notes?: string;
  }) => {
    if (data.value) setValue(data.value.toString());
    if (data.time) setTime(data.time);
    if (data.context) setContext(data.context);
    if (data.notes) setNotes(data.notes);
  }, []);

  return (
    <Card className="overflow-hidden border-0 shadow-xl bg-gradient-to-br from-card to-card/80">
      <CardHeader className="bg-gradient-to-l from-teal-500/10 to-transparent pb-3 sm:pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-500 shadow-lg shadow-teal-500/20">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div className="text-right flex-1">
            <CardTitle className="text-xl sm:text-2xl">רישום מדידה חדשה</CardTitle>
            <CardDescription className="text-sm">
              תעד את רמת הסוכר בדם שלך
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-2 px-3 sm:px-6">
        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
          {/* קלט קולי */}
          <VoiceInput onVoiceData={handleVoiceData} />

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-dashed" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-3 text-muted-foreground font-medium">
                או הזן ידנית
              </span>
            </div>
          </div>

          {/* ערך סוכר בדם - שדה ראשי וגדול */}
          <div className="space-y-2 text-right">
            <Label htmlFor="value" className="text-base font-semibold flex items-center gap-2 justify-end">
              רמת סוכר בדם
              <span className="text-xs text-muted-foreground font-normal">(מ"ג/ד"ל)</span>
            </Label>
            <div className="relative">
              <Input
                id="value"
                type="number"
                inputMode="numeric"
                placeholder="הזן ערך"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className={`h-20 sm:h-24 text-4xl sm:text-5xl font-bold text-center rounded-2xl transition-all ${
                  currentStatus 
                    ? `${currentStatus.bgColor} ${currentStatus.color} border-2 ${currentStatus.color.replace('text-', 'border-')}`
                    : "bg-muted/30"
                }`}
                min="20"
                max="600"
                aria-invalid={!!errors.value}
                aria-describedby="value-hint"
              />
              {currentStatus && (
                <div className={`absolute top-2 start-2 px-2.5 py-1 rounded-full text-xs font-semibold ${currentStatus.bgColor} ${currentStatus.color}`}>
                  {currentStatus.label}
                </div>
              )}
            </div>
            <p id="value-hint" className="text-xs text-muted-foreground">
              טווח תקין: 70-180 מ"ג/ד"ל
            </p>
            {errors.value && (
              <p className="text-sm text-destructive font-medium">{errors.value}</p>
            )}
          </div>

          {/* שורת תאריך ושעה */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2 text-right">
              <Label htmlFor="date" className="text-sm font-semibold">
                תאריך
              </Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="h-12 sm:h-14 text-base sm:text-lg text-center rounded-xl"
                aria-invalid={!!errors.date}
              />
              {errors.date && (
                <p className="text-sm text-destructive">{errors.date}</p>
              )}
            </div>

            <div className="space-y-2 text-right">
              <Label htmlFor="time" className="text-sm font-semibold">
                שעה
              </Label>
              <Input
                id="time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="h-12 sm:h-14 text-base sm:text-lg text-center rounded-xl"
                aria-invalid={!!errors.time}
              />
              {errors.time && (
                <p className="text-sm text-destructive">{errors.time}</p>
              )}
            </div>
          </div>

          {/* הקשר המדידה */}
          <div className="space-y-2 text-right">
            <Label htmlFor="context" className="text-sm font-semibold block">
              הקשר המדידה
            </Label>
            <Select
              value={context}
              onValueChange={(val) => setContext(val as MeasurementContext)}
            >
              <SelectTrigger
                id="context"
                className="h-12 sm:h-14 text-base sm:text-lg w-full rounded-xl [&>span]:text-right [&>span]:w-full [&>span]:block"
                aria-invalid={!!errors.context}
                dir="rtl"
              >
                <SelectValue placeholder="בחר מתי מדדת" className="text-right" />
              </SelectTrigger>
              <SelectContent align="end" dir="rtl" className="text-right">
                {(Object.entries(CONTEXT_LABELS) as [MeasurementContext, string][]).map(
                  ([key, label]) => (
                    <SelectItem key={key} value={key} className="text-base py-3 text-right justify-end">
                      {label}
                    </SelectItem>
                  )
                )}
              </SelectContent>
            </Select>
            {errors.context && (
              <p className="text-sm text-destructive">{errors.context}</p>
            )}
          </div>

          {/* הערות */}
          <div className="space-y-2 text-right">
            <Label htmlFor="notes" className="text-sm font-semibold">
              הערות{" "}
              <span className="text-muted-foreground font-normal">
                (אופציונלי)
              </span>
            </Label>
            <Textarea
              id="notes"
              placeholder="הערות נוספות..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-16 sm:min-h-20 text-base resize-none text-right rounded-xl"
              rows={2}
            />
          </div>

          {/* כפתור שמירה */}
          <Button
            type="submit"
            size="lg"
            className={`group w-full h-14 sm:h-16 text-lg sm:text-xl font-bold rounded-xl transition-all duration-300 ${
              showSuccess
                ? "bg-emerald-500 hover:bg-emerald-600 shadow-lg shadow-emerald-500/30 scale-[1.02]"
                : "bg-gradient-to-l from-teal-600 to-teal-500 hover:from-teal-700 hover:to-teal-600 shadow-lg shadow-teal-500/30 hover:shadow-xl hover:shadow-teal-500/40 hover:-translate-y-0.5"
            } text-white`}
          >
            {showSuccess ? (
              <span className="flex items-center gap-2 animate-success-pop">
                <CheckCircle2 className="w-6 h-6 animate-checkmark" />
                נשמר בהצלחה!
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Plus className="w-6 h-6 transition-transform duration-200 group-hover:rotate-90" />
                שמור מדידה
              </span>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
