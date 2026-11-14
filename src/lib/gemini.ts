import { ChatMessage } from "@/types";

export const SIMPLE_MODEL = "gemini-2.0-flash";
export const SIMPLE_MODEL_FALLBACK = "gemini-1.5-flash";
export const COMPLEX_MODEL = "gemini-1.5-pro";

export type ComplexityLevel = "simple" | "complex";

export const SYSTEM_PROMPT = `You are Lampy, the Salt and Lamp United (SLU) assistant. You ONLY answer questions about SLU — our events, groups, beliefs, schedule, mission, and contact info. You may also answer Biblical questions as long as it is educational, explanatory, and helpful. Any challenge may be entertained with moderation. If asked about anything else, politely redirect: "I'm here to help with Salt and Lamp United questions." When you are opened, introduce yourself: "Salt and Shine! I'm Lampy, your Salt and Lamp United Assistant. How can I help you today?"

FORMATTING RULES (always follow — your output is rendered as markdown):
- Write in short paragraphs: max 3 sentences each, separated by blank lines.
- Use ## headings for each part of a multi-part answer.
- Use bullet lists with - for enumerations.
- Bold key terms with **term**.
- Keep simple answers concise (under 120 words).
- For complex answers (over 150 words), always end with this exact footer:

**Want to go deeper?** [Open the full chat →](/chat)

### Follow-up questions
- <2-3 suggested follow-up questions as a markdown list>`;

const COMPLEX_KEYWORDS = [
  "explain",
  "why",
  "theology",
  "doctrine",
  "compare",
  "difference",
  "deep",
  "detailed",
  "history",
  "bible study",
  "sermon",
  "debate",
  "versebyverse",
  "verse-by-verse",
  "hermeneutics",
  "eschatology",
  "soteriology",
  "trinity",
  "predestination",
  "suffering",
  "evolution",
  "philosophy",
  "evidence",
  "prove",
  "contradiction",
];

const FOLLOW_UP_WORDS = [
  "more",
  "elaborate",
  "expand",
  "continue",
  "deeper",
  "example",
];

export function classifyComplexity(
  messages: ChatMessage[]
): { level: ComplexityLevel; reason: string } {
  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  if (!lastUser) return { level: "simple", reason: "no user message" };
  const text = lastUser.content;
  const lower = text.toLowerCase();

  if (text.length >= 200)
    return { level: "complex", reason: "message >= 200 chars" };

  const hitKeyword = COMPLEX_KEYWORDS.find((k) => lower.includes(k));
  if (hitKeyword)
    return { level: "complex", reason: `keyword: ${hitKeyword}` };

  const qCount = (text.match(/\?/g) ?? []).length;
  if (qCount > 1)
    return { level: "complex", reason: "multiple questions" };

  const hitFollowUp = FOLLOW_UP_WORDS.find((w) =>
    new RegExp(`\\b${w}\\b`).test(lower)
  );
  if (hitFollowUp)
    return { level: "complex", reason: `follow-up word: ${hitFollowUp}` };

  return { level: "simple", reason: "short factual question" };
}

async function callGemini(
  model: string,
  messages: ChatMessage[],
  systemPrompt: string
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured");

  const contents = messages.map((msg) => ({
    role: msg.role === "assistant" ? "model" : "user",
    parts: [{ text: msg.content }],
  }));

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents,
      }),
    }
  );

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Gemini API error (${model}): ${res.status} ${error}`);
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("No response from Gemini API");
  return text;
}

export interface ChatFullResult {
  text: string;
  modelUsed: string;
  complexity: ComplexityLevel;
}

export async function chatWithSLUFull(
  messages: ChatMessage[],
  systemPrompt?: string
): Promise<ChatFullResult> {
  const { level } = classifyComplexity(messages);
  const prompt = systemPrompt ?? SYSTEM_PROMPT;

  if (level === "complex") {
    // Try complex model first, fall back to simple on 404/model errors.
    try {
      const text = await callGemini(COMPLEX_MODEL, messages, prompt);
      return { text, modelUsed: COMPLEX_MODEL, complexity: level };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      const isModelError = /404|not found|not supported|invalid/i.test(msg);
      if (!isModelError) throw err;
      try {
        const text = await callGemini(SIMPLE_MODEL, messages, prompt);
        return { text, modelUsed: SIMPLE_MODEL, complexity: level };
      } catch {
        const text = await callGemini(
          SIMPLE_MODEL_FALLBACK,
          messages,
          prompt
        );
        return { text, modelUsed: SIMPLE_MODEL_FALLBACK, complexity: level };
      }
    }
  }

  try {
    const text = await callGemini(SIMPLE_MODEL, messages, prompt);
    return { text, modelUsed: SIMPLE_MODEL, complexity: level };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (!/404|not found|not supported|invalid/i.test(msg)) throw err;
    const text = await callGemini(SIMPLE_MODEL_FALLBACK, messages, prompt);
    return { text, modelUsed: SIMPLE_MODEL_FALLBACK, complexity: level };
  }
}

/** Backward-compatible string wrapper. */
export async function chatWithSLU(
  messages: ChatMessage[],
  systemPrompt?: string
): Promise<string> {
  const result = await chatWithSLUFull(messages, systemPrompt);
  return result.text;
}
