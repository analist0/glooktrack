import { getKey, reportUsage, blockKey, type Provider } from "@/lib/ai/key-manager";
import { estimate } from "@/lib/ai/usage-engine";
import { callProvider } from "@/lib/ai/router";

const VALID_PROVIDERS: Provider[] = ["gemini", "xai", "perplexity"];

export async function POST(req: Request) {
  try {
    const { provider, prompt } = await req.json();

    if (!provider || !VALID_PROVIDERS.includes(provider)) {
      return Response.json(
        { ok: false, error: "Invalid provider" },
        { status: 400 }
      );
    }

    if (!prompt || typeof prompt !== "string" || prompt.length > 10_000) {
      return Response.json(
        { ok: false, error: "Invalid prompt" },
        { status: 400 }
      );
    }

    const keyData = getKey(provider);
    const usage = estimate(prompt, provider);

    try {
      const result = await callProvider(provider, keyData.key, prompt);

      reportUsage(provider, keyData.key, usage.tokens);

      return Response.json({
        ok: true,
        provider,
        usage,
        result,
      });
    } catch (err: unknown) {
      const statusMatch = err instanceof Error
        ? err.message.match(/error: (\d+)/)
        : null;
      const status = statusMatch ? parseInt(statusMatch[1], 10) : undefined;

      if (status === 401 || status === 429) {
        blockKey(provider, keyData.key);
      }

      throw err;
    }
  } catch {
    return Response.json(
      { ok: false, error: "AI gateway failed" },
      { status: 500 }
    );
  }
}
