import { getKey, reportUsage, blockKey } from "@/lib/ai/key-manager";
import { estimate } from "@/lib/ai/usage-engine";
import { callProvider } from "@/lib/ai/router";

/**
 * Handle POST requests to the AI gateway and forward the provided prompt to the selected provider.
 *
 * Expects the request body to be JSON with `provider` (provider name) and `prompt` (the prompt payload). Retrieves credentials for the provider, estimates usage, calls the provider, reports usage, and returns the provider's result. If the provider responds with status `401` or `429`, the associated API key is blocked before propagating the error. On unexpected failures returns a generic 500 error response.
 *
 * @param req - The incoming HTTP Request whose JSON body must include `provider` and `prompt`
 * @returns A Response containing JSON: on success `{ ok: true, provider, usage, result }`; on failure `{ ok: false, error: "AI gateway failed" }` with HTTP status 500
 */
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