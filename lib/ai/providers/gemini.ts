/**
 * Google Gemini Provider
 * GlucoTrack AI Gateway
 */

export interface GeminiResponse {
  text: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
  };
}

export async function callGemini(apiKey: string, prompt: string, systemPrompt?: string): Promise<GeminiResponse> {
  const contents = [];

  // Add system instruction if provided
  if (systemPrompt) {
    contents.push({
      role: "user",
      parts: [{ text: systemPrompt }]
    });
    contents.push({
      role: "model",
      parts: [{ text: "הבנתי. אני מוכן לעזור." }]
    });
  }

  contents.push({
    role: "user",
    parts: [{ text: prompt }]
  });

  const response = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents,
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 2048,
        },
        safetySettings: [
          { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
        ],
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    const err = new Error(error.error?.message || "Gemini API error") as Error & { status: number };
    err.status = response.status;
    throw err;
  }

  const json = await response.json();
  const text = json.candidates?.[0]?.content?.parts?.[0]?.text || "";

  return {
    text,
    usage: json.usageMetadata ? {
      promptTokens: json.usageMetadata.promptTokenCount || 0,
      completionTokens: json.usageMetadata.candidatesTokenCount || 0,
    } : undefined,
  };
}
