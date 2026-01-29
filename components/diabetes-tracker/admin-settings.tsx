"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Settings,
  User,
  Heart,
  Palette,
  Activity,
  Bell,
  Database,
  Info,
  Save,
  RotateCcw,
  Download,
  Upload,
  Trash2,
  Sun,
  Moon,
  Monitor,
  ChevronLeft,
  CheckCircle2,
  AlertTriangle,
  HardDrive,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
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
import type { AppSettings } from "@/lib/settings-types";
import { DEFAULT_SETTINGS, DIABETES_TYPE_LABELS } from "@/lib/settings-types";
import {
  loadSettings,
  saveSettings,
  resetSettings,
  exportAllData,
  importAllData,
  getStorageUsage,
} from "@/lib/settings-storage";

interface AdminSettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSettingsChange?: (settings: AppSettings) => void;
}

type SettingsTab =
  | "profile"
  | "ranges"
  | "display"
  | "measurement"
  | "reminders"
  | "data"
  | "about";

const TABS: { id: SettingsTab; label: string; icon: React.ElementType }[] = [
  { id: "profile", label: "פרופיל", icon: User },
  { id: "ranges", label: "טווחי סוכר", icon: Heart },
  { id: "display", label: "תצוגה", icon: Palette },
  { id: "measurement", label: "מדידות", icon: Activity },
  { id: "reminders", label: "תזכורות", icon: Bell },
  { id: "data", label: "נתונים", icon: Database },
  { id: "about", label: "אודות", icon: Info },
];

