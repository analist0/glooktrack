/**
 * AI Key Manager - ניהול מפתחות עם רוטציה, חסימה ושמירה מתמשכת
 * GlucoTrack AI Gateway
 */

import {
  aiStorage,
  STORAGE_KEYS,
  AIStats,
  createDefaultStats,
  getTodayKey,
} from "./storage";

export type Provider = "perplexity" | "xai" | "gemini";

export type KeyUsage = {
  key: string;
  calls: number;
  tokens: number;
  lastUsed: number;
  blocked?: boolean;
  errorCount?: number;
};

// In-memory store for fast access
const store: Record<Provider, KeyUsage[]> = {
  perplexity: [],
  xai: [],
  gemini: [],
};

// Global stats
let globalStats: AIStats = createDefaultStats();

let initialized = false;
let hydrated = false;
let persistenceEnabled = true;

function newKey(key: string): KeyUsage {
  return {
    key: key.trim(),
    calls: 0,
    tokens: 0,
    lastUsed: 0,
    errorCount: 0,
  };
}

/**
 * Initialize keys from environment and load persisted data
 */
async function initKeysAsync(): Promise<void> {
  if (hydrated) return;

  // Ensure keys are loaded from env first
  if (!initialized) {
    initKeys();
  }

  // Try to load persisted data
  try {
    const persistedKeys = await aiStorage.get<Record<Provider, KeyUsage[]>>(
      STORAGE_KEYS.KEYS_DATA
    );
    if (persistedKeys) {
      // Merge persisted stats with current keys
      for (const provider of Object.keys(store) as Provider[]) {
        for (const currentKey of store[provider]) {
          const persisted = persistedKeys[provider]?.find(
            (k) => k.key === currentKey.key
          );
          if (persisted) {
            currentKey.calls = persisted.calls;
            currentKey.tokens = persisted.tokens;
            currentKey.lastUsed = persisted.lastUsed;
            // Don't persist blocked status - allow retry on restart
          }
        }
      }
    }

    // Load global stats
    const persistedStats = await aiStorage.get<AIStats>(STORAGE_KEYS.STATS);
    if (persistedStats) {
      globalStats = persistedStats;
    }
  } catch (error) {
    console.warn("[Key Manager] Failed to load persisted data:", error);
  }

  hydrated = true;
}

// Synchronous version for immediate use
function initKeys() {
  if (initialized) return;

  const perplexityKeys = process.env.PERPLEXITY_KEYS?.split(",").filter((k) =>
    k.trim()
  );
  const xaiKeys = process.env.XAI_KEYS?.split(",").filter((k) => k.trim());
  const geminiKeys = process.env.GEMINI_KEYS?.split(",").filter((k) =>
    k.trim()
  );

  store.perplexity = perplexityKeys?.map((k) => newKey(k)) || [];
  store.xai = xaiKeys?.map((k) => newKey(k)) || [];
  store.gemini = geminiKeys?.map((k) => newKey(k)) || [];

  initialized = true;

  // Load persisted data in background (hydration)
  initKeysAsync().catch(console.error);
}

/**
 * Persist current state to storage
 */
async function persistState(): Promise<void> {
  if (!persistenceEnabled) return;

  try {
    // Save keys data (without the actual key strings for security - just stats)
    const keysToSave: Record<Provider, KeyUsage[]> = {
      perplexity: store.perplexity.map((k) => ({ ...k })),
      xai: store.xai.map((k) => ({ ...k })),
      gemini: store.gemini.map((k) => ({ ...k })),
    };
    await aiStorage.set(STORAGE_KEYS.KEYS_DATA, keysToSave);

    // Save global stats
    globalStats.lastUpdated = Date.now();
    await aiStorage.set(STORAGE_KEYS.STATS, globalStats);

    // Save daily stats
    const todayKey = getTodayKey();
    const dailyStats = await aiStorage.get<AIStats>(
      STORAGE_KEYS.DAILY_STATS(todayKey)
    );
    if (!dailyStats) {
      await aiStorage.set(STORAGE_KEYS.DAILY_STATS(todayKey), createDefaultStats());
    }
  } catch (error) {
    console.warn("[Key Manager] Failed to persist state:", error);
  }
}

/**
 * Get the best available key for a provider
 */
