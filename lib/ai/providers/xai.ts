export async function callXAI(apiKey: string, prompt: string) {
  const res = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "grok-2-latest",
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) throw res;

  const json = await res.json();
  return json.choices?.[0]?.message?.content || "";
}
