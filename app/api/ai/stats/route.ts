/**
 * AI Stats API Endpoint
 * GlucoTrack AI Gateway
 */

import { NextResponse } from "next/server";
import { getStats, debugStats, getAvailableProviders } from "@/lib/ai/key-manager";

export async function GET() {
  try {
    const stats = await getStats();
    const providers = getAvailableProviders();
    const providerStats = debugStats();

    return NextResponse.json({
      ok: true,
      availableProviders: providers,
      stats: stats.global,
      today: stats.today,
      providers: Object.entries(providerStats).map(([provider, data]) => ({
        provider,
        totalKeys: data.total,
        activeKeys: data.available,
        blockedKeys: data.total - data.available,
        totalCalls: data.totalCalls,
        totalTokens: data.totalTokens,
      })),
    });
  } catch (error) {
    console.error("Stats error:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to get stats" },
      { status: 500 }
    );
  }
}
