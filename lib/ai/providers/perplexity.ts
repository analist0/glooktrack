export async function callPerplexity(apiKey: string, prompt: string) {
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
  });

  if (!res.ok) throw res;

  const json = await res.json();
  return json.choices?.[0]?.message?.content || "";
}
