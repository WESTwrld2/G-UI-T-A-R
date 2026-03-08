import OpenAI from "openai";
import { buildPrompt } from "./buildPrompt";
import type { UserConstraints } from "@/logic/schema/userConstraints.zod";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export async function generateWithOpenAI(userConstraints: UserConstraints) {
  const prompt = buildPrompt(userConstraints);

  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.6,
    messages: [
      {
        role: "system",
        content: "You generate UI design tokens in strict JSON format."
      },
      {
        role: "user",
        content: prompt
      }
    ]
  });

  const content = response.choices[0].message.content;

  if (!content) {
    throw new Error("LLM returned empty response");
  }

  try {
    return JSON.parse(content);
  } catch {
    throw new Error("LLM output was not valid JSON");
  }
}