/**
 * Send a chat completion request to the XAI API using the provided API key and prompt.
 *
 * @param apiKey - The API key used as a Bearer token for Authorization.
 * @param prompt - The user's prompt to send as the single message in the chat request.
 * @returns The assistant message content from the first choice, or an empty string if unavailable.
 * @throws The fetch Response object when the HTTP response is not OK.
 */
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