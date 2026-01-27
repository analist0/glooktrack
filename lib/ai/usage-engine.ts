import { Provider } from "./key-manager";

const COSTS_PER_TOKEN: Record<Provider, number> = {
  perplexity: 0.0002,
  xai: 0.00015,
  gemini: 0.0001,
};

/**
 * Estimate token usage and USD cost for a prompt with a given provider.
 *
 * @param prompt - Input text to estimate token usage for.
 * @param provider - Provider whose per-token pricing is used for the estimate.
 * @returns An object containing `tokens` (estimated token count) and `costUSD` (estimated cost in USD, rounded to six decimal places)
 */
export function estimate(prompt: string, provider: Provider) {
  const tokens = Math.ceil(prompt.length / 4);
  const cost = tokens * COSTS_PER_TOKEN[provider];

  return {
    tokens,
    costUSD: Number(cost.toFixed(6)),
  };
}