/**
 * AI Storage Layer - שכבת אחסון עם תמיכה ב-File/Memory
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

// File-based backend (for server-side)
class FileBackend implements StorageBackend {
  private dataDir: string;
  private fs: typeof import("fs/promises") | null = null;
  private initFailed = false;

  constructor() {
    this.dataDir = process.env.AI_STORAGE_DIR || "./.ai-storage";
  }

  private async ensureFs() {
    if (this.initFailed) return null;
    if (this.fs) return this.fs;

    // Only works server-side
    if (typeof window !== "undefined") {
      this.initFailed = true;
      return null;
    }

    try {
      this.fs = await import("fs/promises");
      await this.fs.mkdir(this.dataDir, { recursive: true });
      return this.fs;
    } catch {
      this.initFailed = true;
      return null;
    }
  }

  private getFilePath(key: string): string {
    return `${this.dataDir}/${key.replace(/[^a-zA-Z0-9-_]/g, "_")}.json`;
  }

  async get(key: string): Promise<string | null> {
    try {
      const fs = await this.ensureFs();
      if (!fs) return null;
      const content = await fs.readFile(this.getFilePath(key), "utf-8");
      return content;
    } catch {
      return null;
    }
  }

  async set(key: string, value: string): Promise<void> {
    try {
      const fs = await this.ensureFs();
      if (!fs) return;
      await fs.writeFile(this.getFilePath(key), value, "utf-8");
    } catch (error) {
      console.error("[AI Storage] File write failed:", error);
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const fs = await this.ensureFs();
      if (!fs) return false;
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
  private file: FileBackend;
  private memory: MemoryBackend;

  constructor() {
    this.file = new FileBackend();
    this.memory = new MemoryBackend();
  }

  private async getBackend(): Promise<StorageBackend> {
    // Use file backend on server
    if (typeof window === "undefined") {
      return this.file;
    }

    // Use memory on client
    return this.memory;
  }

  async get<T>(key: string): Promise<T | null> {
    // Try memory first for speed
    const memValue = await this.memory.get(key);
    if (memValue) {
      try {
        return JSON.parse(memValue) as T;
      } catch {
        // Continue to file backend
      }
    }

    const backend = await this.getBackend();
    const value = await backend.get(key);
    if (!value) return null;

    try {
      const parsed = JSON.parse(value) as T;
      // Cache in memory
      await this.memory.set(key, value);
      return parsed;
    } catch {
      return null;
    }
  }

  async set<T>(key: string, value: T): Promise<void> {
    const serialized = JSON.stringify(value);

    // Save to memory for fast access
    await this.memory.set(key, serialized);

    // Also persist to file backend
    const backend = await this.getBackend();
    await backend.set(key, serialized);
  }

  async exists(key: string): Promise<boolean> {
    if (await this.memory.exists(key)) return true;

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
