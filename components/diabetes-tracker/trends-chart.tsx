"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
} from "@/components/ui/chart";
import { EmptyState } from "./empty-state";
import type { BloodSugarMeasurement } from "@/lib/diabetes-types";
import { getBloodSugarStatus } from "@/lib/diabetes-types";
import { formatDate, formatTime } from "@/lib/diabetes-storage";
import { TrendingUp } from "lucide-react";

interface TrendsChartProps {
  measurements: BloodSugarMeasurement[];
}

const chartConfig = {
  value: {
    label: "רמת סוכר",
    color: "hsl(var(--chart-1))",
  },
};

export function TrendsChart({ measurements }: TrendsChartProps) {
  // הכנת נתונים לגרף (מהישן לחדש לכיוון קו נכון)
  const chartData = [...measurements]
    .reverse()
    .slice(-30) // 30 מדידות אחרונות
    .map((m) => ({
      datetime: `${m.date} ${m.time}`,
      displayDate: formatDate(m.date),
      displayTime: formatTime(m.time),
      value: m.value,
      status: getBloodSugarStatus(m.value),
    }));

  if (measurements.length === 0) {
    return (
      <Card className="overflow-hidden border-0 shadow-xl bg-gradient-to-br from-card to-card/80">
        <CardHeader className="bg-gradient-to-l from-purple-500/10 to-transparent pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-purple-500/10">
              <TrendingUp className="w-5 h-5 text-purple-600" />
            </div>
            <div className="text-right">
              <CardTitle className="text-xl">מגמות</CardTitle>
              <CardDescription>
                רמות סוכר בדם לאורך זמן
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <EmptyState
            title="עדיין אין נתוני מגמות"
            description="הוסף מדידות כדי לראות את מגמות רמת הסוכר שלך מוצגות לאורך זמן."
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden border-0 shadow-xl bg-gradient-to-br from-card to-card/80">
      <CardHeader className="bg-gradient-to-l from-purple-500/10 to-transparent pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-purple-500/10">
            <TrendingUp className="w-5 h-5 text-purple-600" />
          </div>
          <div className="text-right">
            <CardTitle className="text-xl">מגמות</CardTitle>
            <CardDescription>
              {measurements.length === 1
                ? "מדידה אחת"
                : `${Math.min(measurements.length, 30)} מדידות אחרונות`}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-56 sm:h-72 lg:h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 20, right: 10, left: 0, bottom: 20 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="hsl(var(--border))"
              />
              <XAxis
                dataKey="displayDate"
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                tickMargin={10}
                interval="preserveStartEnd"
              />
              <YAxis
                domain={[40, 300]}
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                tickMargin={10}
                tickFormatter={(value) => `${value}`}
              />
              {/* קווי ייחוס לטווח תקין */}
              <ReferenceLine
                y={70}
                stroke="#3b82f6"
                strokeDasharray="5 5"
                strokeWidth={1.5}
              />
              <ReferenceLine
                y={180}
                stroke="#ef4444"
                strokeDasharray="5 5"
                strokeWidth={1.5}
              />
              <ChartTooltip
                content={({ active, payload }) => {
                  if (!active || !payload || !payload.length) return null;
                  const data = payload[0]?.payload as {
                    displayDate: string;
                    displayTime: string;
                    value: number;
                  } | undefined;
                  if (!data) return null;
                  const status = getBloodSugarStatus(data.value);
                  return (
                    <div className="bg-card border rounded-xl shadow-xl p-3 text-right">
                      <div className="font-semibold">{data.displayDate}</div>
                      <div className="text-muted-foreground text-sm">{data.displayTime}</div>
                      <div className="flex items-center gap-2 mt-2">
                        <span className={`font-bold text-xl ${status.color}`}>
                          {data.value} מ&quot;ג/ד&quot;ל
                        </span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${status.bgColor} ${status.color}`}
                        >
                          {status.label}
                        </span>
                      </div>
                    </div>
                  );
                }}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#0d9488"
                strokeWidth={3}
                dot={(props) => {
                  const { cx, cy, payload } = props;
                  const status = getBloodSugarStatus(payload.value);
                  const fillColor =
                    status.label === "נמוך"
                      ? "#3b82f6"
                      : status.label === "גבוה"
                        ? "#ef4444"
                        : "#10b981";
                  return (
                    <circle
                      key={`dot-${cx}-${cy}`}
                      cx={cx}
                      cy={cy}
                      r={5}
                      fill={fillColor}
                      stroke="white"
                      strokeWidth={2}
                    />
                  );
                }}
                activeDot={{
                  r: 7,
                  stroke: "#0d9488",
                  strokeWidth: 2,
                  fill: "white",
                }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>

        {/* מקרא */}
        <div className="flex flex-wrap justify-center gap-3 sm:gap-6 mt-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <span className="w-6 h-0.5 bg-blue-500 rounded" style={{ borderStyle: "dashed" }} />
            <span>נמוך (&lt;70)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-emerald-500" />
            <span>תקין (70-180)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-6 h-0.5 bg-red-500 rounded" style={{ borderStyle: "dashed" }} />
            <span>גבוה (&gt;180)</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
