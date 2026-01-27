import { debugStats, ALL_PROVIDERS } from "@/lib/ai/key-manager";

export async function GET() {
  const raw = debugStats();

  const summary = ALL_PROVIDERS.map((provider) => {
    const keys = raw[provider];
    return {
      provider,
      totalKeys: keys.length,
      activeKeys: keys.filter((k) => !k.blocked).length,
      blockedKeys: keys.filter((k) => k.blocked).length,
      totalCalls: keys.reduce((sum, k) => sum + k.calls, 0),
      totalTokens: keys.reduce((sum, k) => sum + k.tokens, 0),
    };
  });

  return Response.json({ ok: true, providers: summary });
}
