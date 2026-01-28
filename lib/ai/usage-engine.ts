/**
 * AI Usage Engine - חישוב טוקנים ועלויות
 * GlucoTrack AI Gateway
 */

import { Provider } from "./key-manager";

// Approximate costs per 1K tokens (input + output average)
const COSTS_PER_1K_TOKENS: Record<Provider, number> = {
  perplexity: 0.20,  // $0.20 per 1K tokens (sonar-pro)
  xai: 0.15,         // $0.15 per 1K tokens (grok-2)
  gemini: 0.075,     // $0.075 per 1K tokens (gemini-pro)
};

// Model-specific token limits
const TOKEN_LIMITS: Record<Provider, number> = {
  perplexity: 4096,
  xai: 8192,
  gemini: 32768,
};

/**
 * Estimate token count from text
 * Rough estimation: ~4 characters per token for English
 * Hebrew tends to be more compact, so we use ~3.5
 */
export function estimateTokens(text: string): number {
  // Hebrew detection
  const hebrewChars = (text.match(/[\u0590-\u05FF]/g) || []).length;
  const isHebrew = hebrewChars > text.length * 0.3;

  const charsPerToken = isHebrew ? 3.5 : 4;
  return Math.ceil(text.length / charsPerToken);
}

/**
 * Estimate cost for a prompt
 */
export function estimateCost(prompt: string, provider: Provider): {
  inputTokens: number;
  estimatedOutputTokens: number;
  totalTokens: number;
  costUSD: number;
} {
  const inputTokens = estimateTokens(prompt);
  // Estimate output as roughly 1.5x input for analysis tasks
  const estimatedOutputTokens = Math.ceil(inputTokens * 1.5);
  const totalTokens = inputTokens + estimatedOutputTokens;

  const costPer1K = COSTS_PER_1K_TOKENS[provider];
  const costUSD = (totalTokens / 1000) * costPer1K;

  return {
    inputTokens,
    estimatedOutputTokens,
    totalTokens,
    costUSD: Number(costUSD.toFixed(6)),
  };
}

/**
 * Check if prompt is within token limit
 */
export function isWithinLimit(prompt: string, provider: Provider): boolean {
  const tokens = estimateTokens(prompt);
  return tokens < TOKEN_LIMITS[provider] * 0.8; // 80% safety margin
}

/**
 * Get token limit for provider
 */
export function getTokenLimit(provider: Provider): number {
  return TOKEN_LIMITS[provider];
}

/**
 * Format cost for display
 */
export function formatCost(costUSD: number): string {
  if (costUSD < 0.01) {
    return `$${(costUSD * 100).toFixed(2)}¢`;
  }
  return `$${costUSD.toFixed(4)}`;
}

/**
 * Calculate actual usage from API response
 */
export function calculateActualUsage(
  provider: Provider,
  inputTokens: number,
  outputTokens: number
): {
  totalTokens: number;
  costUSD: number;
} {
  const totalTokens = inputTokens + outputTokens;
  const costPer1K = COSTS_PER_1K_TOKENS[provider];
  const costUSD = (totalTokens / 1000) * costPer1K;

  return {
    totalTokens,
    costUSD: Number(costUSD.toFixed(6)),
  };
}
