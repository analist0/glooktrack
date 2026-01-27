import { Provider } from "./key-manager";

const COSTS_PER_TOKEN: Record<Provider, number> = {
  perplexity: 0.0002,
  xai: 0.00015,
  gemini: 0.0001,
};

export function estimate(prompt: string, provider: Provider) {
  const tokens = Math.ceil(prompt.length / 4);
  const cost = tokens * COSTS_PER_TOKEN[provider];

  return {
    tokens,
    costUSD: Number(cost.toFixed(6)),
  };
}
