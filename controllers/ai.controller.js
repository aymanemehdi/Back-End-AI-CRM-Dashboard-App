import { Lead } from "../models/Lead.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/APIError.js";
import {
  generateLeadSummary,
  generateEmail,
  generateSalesInsights,
  isAIConfigured,
} from "../services/ai.service.js";

/* ----------------------------- Resolve Lead ----------------------------- */
const resolveLead = async (req) => {
  // A lead can be supplied by ID or directly in the request body.
  // Using an ID lets us load the complete, trusted database record.
  if (req.body.leadId) {
    // Include the authenticated owner in the query so users cannot use this
    // endpoint to read another user's lead.
    const lead = await Lead.findOne({ _id: req.body.leadId, owner: req.user._id });
    if (!lead) throw new ApiError(404, "Lead not found");
    return lead;
  }

  // Inline leads are useful for previews and do not need to be saved first.
  if (req.body.lead) return req.body.lead;

  // Neither input form was provided, so the AI service has no lead to process.
  throw new ApiError(400, "Provide a leadId or an inline lead object");
};

/* ----------------------------- AI Status ----------------------------- */
export const aiStatus = asyncHandler(async (req, res) => {
  // This endpoint lets the frontend show whether the Gemini API key is ready
  // and which model will be used, without making an AI request.
  res.json({
    success: true,
    configured: isAIConfigured(),
    model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
  });
});

/* ----------------------------- Generate Lead Summary ----------------------------- */
export const leadSummary = asyncHandler(async (req, res) => {
  // Resolve the lead before calling the AI service so input validation and
  // ownership checks happen in one place.
  const lead = await resolveLead(req);

  // The service returns the generated summary and a normalized risk score.
  const result = await generateLeadSummary(lead);

  if (req.body.leadId) {
    // Persist generated fields only for a database lead. Inline leads are not
    // stored because they were supplied only for this request.
    await Lead.updateOne(
      { _id: req.body.leadId, owner: req.user._id },
      {
        $set: {
          // Save the AI output so later dashboard requests can reuse it.
          aiSummary: result.summary,
          aiRiskScore: result.riskScore,
        },
      }
    );
  }

  res.json({ success: true, ...result });
});

/* ----------------------------- Generate Email Draft ----------------------------- */
export const generateEmailDraft = asyncHandler(async (req, res) => {
  // Reuse the same lead resolution and ownership rules as lead summaries.
  const lead = await resolveLead(req);

  // Purpose and tone control the style of the generated message.
  const { purpose, tone } = req.body;

  // Pass the authenticated user's identity to personalize the sender details.
  const result = await generateEmail({
    lead,
    purpose,
    tone,
    sender: { name: req.user.name, company: req.user.company },
  });

  res.json({ success: true, ...result });
});

/* ----------------------------- Generate Sales Insights ----------------------------- */
export const salesInsights = asyncHandler(async (req, res) => {
  // Clients may provide precomputed stats, which is useful when they already
  // have a filtered dashboard view.
  let stats = req.body.stats;

  if (!stats) {
    // Otherwise calculate stats from this user's leads on the server. This
    // prevents the AI prompt from being built from another user's data.
    const leads = await Lead.find({ owner: req.user._id });
    stats = buildPipelineStats(leads);
  }

  // Ask the AI service to turn numeric pipeline data into useful sales advice.
  const result = await generateSalesInsights(stats);
  res.json({ success: true, ...result });
});

/* ----------------------------- Build Pipeline Stats ----------------------------- */
const buildPipelineStats = (leads) => {
  // Group leads by status while counting records and adding their monetary value.
  const byStage = {};
  let totalValue = 0;

  for (const l of leads) {
    // Create a stage bucket the first time a status appears.
    byStage[l.status] = byStage[l.status] || { count: 0, value: 0 };
    byStage[l.status].count += 1;

    // Missing values are treated as zero so one incomplete lead cannot produce
    // NaN totals or break the response.
    byStage[l.status].value += l.value || 0;
    totalValue += l.value || 0;
  }

  // Win rate uses only closed leads: Won divided by Won plus Lost.
  const won = byStage.Won?.count || 0;
  const lost = byStage.Lost?.count || 0;
  const closed = won + lost;

  // Return a compact object that can be sent to the AI service as context.
  return {
    totalLeads: leads.length,
    totalPipelineValue: totalValue,
    winRate: closed ? Math.round((won / closed) * 100) : 0,
    stages: byStage,
  };
};
