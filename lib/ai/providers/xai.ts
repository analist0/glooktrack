/**
 * xAI (Grok) Provider
 * GlucoTrack AI Gateway
 */

export interface XAIResponse {
  text: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
  };
}

export async function callXAI(apiKey: string, prompt: string, systemPrompt?: string): Promise<XAIResponse> {
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

  const response = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "grok-2-latest",
      messages,
      temperature: 0.7,
      max_tokens: 2048,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    const err = new Error(error.error?.message || "xAI API error") as Error & { status: number };
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
  };
}
