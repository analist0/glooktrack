/**
 * Perplexity AI Provider
 * GlucoTrack AI Gateway
 */

export interface PerplexityResponse {
  text: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
  };
  citations?: string[];
}

export async function callPerplexity(apiKey: string, prompt: string, systemPrompt?: string): Promise<PerplexityResponse> {
  const messages = [];

  if (systemPrompt) {
    messages.push({
      role: "system",
      content: systemPrompt
    });
  }

  messages.push({
    role: "user",
    content: prompt
  });

  const response = await fetch("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "sonar-pro",
      messages,
      temperature: 0.7,
      max_tokens: 2048,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    const err = new Error(error.error?.message || "Perplexity API error") as Error & { status: number };
    err.status = response.status;
    throw err;
  }

  const json = await response.json();
  const text = json.choices?.[0]?.message?.content || "";

  return {
    text,
    usage: json.usage ? {
      promptTokens: json.usage.prompt_tokens || 0,
      completionTokens: json.usage.completion_tokens || 0,
    } : undefined,
    citations: json.citations || [],
  };
}
