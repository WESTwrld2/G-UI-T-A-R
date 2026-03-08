import { GoogleGenAI } from "@google/genai";
import { buildPrompt } from "./buildPrompt";
import type { UserConstraints } from "@/logic/schema/userConstraints.zod";

const client = new GoogleGenAI({apiKey: process.env.GEMINI_API_KEY!});

export async function generateWithGemini(userConstraints: UserConstraints) {
  const prompt = buildPrompt(userConstraints);

  const response = await client.models.generateContent({
    model: "gemini-1.5-pro",
    contents: prompt,
  });
  const content = response.text; //this whole thing isn't working yet

  if (!content) {
    throw new Error("Gemini returned empty response");
  }

  try {
    return JSON.parse(content);
  } catch {
    throw new Error("Gemini output was not valid JSON");
  }
}