import { Lead } from "../models/Lead.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/APIError.js";

/* ----------------------------- Get all leads ----------------------------- */
export const getLeads = asyncHandler(async (req, res) => {
  // These query parameters let the client filter the pipeline view.
  const { status, priority, source, search } = req.query;

  // Users can only read leads that belong to their own account.
  const filter = { owner: req.user._id };

  // Add each optional filter only when it was supplied by the client.
  if (status) filter.status = status;
  if (priority) filter.priority = priority;
  if (source) filter.source = source;

  if (search) {
    // Search the main lead fields case-insensitively with one regular expression.
    const rx = new RegExp(search, "i");
    filter.$or = [{ name: rx }, { email: rx }, { company: rx }];
  }

  // The order field controls pipeline position; createdAt keeps newer ties first.
  const leads = await Lead.find(filter).sort({ order: 1, createdAt: -1 });
  res.json({ success: true, count: leads.length, leads });
});

/* ----------------------------- Get single lead ----------------------------- */
export const getLead = asyncHandler(async (req, res) => {
  // Include the owner in the query so one user cannot access another user's lead.
  const lead = await Lead.findOne({ _id: req.params.id, owner: req.user._id });

  // A missing lead and a lead owned by someone else produce the same response.
  if (!lead) throw new ApiError(404, "Lead not found");
  res.json({ success: true, lead });
});

/* ----------------------------- Create lead ----------------------------- */
export const createLead = asyncHandler(async (req, res) => {
  // Set ownership from the authenticated user instead of trusting request data.
  const lead = await Lead.create({ ...req.body, owner: req.user._id });
  res.status(201).json({ success: true, lead });
});

/* ----------------------------- Update lead ----------------------------- */
export const updateLead = asyncHandler(async (req, res) => {
  // Remove owner so the client cannot transfer the lead to another account.
  const { owner, ...updates } = req.body;

  // Matching the ID and owner protects the update from cross-user access.
  const lead = await Lead.findOneAndUpdate(
    { _id: req.params.id, owner: req.user._id },
    updates,
    { new: true, runValidators: true }
  );

  // `new: true` returns the saved lead, while validators check updated fields.
  if (!lead) throw new ApiError(404, "Lead not found");
  res.json({ success: true, lead });
});

/* ----------------------------- Delete lead ----------------------------- */
export const deleteLead = asyncHandler(async (req, res) => {
  // Delete only a lead that belongs to the authenticated user.
  const lead = await Lead.findOneAndDelete({ _id: req.params.id, owner: req.user._id });

  if (!lead) throw new ApiError(404, "Lead not found");
  res.json({ success: true, message: "Lead deleted" });
});

/* ----------------------------- Reorder leads ----------------------------- */
export const reorderLeads = asyncHandler(async (req, res) => {
  // The frontend sends the new status and position for multiple pipeline cards.
  const { updates } = req.body;

  // Reject malformed input before attempting any database updates.
  if (!Array.isArray(updates)) {
    throw new ApiError(400, "updates must be an array");
  }

  await Promise.all(
    updates.map((u) =>
      Lead.updateOne(
        // Keep every bulk update scoped to the authenticated user's leads.
        { _id: u.id, owner: req.user._id },
        { $set: { status: u.status, order: u.order } }
      )
    )
  );

  res.json({ success: true, message: "Pipeline updated" });
});
