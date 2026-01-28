/**
 * AI Router - מנתב קריאות לספקים
 * GlucoTrack AI Gateway
 */

import { Provider } from "./key-manager";
import { callGemini } from "./providers/gemini";
import { callXAI } from "./providers/xai";
import { callPerplexity } from "./providers/perplexity";

export interface AIResponse {
  text: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
  };
  citations?: string[];
}

/**
 * Call the appropriate AI provider
 */
export async function callProvider(
  provider: Provider,
  apiKey: string,
  prompt: string,
  systemPrompt?: string
): Promise<AIResponse> {
  switch (provider) {
    case "gemini":
      return callGemini(apiKey, prompt, systemPrompt);
    case "xai":
      return callXAI(apiKey, prompt, systemPrompt);
    case "perplexity":
      return callPerplexity(apiKey, prompt, systemPrompt);
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

/**
 * Get provider display name in Hebrew
 */
export function getProviderName(provider: Provider): string {
  const names: Record<Provider, string> = {
    gemini: "Gemini (Google)",
    xai: "Grok (xAI)",
    perplexity: "Perplexity",
  };
  return names[provider];
}

/**
 * Get recommended provider for different task types
 */
export function getRecommendedProvider(taskType: "analysis" | "chat" | "research"): Provider {
  switch (taskType) {
    case "analysis":
      return "gemini"; // Best for data analysis
    case "chat":
      return "xai"; // Best for conversational
    case "research":
      return "perplexity"; // Best for research with citations
    default:
      return "gemini";
  }
}
