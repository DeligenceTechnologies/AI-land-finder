import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function extractJson(text) {
  try {
    const cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start === -1 || end === -1) return null;
    return JSON.parse(cleaned.slice(start, end + 1));
  } catch {
    return null;
  }
}

function dedupeResults(results) {
  const seen = new Set();

  return results.filter((item) => {
    const key = item.url || item.title;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function buildSearchQueries(purpose, preferences) {
  const base = "Nashville TN LoopNet commercial land for sale";

  return [
    `site:loopnet.com Nashville TN land parcels for sale ${purpose} ${preferences}`,
    `${base} 2 acres commercial corridor`,
    `${base} Murfreesboro Pike`,
    `${base} Gallatin Pike`,
    `${base} Dickerson Pike`,
    `${base} Clarksville Pike`,
    `${base} interstate frontage`,
    `${base} QSR restaurant drive thru`,
    `LoopNet Nashville land 4100 Murfreesboro Pike 3 AC`,
    `LoopNet Nashville land 551 Spence Ln 4.02 AC`,
    `LoopNet Nashville land 4211 Murfreesboro Pike 11.89 AC`,
    `LoopNet Nashville land 2210 Gallatin Pike N 5.60 AC`,
    `LoopNet Nashville land 2501 Clarksville Pike 4.31 AC`,
    `LoopNet Nashville land 1312 Dickerson Pike 2.02 AC`,
  ];
}

async function tavilySearch(query) {
  const response = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.TAVILY_API_KEY}`,
    },
    body: JSON.stringify({
      query,
      search_depth: "advanced",
      max_results: 8,
      include_answer: false,
      include_raw_content: true,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.error || "Tavily search failed");
  }

  return data.results || [];
}

function cleanResults(results) {
  return results
    .filter((r) => {
      const text = `${r.title || ""} ${r.content || ""} ${r.raw_content || ""} ${r.url || ""}`.toLowerCase();

      const isRelevant =
        text.includes("loopnet") ||
        text.includes("commercial land") ||
        text.includes("land parcels") ||
        text.includes("murfreesboro pike") ||
        text.includes("gallatin pike") ||
        text.includes("dickerson pike") ||
        text.includes("clarksville pike") ||
        text.includes("spence ln");

      const isBad =
        text.includes("macdonalds of sleat") ||
        text.includes("clan donald") ||
        text.includes("scotland") ||
        text.includes("canada");

      return isRelevant && !isBad;
    })
    .slice(0, 35);
}

function calculateApproxCost(inputTokens, outputTokens) {
  const inputPerMillion = Number(process.env.OPENAI_INPUT_COST_PER_1M || 0.3);
  const outputPerMillion = Number(process.env.OPENAI_OUTPUT_COST_PER_1M || 1.2);

  return (
    (inputTokens / 1000000) * inputPerMillion +
    (outputTokens / 1000000) * outputPerMillion
  ).toFixed(6);
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed" });
  }

  try {
    const { purpose, preferences: rawPreferences } = req.body || {};
    const preferences = rawPreferences?.trim() || "No specific criteria; rank by general suitability for the intended use";

    if (!purpose) {
      return res.status(400).json({
        error: "Purpose is required",
      });
    }

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({
        error: "OPENAI_API_KEY missing",
      });
    }

    if (!process.env.TAVILY_API_KEY) {
      return res.status(500).json({
        error: "TAVILY_API_KEY missing",
      });
    }

    const searchQueries = buildSearchQueries(purpose, rawPreferences?.trim() || "");

    const searchBatches = await Promise.all(
      searchQueries.map((query) => tavilySearch(query))
    );

    const mergedResults = dedupeResults(searchBatches.flat());
    const cleanedResults = cleanResults(mergedResults);

    const prompt = `
You are acting like ChatGPT web search for commercial real estate site screening.

Default example style:
Best preliminary fits from LoopNet
Rank | Property | Size | Why it may fit

User purpose:
${purpose}

User preferences:
${preferences}

Original target URL:
https://www.loopnet.com/search/land/nashville-tn/for-sale/?view=list

Search results:
${JSON.stringify(cleanedResults, null, 2)}

Your job:
- Return all plausible LoopNet-style land candidates aligned with the user query.
- Do not return only one best property.
- Prefer properties that match size, corridor, commercial use, frontage, traffic, and competitor-distance logic.
- For the default McDonald's query, try to align with known strong candidates if supported or mentioned:
  4100 Murfreesboro Pike, 551 Spence Ln, 4211 Murfreesboro Pike, 2210 Gallatin Pike N, 2501 Clarksville Pike, 1312 Dickerson Pike.
- For other user purposes, dynamically rank based on that purpose and preferences.
- Do not include irrelevant residential estate/farm properties unless they clearly fit.
- Do not invent exact facts. If a detail is inferred, phrase it as "likely", "appears", or "needs verification".
- Include a score from 0 to 100.
- Output ONLY valid JSON.

Return this JSON:

{
  "bestFits": [
    {
      "rank": 1,
      "property": "",
      "size": "",
      "whyItMayFit": "",
      "score": 0
    }
  ],
  "supportingNote": ""
}
`;

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.1,
    });

    const rawText = completion.choices?.[0]?.message?.content || "";
    const parsed = extractJson(rawText);

    if (!parsed) {
      return res.status(500).json({
        error: "Could not parse OpenAI response",
        raw: rawText,
      });
    }

    const usage = completion.usage || {};
    const inputTokens = usage.prompt_tokens || 0;
    const outputTokens = usage.completion_tokens || 0;
    const totalTokens = usage.total_tokens || 0;

    return res.status(200).json({
      bestFits: parsed.bestFits || [],
      supportingNote: parsed.supportingNote || "",
      tokenUsage: {
        inputTokens,
        outputTokens,
        totalTokens,
        approxCostUSD: calculateApproxCost(inputTokens, outputTokens),
      },
    });
  } catch (error) {
    console.error("Listings API error:", error);

    return res.status(500).json({
      error: "Failed to search and analyze listings",
      details: error.message,
    });
  }
}