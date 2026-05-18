import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function extractJson(text) {
  if (!text) return null;
  const cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) return null;
  return JSON.parse(cleaned.slice(start, end + 1));
}

export async function scoreLandForBusiness(listing, filters) {
  if (!process.env.OPENAI_API_KEY) {
    return {
      fitScore: 0,
      fitSummary: "OpenAI key missing in .env.local.",
      strengths: [],
      risks: ["OPENAI_API_KEY is not configured"],
      recommendedUse: "",
    };
  }

  const prompt = `
Analyze this land listing for the user's business model.

Business model:
${filters.businessModel}

Listing:
${JSON.stringify(listing, null, 2)}

Return ONLY valid JSON:
{
  "fitScore": 0,
  "fitSummary": "",
  "strengths": [],
  "risks": [],
  "recommendedUse": ""
}
`;

  const response = await client.chat.completions.create({
    model: "gpt-4.1-mini",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.1,
  });

  try {
    return extractJson(response.choices[0].message.content);
  } catch {
    return {
      fitScore: 0,
      fitSummary: "Could not parse AI scoring response.",
      strengths: [],
      risks: ["AI response parsing failed"],
      recommendedUse: "",
    };
  }
}