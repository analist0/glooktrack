import { describe, it, expect } from "vitest";
import { estimate } from "@/lib/ai/usage-engine";

describe("usage-engine", () => {
  describe("estimate", () => {
    it("estimates tokens as prompt length / 4 (ceil)", () => {
      const result = estimate("hello", "gemini");
      expect(result.tokens).toBe(2); // ceil(5/4) = 2
    });

    it("calculates cost for gemini at $0.0001/token", () => {
      const result = estimate("a".repeat(400), "gemini");
      expect(result.tokens).toBe(100);
      expect(result.costUSD).toBeCloseTo(0.01, 4);
    });

    it("calculates cost for xai at $0.00015/token", () => {
      const result = estimate("a".repeat(400), "xai");
      expect(result.tokens).toBe(100);
      expect(result.costUSD).toBeCloseTo(0.015, 4);
    });

    it("calculates cost for perplexity at $0.0002/token", () => {
      const result = estimate("a".repeat(400), "perplexity");
      expect(result.tokens).toBe(100);
      expect(result.costUSD).toBeCloseTo(0.02, 4);
    });

    it("handles empty prompt", () => {
      const result = estimate("", "gemini");
      expect(result.tokens).toBe(0);
      expect(result.costUSD).toBe(0);
    });

    it("rounds cost to 6 decimal places", () => {
      const result = estimate("hi", "perplexity");
      // tokens = ceil(2/4) = 1, cost = 1 * 0.0002 = 0.0002
      expect(result.costUSD).toBe(0.0002);
    });
  });
});