export function getKey(provider: Provider): KeyUsage {
  initKeys();

  const availableKeys = store[provider].filter((k) => !k.blocked);

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
export async function reportUsage(
  provider: Provider,
  key: string,
  tokens: number,
  costUSD: number = 0
): Promise<void> {
  initKeys();

  const keyData = store[provider].find((k) => k.key === key);
  if (!keyData) return;

  keyData.calls++;
  keyData.tokens += tokens;
  keyData.lastUsed = Date.now();
  keyData.errorCount = 0;

  // Update global stats
  globalStats.totalCalls++;
  globalStats.totalTokens += tokens;
  globalStats.totalCostUSD += costUSD;
  globalStats.callsByProvider[provider]++;
  globalStats.tokensByProvider[provider] += tokens;

  // Update daily stats
  try {
    const todayKey = getTodayKey();
    let dailyStats = await aiStorage.get<AIStats>(
      STORAGE_KEYS.DAILY_STATS(todayKey)
    );
    if (!dailyStats) {
      dailyStats = createDefaultStats();
    }
    dailyStats.totalCalls++;
    dailyStats.totalTokens += tokens;
    dailyStats.totalCostUSD += costUSD;
    dailyStats.callsByProvider[provider]++;
    dailyStats.tokensByProvider[provider] += tokens;
    dailyStats.lastUpdated = Date.now();
    await aiStorage.set(STORAGE_KEYS.DAILY_STATS(todayKey), dailyStats);
  } catch {
    // Ignore daily stats errors
  }

  // Persist in background (don't block)
  persistState().catch(console.error);
}

/**
 * Report an error for a key
 */
export function reportError(provider: Provider, key: string) {
  initKeys();

  const keyData = store[provider].find((k) => k.key === key);
  if (!keyData) return;

  keyData.errorCount = (keyData.errorCount || 0) + 1;

  if (keyData.errorCount >= 3) {
    keyData.blocked = true;
  }

  persistState().catch(console.error);
}

/**
 * Block a key immediately
 */
export function blockKey(provider: Provider, key: string) {
  initKeys();

  const keyData = store[provider].find((k) => k.key === key);
  if (keyData) {
    keyData.blocked = true;
  }

  persistState().catch(console.error);
}

/**
 * Unblock a key
 */
export function unblockKey(provider: Provider, key: string) {
  initKeys();

  const keyData = store[provider].find((k) => k.key === key);
  if (keyData) {
    keyData.blocked = false;
    keyData.errorCount = 0;
  }

  persistState().catch(console.error);
}

/**
 * Check if any keys are available for a provider
 */
export function hasAvailableKeys(provider: Provider): boolean {
  initKeys();
  return store[provider].some((k) => !k.blocked);
}

/**
 * Get all available providers
 */
export function getAvailableProviders(): Provider[] {
  initKeys();
  return (Object.keys(store) as Provider[]).filter((p) => hasAvailableKeys(p));
}

/**
 * Get comprehensive stats
 */
export async function getStats(): Promise<{
  global: AIStats;
  today: AIStats | null;
  providers: ReturnType<typeof debugStats>;
}> {
  initKeys();

  const todayKey = getTodayKey();
  const todayStats = await aiStorage.get<AIStats>(
    STORAGE_KEYS.DAILY_STATS(todayKey)
  );

  return {
    global: globalStats,
    today: todayStats,
    providers: debugStats(),
  };
}

/**
 * Get debug stats
 */
export function debugStats() {
  initKeys();

  return {
    perplexity: {
      total: store.perplexity.length,
      available: store.perplexity.filter((k) => !k.blocked).length,
      totalCalls: store.perplexity.reduce((sum, k) => sum + k.calls, 0),
      totalTokens: store.perplexity.reduce((sum, k) => sum + k.tokens, 0),
    },
    xai: {
      total: store.xai.length,
      available: store.xai.filter((k) => !k.blocked).length,
      totalCalls: store.xai.reduce((sum, k) => sum + k.calls, 0),
      totalTokens: store.xai.reduce((sum, k) => sum + k.tokens, 0),
    },
    gemini: {
      total: store.gemini.length,
      available: store.gemini.filter((k) => !k.blocked).length,
      totalCalls: store.gemini.reduce((sum, k) => sum + k.calls, 0),
      totalTokens: store.gemini.reduce((sum, k) => sum + k.tokens, 0),
    },
  };
}

/**
 * Reset all stats (for testing)
 */
export async function resetStats(): Promise<void> {
  globalStats = createDefaultStats();
  for (const provider of Object.keys(store) as Provider[]) {
    for (const key of store[provider]) {
      key.calls = 0;
      key.tokens = 0;
      key.lastUsed = 0;
      key.errorCount = 0;
      key.blocked = false;
    }
  }
  await persistState();
}
