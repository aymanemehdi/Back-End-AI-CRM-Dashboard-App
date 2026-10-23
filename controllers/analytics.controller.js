import { Lead } from "../models/Lead.js";
import { Contact } from "../models/Contact.js";
import { Task } from "../models/Task.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const getOverview = asyncHandler(async (req, res) => {
  // req.user is added by the authentication middleware after it verifies the JWT.
  // Using this ID in every query keeps one user's dashboard separate from another's.
  const owner = req.user._id;

  // These database operations do not depend on each other, so Promise.all runs them
  // at the same time instead of waiting for leads, contacts, and tasks one by one.
  const [leads, contactCount, openTasks] = await Promise.all([
    Lead.find({ owner }),
    Contact.countDocuments({ owner }),
    Task.countDocuments({ owner, status: { $ne: "Completed" } }),
  ]);

  // Keep every expected pipeline stage in the response, including empty stages.
  // This gives the frontend a stable response shape for rendering its chart.
  const stages = ["New", "Qualified", "Proposal", "Won", "Lost"];
  const byStage = Object.fromEntries(stages.map((s) => [s, { count: 0, value: 0 }]));

  // wonValue is the value of successful leads only; totalValue includes every lead.
  let wonValue = 0;
  let totalValue = 0;

  for (const l of leads) {
    // Find the lead's stage bucket. The fallback also keeps unexpected statuses
    // visible instead of silently dropping those leads from the totals.
    const bucket = byStage[l.status] || (byStage[l.status] = { count: 0, value: 0 });
    bucket.count += 1;

    // MongoDB values may be missing, so treat an absent value as zero.
    bucket.value += l.value || 0;
    totalValue += l.value || 0;
    if (l.status === "Won") wonValue += l.value || 0;
  }

  // Conversion rate is based on closed leads: successful leads divided by
  // successful plus lost leads. New or active leads are not included.
  const won = byStage.Won.count;
  const lost = byStage.Lost.count;
  const closed = won + lost;
  // Avoid division by zero when there are no won or lost leads yet.
  const conversionRate = closed ? Math.round((won / closed) * 100) : 0;

  // Prepare six monthly buckets for the chart, including months with no activity.
  // Keeping empty months prevents the chart from having missing or shifting labels.
  const months = lastSixMonths();
  const trend = months.map(({ key, label }) => ({ month: label, leads: 0, won: 0 }));

  // Store each month key with its array position so leads can be added efficiently.
  const indexByKey = Object.fromEntries(months.map((m, i) => [m.key, i]));

  for (const l of leads) {
    // Use both year and month in the key so January from different years cannot clash.
    const d = new Date(l.createdAt);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const idx = indexByKey[key];

    // Ignore records outside the six-month window.
    if (idx === undefined) continue;
    trend[idx].leads += 1;
    if (l.status === "Won") trend[idx].won += l.value || 0;
  }

  // Return a small activity list rather than every lead. Copy the array first so
  // sorting does not mutate the original query result used above.
  const recentLeads = [...leads]
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
    .slice(0, 6)
    .map((l) => ({
      // Expose only the fields needed by the dashboard activity list.
      id: l._id,
      name: l.name,
      company: l.company,
      status: l.status,
      value: l.value,
      updatedAt: l.updatedAt,
    }));

  res.json({
    success: true,
    // Summary values used by dashboard statistic cards.
    stats: {
      revenueWon: wonValue,
      pipelineValue: totalValue,
      totalLeads: leads.length,
      totalContacts: contactCount,
      openTasks,
      conversionRate,
    },
    // Convert the internal lookup object back into the fixed stage order.
    pipeline: stages.map((s) => ({
      stage: s,
      count: byStage[s].count,
      value: byStage[s].value,
    })),
    // The trend array contains one entry per month in chronological order.
    trend,
    // The frontend can use this for the recent activity section.
    recentLeads,
  });
});

export const lastSixMonths = () => {
  // Short labels are sufficient because the chart covers only six consecutive months.
  const labels = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];

  const now = new Date();
  const out = [];

  // Build the current month and the five months before it in chronological order.
  for (let i = 5; i >= 0; i--) {
    // Date automatically handles moving from January into the previous year.
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push({
      key: `${d.getFullYear()}-${d.getMonth()}`,
      label: labels[d.getMonth()],
    });
  }

  return out;
};
