export type Provider = "perplexity" | "xai" | "gemini";

export type KeyUsage = {
  key: string;
  calls: number;
  tokens: number;
  lastUsed: number;
  blocked?: boolean;
};

const store: Record<Provider, KeyUsage[]> = {
  perplexity: [],
  xai: [],
  gemini: [],
};

/**
 * Populate the in-memory key store from environment variables if it has not been initialized.
 *
 * Reads PERPLEXITY_KEYS, XAI_KEYS, and GEMINI_KEYS (comma-separated) and converts each entry
 * into a KeyUsage. If any variable is absent, the corresponding provider is set to an empty array.
 * If the store already contains Gemini keys, the function returns immediately without modifying the store.
 */
function initKeys() {
  if (store.gemini.length) return;

  store.perplexity =
    process.env.PERPLEXITY_KEYS?.split(",").map((k) => newKey(k.trim())) || [];
  store.xai =
    process.env.XAI_KEYS?.split(",").map((k) => newKey(k.trim())) || [];
  store.gemini =
    process.env.GEMINI_KEYS?.split(",").map((k) => newKey(k.trim())) || [];
}

/**
 * Create a new KeyUsage record initialized for tracking usage of the given API key.
 *
 * @param key - The raw API key string to track
 * @returns A `KeyUsage` object with `key` set to `key`, `calls` = 0, `tokens` = 0, and `lastUsed` = 0
 */
function newKey(key: string): KeyUsage {
  return { key, calls: 0, tokens: 0, lastUsed: 0 };
}

/**
 * Selects the least-used, oldest unblocked API key for the specified provider.
 *
 * @returns The selected `KeyUsage` entry for that provider.
 * @throws Error with message `"NO_KEYS"` if no unblocked keys are available for the provider.
 */
export function getKey(provider: Provider): KeyUsage {
  initKeys();
  const keys = store[provider].filter((k) => !k.blocked);

  if (!keys.length) throw new Error("NO_KEYS");

  return keys.sort((a, b) => a.calls - b.calls || a.lastUsed - b.lastUsed)[0];
}

/**
 * Record usage for a provider key by incrementing its call count, adding token usage, and updating last-used time.
 *
 * If the specified key is not present for the provider, the function does nothing.
 *
 * @param provider - The provider whose key usage should be recorded
 * @param key - The API key identifier to update
 * @param tokens - Number of tokens to add to the key's cumulative token count
 */
export function reportUsage(provider: Provider, key: string, tokens: number) {
  const entry = store[provider].find((k) => k.key === key);
  if (!entry) return;

  entry.calls++;
  entry.tokens += tokens;
  entry.lastUsed = Date.now();
}

/**
 * Mark a provider API key as blocked so it will be excluded from future selection.
 *
 * @param provider - The provider containing the key to block
 * @param key - The exact API key string to mark as blocked
 */
export function blockKey(provider: Provider, key: string) {
  const entry = store[provider].find((k) => k.key === key);
  if (entry) entry.blocked = true;
}

/**
 * Return the current in-memory key usage store for all providers.
 *
 * @returns A record mapping each Provider to an array of KeyUsage objects representing current usage counts, token totals, last-used timestamps, and optional blocked state.
 */
export function debugStats() {
  return store;
}