export function AdminSettings({
  open,
  onOpenChange,
  onSettingsChange,
}: AdminSettingsProps) {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");
  const [showSaved, setShowSaved] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showClearDataConfirm, setShowClearDataConfirm] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState(false);
  const [storageInfo, setStorageInfo] = useState({ used: "0 KB", items: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setSettings(loadSettings());
      setStorageInfo(getStorageUsage());
      setActiveTab("profile");
    }
  }, [open]);

  const updateSettings = useCallback(
    <K extends keyof AppSettings>(
      section: K,
      updates: Partial<AppSettings[K]>
    ) => {
      setSettings((prev) => ({
        ...prev,
        [section]: { ...prev[section], ...updates },
      }));
    },
    []
  );

  const handleSave = () => {
    saveSettings(settings);
    onSettingsChange?.(settings);
    setShowSaved(true);
    setTimeout(() => setShowSaved(false), 2000);
  };

  const handleReset = () => {
    const defaultSettings = resetSettings();
    setSettings(defaultSettings);
    onSettingsChange?.(defaultSettings);
    setShowResetConfirm(false);
  };

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
        setSettings(loadSettings());
        setStorageInfo(getStorageUsage());
        setTimeout(() => setImportSuccess(false), 3000);
      } else {
        setImportError("הקובץ אינו תקין. אנא בחר קובץ גיבוי תקין.");
      }
    };
    reader.readAsText(file);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleClearAllData = () => {
    const appKeys = ["diabetesMeasurements", "glucotrackSettings", "diabetesProfileImage", "diabetesPatientName", "pwa-banner-dismissed"];
    appKeys.forEach((key) => localStorage.removeItem(key));
    setSettings(DEFAULT_SETTINGS);
    setStorageInfo(getStorageUsage());
    setShowClearDataConfirm(false);
    onSettingsChange?.(DEFAULT_SETTINGS);
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case "profile":
        return <ProfileTab settings={settings} updateSettings={updateSettings} />;
      case "ranges":
        return <RangesTab settings={settings} updateSettings={updateSettings} />;
      case "display":
        return <DisplayTab settings={settings} updateSettings={updateSettings} />;
      case "measurement":
        return <MeasurementTab settings={settings} updateSettings={updateSettings} />;
      case "reminders":
        return <RemindersTab settings={settings} updateSettings={updateSettings} />;
      case "data":
        return (
          <DataTab
            storageInfo={storageInfo}
            importError={importError}
            importSuccess={importSuccess}
            fileInputRef={fileInputRef}
            onExport={handleExport}
            onImport={handleImport}
            onClearData={() => setShowClearDataConfirm(true)}
          />
        );
      case "about":
        return <AboutTab storageInfo={storageInfo} />;
      default:
        return null;
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="max-w-2xl max-h-[90vh] overflow-hidden p-0 gap-0 sm:max-w-2xl"
          showCloseButton={false}
        >
          <DialogHeader className="p-4 sm:p-6 pb-0 text-right">
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onOpenChange(false)}
                className="rounded-full"
              >
                <X className="w-5 h-5" />
              </Button>
              <div className="flex items-center gap-3">
                <div>
                  <DialogTitle className="text-xl sm:text-2xl">
                    הגדרות מערכת
                  </DialogTitle>
                  <DialogDescription className="text-sm">
                    נהל את כל ההגדרות של האפליקציה
                  </DialogDescription>
                </div>
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-500 shadow-lg">
                  <Settings className="w-5 h-5 text-white" />
                </div>
              </div>
            </div>
          </DialogHeader>

          <div className="flex flex-col sm:flex-row h-[calc(90vh-180px)] sm:h-[60vh]">
            {/* Tabs sidebar */}
            <nav className="flex sm:flex-col overflow-x-auto sm:overflow-x-visible sm:overflow-y-auto border-b sm:border-b-0 sm:border-l sm:w-44 shrink-0 p-2 sm:p-3 gap-1">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                    activeTab === tab.id
                      ? "bg-gradient-to-l from-teal-500/10 to-emerald-500/10 text-teal-700 shadow-sm"
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  }`}
                >
                  <tab.icon className="w-4 h-4 flex-shrink-0" />
                  <span>{tab.label}</span>
                  {activeTab === tab.id && (
                    <ChevronLeft className="w-3 h-3 mr-auto hidden sm:block" />
                  )}
                </button>
              ))}
            </nav>

            {/* Tab content */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              {renderTabContent()}
            </div>
          </div>

          {/* Footer with save/reset */}
          <div className="border-t p-4 sm:p-6 pt-4 flex items-center justify-between gap-3">
            <Button
              variant="outline"
              onClick={() => setShowResetConfirm(true)}
              className="text-sm"
            >
              <RotateCcw className="w-4 h-4 ml-2" />
              איפוס הגדרות
            </Button>
            <Button
              onClick={handleSave}
              className={`text-sm px-6 transition-all ${
                showSaved
                  ? "bg-emerald-500 hover:bg-emerald-600"
                  : "bg-gradient-to-l from-teal-600 to-teal-500 hover:from-teal-700 hover:to-teal-600"
              } text-white`}
            >
              {showSaved ? (
                <>
                  <CheckCircle2 className="w-4 h-4 ml-2" />
                  נשמר!
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 ml-2" />
                  שמור הגדרות
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reset confirmation */}
      <AlertDialog open={showResetConfirm} onOpenChange={setShowResetConfirm}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader className="text-right">
            <AlertDialogTitle>איפוס הגדרות</AlertDialogTitle>
            <AlertDialogDescription>
              האם אתה בטוח שברצונך לאפס את כל ההגדרות לברירת המחדל? פעולה זו לא
              תמחק את המדידות שלך.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogAction
              onClick={handleReset}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              אפס הגדרות
            </AlertDialogAction>
            <AlertDialogCancel>ביטול</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Clear data confirmation */}
      <AlertDialog
        open={showClearDataConfirm}
        onOpenChange={setShowClearDataConfirm}
      >
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader className="text-right">
            <div className="flex items-center gap-2 justify-end">
              <AlertDialogTitle>מחיקת כל הנתונים</AlertDialogTitle>
              <AlertTriangle className="w-5 h-5 text-destructive" />
            </div>
            <AlertDialogDescription>
              <strong className="text-destructive">
                פעולה זו היא בלתי הפיכה!
              </strong>{" "}
              כל הנתונים שלך יימחקו לצמיתות, כולל כל המדידות, ההגדרות, ותמונת
              הפרופיל. מומלץ לגבות את הנתונים לפני המחיקה.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogAction
              onClick={handleClearAllData}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              מחק הכל
            </AlertDialogAction>
            <AlertDialogCancel>ביטול</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ============= Tab Components =============

function ProfileTab({
  settings,
  updateSettings,
}: {
  settings: AppSettings;
  updateSettings: <K extends keyof AppSettings>(
    section: K,
    updates: Partial<AppSettings[K]>
  ) => void;
}) {
  return (
    <div className="space-y-6">
      <SectionTitle icon={User} title="פרטי פרופיל" />

      <div className="space-y-4">
        <div className="space-y-2 text-right">
          <Label htmlFor="patientName" className="text-sm font-semibold">
            שם המטופל
          </Label>
          <Input
            id="patientName"
            value={settings.profile.patientName}
            onChange={(e) =>
              updateSettings("profile", { patientName: e.target.value })
            }
            placeholder="הזן את שם המטופל"
            className="text-right"
          />
        </div>

        <div className="space-y-2 text-right">
          <Label htmlFor="doctorName" className="text-sm font-semibold">
            שם הרופא המטפל
          </Label>
          <Input
            id="doctorName"
            value={settings.profile.doctorName}
            onChange={(e) =>
              updateSettings("profile", { doctorName: e.target.value })
            }
            placeholder="ד״ר..."
            className="text-right"
          />
        </div>

        <div className="space-y-2 text-right">
          <Label htmlFor="diabetesType" className="text-sm font-semibold block">
            סוג סוכרת
          </Label>
          <Select
            value={settings.profile.diabetesType}
            onValueChange={(val) =>
              updateSettings("profile", {
                diabetesType: val as AppSettings["profile"]["diabetesType"],
              })
            }
          >
            <SelectTrigger id="diabetesType" className="w-full text-right" dir="rtl">
              <SelectValue placeholder="בחר סוג סוכרת" />
            </SelectTrigger>
            <SelectContent dir="rtl">
              {Object.entries(DIABETES_TYPE_LABELS).map(([key, label]) => (
                <SelectItem key={key} value={key} className="text-right">
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2 text-right">
          <Label htmlFor="birthDate" className="text-sm font-semibold">
            תאריך לידה
          </Label>
          <Input
            id="birthDate"
            type="date"
            value={settings.profile.birthDate}
            onChange={(e) =>
              updateSettings("profile", { birthDate: e.target.value })
            }
            className="text-right"
          />
        </div>
      </div>
    </div>
  );
}

function RangesTab({
  settings,
  updateSettings,
}: {
  settings: AppSettings;
  updateSettings: <K extends keyof AppSettings>(
    section: K,
    updates: Partial<AppSettings[K]>
  ) => void;
}) {
  const { lowMax, highMin } = settings.bloodSugarRange;

  return (
    <div className="space-y-6">
      <SectionTitle icon={Heart} title="טווחי סוכר בדם" />

      <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-right">
        <div className="flex items-start gap-2 justify-end">
          <p className="text-sm text-amber-800">
            שנה את הטווחים לפי המלצת הרופא שלך. ברירת המחדל היא 70-180 מ&quot;ג/ד&quot;ל.
          </p>
          <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-2 text-right">
          <Label htmlFor="lowMax" className="text-sm font-semibold">
            סף נמוך (מתחת לערך זה = נמוך)
          </Label>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">מ&quot;ג/ד&quot;ל</span>
            <Input
              id="lowMax"
              type="number"
              value={lowMax}
              onChange={(e) =>
                updateSettings("bloodSugarRange", {
                  lowMax: Number(e.target.value),
                })
              }
              min={40}
              max={150}
              className="w-28 text-center text-lg font-bold"
            />
          </div>
        </div>

        <div className="space-y-2 text-right">
          <Label htmlFor="highMin" className="text-sm font-semibold">
            סף גבוה (מעל ערך זה = גבוה)
          </Label>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">מ&quot;ג/ד&quot;ל</span>
            <Input
              id="highMin"
              type="number"
              value={highMin}
              onChange={(e) =>
                updateSettings("bloodSugarRange", {
                  highMin: Number(e.target.value),
                })
              }
              min={100}
              max={300}
              className="w-28 text-center text-lg font-bold"
            />
          </div>
        </div>
      </div>

      {/* Preview */}
      <div className="p-4 rounded-xl bg-muted/50 space-y-3">
        <p className="text-sm font-semibold text-right">תצוגה מקדימה:</p>
        <div className="flex flex-col gap-2 text-right">
          <div className="flex items-center gap-2 justify-end">
            <span className="text-sm">
              נמוך: מתחת ל-{lowMax} מ&quot;ג/ד&quot;ל
            </span>
            <span className="w-3 h-3 rounded-full bg-blue-500" />
          </div>
          <div className="flex items-center gap-2 justify-end">
            <span className="text-sm">
              תקין: {lowMax}-{highMin} מ&quot;ג/ד&quot;ל
            </span>
            <span className="w-3 h-3 rounded-full bg-emerald-500" />
          </div>
          <div className="flex items-center gap-2 justify-end">
            <span className="text-sm">
              גבוה: מעל {highMin} מ&quot;ג/ד&quot;ל
            </span>
            <span className="w-3 h-3 rounded-full bg-red-500" />
          </div>
        </div>
      </div>
    </div>
  );
}

function DisplayTab({
  settings,
  updateSettings,
}: {
  settings: AppSettings;
  updateSettings: <K extends keyof AppSettings>(
    section: K,
    updates: Partial<AppSettings[K]>
  ) => void;
}) {
  return (
    <div className="space-y-6">
      <SectionTitle icon={Palette} title="הגדרות תצוגה" />

      <div className="space-y-4">
        {/* Theme selector */}
        <div className="space-y-3 text-right">
          <Label className="text-sm font-semibold">ערכת נושא</Label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { value: "light", label: "בהיר", icon: Sun },
              { value: "dark", label: "כהה", icon: Moon },
              { value: "system", label: "מערכת", icon: Monitor },
            ].map((theme) => (
              <button
                key={theme.value}
                type="button"
                onClick={() =>
                  updateSettings("display", {
                    theme: theme.value as AppSettings["display"]["theme"],
                  })
                }
                className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${
                  settings.display.theme === theme.value
                    ? "border-teal-500 bg-teal-50 text-teal-700"
                    : "border-transparent bg-muted/30 text-muted-foreground hover:bg-muted/50"
                }`}
              >
                <theme.icon className="w-5 h-5" />
                <span className="text-xs font-medium">{theme.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Chart points */}
        <div className="space-y-2 text-right">
          <Label htmlFor="chartPoints" className="text-sm font-semibold block">
            מספר נקודות בגרף
          </Label>
          <Select
            value={settings.display.chartPoints.toString()}
            onValueChange={(val) =>
              updateSettings("display", { chartPoints: Number(val) })
            }
          >
            <SelectTrigger id="chartPoints" className="w-full text-right" dir="rtl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent dir="rtl">
              <SelectItem value="10" className="text-right">
                10 מדידות אחרונות
              </SelectItem>
              <SelectItem value="20" className="text-right">
                20 מדידות אחרונות
              </SelectItem>
              <SelectItem value="30" className="text-right">
                30 מדידות אחרונות
              </SelectItem>
              <SelectItem value="50" className="text-right">
                50 מדידות אחרונות
              </SelectItem>
              <SelectItem value="100" className="text-right">
                100 מדידות אחרונות
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Show tips toggle */}
        <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30">
          <button
            type="button"
            role="switch"
            aria-checked={settings.display.showTips}
            onClick={() =>
              updateSettings("display", {
                showTips: !settings.display.showTips,
              })
            }
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              settings.display.showTips ? "bg-teal-500" : "bg-muted-foreground/30"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm ${
                settings.display.showTips
                  ? "translate-x-1"
                  : "translate-x-6"
              }`}
            />
          </button>
          <div className="text-right">
            <span className="text-sm font-semibold">הצג טיפים בריאותיים</span>
            <p className="text-xs text-muted-foreground">
              הצג כרטיס טיפים לניהול סוכרת בדף הראשי
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function MeasurementTab({
  settings,
  updateSettings,
}: {
  settings: AppSettings;
  updateSettings: <K extends keyof AppSettings>(
    section: K,
    updates: Partial<AppSettings[K]>
  ) => void;
}) {
  return (
    <div className="space-y-6">
      <SectionTitle icon={Activity} title="הגדרות מדידה" />

      <div className="space-y-4">
        {/* Default context */}
        <div className="space-y-2 text-right">
          <Label
            htmlFor="defaultContext"
            className="text-sm font-semibold block"
          >
            הקשר ברירת מחדל
          </Label>
          <Select
            value={settings.measurement.defaultContext}
            onValueChange={(val) =>
              updateSettings("measurement", {
                defaultContext:
                  val as AppSettings["measurement"]["defaultContext"],
              })
            }
          >
            <SelectTrigger id="defaultContext" className="w-full text-right" dir="rtl">
              <SelectValue placeholder="ללא ברירת מחדל" />
            </SelectTrigger>
            <SelectContent dir="rtl">
              <SelectItem value="none" className="text-right">
                ללא ברירת מחדל
              </SelectItem>
              <SelectItem value="fasting" className="text-right">
                צום
              </SelectItem>
              <SelectItem value="before-meal" className="text-right">
                לפני ארוחה
              </SelectItem>
              <SelectItem value="after-meal" className="text-right">
                אחרי ארוחה
              </SelectItem>
              <SelectItem value="before-sleep" className="text-right">
                לפני שינה
              </SelectItem>
              <SelectItem value="other" className="text-right">
                אחר
              </SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            הקשר שייבחר אוטומטית בטופס מדידה חדשה
          </p>
        </div>

        {/* Unit */}
        <div className="space-y-3 text-right">
          <Label className="text-sm font-semibold">יחידות מדידה</Label>
          <div className="grid grid-cols-2 gap-3">
            {[
              {
                value: "mgdl",
                label: 'מ"ג/ד"ל',
                desc: "מיליגרם לדציליטר",
              },
              {
                value: "mmol",
                label: "mmol/L",
                desc: "מילימול לליטר",
              },
            ].map((unit) => (
              <button
                key={unit.value}
                type="button"
                onClick={() =>
                  updateSettings("measurement", {
                    unit: unit.value as AppSettings["measurement"]["unit"],
                  })
                }
                className={`flex flex-col items-center gap-1 p-4 rounded-xl border-2 transition-all ${
                  settings.measurement.unit === unit.value
                    ? "border-teal-500 bg-teal-50 text-teal-700"
                    : "border-transparent bg-muted/30 text-muted-foreground hover:bg-muted/50"
                }`}
              >
                <span className="text-lg font-bold">{unit.label}</span>
                <span className="text-xs">{unit.desc}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function RemindersTab({
  settings,
  updateSettings,
}: {
  settings: AppSettings;
  updateSettings: <K extends keyof AppSettings>(
    section: K,
    updates: Partial<AppSettings[K]>
  ) => void;
}) {
  return (
    <div className="space-y-6">
      <SectionTitle icon={Bell} title="תזכורות מדידה" />

      {/* Master toggle */}
      <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-l from-teal-50 to-emerald-50 border border-teal-100">
        <button
          type="button"
          role="switch"
          aria-checked={settings.reminders.enabled}
          onClick={() =>
            updateSettings("reminders", {
              enabled: !settings.reminders.enabled,
            })
          }
          className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
            settings.reminders.enabled
              ? "bg-teal-500"
              : "bg-muted-foreground/30"
          }`}
        >
          <span
            className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform shadow-sm ${
              settings.reminders.enabled
                ? "translate-x-1"
                : "translate-x-6"
            }`}
          />
        </button>
        <div className="text-right">
          <span className="text-sm font-semibold">הפעל תזכורות</span>
          <p className="text-xs text-muted-foreground">
            קבל תזכורות למדידת סוכר בזמנים קבועים
          </p>
        </div>
      </div>

      {settings.reminders.enabled && (
        <div className="space-y-3">
          {[
            {
              key: "morning" as const,
              label: "בוקר",
              timeKey: "morningTime" as const,
              enabledKey: "morningEnabled" as const,
            },
            {
              key: "afternoon" as const,
              label: "צהריים",
              timeKey: "afternoonTime" as const,
              enabledKey: "afternoonEnabled" as const,
            },
            {
              key: "evening" as const,
              label: "ערב",
              timeKey: "eveningTime" as const,
              enabledKey: "eveningEnabled" as const,
            },
          ].map((reminder) => (
            <div
              key={reminder.key}
              className={`flex items-center justify-between p-4 rounded-xl transition-all ${
                settings.reminders[reminder.enabledKey]
                  ? "bg-muted/50"
                  : "bg-muted/20 opacity-60"
              }`}
            >
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  role="switch"
                  aria-checked={settings.reminders[reminder.enabledKey]}
                  onClick={() =>
                    updateSettings("reminders", {
                      [reminder.enabledKey]:
                        !settings.reminders[reminder.enabledKey],
                    })
                  }
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                    settings.reminders[reminder.enabledKey]
                      ? "bg-teal-500"
                      : "bg-muted-foreground/30"
                  }`}
                >
                  <span
                    className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform shadow-sm ${
                      settings.reminders[reminder.enabledKey]
                        ? "translate-x-0.5"
                        : "translate-x-5"
                    }`}
                  />
                </button>
                <Input
                  type="time"
                  value={settings.reminders[reminder.timeKey]}
                  onChange={(e) =>
                    updateSettings("reminders", {
                      [reminder.timeKey]: e.target.value,
                    })
                  }
                  className="w-28 text-center"
                  disabled={!settings.reminders[reminder.enabledKey]}
                />
              </div>
              <span className="text-sm font-semibold">{reminder.label}</span>
            </div>
          ))}

          <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-right">
            <p className="text-xs text-blue-800">
              התזכורות דורשות הרשאת התראות בדפדפן. ודא שהתראות מופעלות.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function DataTab({
  storageInfo,
  importError,
  importSuccess,
  fileInputRef,
  onExport,
  onImport,
  onClearData,
}: {
  storageInfo: { used: string; items: number };
  importError: string | null;
  importSuccess: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onExport: () => void;
  onImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClearData: () => void;
}) {
  return (
    <div className="space-y-6">
      <SectionTitle icon={Database} title="ניהול נתונים" />

      {/* Storage info */}
      <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30">
        <div className="text-sm">
          <span className="font-bold">{storageInfo.used}</span>
          <span className="text-muted-foreground"> ({storageInfo.items} פריטים)</span>
        </div>
        <div className="flex items-center gap-2 text-right">
          <div>
            <span className="text-sm font-semibold">אחסון מקומי</span>
            <p className="text-xs text-muted-foreground">
              נפח מנוצל במכשיר
            </p>
          </div>
          <HardDrive className="w-4 h-4 text-muted-foreground" />
        </div>
      </div>

      {/* Export */}
      <div className="space-y-2">
        <Button
          variant="outline"
          className="w-full h-12 justify-between"
          onClick={onExport}
        >
          <Download className="w-4 h-4" />
          <div className="text-right flex-1 mr-3">
            <span className="text-sm font-semibold">גיבוי נתונים</span>
            <p className="text-xs text-muted-foreground">
              הורד את כל הנתונים כקובץ JSON
            </p>
          </div>
        </Button>
      </div>

      {/* Import */}
      <div className="space-y-2">
        <Button
          variant="outline"
          className="w-full h-12 justify-between"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="w-4 h-4" />
          <div className="text-right flex-1 mr-3">
            <span className="text-sm font-semibold">שחזור מגיבוי</span>
            <p className="text-xs text-muted-foreground">
              ייבא נתונים מקובץ גיבוי
            </p>
          </div>
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={onImport}
          className="hidden"
        />
        {importError && (
          <p className="text-sm text-destructive text-right">{importError}</p>
        )}
        {importSuccess && (
          <div className="flex items-center gap-2 justify-end text-emerald-600">
            <span className="text-sm font-medium">הנתונים יובאו בהצלחה!</span>
            <CheckCircle2 className="w-4 h-4" />
          </div>
        )}
      </div>

      {/* Danger zone */}
      <div className="border border-destructive/30 rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2 justify-end text-right">
          <span className="text-sm font-bold text-destructive">אזור מסוכן</span>
          <AlertTriangle className="w-4 h-4 text-destructive" />
        </div>
        <Button
          variant="outline"
          className="w-full h-12 justify-between border-destructive/30 text-destructive hover:bg-destructive/5"
          onClick={onClearData}
        >
          <Trash2 className="w-4 h-4" />
          <div className="text-right flex-1 mr-3">
            <span className="text-sm font-semibold">מחק את כל הנתונים</span>
            <p className="text-xs opacity-70">
              מחיקת כל המדידות, ההגדרות והנתונים
            </p>
          </div>
        </Button>
      </div>
    </div>
  );
}

function AboutTab({
  storageInfo,
}: {
  storageInfo: { used: string; items: number };
}) {
  return (
    <div className="space-y-6">
      <SectionTitle icon={Info} title="אודות האפליקציה" />

      <div className="text-center space-y-4">
        <div className="inline-flex p-4 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-500 shadow-lg">
          <Heart className="w-8 h-8 text-white" />
        </div>
        <div>
          <h3 className="text-2xl font-bold text-foreground">גלוקוטרק</h3>
          <p className="text-sm text-muted-foreground">GlucoTrack</p>
        </div>
        <p className="text-sm text-muted-foreground">
          גרסה 1.0.0
        </p>
      </div>

      <div className="space-y-2">
        <InfoRow label="פיתוח" value="יוסף אלישר" />
        <InfoRow label="טכנולוגיה" value="Next.js 16 + React 19" />
        <InfoRow label="אחסון מקומי" value={storageInfo.used} />
        <InfoRow label="פריטים מאוחסנים" value={storageInfo.items.toString()} />
        <InfoRow label="סוג אפליקציה" value="PWA - Progressive Web App" />
        <InfoRow label="שפה" value="עברית (RTL)" />
        <InfoRow label="נגישות" value="WCAG 2.1" />
      </div>

      <div className="p-4 rounded-xl bg-gradient-to-l from-teal-50 to-emerald-50 border border-teal-100 text-right">
        <p className="text-xs text-teal-700 leading-relaxed">
          אפליקציה זו נועדה למעקב אישי בלבד ואינה מהווה תחליף לייעוץ רפואי
          מקצועי. תמיד התייעץ עם הרופא המטפל שלך. כל הנתונים נשמרים מקומית
          במכשיר שלך בלבד.
        </p>
      </div>
    </div>
  );
}

// ============= Utility Components =============

function SectionTitle({
  icon: Icon,
  title,
}: {
  icon: React.ElementType;
  title: string;
}) {
  return (
    <div className="flex items-center gap-2 justify-end pb-2 border-b">
      <h3 className="text-lg font-bold">{title}</h3>
      <Icon className="w-5 h-5 text-teal-600" />
    </div>
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
