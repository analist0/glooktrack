/**
 * AI Storage Layer - שכבת אחסון עם תמיכה ב-Redis/File/Memory
 * GlucoTrack AI Gateway
 */

import { Provider, KeyUsage } from "./key-manager";

export interface AIStats {
  totalCalls: number;
  totalTokens: number;
  totalCostUSD: number;
  callsByProvider: Record<Provider, number>;
  tokensByProvider: Record<Provider, number>;
  lastUpdated: number;
}

export interface StorageData {
  keys: Record<Provider, KeyUsage[]>;
  stats: AIStats;
  dailyStats: Record<string, AIStats>; // YYYY-MM-DD -> stats
}

// Storage backend interface
interface StorageBackend {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  exists(key: string): Promise<boolean>;
}

// Redis backend
class RedisBackend implements StorageBackend {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private client: any = null;
  private connectionFailed = false;

  async getClient() {
    if (this.connectionFailed) return null;
    if (this.client) return this.client;

    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
      this.connectionFailed = true;
      return null;
    }

    try {
      // Dynamic import of ioredis (optional dependency)
      // @ts-expect-error - ioredis is an optional dependency
      const ioredis = await import("ioredis");
      const Redis = ioredis.default || ioredis;
      this.client = new Redis(redisUrl, {
        maxRetriesPerRequest: 1,
        connectTimeout: 5000,
        lazyConnect: true,
      });
      await this.client.connect();
      console.log("[AI Storage] Redis connected");
      return this.client;
    } catch {
      console.log("[AI Storage] Redis not available, using fallback");
      this.connectionFailed = true;
      return null;
    }
  }

  async get(key: string): Promise<string | null> {
    const client = await this.getClient();
    if (!client) return null;
    return client.get(key);
  }

  async set(key: string, value: string): Promise<void> {
    const client = await this.getClient();
    if (!client) return;
    await client.set(key, value);
  }

  async exists(key: string): Promise<boolean> {
    const client = await this.getClient();
    if (!client) return false;
    return (await client.exists(key)) > 0;
  }
}

// File-based backend (for development/fallback)
class FileBackend implements StorageBackend {
  private dataDir: string;
  private fs: typeof import("fs/promises") | null = null;
  private path: typeof import("path") | null = null;

  constructor() {
    this.dataDir = process.env.AI_STORAGE_DIR || "./.ai-storage";
  }

  private async ensureFs() {
    if (!this.fs) {
      this.fs = await import("fs/promises");
      this.path = await import("path");
      try {
        await this.fs.mkdir(this.dataDir, { recursive: true });
      } catch {
        // Directory might already exist
      }
    }
    return { fs: this.fs, path: this.path! };
  }

  private getFilePath(key: string): string {
    return `${this.dataDir}/${key.replace(/[^a-zA-Z0-9-_]/g, "_")}.json`;
  }

  async get(key: string): Promise<string | null> {
    try {
      const { fs } = await this.ensureFs();
      const content = await fs.readFile(this.getFilePath(key), "utf-8");
      return content;
    } catch {
      return null;
    }
  }

  async set(key: string, value: string): Promise<void> {
    try {
      const { fs } = await this.ensureFs();
      await fs.writeFile(this.getFilePath(key), value, "utf-8");
    } catch (error) {
      console.error("[AI Storage] File write failed:", error);
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const { fs } = await this.ensureFs();
      await fs.access(this.getFilePath(key));
      return true;
    } catch {
      return false;
    }
  }
}

// Memory backend (fastest, but lost on restart)
class MemoryBackend implements StorageBackend {
  private store = new Map<string, string>();

  async get(key: string): Promise<string | null> {
    return this.store.get(key) || null;
  }

  async set(key: string, value: string): Promise<void> {
    this.store.set(key, value);
  }

  async exists(key: string): Promise<boolean> {
    return this.store.has(key);
  }
}

// Main storage class with fallback chain
class AIStorage {
  private redis: RedisBackend;
  private file: FileBackend;
  private memory: MemoryBackend;
  private initialized = false;

  constructor() {
    this.redis = new RedisBackend();
    this.file = new FileBackend();
    this.memory = new MemoryBackend();
  }

  private async getBackend(): Promise<StorageBackend> {
    // Try Redis first
    if (process.env.REDIS_URL) {
      const redisClient = await this.redis.getClient();
      if (redisClient) return this.redis;
    }

    // Fall back to file if in server environment
    if (typeof window === "undefined") {
      return this.file;
    }

    // Use memory as last resort
    return this.memory;
  }

  async get<T>(key: string): Promise<T | null> {
    const backend = await this.getBackend();
    const value = await backend.get(key);
    if (!value) return null;
    try {
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  }

  async set<T>(key: string, value: T): Promise<void> {
    const backend = await this.getBackend();
    await backend.set(key, JSON.stringify(value));

    // Also save to memory for fast access
    await this.memory.set(key, JSON.stringify(value));
  }

  async exists(key: string): Promise<boolean> {
    const backend = await this.getBackend();
    return backend.exists(key);
  }
}

// Singleton instance
export const aiStorage = new AIStorage();

// Storage keys
export const STORAGE_KEYS = {
  KEYS_DATA: "glucotrack:ai:keys",
  STATS: "glucotrack:ai:stats",
  DAILY_STATS: (date: string) => `glucotrack:ai:daily:${date}`,
};

// Helper to create default stats
export function createDefaultStats(): AIStats {
  return {
    totalCalls: 0,
    totalTokens: 0,
    totalCostUSD: 0,
    callsByProvider: { gemini: 0, xai: 0, perplexity: 0 },
    tokensByProvider: { gemini: 0, xai: 0, perplexity: 0 },
    lastUpdated: Date.now(),
  };
}

// Get today's date key
export function getTodayKey(): string {
  return new Date().toISOString().split("T")[0];
}
