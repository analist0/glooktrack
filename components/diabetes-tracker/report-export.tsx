"use client";

import React, { useState, useRef } from "react";
import { FileText, Download, Printer, Calendar, TrendingUp, Activity, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import type { BloodSugarMeasurement, MeasurementStats } from "@/lib/diabetes-types";
import { CONTEXT_LABELS, getBloodSugarStatus } from "@/lib/diabetes-types";
import { formatDate, formatTime } from "@/lib/diabetes-storage";

interface ReportExportProps {
  measurements: BloodSugarMeasurement[];
  stats: MeasurementStats;
  patientName?: string;
}

type DateRange = "week" | "month" | "3months" | "all";

const NAME_STORAGE_KEY = "diabetesPatientName";

export function ReportExport({ measurements, stats, patientName }: ReportExportProps) {
  const [dateRange, setDateRange] = useState<DateRange>("month");
  const [isOpen, setIsOpen] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  const getPatientName = () => {
    if (patientName) return patientName;
    if (typeof window !== "undefined") {
      return localStorage.getItem(NAME_STORAGE_KEY) || "לא צוין";
    }
    return "לא צוין";
  };

  const getFilteredMeasurements = () => {
    const now = new Date();
    let cutoffDate: Date;

    switch (dateRange) {
      case "week":
        cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "month":
        cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case "3months":
        cutoffDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        return measurements;
    }

    const cutoffStr = cutoffDate.toISOString().split("T")[0];
    return measurements.filter((m) => m.date >= cutoffStr);
  };

  const filteredMeasurements = getFilteredMeasurements();

  const calculateFilteredStats = () => {
    if (filteredMeasurements.length === 0) {
      return { average: null, highest: null, lowest: null, inRange: 0, low: 0, high: 0 };
    }

    const values = filteredMeasurements.map((m) => m.value);
    const average = Math.round(values.reduce((a, b) => a + b, 0) / values.length);
    const highest = Math.max(...values);
    const lowest = Math.min(...values);
    
    const inRange = filteredMeasurements.filter((m) => m.value >= 70 && m.value <= 180).length;
    const low = filteredMeasurements.filter((m) => m.value < 70).length;
    const high = filteredMeasurements.filter((m) => m.value > 180).length;

    return { average, highest, lowest, inRange, low, high };
  };

  const filteredStats = calculateFilteredStats();

  const generateReportHTML = () => {
    const name = getPatientName();
    const reportDate = new Date().toLocaleDateString("he-IL", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const rangeLabels: Record<DateRange, string> = {
      week: "שבוע אחרון",
      month: "חודש אחרון",
      "3months": "3 חודשים אחרונים",
      all: "כל הנתונים",
    };

    return `
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
  <meta charset="UTF-8">
  <title>דו"ח מעקב סוכרת - ${name}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: 'Segoe UI', Tahoma, Arial, sans-serif; 
      direction: rtl; 
      padding: 40px; 
      background: #fff;
      color: #1a1a1a;
      line-height: 1.6;
    }
    .header { 
      text-align: center; 
      margin-bottom: 40px; 
      padding-bottom: 20px; 
      border-bottom: 3px solid #0d9488;
    }
    .header h1 { 
      color: #0d9488; 
      font-size: 28px; 
      margin-bottom: 8px;
    }
    .header .subtitle { 
      color: #666; 
      font-size: 14px;
    }
    .patient-info {
      background: linear-gradient(135deg, #f0fdfa 0%, #ccfbf1 100%);
      padding: 20px;
      border-radius: 12px;
      margin-bottom: 30px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .patient-info .name {
      font-size: 20px;
      font-weight: bold;
      color: #0d9488;
    }
    .patient-info .date {
      color: #666;
      font-size: 14px;
    }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
      margin-bottom: 30px;
    }
    .stat-card {
      background: #f8fafc;
      padding: 20px;
      border-radius: 12px;
      text-align: center;
      border: 1px solid #e2e8f0;
    }
    .stat-card .value {
      font-size: 32px;
      font-weight: bold;
      color: #0d9488;
    }
    .stat-card .label {
      color: #64748b;
      font-size: 14px;
      margin-top: 4px;
    }
    .stat-card.low .value { color: #2563eb; }
    .stat-card.high .value { color: #dc2626; }
    .summary-box {
      background: #fff;
      border: 2px solid #0d9488;
      border-radius: 12px;
      padding: 24px;
      margin-bottom: 30px;
    }
    .summary-box h3 {
      color: #0d9488;
      margin-bottom: 16px;
      font-size: 18px;
    }
    .summary-row {
      display: flex;
      justify-content: space-between;
      padding: 12px 0;
      border-bottom: 1px solid #e2e8f0;
    }
    .summary-row:last-child { border-bottom: none; }
    .range-bar {
      display: flex;
      height: 24px;
      border-radius: 12px;
      overflow: hidden;
      margin: 20px 0;
    }
    .range-bar .low { background: #3b82f6; }
    .range-bar .normal { background: #10b981; }
    .range-bar .high { background: #ef4444; }
    .table-container {
      margin-top: 30px;
    }
    .table-container h3 {
      color: #0d9488;
      margin-bottom: 16px;
      font-size: 18px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 14px;
    }
    th {
      background: #0d9488;
      color: white;
      padding: 12px;
      text-align: right;
    }
    td {
      padding: 12px;
      border-bottom: 1px solid #e2e8f0;
    }
    tr:nth-child(even) { background: #f8fafc; }
    .value-low { color: #2563eb; font-weight: bold; }
    .value-normal { color: #10b981; font-weight: bold; }
    .value-high { color: #dc2626; font-weight: bold; }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 2px solid #e2e8f0;
      text-align: center;
      color: #64748b;
      font-size: 12px;
    }
    .doctor-section {
      margin-top: 40px;
      padding: 24px;
      border: 2px dashed #cbd5e1;
      border-radius: 12px;
    }
    .doctor-section h4 {
      margin-bottom: 20px;
      color: #475569;
    }
    .signature-line {
      display: flex;
      justify-content: space-between;
      margin-top: 40px;
    }
    .signature-box {
      width: 200px;
      text-align: center;
    }
    .signature-box .line {
      border-bottom: 1px solid #000;
      margin-bottom: 8px;
      height: 40px;
    }
    @media print {
      body { padding: 20px; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>דו"ח מעקב רמות סוכר בדם</h1>
    <p class="subtitle">גלוקוטרק - מערכת מעקב סוכרת</p>
  </div>

  <div class="patient-info">
    <div>
      <div class="name">${name}</div>
      <div>תקופת הדו"ח: ${rangeLabels[dateRange]}</div>
    </div>
    <div class="date">
      <div>תאריך הפקת הדו"ח:</div>
      <div><strong>${reportDate}</strong></div>
    </div>
  </div>

  <div class="stats-grid">
    <div class="stat-card">
      <div class="value">${filteredStats.average ?? "-"}</div>
      <div class="label">ממוצע מ"ג/ד"ל</div>
    </div>
    <div class="stat-card low">
      <div class="value">${filteredStats.lowest ?? "-"}</div>
      <div class="label">ערך נמוך ביותר</div>
    </div>
    <div class="stat-card high">
      <div class="value">${filteredStats.highest ?? "-"}</div>
      <div class="label">ערך גבוה ביותר</div>
    </div>
  </div>

  <div class="summary-box">
    <h3>התפלגות המדידות</h3>
    <div class="range-bar">
      ${filteredStats.low > 0 ? `<div class="low" style="width: ${(filteredStats.low / filteredMeasurements.length) * 100}%"></div>` : ""}
      ${filteredStats.inRange > 0 ? `<div class="normal" style="width: ${(filteredStats.inRange / filteredMeasurements.length) * 100}%"></div>` : ""}
      ${filteredStats.high > 0 ? `<div class="high" style="width: ${(filteredStats.high / filteredMeasurements.length) * 100}%"></div>` : ""}
    </div>
    <div class="summary-row">
      <span>סך הכל מדידות</span>
      <strong>${filteredMeasurements.length}</strong>
    </div>
    <div class="summary-row">
      <span>בטווח התקין (70-180)</span>
      <strong style="color: #10b981">${filteredStats.inRange} (${filteredMeasurements.length > 0 ? Math.round((filteredStats.inRange / filteredMeasurements.length) * 100) : 0}%)</strong>
    </div>
    <div class="summary-row">
      <span>מתחת לטווח (&lt;70)</span>
      <strong style="color: #3b82f6">${filteredStats.low} (${filteredMeasurements.length > 0 ? Math.round((filteredStats.low / filteredMeasurements.length) * 100) : 0}%)</strong>
    </div>
    <div class="summary-row">
      <span>מעל לטווח (&gt;180)</span>
      <strong style="color: #ef4444">${filteredStats.high} (${filteredMeasurements.length > 0 ? Math.round((filteredStats.high / filteredMeasurements.length) * 100) : 0}%)</strong>
    </div>
  </div>

  <div class="table-container">
    <h3>פירוט המדידות</h3>
    <table>
      <thead>
        <tr>
          <th>תאריך</th>
          <th>שעה</th>
          <th>ערך (מ"ג/ד"ל)</th>
          <th>הקשר</th>
          <th>הערות</th>
        </tr>
      </thead>
      <tbody>
        ${filteredMeasurements
          .slice(0, 50)
          .map((m) => {
            const status = getBloodSugarStatus(m.value);
            const valueClass = m.value < 70 ? "value-low" : m.value > 180 ? "value-high" : "value-normal";
            return `
            <tr>
              <td>${formatDate(m.date)}</td>
              <td>${formatTime(m.time)}</td>
              <td class="${valueClass}">${m.value}</td>
              <td>${CONTEXT_LABELS[m.context]}</td>
              <td>${m.notes || "-"}</td>
            </tr>
          `;
          })
          .join("")}
      </tbody>
    </table>
    ${filteredMeasurements.length > 50 ? `<p style="margin-top: 16px; color: #64748b; font-size: 14px;">* מוצגות 50 המדידות האחרונות מתוך ${filteredMeasurements.length}</p>` : ""}
  </div>

  <div class="doctor-section">
    <h4>לשימוש הרופא המטפל</h4>
    <p style="margin-bottom: 16px; color: #64748b;">הערות והמלצות:</p>
    <div style="min-height: 100px; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px;"></div>
    
    <div class="signature-line">
      <div class="signature-box">
        <div class="line"></div>
        <div>חתימת הרופא</div>
      </div>
      <div class="signature-box">
        <div class="line"></div>
        <div>תאריך</div>
      </div>
    </div>
  </div>

  <div class="footer">
    <p>דו"ח זה הופק אוטומטית ממערכת גלוקוטרק למעקב סוכרת</p>
    <p>הנתונים מבוססים על הזנות המשתמש ואינם מהווים ייעוץ רפואי</p>
    <p style="margin-top: 8px;">פיתוח: יוסף אלישר | 058-4423342</p>
  </div>
</body>
</html>
    `;
  };

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(generateReportHTML());
      printWindow.document.close();
      printWindow.onload = () => {
        printWindow.print();
      };
    }
  };

  const handleDownload = () => {
    const html = generateReportHTML();
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `דוח-סוכרת-${new Date().toISOString().split("T")[0]}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="w-full h-12 sm:h-14 text-base font-semibold rounded-xl border-2 border-teal-200 hover:bg-teal-50 hover:border-teal-300 transition-all bg-transparent"
        >
          <FileText className="w-5 h-5 ms-2" />
          ייצוא דו"ח לרופא
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg mx-auto">
        <DialogHeader className="text-right">
          <DialogTitle className="text-xl flex items-center gap-2 justify-end">
            ייצוא דו"ח מקצועי
            <FileText className="w-5 h-5 text-teal-600" />
          </DialogTitle>
          <DialogDescription className="text-right">
            צור דו"ח מפורט להגשה לרופא המטפל
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* בחירת טווח תאריכים */}
          <div className="space-y-2 text-right">
            <Label className="text-sm font-semibold flex items-center gap-2 justify-end">
              תקופת הדו"ח
              <Calendar className="w-4 h-4 text-muted-foreground" />
            </Label>
            <Select value={dateRange} onValueChange={(v) => setDateRange(v as DateRange)}>
              <SelectTrigger className="h-12 text-right">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week" className="text-right">שבוע אחרון</SelectItem>
                <SelectItem value="month" className="text-right">חודש אחרון</SelectItem>
                <SelectItem value="3months" className="text-right">3 חודשים אחרונים</SelectItem>
                <SelectItem value="all" className="text-right">כל הנתונים</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* תצוגה מקדימה של סטטיסטיקות */}
          <div className="bg-muted/50 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2 justify-end text-sm font-semibold">
              <span>סיכום הדו"ח</span>
              <TrendingUp className="w-4 h-4 text-teal-600" />
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-card rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-teal-600">
                  {filteredMeasurements.length}
                </div>
                <div className="text-muted-foreground text-xs">מדידות</div>
              </div>
              <div className="bg-card rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-teal-600">
                  {filteredStats.average ?? "-"}
                </div>
                <div className="text-muted-foreground text-xs">ממוצע</div>
              </div>
            </div>
            {filteredMeasurements.length > 0 && (
              <div className="flex gap-2 text-xs justify-center">
                <span className="px-2 py-1 rounded-full bg-emerald-100 text-emerald-700">
                  {filteredStats.inRange} בטווח
                </span>
                <span className="px-2 py-1 rounded-full bg-blue-100 text-blue-700">
                  {filteredStats.low} נמוך
                </span>
                <span className="px-2 py-1 rounded-full bg-red-100 text-red-700">
                  {filteredStats.high} גבוה
                </span>
              </div>
            )}
          </div>

          {/* כפתורי פעולה */}
          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={handlePrint}
              className="h-14 text-base font-semibold rounded-xl bg-gradient-to-l from-teal-600 to-teal-500 hover:from-teal-700 hover:to-teal-600"
              disabled={filteredMeasurements.length === 0}
            >
              <Printer className="w-5 h-5 ms-2" />
              הדפסה
            </Button>
            <Button
              onClick={handleDownload}
              variant="outline"
              className="h-14 text-base font-semibold rounded-xl border-2 bg-transparent"
              disabled={filteredMeasurements.length === 0}
            >
              <Download className="w-5 h-5 ms-2" />
              הורדה
            </Button>
          </div>

          {filteredMeasurements.length === 0 && (
            <p className="text-center text-muted-foreground text-sm">
              אין נתונים בתקופה הנבחרת
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
