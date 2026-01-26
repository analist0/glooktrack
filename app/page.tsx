"use client";

import { useState, useEffect, useCallback, memo } from "react";
import { Header } from "@/components/diabetes-tracker/header";
import { MeasurementForm } from "@/components/diabetes-tracker/measurement-form";
import { MeasurementsList } from "@/components/diabetes-tracker/measurements-list";
import { StatisticsCard } from "@/components/diabetes-tracker/statistics-card";
import { TrendsChart } from "@/components/diabetes-tracker/trends-chart";
import { ReportExport } from "@/components/diabetes-tracker/report-export";
import { PWAInstaller } from "@/components/diabetes-tracker/pwa-installer";
import type { BloodSugarMeasurement, MeasurementStats } from "@/lib/diabetes-types";
import {
  loadMeasurements,
  saveMeasurement,
  deleteMeasurement,
  clearAllMeasurements,
  calculateStats,
} from "@/lib/diabetes-storage";
import { 
  Phone, 
  Code, 
  Heart, 
  Shield, 
  Smartphone, 
  Lightbulb,
  Clock,
  Utensils,
  Moon,
  Activity,
  Droplet
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Memoized Tips Component for performance
const HealthTips = memo(function HealthTips() {
  const tips = [
    { icon: Clock, text: "מדוד בשעות קבועות כל יום לתוצאות עקביות", color: "text-blue-500" },
    { icon: Utensils, text: "מדוד לפני ואחרי ארוחות לזיהוי דפוסים", color: "text-orange-500" },
    { icon: Moon, text: "מדידת בוקר (צום) היא החשובה ביותר", color: "text-purple-500" },
    { icon: Activity, text: "פעילות גופנית עוזרת לאזן את הסוכר", color: "text-green-500" },
  ];

  return (
    <Card className="rounded-2xl border-0 shadow-lg bg-gradient-to-br from-amber-50 to-orange-50">
      <CardHeader className="pb-2 sm:pb-3">
        <CardTitle className="flex items-center gap-2 justify-end text-base sm:text-lg">
          <span>טיפים לניהול סוכרת</span>
          <div className="p-1.5 rounded-lg bg-amber-100">
            <Lightbulb className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600" />
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <ul className="space-y-2 sm:space-y-3">
          {tips.map((tip, index) => (
            <li key={index} className="flex items-center gap-2 sm:gap-3 justify-end text-right">
              <span className="text-xs sm:text-sm text-foreground/80 leading-relaxed">{tip.text}</span>
              <tip.icon className={`w-4 h-4 flex-shrink-0 ${tip.color}`} />
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
});

// Loading skeleton component
const LoadingSkeleton = memo(function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <div className="h-14 sm:h-16 bg-gradient-to-l from-teal-600 to-emerald-500 animate-pulse" />
      <main className="max-w-5xl mx-auto px-3 py-4 sm:px-6 sm:py-8">
        <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
          <div className="space-y-4 sm:space-y-6">
            <div className="h-[450px] sm:h-[500px] rounded-2xl bg-card border animate-pulse shadow-lg" />
          </div>
          <div className="space-y-4 sm:space-y-6">
            <div className="h-56 sm:h-64 rounded-2xl bg-card border animate-pulse shadow-lg" />
            <div className="h-64 sm:h-80 rounded-2xl bg-card border animate-pulse shadow-lg" />
          </div>
        </div>
      </main>
    </div>
  );
});

export default function DiabetesTrackerPage() {
  const [measurements, setMeasurements] = useState<BloodSugarMeasurement[]>([]);
  const [stats, setStats] = useState<MeasurementStats>({
    todayAverage: null,
    weekAverage: null,
    monthAverage: null,
    highest: null,
    lowest: null,
    totalCount: 0,
  });
  const [isLoaded, setIsLoaded] = useState(false);

  // Load data on mount with cleanup
  useEffect(() => {
    let isMounted = true;
    
    const loadData = () => {
      try {
        const stored = loadMeasurements();
        if (isMounted) {
          setMeasurements(stored);
          setStats(calculateStats(stored));
          setIsLoaded(true);
        }
      } catch (error) {
        console.error("Error loading measurements:", error);
        if (isMounted) {
          setIsLoaded(true);
        }
      }
    };

    loadData();

    // Cleanup function to prevent memory leaks
    return () => {
      isMounted = false;
    };
  }, []);

  const updateStats = useCallback((newMeasurements: BloodSugarMeasurement[]) => {
    setStats(calculateStats(newMeasurements));
  }, []);

  const handleSaveMeasurement = useCallback(
    (measurement: BloodSugarMeasurement) => {
      const updated = saveMeasurement(measurement);
      setMeasurements(updated);
      updateStats(updated);
    },
    [updateStats]
  );

  const handleDeleteMeasurement = useCallback(
    (id: string) => {
      const updated = deleteMeasurement(id);
      setMeasurements(updated);
      updateStats(updated);
    },
    [updateStats]
  );

  const handleClearAll = useCallback(() => {
    clearAllMeasurements();
    setMeasurements([]);
    setStats({
      todayAverage: null,
      weekAverage: null,
      monthAverage: null,
      highest: null,
      lowest: null,
      totalCount: 0,
    });
  }, []);

  if (!isLoaded) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/30 flex flex-col">
      {/* Skip link for accessibility */}
      <a href="#main-content" className="skip-link sr-only focus:not-sr-only">
        דלג לתוכן הראשי
      </a>
      
      {/* PWA Installer */}
      <PWAInstaller />
      
      <Header />

      <main id="main-content" className="flex-1 w-full max-w-5xl mx-auto px-3 py-4 sm:px-6 sm:py-8">
        <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
          {/* עמודה ימנית - טופס ורשימה */}
          <div className="space-y-4 sm:space-y-6">
            <MeasurementForm onSave={handleSaveMeasurement} />
            <div className="lg:hidden">
              <StatisticsCard stats={stats} />
            </div>
            <MeasurementsList
              measurements={measurements}
              onDelete={handleDeleteMeasurement}
              onClearAll={handleClearAll}
            />
          </div>

          {/* עמודה שמאלית - סטטיסטיקות וגרף */}
          <div className="space-y-4 sm:space-y-6">
            <div className="hidden lg:block">
              <StatisticsCard stats={stats} />
            </div>
            <TrendsChart measurements={measurements} />
            
            {/* טיפים לבריאות */}
            <HealthTips />
            
            {/* כפתור ייצוא דו"ח */}
            <ReportExport measurements={measurements} stats={stats} />
          </div>
        </div>

        {/* הודעת פרטיות - מיושרת לימין */}
        <div className="mt-6 sm:mt-8 p-4 sm:p-5 rounded-2xl bg-gradient-to-l from-teal-50 to-emerald-50 border border-teal-100 shadow-sm">
          <div className="flex items-start gap-3 justify-end">
            <div className="text-right flex-1">
              <div className="flex items-center gap-2 justify-end mb-1">
                <p className="font-semibold text-teal-800 text-sm sm:text-base">
                  הנתונים שלך מאובטחים
                </p>
                <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-teal-600 flex-shrink-0" />
              </div>
              <p className="text-xs sm:text-sm text-teal-700 leading-relaxed">
                כל המידע נשמר באופן מקומי במכשיר שלך בלבד ואינו משותף עם שום שרת חיצוני.
              </p>
              <p className="text-[10px] sm:text-xs text-teal-600 mt-1">
                תמיד התייעץ עם הרופא המטפל שלך לקבלת ייעוץ רפואי מקצועי.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* כותרת תחתונה - תמיד למטה ומיושרת לימין */}
      <footer className="w-full mt-auto border-t bg-gradient-to-l from-muted/50 to-background print:hidden">
        <div className="max-w-5xl mx-auto px-3 py-6 sm:px-6 sm:py-8">
          <div className="flex flex-col items-end gap-4 sm:gap-5 text-right">
            
            {/* לוגו */}
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg sm:text-xl font-bold text-primary">גלוקוטרק</span>
              <div className="p-2 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-500 shadow-lg">
                <Droplet className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
            </div>
            
            {/* קרדיט */}
            <div className="flex flex-col items-end gap-2">
              <div className="flex items-center gap-2 text-muted-foreground">
                <span className="text-xs sm:text-sm font-medium">Full Stack Development</span>
                <Code className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-foreground text-base sm:text-lg">יוסף אלישר</span>
                <Heart className="w-4 h-4 text-red-500 animate-pulse" />
              </div>
            </div>
            
            {/* פרטי קשר */}
            <a 
              href="tel:058-4423342" 
              className="flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 rounded-full bg-gradient-to-l from-teal-500 to-emerald-500 text-white text-sm sm:text-base font-semibold hover:from-teal-600 hover:to-emerald-600 transition-all shadow-lg hover:shadow-xl touch-target"
              aria-label="התקשר ליוסף אלישר"
            >
              <span dir="ltr">058-4423342</span>
              <Phone className="w-4 h-4 sm:w-5 sm:h-5" />
            </a>

            {/* תכונות */}
            <div className="flex flex-wrap justify-end gap-2 text-[10px] sm:text-xs text-muted-foreground">
              <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-background border">
                נגיש WCAG 2.1
              </span>
              <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-background border">
                RTL מלא
              </span>
              <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-background border">
                אחסון מקומי
                <Shield className="w-3 h-3" />
              </span>
              <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-background border">
                רספונסיבי
                <Smartphone className="w-3 h-3" />
              </span>
            </div>

            {/* שנה */}
            <p className="text-[10px] sm:text-xs text-muted-foreground">
              {new Date().getFullYear()} גלוקוטרק - כל הזכויות שמורות
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
