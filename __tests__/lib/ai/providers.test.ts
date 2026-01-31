import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { callGemini } from "@/lib/ai/providers/gemini";
import { callXAI } from "@/lib/ai/providers/xai";
import { callPerplexity } from "@/lib/ai/providers/perplexity";

describe("AI Providers", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({}),
      })
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("callGemini", () => {
    it("sends API key in x-goog-api-key header, not in URL", async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({
          candidates: [{ content: { parts: [{ text: "response" }] } }],
        }),
      } as Response);

      const result = await callGemini("test-key", "hello");

      const [url, options] = vi.mocked(fetch).mock.calls[0];
      expect(url).not.toContain("test-key");
      expect(url).not.toContain("key=");
      expect((options?.headers as Record<string, string>)["x-goog-api-key"]).toBe("test-key");
      expect(result).toBe("response");
    });

    it("uses AbortController with signal", async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ candidates: [{ content: { parts: [{ text: "" }] } }] }),
      } as Response);

      await callGemini("key", "test");

      const [, options] = vi.mocked(fetch).mock.calls[0];
      expect(options?.signal).toBeInstanceOf(AbortSignal);
    });

    it("throws Error with status code on failure", async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        status: 401,
      } as Response);

      await expect(callGemini("bad-key", "test")).rejects.toThrow("Gemini API error: 401");
    });

    it("returns empty string when no candidates", async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ candidates: [] }),
      } as Response);

      const result = await callGemini("key", "test");
      expect(result).toBe("");
    });
  });

  describe("callXAI", () => {
    it("sends API key as Bearer token", async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: "xai response" } }],
        }),
      } as Response);

      const result = await callXAI("test-key", "hello");

      const [, options] = vi.mocked(fetch).mock.calls[0];
      expect((options?.headers as Record<string, string>).Authorization).toBe("Bearer test-key");
      expect(result).toBe("xai response");
    });

    it("uses AbortController with signal", async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ choices: [{ message: { content: "" } }] }),
      } as Response);

      await callXAI("key", "test");

      const [, options] = vi.mocked(fetch).mock.calls[0];
      expect(options?.signal).toBeInstanceOf(AbortSignal);
    });

    it("throws Error with status code on failure", async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        status: 429,
      } as Response);

      await expect(callXAI("key", "test")).rejects.toThrow("xAI API error: 429");
    });
  });

  describe("callPerplexity", () => {
    it("sends API key as Bearer token", async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: "perplexity response" } }],
        }),
      } as Response);

      const result = await callPerplexity("test-key", "hello");

      const [, options] = vi.mocked(fetch).mock.calls[0];
      expect((options?.headers as Record<string, string>).Authorization).toBe("Bearer test-key");
      expect(result).toBe("perplexity response");
    });

    it("throws Error with status code on failure", async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        status: 500,
      } as Response);

      await expect(callPerplexity("key", "test")).rejects.toThrow("Perplexity API error: 500");
    });
  });
});
