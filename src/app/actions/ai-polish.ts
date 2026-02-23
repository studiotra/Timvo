"use server";

import OpenAI from "openai";

export async function polishDescription(raw: string): Promise<string> {
  const key = process.env.OPENAI_API_KEY;
  if (!key?.trim()) return raw;

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
        { role: "user", content: raw || "Time" },
      ],
      max_tokens: 60,
    });
    const text = choices[0]?.message?.content?.trim();
    return text && text.length > 0 ? text : raw;
  } catch {
    return raw;
  }
}
