/**
 * Request a chat completion from Perplexity and return the selected message content.
 *
 * @param apiKey - Perplexity API key used for the Bearer Authorization header
 * @param prompt - User prompt sent as the message content
 * @returns The content of the first choice's message, or an empty string if no content is present
 * @throws The fetch Response object when the HTTP response has a non-OK status
 */
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