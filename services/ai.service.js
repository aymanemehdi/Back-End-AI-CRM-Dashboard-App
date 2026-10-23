import { GoogleGenAI } from "@google/genai";
import { ApiError } from "../utils/APIError.js";

let client = null;

/* ----------------------------- Initialize Gemini client ----------------------------- */
const getClient = () => {
  // Read the key when the service is used so the application can start even if
  // AI is not configured, while still returning a clear error when AI is called.
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new ApiError(
      503,
      "Gemini API key is not configured. Add GEMINI_API_KEY to the backend .env"
    );
  }

  // Reuse one SDK client for all requests instead of creating a new client per call.
  if (!client) client = new GoogleGenAI({ apiKey });
  return client;
};

// Allow deployments to choose a different Gemini model without changing code.
const MODEL = () => process.env.GEMINI_MODEL || "gemini-2.5-flash";

// This is useful to controllers when they need to show whether AI features are available.
export const isAIConfigured = () => Boolean(process.env.GEMINI_API_KEY);

/* ----------------------------- Generate structured JSON ----------------------------- */
export const generateJSON = async (prompt, schema) => {
  // Every structured request gets a client only after the configuration check passes.
  const ai = getClient();
  try {
    // The MIME type and schema ask Gemini for machine-readable output that can be parsed.
    // Temperature controls variation: a moderate value keeps results useful but natural.
    const response = await ai.models.generateContent({
      model: MODEL(),
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature: 0.6,
      },
    });

    // Convert the model's JSON text into a JavaScript object for the controller to use.
    return JSON.parse(response.text);
  } catch (err) {
    // Keep provider details in server logs while exposing a stable API error to clients.
    console.error("Gemini JSON error:", err?.message || err);
    throw new ApiError(502, "AI request failed. Please try again in a moment.");
  }
};

/* ----------------------------- Generate plain text ----------------------------- */
export const generateText = async (prompt, temperature = 0.7) => {
  // This helper is for responses that should remain plain text rather than match a schema.
  const ai = getClient();
  try {
    const response = await ai.models.generateContent({
      model: MODEL(),
      contents: prompt,
      config: { temperature },
    });

    // Remove accidental whitespace before returning the generated text.
    return response.text.trim();
  } catch (err) {
    // Do not leak API credentials or provider internals through the HTTP response.
    console.error("Gemini text error:", err?.message || err);
    throw new ApiError(502, "AI request failed. Please try again in a moment.");
  }
};

/* ----------------------------- Generate lead summary ----------------------------- */
export const generateLeadSummary = async (lead) => {
  // Put CRM data into a focused instruction so the model knows the task and output format.
  // Fallback values prevent missing database fields from producing unclear prompts.
  const prompt = `You are an expert B2B sales analyst for a CRM called TTP CRM.
Analyse the following sales lead and produce a concise assessment.

Lead details:
- Name: ${lead.name || "N/A"}
- Company: ${lead.company || "N/A"}
- Email: ${lead.email || "N/A"}
- Current pipeline stage: ${lead.status || "New"}
- Potential deal value: $${lead.value || 0}
- Source: ${lead.source || "Unknown"}
- Notes: ${lead.notes || "None"}

Return JSON only.`;

  const schema = {
    type: "object",
    properties: {
      // These fields give the frontend predictable data for a summary panel.
      summary: {
        type: "string",
        description: "2–3 sentence executive summary of the lead",
      },
      riskScore: {
        type: "integer",
        description: "Risk of losing this deal, 0 (safe) to 100 (high risk)",
      },
      suggestedPriority: {
        type: "string",
        enum: ["Low", "Medium", "High"],
      },
      nextBestAction: {
        type: "string",
        description: "One concrete recommended next step",
      },
    },
    required: ["summary", "riskScore", "suggestedPriority", "nextBestAction"],
  };

  // The shared helper sends the prompt and validates/parses the structured response.
  return generateJSON(prompt, schema);
};

/* ----------------------------- Generate sales email ----------------------------- */
export const generateEmail = async ({ lead, purpose, tone, sender }) => {
  // Build the email instruction from the lead and sender context supplied by the CRM.
  // Optional chaining and fallbacks keep this function safe with partial input.
  const prompt = `You are a senior sales rep writing on behalf of ${
    sender?.name || "our team"
  } ${sender?.company ? `at ${sender.company}` : ""}.

Write a professional sales email.
Purpose: ${purpose || "follow-up"}
Desired tone: ${tone || "friendly and professional"}

Recipient (lead) details:
- Name: ${lead?.name || "there"}
- Company: ${lead?.company || "N/A"}
- Pipeline stage: ${lead?.status || "New"}
- Context / notes: ${lead?.notes || "None"}

Return JSON only with a compelling subject line and a complete email body.
Use line breaks (\\n) in the body. Keep it under 180 words. Sign off as ${
    sender?.name || "the TTP CRM team"
  }.`;

  const schema = {
    type: "object",
    properties: {
      // Returning subject and body separately lets the frontend fill an email composer.
      subject: { type: "string" },
      body: { type: "string" },
    },
    required: ["subject", "body"],
  };

  // Use structured generation so the email is easy to display or edit before sending.
  return generateJSON(prompt, schema);
};

/* ----------------------------- Generate sales insights ----------------------------- */
export const generateSalesInsights = async (pipelineStats) => {
  // Serialize the analytics snapshot so the model can reason over the exact CRM values.
  const prompt = `You are a revenue-operations advisor. Given this snapshot of a sales pipeline, identify what is working, what is at risk, and concrete actions to improve conversion.

Pipeline snapshot (JSON):
${JSON.stringify(pipelineStats, null, 2)}

Return JSON only.`;

  const schema = {
    type: "object",
    properties: {
      // The schema separates the short headline, observations, recommendations, and score.
      headline: {
        type: "string",
        description: "One-sentence summary of pipeline health",
      },
      insights: {
        type: "array",
        description: "3–5 specific, data-driven observations",
        items: { type: "string" },
      },
      recommendations: {
        type: "array",
        description: "3–5 prioritized, actionable recommendations",
        items: { type: "string" },
      },
      healthScore: {
        type: "integer",
        description: "Overall pipeline health, 0–100",
      },
    },
    required: ["headline", "insights", "recommendations", "healthScore"],
  };

  // Return the same parsed JSON shape expected by the analytics endpoint.
  return generateJSON(prompt, schema);
};
