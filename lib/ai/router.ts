import { Provider } from "./key-manager";
import { callGemini } from "./providers/gemini";
import { callXAI } from "./providers/xai";
import { callPerplexity } from "./providers/perplexity";

/**
 * Route a prompt to the specified AI provider and return its response.
 *
 * @param provider - Which provider to call; one of `"gemini"`, `"xai"`, or `"perplexity"`.
 * @param key - API key or credential used for the selected provider.
 * @param prompt - The text prompt to send to the provider.
 * @returns The response returned by the selected provider.
 * @throws Error if `provider` is not one of the supported values.
 */
export async function callProvider(
  provider: Provider,
  key: string,
  prompt: string
) {
  switch (provider) {
    case "gemini":
      return callGemini(key, prompt);
    case "xai":
      return callXAI(key, prompt);
    case "perplexity":
      return callPerplexity(key, prompt);
    default:
      throw new Error("Unknown provider");
  }
}