/**
 * Generate text from Google Gemini using the provided API key and prompt.
 *
 * @param apiKey - API key used to authenticate the Gemini request
 * @param prompt - Prompt text to send to the model
 * @returns The generated text from the first candidate's first content part, or an empty string if unavailable
 * @throws The `Response` object when the HTTP request returns a non-OK status
 */
export async function callGemini(apiKey: string, prompt: string) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    }
  );

  if (!res.ok) throw res;

  const json = await res.json();
  return json.candidates?.[0]?.content?.parts?.[0]?.text || "";
}