import { describe, it, expect, beforeEach, vi } from "vitest";
import { getKey, reportUsage, blockKey, _resetStore } from "@/lib/ai/key-manager";

describe("key-manager", () => {
  beforeEach(() => {
    _resetStore();
    delete process.env.PERPLEXITY_KEYS;
    delete process.env.XAI_KEYS;
    delete process.env.GEMINI_KEYS;
  });

  function setEnv(keys: { gemini?: string; xai?: string; perplexity?: string }) {
    if (keys.gemini) process.env.GEMINI_KEYS = keys.gemini;
    if (keys.xai) process.env.XAI_KEYS = keys.xai;
    if (keys.perplexity) process.env.PERPLEXITY_KEYS = keys.perplexity;
  }

  describe("getKey", () => {
    it("throws NO_KEYS when no keys are configured", () => {
      expect(() => getKey("gemini")).toThrow("NO_KEYS");
    });

    it("returns a key when keys are configured", () => {
      setEnv({ gemini: "key1,key2" });
      const keyData = getKey("gemini");
      expect(keyData.key).toBe("key1");
      expect(keyData.calls).toBe(0);
      expect(keyData.tokens).toBe(0);
    });

    it("returns least-used key", () => {
      setEnv({ gemini: "key1,key2" });
      // trigger init
      getKey("gemini");
      reportUsage("gemini", "key1", 100);

      const keyData = getKey("gemini");
      expect(keyData.key).toBe("key2");
    });

    it("skips blocked keys", () => {
      setEnv({ gemini: "key1,key2" });
      // trigger init
      getKey("gemini");
      blockKey("gemini", "key1");

      const keyData = getKey("gemini");
      expect(keyData.key).toBe("key2");
    });

    it("throws NO_KEYS when all keys are blocked", () => {
      setEnv({ gemini: "key1" });
      // trigger init
      getKey("gemini");
      blockKey("gemini", "key1");

      expect(() => getKey("gemini")).toThrow("NO_KEYS");
    });

    it("trims whitespace from keys", () => {
      setEnv({ gemini: " key1 , key2 " });
      const keyData = getKey("gemini");
      expect(keyData.key).toBe("key1");
    });
  });

  describe("reportUsage", () => {
    it("increments calls and tokens for the correct key", () => {
      setEnv({ gemini: "key1" });
      // trigger init
      getKey("gemini");
      reportUsage("gemini", "key1", 500);

      const keyData = getKey("gemini");
      expect(keyData.calls).toBe(1);
      expect(keyData.tokens).toBe(500);
      expect(keyData.lastUsed).toBeGreaterThan(0);
    });

    it("does nothing for unknown key", () => {
      setEnv({ gemini: "key1" });
      // trigger init
      getKey("gemini");
      reportUsage("gemini", "nonexistent", 100);

      const keyData = getKey("gemini");
      expect(keyData.calls).toBe(0);
    });
  });

  describe("blockKey", () => {
    it("marks a key as blocked", () => {
      setEnv({ gemini: "key1,key2" });
      // trigger init
      getKey("gemini");
      blockKey("gemini", "key1");

      const keyData = getKey("gemini");
      expect(keyData.key).toBe("key2");
    });
  });

  describe("debugStats is removed", () => {
    it("does not export debugStats", async () => {
      const mod = await import("@/lib/ai/key-manager");
      expect((mod as Record<string, unknown>).debugStats).toBeUndefined();
    });
  });
});
