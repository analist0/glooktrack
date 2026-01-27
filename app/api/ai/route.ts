import { callWithFallback } from "@/lib/ai/router";
import { checkRateLimit } from "@/lib/ai/rate-limiter";
import type { Provider } from "@/lib/ai/key-manager";

const VALID_PROVIDERS = new Set<Provider>(["gemini", "xai", "perplexity"]);

export async function POST(req: Request) {
  try {
    const clientIp =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anonymous";

    const limit = checkRateLimit(clientIp);
    if (!limit.allowed) {
      return Response.json(
        { ok: false, error: "Rate limit exceeded", resetAt: limit.resetAt },
        {
          status: 429,
          headers: {
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": String(limit.resetAt),
          },
        }
      );
    }

    const { provider, prompt } = await req.json();

    if (!VALID_PROVIDERS.has(provider)) {
      return Response.json(
        { ok: false, error: "Invalid provider" },
        { status: 400 }
      );
    }

    if (!prompt || typeof prompt !== "string") {
      return Response.json(
        { ok: false, error: "Prompt is required" },
        { status: 400 }
      );
    }

    const result = await callWithFallback(provider, prompt);

    return Response.json(result, {
      headers: {
        "X-RateLimit-Remaining": String(limit.remaining),
      },
    });
  } catch {
    return Response.json(
      { ok: false, error: "AI gateway failed" },
      { status: 500 }
    );
  }
}
