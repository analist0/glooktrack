/**
 * AI Gateway API Route
 * GlucoTrack - ניתוח סוכרת עם בינה מלאכותית
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getKey,
  reportUsage,
  reportError,
  blockKey,
  getAvailableProviders,
  getStats,
  Provider,
} from "@/lib/ai/key-manager";
import { estimateCost, calculateActualUsage } from "@/lib/ai/usage-engine";
import { callProvider, getRecommendedProvider } from "@/lib/ai/router";
import { BLOOD_SUGAR_THRESHOLDS } from "@/lib/diabetes-types";

// Log conversation to Supabase (non-blocking)
async function logConversation(data: {
  userId?: string;
  provider: string;
  userMessage: string;
  aiResponse: string;
  taskType: string;
  tokensUsed: number;
  costEstimate: number;
}) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key || !data.userId) return;

    const { createClient } = await import("@supabase/supabase-js");
    const sb = createClient(url, key);
    await sb.from("ai_conversations").insert({
      user_id: data.userId,
      provider: data.provider,
      user_message: data.userMessage,
      ai_response: data.aiResponse,
      task_type: data.taskType,
      tokens_used: data.tokensUsed,
      cost_estimate: data.costEstimate,
    });
  } catch {
    // Non-critical, ignore errors
  }
}

// System prompt for GlucoTrack AI Assistant
const GLUCOTRACK_SYSTEM_PROMPT = `אתה עוזר AI מומחה לניהול סוכרת בשם "גלוקו-AI".
תפקידך לעזור למשתמשים להבין את נתוני הסוכר שלהם ולתת תובנות מועילות.

כללים חשובים:
1. תמיד ענה בעברית
2. היה אמפתי ותומך
3. אל תתן ייעוץ רפואי - המלץ תמיד להתייעץ עם רופא
4. התמקד בדפוסים, מגמות והמלצות כלליות
5. השתמש באימוג'ים כדי להפוך את התשובות לידידותיות
6. היה קצר וממוקד - 2-3 פסקאות מקסימום

טווחי סוכר תקינים:
- צום: 70-100 מ"ג/ד"ל
- לפני אוכל: 70-130 מ"ג/ד"ל
- שעתיים אחרי אוכל: מתחת ל-180 מ"ג/ד"ל
- נמוך (היפוגליקמיה): מתחת ל-70 מ"ג/ד"ל
- גבוה (היפרגליקמיה): מעל 180 מ"ג/ד"ל`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      prompt,
      provider: requestedProvider,
      measurements,
      taskType = "analysis",
      userId,
    } = body as {
      prompt: string;
      provider?: Provider;
      userId?: string;
      measurements?: Array<{
        value: number;
        date: string;
        time: string;
        context: string;
      }>;
      taskType?: "analysis" | "chat" | "research";
    };

    if (!prompt) {
      return NextResponse.json(
        { ok: false, error: "Prompt is required" },
        { status: 400 }
      );
    }

    // Get available providers
    const availableProviders = getAvailableProviders();
    if (availableProviders.length === 0) {
      return NextResponse.json(
        { ok: false, error: "No AI providers available" },
        { status: 503 }
      );
    }

    // Select provider
    let provider: Provider;
    if (requestedProvider && availableProviders.includes(requestedProvider)) {
      provider = requestedProvider;
    } else {
      // Use recommended provider or first available
      const recommended = getRecommendedProvider(taskType);
      provider = availableProviders.includes(recommended)
        ? recommended
        : availableProviders[0];
    }

    // Build the full prompt with context
    let fullPrompt = prompt;

    // Add measurements context if provided
    if (measurements && measurements.length > 0) {
      const measurementsContext = buildMeasurementsContext(measurements);
      fullPrompt = `${measurementsContext}\n\nשאלת המשתמש: ${prompt}`;
    }

    // Get API key
    const keyData = getKey(provider);
    const costEstimate = estimateCost(fullPrompt, provider);

    try {
      // Call the AI provider
      const response = await callProvider(
        provider,
        keyData.key,
        fullPrompt,
        GLUCOTRACK_SYSTEM_PROMPT
      );

      // Calculate actual usage
      const actualUsage = response.usage
        ? calculateActualUsage(
            provider,
            response.usage.promptTokens,
            response.usage.completionTokens
          )
        : costEstimate;

      // Report usage (async, non-blocking)
      await reportUsage(provider, keyData.key, actualUsage.totalTokens, actualUsage.costUSD);

      // Log conversation (non-blocking)
      logConversation({
        userId,
        provider,
        userMessage: prompt,
        aiResponse: response.text,
        taskType,
        tokensUsed: actualUsage.totalTokens,
        costEstimate: actualUsage.costUSD,
      }).catch(() => {});

      return NextResponse.json({
        ok: true,
        provider,
        result: response.text,
        usage: {
          tokens: actualUsage.totalTokens,
          costUSD: actualUsage.costUSD,
        },
        citations: response.citations,
      });
    } catch (err: unknown) {
      const error = err as Error & { status?: number };

      // Handle specific error codes
      if (error.status === 401 || error.status === 403) {
        blockKey(provider, keyData.key);
      } else if (error.status === 429) {
        reportError(provider, keyData.key);
      } else {
        reportError(provider, keyData.key);
      }

      // Try fallback provider
      const fallbackProviders = availableProviders.filter(p => p !== provider);
      if (fallbackProviders.length > 0) {
        const fallbackProvider = fallbackProviders[0];
        try {
          const fallbackKey = getKey(fallbackProvider);
          const fallbackResponse = await callProvider(
            fallbackProvider,
            fallbackKey.key,
            fullPrompt,
            GLUCOTRACK_SYSTEM_PROMPT
          );

          const fallbackUsage = fallbackResponse.usage
            ? calculateActualUsage(
                fallbackProvider,
                fallbackResponse.usage.promptTokens,
                fallbackResponse.usage.completionTokens
              )
            : estimateCost(fullPrompt, fallbackProvider);

          await reportUsage(fallbackProvider, fallbackKey.key, fallbackUsage.totalTokens, fallbackUsage.costUSD);

          return NextResponse.json({
            ok: true,
            provider: fallbackProvider,
            result: fallbackResponse.text,
            usage: {
              tokens: fallbackUsage.totalTokens,
              costUSD: fallbackUsage.costUSD,
            },
            citations: fallbackResponse.citations,
            fallback: true,
          });
        } catch {
          // Fallback also failed
        }
      }

      throw error;
    }
  } catch (err) {
    console.error("AI Gateway error:", err);

    return NextResponse.json(
      {
        ok: false,
        error: "AI service temporarily unavailable",
        message: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * Build context string from measurements
 */
