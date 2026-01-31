export async function callPerplexity(apiKey: string, prompt: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);

  try {
    const res = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "sonar-pro",
        messages: [{ role: "user", content: prompt }],
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      throw new Error(`Perplexity API error: ${res.status}`);
    }

    const json = await res.json();
    return json.choices?.[0]?.message?.content || "";
  } finally {
    clearTimeout(timeout);
  }
}
