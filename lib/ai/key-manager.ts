/**
 * AI Key Manager - ניהול מפתחות עם רוטציה וחסימה
 * GlucoTrack AI Gateway
 */

export type Provider = "perplexity" | "xai" | "gemini";

export type KeyUsage = {
  key: string;
  calls: number;
  tokens: number;
  lastUsed: number;
  blocked?: boolean;
  errorCount?: number;
};

// In-memory store for keys
const store: Record<Provider, KeyUsage[]> = {
  perplexity: [],
  xai: [],
  gemini: []
};

let initialized = false;

function newKey(key: string): KeyUsage {
  return {
    key: key.trim(),
    calls: 0,
    tokens: 0,
    lastUsed: 0,
    errorCount: 0
  };
}

function initKeys() {
  if (initialized) return;

  const perplexityKeys = process.env.PERPLEXITY_KEYS?.split(",").filter(k => k.trim());
  const xaiKeys = process.env.XAI_KEYS?.split(",").filter(k => k.trim());
  const geminiKeys = process.env.GEMINI_KEYS?.split(",").filter(k => k.trim());

  store.perplexity = perplexityKeys?.map(k => newKey(k)) || [];
  store.xai = xaiKeys?.map(k => newKey(k)) || [];
  store.gemini = geminiKeys?.map(k => newKey(k)) || [];

  initialized = true;
}

/**
 * Get the best available key for a provider
 * Uses least-used strategy with fallback to least-recently-used
 */
export function getKey(provider: Provider): KeyUsage {
  initKeys();

  const availableKeys = store[provider].filter(k => !k.blocked);

  if (!availableKeys.length) {
    throw new Error(`NO_KEYS_AVAILABLE_${provider.toUpperCase()}`);
  }

  // Sort by: 1) fewest calls, 2) oldest last used
  return availableKeys.sort((a, b) => {
    const callDiff = a.calls - b.calls;
    if (callDiff !== 0) return callDiff;
    return a.lastUsed - b.lastUsed;
  })[0];
}

/**
 * Report successful usage of a key
 */
export function reportUsage(provider: Provider, key: string, tokens: number) {
  initKeys();

  const keyData = store[provider].find(k => k.key === key);
  if (!keyData) return;

  keyData.calls++;
  keyData.tokens += tokens;
  keyData.lastUsed = Date.now();
  keyData.errorCount = 0; // Reset error count on success
}

/**
 * Report an error for a key
 * After 3 errors, the key is blocked
 */
export function reportError(provider: Provider, key: string) {
  initKeys();

  const keyData = store[provider].find(k => k.key === key);
  if (!keyData) return;

  keyData.errorCount = (keyData.errorCount || 0) + 1;

  if (keyData.errorCount >= 3) {
    keyData.blocked = true;
  }
}

/**
 * Block a key immediately (e.g., on 401/429)
 */
export function blockKey(provider: Provider, key: string) {
  initKeys();

  const keyData = store[provider].find(k => k.key === key);
  if (keyData) {
    keyData.blocked = true;
  }
}

/**
 * Unblock a key
 */
export function unblockKey(provider: Provider, key: string) {
  initKeys();

  const keyData = store[provider].find(k => k.key === key);
  if (keyData) {
    keyData.blocked = false;
    keyData.errorCount = 0;
  }
}

/**
 * Check if any keys are available for a provider
 */
export function hasAvailableKeys(provider: Provider): boolean {
  initKeys();
  return store[provider].some(k => !k.blocked);
}

/**
 * Get all available providers
 */
export function getAvailableProviders(): Provider[] {
  initKeys();
  return (Object.keys(store) as Provider[]).filter(p => hasAvailableKeys(p));
}

/**
 * Get debug stats (for admin/debugging)
 */
export function debugStats() {
  initKeys();

  return {
    perplexity: {
      total: store.perplexity.length,
      available: store.perplexity.filter(k => !k.blocked).length,
      totalCalls: store.perplexity.reduce((sum, k) => sum + k.calls, 0),
      totalTokens: store.perplexity.reduce((sum, k) => sum + k.tokens, 0),
    },
    xai: {
      total: store.xai.length,
      available: store.xai.filter(k => !k.blocked).length,
      totalCalls: store.xai.reduce((sum, k) => sum + k.calls, 0),
      totalTokens: store.xai.reduce((sum, k) => sum + k.tokens, 0),
    },
    gemini: {
      total: store.gemini.length,
      available: store.gemini.filter(k => !k.blocked).length,
      totalCalls: store.gemini.reduce((sum, k) => sum + k.calls, 0),
      totalTokens: store.gemini.reduce((sum, k) => sum + k.tokens, 0),
    },
  };
}
