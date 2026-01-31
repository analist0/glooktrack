import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/ai/key-manager", () => ({
  getKey: vi.fn(),
  reportUsage: vi.fn(),
  blockKey: vi.fn(),
}));

vi.mock("@/lib/ai/usage-engine", () => ({
  estimate: vi.fn().mockReturnValue({ tokens: 10, costUSD: 0.001 }),
}));

vi.mock("@/lib/ai/router", () => ({
  callProvider: vi.fn(),
}));

import { POST } from "@/app/api/ai/route";
import { getKey, blockKey } from "@/lib/ai/key-manager";
import { callProvider } from "@/lib/ai/router";

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/ai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/ai", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 for invalid provider", async () => {
    const res = await POST(makeRequest({ provider: "invalid", prompt: "test" }));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.ok).toBe(false);
    expect(body.error).toBe("Invalid provider");
  });

  it("returns 400 for missing provider", async () => {
    const res = await POST(makeRequest({ prompt: "test" }));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.ok).toBe(false);
  });

  it("returns 400 for missing prompt", async () => {
    const res = await POST(makeRequest({ provider: "gemini" }));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("Invalid prompt");
  });

  it("returns 400 for prompt exceeding 10000 chars", async () => {
    const res = await POST(
      makeRequest({ provider: "gemini", prompt: "a".repeat(10001) })
    );
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("Invalid prompt");
  });

  it("returns 400 for non-string prompt", async () => {
    const res = await POST(makeRequest({ provider: "gemini", prompt: 123 }));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("Invalid prompt");
  });

  it("returns successful response for valid request", async () => {
    vi.mocked(getKey).mockReturnValue({
      key: "test-key",
      calls: 0,
      tokens: 0,
      lastUsed: 0,
    });
    vi.mocked(callProvider).mockResolvedValue("AI response");

    const res = await POST(makeRequest({ provider: "gemini", prompt: "hello" }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.result).toBe("AI response");
    expect(body.provider).toBe("gemini");
  });

  it("blocks key on 401 error", async () => {
    vi.mocked(getKey).mockReturnValue({
      key: "bad-key",
      calls: 0,
      tokens: 0,
      lastUsed: 0,
    });
    vi.mocked(callProvider).mockRejectedValue(new Error("Gemini API error: 401"));

    const res = await POST(makeRequest({ provider: "gemini", prompt: "hello" }));
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.ok).toBe(false);
    expect(blockKey).toHaveBeenCalledWith("gemini", "bad-key");
  });

  it("blocks key on 429 error", async () => {
    vi.mocked(getKey).mockReturnValue({
      key: "rate-limited-key",
      calls: 0,
      tokens: 0,
      lastUsed: 0,
    });
    vi.mocked(callProvider).mockRejectedValue(new Error("xAI API error: 429"));

    const res = await POST(makeRequest({ provider: "xai", prompt: "hello" }));

    expect(blockKey).toHaveBeenCalledWith("xai", "rate-limited-key");
  });

  it("does not block key on 500 error", async () => {
    vi.mocked(getKey).mockReturnValue({
      key: "key",
      calls: 0,
      tokens: 0,
      lastUsed: 0,
    });
    vi.mocked(callProvider).mockRejectedValue(new Error("Perplexity API error: 500"));

    await POST(makeRequest({ provider: "perplexity", prompt: "hello" }));

    expect(blockKey).not.toHaveBeenCalled();
  });

  it("returns 500 when getKey throws", async () => {
    vi.mocked(getKey).mockImplementation(() => {
      throw new Error("NO_KEYS");
    });

    const res = await POST(makeRequest({ provider: "gemini", prompt: "hello" }));
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.ok).toBe(false);
  });

  it("accepts all valid providers", async () => {
    vi.mocked(getKey).mockReturnValue({
      key: "key",
      calls: 0,
      tokens: 0,
      lastUsed: 0,
    });
    vi.mocked(callProvider).mockResolvedValue("ok");

    for (const provider of ["gemini", "xai", "perplexity"]) {
      const res = await POST(makeRequest({ provider, prompt: "test" }));
      expect(res.status).toBe(200);
    }
  });
});
