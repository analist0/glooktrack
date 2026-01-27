import { Provider } from "./key-manager";
import { callGemini } from "./providers/gemini";
import { callXAI } from "./providers/xai";
import { callPerplexity } from "./providers/perplexity";

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
