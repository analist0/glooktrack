import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/ai/providers/gemini", () => ({
  callGemini: vi.fn().mockResolvedValue("gemini response"),
}));

vi.mock("@/lib/ai/providers/xai", () => ({
  callXAI: vi.fn().mockResolvedValue("xai response"),
}));

vi.mock("@/lib/ai/providers/perplexity", () => ({
  callPerplexity: vi.fn().mockResolvedValue("perplexity response"),
}));

import { callProvider } from "@/lib/ai/router";
import { callGemini } from "@/lib/ai/providers/gemini";
import { callXAI } from "@/lib/ai/providers/xai";
import { callPerplexity } from "@/lib/ai/providers/perplexity";

describe("router", () => {
  describe("callProvider", () => {
    it("routes to gemini provider", async () => {
      const result = await callProvider("gemini", "key", "prompt");
      expect(callGemini).toHaveBeenCalledWith("key", "prompt");
      expect(result).toBe("gemini response");
    });

    it("routes to xai provider", async () => {
      const result = await callProvider("xai", "key", "prompt");
      expect(callXAI).toHaveBeenCalledWith("key", "prompt");
      expect(result).toBe("xai response");
    });

    it("routes to perplexity provider", async () => {
      const result = await callProvider("perplexity", "key", "prompt");
      expect(callPerplexity).toHaveBeenCalledWith("key", "prompt");
      expect(result).toBe("perplexity response");
    });

    it("throws for unknown provider", async () => {
      await expect(
        callProvider("unknown" as never, "key", "prompt")
      ).rejects.toThrow("Unknown provider");
    });
  });
});
