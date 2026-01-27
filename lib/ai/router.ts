import {
  Provider,
  getKey,
  reportUsage,
  blockKey,
  getFallbackOrder,
  hasAvailableKeys,
} from "./key-manager";
import { estimate } from "./usage-engine";
import { callGemini } from "./providers/gemini";
import { callXAI } from "./providers/xai";
import { callPerplexity } from "./providers/perplexity";

export async function callProvider(
  provider: Provider,
  key: string,
  prompt: string
) {
  switch (provider) {
    case "gemini":
      return callGemini(key, prompt);
    case "xai":
      return callXAI(key, prompt);
    case "perplexity":
      return callPerplexity(key, prompt);
    default:
      throw new Error("Unknown provider");
  }
}

export type GatewayResult = {
  ok: true;
  provider: Provider;
  usage: { tokens: number; costUSD: number };
  result: string;
  fallbackUsed: boolean;
};

export async function callWithFallback(
  preferred: Provider,
  prompt: string
): Promise<GatewayResult> {
  const chain = getFallbackOrder(preferred);
  let lastError: unknown;

  for (const provider of chain) {
    if (!hasAvailableKeys(provider)) continue;

    const keyData = getKey(provider);
    const usage = estimate(prompt, provider);

    try {
      const result = await callProvider(provider, keyData.key, prompt);
      reportUsage(provider, keyData.key, usage.tokens);

      return {
        ok: true,
        provider,
        usage,
        result,
        fallbackUsed: provider !== preferred,
      };
    } catch (err: unknown) {
      const status =
        err instanceof Response
          ? err.status
          : (err as { status?: number })?.status;

      if (status === 401 || status === 429) {
        blockKey(provider, keyData.key);
      }

      lastError = err;
    }
  }

  throw lastError ?? new Error("All providers failed");
}
