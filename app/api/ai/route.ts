import { getKey, reportUsage, blockKey } from "@/lib/ai/key-manager";
import { estimate } from "@/lib/ai/usage-engine";
import { callProvider } from "@/lib/ai/router";

export async function POST(req: Request) {
  try {
    const { provider, prompt } = await req.json();

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
      const status =
        err instanceof Response
          ? err.status
          : (err as { status?: number })?.status;

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
