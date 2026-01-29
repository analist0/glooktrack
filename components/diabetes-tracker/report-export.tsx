"use client";

import React, { useState, useRef } from "react";
import { FileText, Download, Printer, Calendar, TrendingUp, User, BarChart3 } from "lucide-react";
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
import { CONTEXT_LABELS, BLOOD_SUGAR_THRESHOLDS } from "@/lib/diabetes-types";
import { formatDate, formatTime } from "@/lib/diabetes-storage";

// HTML escape function to prevent XSS
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (char) => map[char]);
}

interface ReportExportProps {
  measurements: BloodSugarMeasurement[];
  stats: MeasurementStats;
  patientName?: string;
}

type DateRange = "week" | "month" | "3months" | "all";

const NAME_STORAGE_KEY = "diabetesPatientName";

// Helper function to generate SVG line chart
function generateLineChartSVG(measurements: BloodSugarMeasurement[]): string {
  if (measurements.length < 2) return "";

  const width = 700;
  const height = 250;
  const padding = { top: 30, right: 30, bottom: 50, left: 60 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Get last 30 measurements for the chart
  const chartData = [...measurements].slice(0, 30).reverse();
  const values = chartData.map(m => m.value);
  const minVal = Math.min(...values, 60);
  const maxVal = Math.max(...values, 200);
  const range = maxVal - minVal || 1;

  // Create points for the line
  const points = chartData.map((m, i) => {
    const x = padding.left + (i / (chartData.length - 1)) * chartWidth;
    const y = padding.top + chartHeight - ((m.value - minVal) / range) * chartHeight;
    return { x, y, value: m.value, date: m.date };
  });

  // Create path
  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  // Create area fill path
  const areaD = `${pathD} L ${points[points.length - 1].x} ${padding.top + chartHeight} L ${points[0].x} ${padding.top + chartHeight} Z`;

  // Y-axis labels
  const yLabels = [minVal, Math.round((minVal + maxVal) / 2), maxVal].map(val => {
    const y = padding.top + chartHeight - ((val - minVal) / range) * chartHeight;
    return `<text x="${padding.left - 10}" y="${y + 4}" text-anchor="end" fill="#64748b" font-size="11">${val}</text>
            <line x1="${padding.left}" y1="${y}" x2="${padding.left + chartWidth}" y2="${y}" stroke="#e2e8f0" stroke-dasharray="4"/>`;
  }).join('');

  // Reference lines for normal range
  const y70 = padding.top + chartHeight - ((BLOOD_SUGAR_THRESHOLDS.LOW - minVal) / range) * chartHeight;
  const y180 = padding.top + chartHeight - ((BLOOD_SUGAR_THRESHOLDS.HIGH - minVal) / range) * chartHeight;

  // Dots for each point with color coding
  const dots = points.map(p => {
    const color = p.value < BLOOD_SUGAR_THRESHOLDS.LOW ? '#3b82f6' : p.value > BLOOD_SUGAR_THRESHOLDS.HIGH ? '#ef4444' : '#10b981';
    return `<circle cx="${p.x}" cy="${p.y}" r="5" fill="${color}" stroke="white" stroke-width="2"/>`;
  }).join('');

  return `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg" style="background: #fafafa; border-radius: 12px;">
      <defs>
        <linearGradient id="lineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color:#0d9488;stop-opacity:0.3"/>
          <stop offset="100%" style="stop-color:#0d9488;stop-opacity:0.05"/>
        </linearGradient>
      </defs>

      <!-- Normal range highlight -->
      <rect x="${padding.left}" y="${y180}" width="${chartWidth}" height="${y70 - y180}" fill="#10b98120" rx="4"/>

      <!-- Grid and labels -->
      ${yLabels}

      <!-- Reference lines -->
      <line x1="${padding.left}" y1="${y70}" x2="${padding.left + chartWidth}" y2="${y70}" stroke="#10b981" stroke-width="1.5" stroke-dasharray="6"/>
      <text x="${padding.left + chartWidth + 5}" y="${y70 + 4}" fill="#10b981" font-size="10">${BLOOD_SUGAR_THRESHOLDS.LOW}</text>
      <line x1="${padding.left}" y1="${y180}" x2="${padding.left + chartWidth}" y2="${y180}" stroke="#f59e0b" stroke-width="1.5" stroke-dasharray="6"/>
      <text x="${padding.left + chartWidth + 5}" y="${y180 + 4}" fill="#f59e0b" font-size="10">${BLOOD_SUGAR_THRESHOLDS.HIGH}</text>

      <!-- Area fill -->
      <path d="${areaD}" fill="url(#lineGradient)"/>

      <!-- Line -->
      <path d="${pathD}" fill="none" stroke="#0d9488" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>

      <!-- Dots -->
      ${dots}

      <!-- Axis -->
      <line x1="${padding.left}" y1="${padding.top + chartHeight}" x2="${padding.left + chartWidth}" y2="${padding.top + chartHeight}" stroke="#94a3b8" stroke-width="1"/>
      <line x1="${padding.left}" y1="${padding.top}" x2="${padding.left}" y2="${padding.top + chartHeight}" stroke="#94a3b8" stroke-width="1"/>

      <!-- Title -->
      <text x="${width / 2}" y="18" text-anchor="middle" fill="#0d9488" font-size="14" font-weight="bold">מגמת רמות הסוכר (${chartData.length} מדידות אחרונות)</text>

      <!-- Y-axis label -->
      <text x="15" y="${height / 2}" text-anchor="middle" fill="#64748b" font-size="11" transform="rotate(-90, 15, ${height / 2})">מ"ג/ד"ל</text>
    </svg>
  `;
}

// Helper function to generate SVG pie chart
function generatePieChartSVG(inRange: number, low: number, high: number): string {
  const total = inRange + low + high;
  if (total === 0) return "";

  const size = 200;
  const cx = size / 2;
  const cy = size / 2;
  const radius = 70;
  const innerRadius = 40;

  function polarToCartesian(centerX: number, centerY: number, r: number, angleInDegrees: number) {
    const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
    return {
      x: centerX + (r * Math.cos(angleInRadians)),
      y: centerY + (r * Math.sin(angleInRadians))
    };
  }

  function describeArc(x: number, y: number, r: number, innerR: number, startAngle: number, endAngle: number) {
    const start = polarToCartesian(x, y, r, endAngle);
    const end = polarToCartesian(x, y, r, startAngle);
    const innerStart = polarToCartesian(x, y, innerR, endAngle);
    const innerEnd = polarToCartesian(x, y, innerR, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";

    return [
      "M", start.x, start.y,
      "A", r, r, 0, largeArcFlag, 0, end.x, end.y,
      "L", innerEnd.x, innerEnd.y,
      "A", innerR, innerR, 0, largeArcFlag, 1, innerStart.x, innerStart.y,
      "Z"
    ].join(" ");
  }

  const segments = [
    { value: inRange, color: '#10b981', label: 'בטווח' },
    { value: low, color: '#3b82f6', label: 'נמוך' },
    { value: high, color: '#ef4444', label: 'גבוה' }
  ].filter(s => s.value > 0);

  let currentAngle = 0;
  const paths = segments.map(segment => {
    const angle = (segment.value / total) * 360;
    const path = describeArc(cx, cy, radius, innerRadius, currentAngle, currentAngle + angle);
    currentAngle += angle;
    return `<path d="${path}" fill="${segment.color}" stroke="white" stroke-width="2"/>`;
  }).join('');

  return `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      ${paths}
      <circle cx="${cx}" cy="${cy}" r="${innerRadius - 5}" fill="white"/>
      <text x="${cx}" y="${cy - 5}" text-anchor="middle" fill="#0d9488" font-size="20" font-weight="bold">${total}</text>
      <text x="${cx}" y="${cy + 12}" text-anchor="middle" fill="#64748b" font-size="10">מדידות</text>
    </svg>
  `;
}

// Helper function to analyze time patterns
function analyzeTimePatterns(measurements: BloodSugarMeasurement[]): { morning: number | null; afternoon: number | null; evening: number | null; night: number | null } {
  const timeGroups = {
    morning: measurements.filter(m => {
      const hour = parseInt(m.time.split(':')[0]);
      return hour >= 5 && hour < 12;
    }),
    afternoon: measurements.filter(m => {
      const hour = parseInt(m.time.split(':')[0]);
      return hour >= 12 && hour < 17;
    }),
    evening: measurements.filter(m => {
      const hour = parseInt(m.time.split(':')[0]);
      return hour >= 17 && hour < 21;
    }),
    night: measurements.filter(m => {
      const hour = parseInt(m.time.split(':')[0]);
      return hour >= 21 || hour < 5;
    })
  };

  const calcAverage = (arr: BloodSugarMeasurement[]) =>
    arr.length > 0 ? Math.round(arr.reduce((sum, m) => sum + m.value, 0) / arr.length) : null;

  return {
    morning: calcAverage(timeGroups.morning),
    afternoon: calcAverage(timeGroups.afternoon),
    evening: calcAverage(timeGroups.evening),
    night: calcAverage(timeGroups.night)
  };
}

// Helper function to generate time analysis bar chart SVG
function generateTimeChartSVG(timeData: { morning: number | null; afternoon: number | null; evening: number | null; night: number | null }): string {
  const width = 350;
  const height = 180;
  const barWidth = 50;
  const maxValue = 250;
  const padding = { top: 30, right: 20, bottom: 40, left: 50 };
  const chartHeight = height - padding.top - padding.bottom;

  const data = [
    { label: 'בוקר', value: timeData.morning, icon: '🌅' },
    { label: 'צהריים', value: timeData.afternoon, icon: '☀️' },
    { label: 'ערב', value: timeData.evening, icon: '🌆' },
    { label: 'לילה', value: timeData.night, icon: '🌙' }
  ];

  const bars = data.map((d, i) => {
    const x = padding.left + i * (barWidth + 25) + 10;
    if (d.value === null) {
      return `
        <rect x="${x}" y="${padding.top + chartHeight - 5}" width="${barWidth}" height="5" fill="#e2e8f0" rx="3"/>
        <text x="${x + barWidth / 2}" y="${height - 10}" text-anchor="middle" fill="#64748b" font-size="10">${d.label}</text>
      `;
    }
    const barHeight = (d.value / maxValue) * chartHeight;
    const color = d.value < BLOOD_SUGAR_THRESHOLDS.LOW ? '#3b82f6' : d.value > BLOOD_SUGAR_THRESHOLDS.HIGH ? '#ef4444' : '#10b981';
    return `
      <rect x="${x}" y="${padding.top + chartHeight - barHeight}" width="${barWidth}" height="${barHeight}" fill="${color}" rx="4"/>
      <text x="${x + barWidth / 2}" y="${padding.top + chartHeight - barHeight - 8}" text-anchor="middle" fill="${color}" font-size="12" font-weight="bold">${d.value}</text>
      <text x="${x + barWidth / 2}" y="${height - 10}" text-anchor="middle" fill="#64748b" font-size="10">${d.label}</text>
    `;
  }).join('');

  // Reference lines
  const y180 = padding.top + chartHeight - (BLOOD_SUGAR_THRESHOLDS.HIGH / maxValue) * chartHeight;
  const y70 = padding.top + chartHeight - (BLOOD_SUGAR_THRESHOLDS.LOW / maxValue) * chartHeight;

  return `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg" style="background: #fafafa; border-radius: 12px;">
      <!-- Normal range -->
      <rect x="${padding.left}" y="${y180}" width="${width - padding.left - padding.right}" height="${y70 - y180}" fill="#10b98110" rx="4"/>

      <!-- Reference lines -->
      <line x1="${padding.left}" y1="${y180}" x2="${width - padding.right}" y2="${y180}" stroke="#f59e0b" stroke-width="1" stroke-dasharray="4"/>
      <line x1="${padding.left}" y1="${y70}" x2="${width - padding.right}" y2="${y70}" stroke="#10b981" stroke-width="1" stroke-dasharray="4"/>

      ${bars}

      <!-- Title -->
      <text x="${width / 2}" y="18" text-anchor="middle" fill="#0d9488" font-size="13" font-weight="bold">ממוצע לפי שעות היום</text>
    </svg>
  `;
}

// Helper function to analyze context patterns
function analyzeContextPatterns(measurements: BloodSugarMeasurement[]): { context: string; average: number; count: number }[] {
  const groups: Record<string, BloodSugarMeasurement[]> = {};

  measurements.forEach(m => {
    if (!groups[m.context]) groups[m.context] = [];
    groups[m.context].push(m);
  });

  return Object.entries(groups).map(([context, items]) => ({
    context,
    average: Math.round(items.reduce((sum, m) => sum + m.value, 0) / items.length),
    count: items.length
  })).sort((a, b) => b.count - a.count);
}

// Helper function to generate insights for report
function generateReportInsights(measurements: BloodSugarMeasurement[], filteredStats: { average: number | null; highest: number | null; lowest: number | null; inRange: number; low: number; high: number }): string[] {
  const insights: string[] = [];
  const total = filteredStats.inRange + filteredStats.low + filteredStats.high;

  if (total === 0) return insights;

  const inRangePercent = Math.round((filteredStats.inRange / total) * 100);

  // Time in range insight
  if (inRangePercent >= 70) {
    insights.push(`✅ ${inRangePercent}% מהמדידות בטווח התקין - תוצאה מצוינת!`);
  } else if (inRangePercent >= 50) {
    insights.push(`📊 ${inRangePercent}% מהמדידות בטווח התקין - יש מקום לשיפור`);
  } else {
    insights.push(`⚠️ רק ${inRangePercent}% מהמדידות בטווח התקין - מומלץ להתייעץ עם הרופא`);
  }

  // Low readings insight
  if (filteredStats.low > 0) {
    const lowPercent = Math.round((filteredStats.low / total) * 100);
    insights.push(`📉 ${filteredStats.low} מדידות נמוכות (${lowPercent}%) - יש לשים לב לתסמיני היפוגליקמיה`);
  }

  // High readings insight
  if (filteredStats.high > 0) {
    const highPercent = Math.round((filteredStats.high / total) * 100);
    if (highPercent > 30) {
      insights.push(`📈 ${filteredStats.high} מדידות גבוהות (${highPercent}%) - מומלץ לבדוק את התזונה והפעילות`);
    }
  }

  // Trend analysis
  if (measurements.length >= 7) {
    const recent = measurements.slice(0, 7).map(m => m.value);
    const older = measurements.slice(7, 14).map(m => m.value);
    if (older.length >= 3) {
      const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
      const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
      const diff = recentAvg - olderAvg;
      if (diff > 15) {
        insights.push(`📈 מגמת עלייה: הממוצע עלה ב-${Math.round(diff)} מ"ג/ד"ל בשבוע האחרון`);
      } else if (diff < -15) {
        insights.push(`📉 מגמת ירידה: הממוצע ירד ב-${Math.round(Math.abs(diff))} מ"ג/ד"ל בשבוע האחרון`);
      }
    }
  }

  // Variability
  if (filteredStats.highest != null && filteredStats.lowest != null) {
    const variability = filteredStats.highest - filteredStats.lowest;
    if (variability > 150) {
      insights.push(`⚡ תנודתיות גבוהה: טווח של ${variability} מ"ג/ד"ל בין המדידות`);
    }
  }

  return insights;
}

export function ReportExport({ measurements, stats, patientName }: ReportExportProps) {
  const [dateRange, setDateRange] = useState<DateRange>("month");
  const [isOpen, setIsOpen] = useState(false);
  const [localPatientName, setLocalPatientName] = useState("");
  const [nameSaved, setNameSaved] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);
  const nameSavedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clean up timeout on unmount
  React.useEffect(() => {
    return () => {
      if (nameSavedTimeoutRef.current) {
        clearTimeout(nameSavedTimeoutRef.current);
      }
    };
  }, []);

  // Load patient name from localStorage on mount
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const savedName = localStorage.getItem(NAME_STORAGE_KEY);
      if (savedName) {
        setLocalPatientName(savedName);
      }
    }
  }, []);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    setLocalPatientName(newName);
    setNameSaved(false);
  };

  const savePatientName = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem(NAME_STORAGE_KEY, localPatientName);
      setNameSaved(true);
      // Clear any existing timeout before setting a new one
      if (nameSavedTimeoutRef.current) {
        clearTimeout(nameSavedTimeoutRef.current);
      }
      nameSavedTimeoutRef.current = setTimeout(() => setNameSaved(false), 2000);
    }
  };

  const getPatientName = () => {
    if (patientName) return patientName;
    if (localPatientName) return localPatientName;
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
    
    const inRange = filteredMeasurements.filter((m) => m.value >= BLOOD_SUGAR_THRESHOLDS.LOW && m.value <= BLOOD_SUGAR_THRESHOLDS.HIGH).length;
    const low = filteredMeasurements.filter((m) => m.value < BLOOD_SUGAR_THRESHOLDS.LOW).length;
    const high = filteredMeasurements.filter((m) => m.value > BLOOD_SUGAR_THRESHOLDS.HIGH).length;

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

    // Generate advanced analysis data
    const lineChart = generateLineChartSVG(filteredMeasurements);
    const pieChart = generatePieChartSVG(filteredStats.inRange, filteredStats.low, filteredStats.high);
    const timeData = analyzeTimePatterns(filteredMeasurements);
    const timeChart = generateTimeChartSVG(timeData);
    const contextPatterns = analyzeContextPatterns(filteredMeasurements);
    const insights = generateReportInsights(filteredMeasurements, filteredStats);

    return `
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
  <meta charset="UTF-8">
  <title>דו"ח מעקב סוכרת - ${escapeHtml(name)}</title>
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
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 3px solid #0d9488;
      background: linear-gradient(135deg, #f0fdfa 0%, #ccfbf1 100%);
      margin: -40px -40px 30px -40px;
      padding: 40px;
    }
    .header h1 {
      color: #0d9488;
      font-size: 32px;
      margin-bottom: 8px;
      text-shadow: 0 1px 2px rgba(0,0,0,0.1);
    }
    .header .subtitle {
      color: #115e59;
      font-size: 16px;
      font-weight: 500;
    }
    .patient-info {
      background: #fff;
      padding: 24px;
      border-radius: 16px;
      margin-bottom: 30px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06);
      border: 1px solid #e2e8f0;
    }
    .patient-info .name {
      font-size: 24px;
      font-weight: bold;
      color: #0d9488;
    }
    .patient-info .date {
      color: #64748b;
      font-size: 14px;
      text-align: left;
    }
    .section-title {
      color: #0d9488;
      font-size: 20px;
      margin-bottom: 16px;
      padding-bottom: 8px;
      border-bottom: 2px solid #ccfbf1;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .section-title::before {
      content: '';
      width: 4px;
      height: 24px;
      background: linear-gradient(180deg, #0d9488, #10b981);
      border-radius: 2px;
    }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
      margin-bottom: 30px;
    }
    .stat-card {
      background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
      padding: 20px 16px;
      border-radius: 16px;
      text-align: center;
      border: 1px solid #e2e8f0;
      transition: transform 0.2s;
    }
    .stat-card .value {
      font-size: 36px;
      font-weight: bold;
      color: #0d9488;
    }
    .stat-card .label {
      color: #64748b;
      font-size: 13px;
      margin-top: 4px;
      font-weight: 500;
    }
    .stat-card.low .value { color: #2563eb; }
    .stat-card.high .value { color: #dc2626; }
    .stat-card.count .value { color: #7c3aed; }

    .charts-section {
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: 24px;
      margin-bottom: 30px;
    }
    .chart-box {
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      padding: 20px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.05);
    }
    .chart-box h3 {
      color: #0d9488;
      margin-bottom: 16px;
      font-size: 16px;
    }
    .chart-box svg {
      display: block;
      margin: 0 auto;
    }

    .analysis-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
      margin-bottom: 30px;
    }

    .insights-box {
      background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
      border: 1px solid #93c5fd;
      border-radius: 16px;
      padding: 24px;
      margin-bottom: 30px;
    }
    .insights-box h3 {
      color: #1e40af;
      margin-bottom: 16px;
      font-size: 18px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .insights-box ul {
      list-style: none;
    }
    .insights-box li {
      padding: 10px 12px;
      background: rgba(255,255,255,0.7);
      border-radius: 8px;
      margin-bottom: 8px;
      font-size: 14px;
      color: #1e3a8a;
    }
    .insights-box li:last-child { margin-bottom: 0; }

    .distribution-section {
      display: grid;
      grid-template-columns: 200px 1fr;
      gap: 24px;
      align-items: center;
      margin-bottom: 30px;
      background: #fff;
      border: 2px solid #0d9488;
      border-radius: 16px;
      padding: 24px;
    }
    .distribution-legend {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .legend-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px;
      background: #f8fafc;
      border-radius: 8px;
    }
    .legend-color {
      width: 16px;
      height: 16px;
      border-radius: 4px;
    }
    .legend-color.normal { background: #10b981; }
    .legend-color.low { background: #3b82f6; }
    .legend-color.high { background: #ef4444; }

    .context-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 14px;
      margin-bottom: 30px;
    }
    .context-table th {
      background: linear-gradient(135deg, #0d9488, #0f766e);
      color: white;
      padding: 14px 16px;
      text-align: right;
      font-weight: 600;
    }
    .context-table th:first-child { border-radius: 0 12px 0 0; }
    .context-table th:last-child { border-radius: 12px 0 0 0; }
    .context-table td {
      padding: 14px 16px;
      border-bottom: 1px solid #e2e8f0;
    }
    .context-table tr:nth-child(even) { background: #f8fafc; }
    .context-table tr:hover { background: #f0fdfa; }

    .time-analysis {
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      padding: 24px;
    }

    .table-container {
      margin-top: 30px;
      page-break-before: always;
    }
    .table-container h3 {
      color: #0d9488;
      margin-bottom: 16px;
      font-size: 18px;
    }
    table.measurements-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }
    .measurements-table th {
      background: linear-gradient(135deg, #0d9488, #0f766e);
      color: white;
      padding: 12px;
      text-align: right;
      font-weight: 600;
    }
    .measurements-table td {
      padding: 10px 12px;
      border-bottom: 1px solid #e2e8f0;
    }
    .measurements-table tr:nth-child(even) { background: #f8fafc; }
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
      border: 2px dashed #94a3b8;
      border-radius: 16px;
      background: #fafafa;
    }
    .doctor-section h4 {
      margin-bottom: 20px;
      color: #475569;
      font-size: 18px;
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
      body { padding: 20px; font-size: 12px; }
      .no-print { display: none; }
      .header { margin: -20px -20px 20px -20px; padding: 20px; }
      .charts-section, .analysis-grid { page-break-inside: avoid; }
      .stat-card .value { font-size: 28px; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>📊 דו"ח מעקב רמות סוכר בדם</h1>
    <p class="subtitle">גלוקוטרק - מערכת מעקב סוכרת מתקדמת</p>
  </div>

  <div class="patient-info">
    <div>
      <div class="name">👤 ${escapeHtml(name)}</div>
      <div style="color: #64748b; margin-top: 4px;">תקופת הדו"ח: <strong>${rangeLabels[dateRange]}</strong></div>
    </div>
    <div class="date">
      <div>תאריך הפקת הדו"ח:</div>
      <div style="font-size: 18px; font-weight: bold; color: #0d9488;">${reportDate}</div>
    </div>
  </div>

  <!-- סטטיסטיקות מהירות -->
  <h2 class="section-title">סיכום מהיר</h2>
  <div class="stats-grid">
    <div class="stat-card count">
      <div class="value">${filteredMeasurements.length}</div>
      <div class="label">סה"כ מדידות</div>
    </div>
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

  ${insights.length > 0 ? `
  <!-- תובנות -->
  <div class="insights-box">
    <h3>💡 תובנות ומגמות</h3>
    <ul>
      ${insights.map(insight => `<li>${insight}</li>`).join('')}
    </ul>
  </div>
  ` : ''}

  <!-- גרפים -->
  ${lineChart ? `
  <h2 class="section-title">גרף מגמות</h2>
  <div class="charts-section">
    <div class="chart-box">
      ${lineChart}
    </div>
    <div class="time-analysis">
      <h3>⏰ ניתוח לפי שעות</h3>
      ${timeChart}
    </div>
  </div>
  ` : ''}

  <!-- התפלגות -->
  <h2 class="section-title">התפלגות המדידות</h2>
  <div class="distribution-section">
    <div style="text-align: center;">
      ${pieChart}
    </div>
    <div class="distribution-legend">
      <div class="legend-item">
        <div class="legend-color normal"></div>
        <div>
          <strong style="color: #10b981">${filteredStats.inRange}</strong>
          <span style="color: #64748b;"> מדידות בטווח (${BLOOD_SUGAR_THRESHOLDS.LOW}-${BLOOD_SUGAR_THRESHOLDS.HIGH}) - </span>
          <strong style="color: #10b981">${filteredMeasurements.length > 0 ? Math.round((filteredStats.inRange / filteredMeasurements.length) * 100) : 0}%</strong>
        </div>
      </div>
      <div class="legend-item">
        <div class="legend-color low"></div>
        <div>
          <strong style="color: #3b82f6">${filteredStats.low}</strong>
          <span style="color: #64748b;"> מדידות נמוכות (&lt;${BLOOD_SUGAR_THRESHOLDS.LOW}) - </span>
          <strong style="color: #3b82f6">${filteredMeasurements.length > 0 ? Math.round((filteredStats.low / filteredMeasurements.length) * 100) : 0}%</strong>
        </div>
      </div>
      <div class="legend-item">
        <div class="legend-color high"></div>
        <div>
          <strong style="color: #ef4444">${filteredStats.high}</strong>
          <span style="color: #64748b;"> מדידות גבוהות (&gt;${BLOOD_SUGAR_THRESHOLDS.HIGH}) - </span>
          <strong style="color: #ef4444">${filteredMeasurements.length > 0 ? Math.round((filteredStats.high / filteredMeasurements.length) * 100) : 0}%</strong>
        </div>
      </div>
    </div>
  </div>

  <!-- ניתוח לפי הקשר -->
  ${contextPatterns.length > 0 ? `
  <h2 class="section-title">ניתוח לפי הקשר מדידה</h2>
  <table class="context-table">
    <thead>
      <tr>
        <th>הקשר</th>
        <th>מספר מדידות</th>
        <th>ממוצע</th>
        <th>מצב</th>
      </tr>
    </thead>
    <tbody>
      ${contextPatterns.map(cp => {
        const statusColor = cp.average < BLOOD_SUGAR_THRESHOLDS.LOW ? '#3b82f6' : cp.average > BLOOD_SUGAR_THRESHOLDS.HIGH ? '#ef4444' : '#10b981';
        const statusText = cp.average < BLOOD_SUGAR_THRESHOLDS.LOW ? 'נמוך' : cp.average > BLOOD_SUGAR_THRESHOLDS.HIGH ? 'גבוה' : 'תקין';
        return `
        <tr>
          <td><strong>${CONTEXT_LABELS[cp.context as keyof typeof CONTEXT_LABELS] || cp.context}</strong></td>
          <td>${cp.count}</td>
          <td style="color: ${statusColor}; font-weight: bold;">${cp.average} מ"ג/ד"ל</td>
          <td><span style="background: ${statusColor}20; color: ${statusColor}; padding: 4px 12px; border-radius: 20px; font-size: 12px;">${statusText}</span></td>
        </tr>
      `;
      }).join('')}
    </tbody>
  </table>
  ` : ''}

  <!-- טבלת מדידות -->
  <div class="table-container">
    <h2 class="section-title">פירוט המדידות</h2>
    <table class="measurements-table">
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
            const valueClass = m.value < BLOOD_SUGAR_THRESHOLDS.LOW ? "value-low" : m.value > BLOOD_SUGAR_THRESHOLDS.HIGH ? "value-high" : "value-normal";
            return `
            <tr>
              <td>${formatDate(m.date)}</td>
              <td>${formatTime(m.time)}</td>
              <td class="${valueClass}">${m.value}</td>
              <td>${CONTEXT_LABELS[m.context]}</td>
              <td>${m.notes ? escapeHtml(m.notes) : "-"}</td>
            </tr>
          `;
          })
          .join("")}
      </tbody>
    </table>
    ${filteredMeasurements.length > 50 ? `<p style="margin-top: 16px; color: #64748b; font-size: 14px; text-align: center;">* מוצגות 50 המדידות האחרונות מתוך ${filteredMeasurements.length}</p>` : ""}
  </div>

  <!-- אזור לרופא -->
  <div class="doctor-section">
    <h4>📋 לשימוש הרופא המטפל</h4>
    <p style="margin-bottom: 16px; color: #64748b;">הערות והמלצות:</p>
    <div style="min-height: 120px; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; background: white;"></div>

    <div class="signature-line">
      <div class="signature-box">
        <div class="line"></div>
        <div>חתימת הרופא</div>
      </div>
      <div class="signature-box">
        <div class="line"></div>
        <div>תאריך</div>
      </div>
      <div class="signature-box">
        <div class="line"></div>
        <div>חותמת מרפאה</div>
      </div>
    </div>
  </div>

  <div class="footer">
    <p style="font-size: 14px; color: #0d9488; font-weight: 600;">דו"ח זה הופק אוטומטית ממערכת גלוקוטרק למעקב סוכרת</p>
    <p style="margin-top: 8px;">⚠️ הנתונים מבוססים על הזנות המשתמש ואינם מהווים ייעוץ רפואי. יש להתייעץ עם רופא.</p>
    <p style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #e2e8f0;">
      <strong>פיתוח:</strong> יוסף אלישר | 📞 058-4423342
    </p>
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
          className="group w-full h-12 sm:h-14 text-base font-semibold rounded-xl border-2 border-teal-200 dark:border-teal-700 hover:bg-teal-50 dark:hover:bg-teal-950/30 hover:border-teal-300 dark:hover:border-teal-600 transition-all duration-300 bg-transparent hover:-translate-y-0.5 hover:shadow-lg"
        >
          <FileText className="w-5 h-5 ms-2 transition-transform duration-300 group-hover:scale-110" />
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
          {/* שם המטופל */}
          <div className="space-y-2 text-right">
            <Label className="text-sm font-semibold flex items-center gap-2 justify-end">
              שם לדו"ח
              <User className="w-4 h-4 text-muted-foreground" />
            </Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={nameSaved ? "default" : "outline"}
                size="sm"
                onClick={savePatientName}
                className={`h-12 px-4 transition-all ${nameSaved ? 'bg-emerald-500 hover:bg-emerald-600' : ''}`}
                disabled={!localPatientName.trim()}
              >
                {nameSaved ? '✓ נשמר' : 'שמור'}
              </Button>
              <input
                type="text"
                value={localPatientName}
                onChange={handleNameChange}
                placeholder="הזן את שמך"
                className="flex-1 h-12 px-4 text-right rounded-xl border border-input bg-background text-base"
                dir="rtl"
              />
            </div>
            <p className="text-xs text-muted-foreground">השם יישמר ויופיע בכל הדוחות שלך</p>
          </div>

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
                <span className="px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">
                  {filteredStats.inRange} בטווח
                </span>
                <span className="px-2 py-1 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
                  {filteredStats.low} נמוך
                </span>
                <span className="px-2 py-1 rounded-full bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300">
                  {filteredStats.high} גבוה
                </span>
              </div>
            )}
          </div>

          {/* מה כלול בדו"ח */}
          <div className="bg-gradient-to-l from-teal-50 to-emerald-50 dark:from-teal-950/30 dark:to-emerald-950/30 rounded-xl p-4 border border-teal-100 dark:border-teal-800">
            <div className="flex items-center gap-2 justify-end text-sm font-semibold text-teal-800 dark:text-teal-200 mb-3">
              <span>מה כלול בדו"ח המתקדם</span>
              <BarChart3 className="w-4 h-4" />
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs text-teal-700 dark:text-teal-300">
              <div className="flex items-center gap-1.5 justify-end">
                <span>גרף מגמות אינטראקטיבי</span>
                <span>📈</span>
              </div>
              <div className="flex items-center gap-1.5 justify-end">
                <span>תרשים עוגה להתפלגות</span>
                <span>🥧</span>
              </div>
              <div className="flex items-center gap-1.5 justify-end">
                <span>ניתוח לפי שעות היום</span>
                <span>⏰</span>
              </div>
              <div className="flex items-center gap-1.5 justify-end">
                <span>תובנות חכמות</span>
                <span>💡</span>
              </div>
              <div className="flex items-center gap-1.5 justify-end">
                <span>ניתוח לפי הקשר</span>
                <span>📊</span>
              </div>
              <div className="flex items-center gap-1.5 justify-end">
                <span>אזור לרופא</span>
                <span>📋</span>
              </div>
            </div>
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