function buildMeasurementsContext(
  measurements: Array<{
    value: number;
    date: string;
    time: string;
    context: string;
  }>
): string {
  const contextLabels: Record<string, string> = {
    fasting: "צום",
    "before-meal": "לפני אוכל",
    "after-meal": "אחרי אוכל",
    "before-sleep": "לפני שינה",
    other: "אחר",
  };

  // Calculate stats
  const values = measurements.map(m => m.value);
  const avg = Math.round(values.reduce((a, b) => a + b, 0) / values.length);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const inRange = values.filter(v => v >= BLOOD_SUGAR_THRESHOLDS.LOW && v <= BLOOD_SUGAR_THRESHOLDS.HIGH).length;
  const inRangePercent = Math.round((inRange / values.length) * 100);

  // Recent measurements (last 10)
  const recent = measurements.slice(0, 10);
  const recentList = recent
    .map(
      m =>
        `- ${m.date} ${m.time}: ${m.value} מ"ג/ד"ל (${contextLabels[m.context] || m.context})`
    )
    .join("\n");

  return `נתוני מדידות הסוכר של המשתמש:

📊 סטטיסטיקות:
- סה"כ מדידות: ${measurements.length}
- ממוצע: ${avg} מ"ג/ד"ל
- נמוך ביותר: ${min} מ"ג/ד"ל
- גבוה ביותר: ${max} מ"ג/ד"ל
- בטווח התקין: ${inRangePercent}%

📋 ${recent.length} מדידות אחרונות:
${recentList}`;
}

// GET endpoint to check AI status and get stats
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const includeStats = searchParams.get("stats") === "true";

  const providers = getAvailableProviders();

  const response: {
    ok: boolean;
    availableProviders: Provider[];
    status: string;
    stats?: Awaited<ReturnType<typeof getStats>>;
  } = {
    ok: true,
    availableProviders: providers,
    status: providers.length > 0 ? "operational" : "no_keys_configured",
  };

  // Include stats if requested
  if (includeStats) {
    response.stats = await getStats();
  }

  return NextResponse.json(response);
}
