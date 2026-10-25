"use server";

import OpenAI from "openai";

export type PolishDescriptionResult = {
  text: string;
  changed: boolean;
  error?: string;
};

export async function isAiPolishAvailable(): Promise<boolean> {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

export async function polishDescription(raw: string): Promise<PolishDescriptionResult> {
  const input = raw.trim();
  if (!input) return { text: "", changed: false };

  const key = process.env.OPENAI_API_KEY;
  if (!key?.trim()) {
    return { text: input, changed: false, error: "AI Polish is unavailable" };
  }

  try {
    const openai = new OpenAI({ apiKey: key });
    const { choices } = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "Rewrite the following time log description into a single professional, concise line item for an invoice. Keep it under 60 characters. Do not add bullets or numbering.",
        },
        { role: "user", content: input },
      ],
      max_tokens: 60,
    });
    const text = choices[0]?.message?.content?.trim();
    if (text && text.length > 0) {
      return { text, changed: text !== input };
    }
    return { text: input, changed: false };
  } catch {
    return { text: input, changed: false, error: "AI Polish failed" };
  }
}
