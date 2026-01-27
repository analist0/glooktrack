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

function initKeys() {
  if (store.gemini.length) return;

  store.perplexity =
    process.env.PERPLEXITY_KEYS?.split(",").map((k) => newKey(k.trim())) || [];
  store.xai =
    process.env.XAI_KEYS?.split(",").map((k) => newKey(k.trim())) || [];
  store.gemini =
    process.env.GEMINI_KEYS?.split(",").map((k) => newKey(k.trim())) || [];
}

function newKey(key: string): KeyUsage {
  return { key, calls: 0, tokens: 0, lastUsed: 0 };
}

export function getKey(provider: Provider): KeyUsage {
  initKeys();
  const keys = store[provider].filter((k) => !k.blocked);

  if (!keys.length) throw new Error("NO_KEYS");

  return keys.sort((a, b) => a.calls - b.calls || a.lastUsed - b.lastUsed)[0];
}

export function reportUsage(provider: Provider, key: string, tokens: number) {
  const entry = store[provider].find((k) => k.key === key);
  if (!entry) return;

  entry.calls++;
  entry.tokens += tokens;
  entry.lastUsed = Date.now();
}

export function blockKey(provider: Provider, key: string) {
  const entry = store[provider].find((k) => k.key === key);
  if (entry) entry.blocked = true;
}

export function debugStats() {
  return store;
}
