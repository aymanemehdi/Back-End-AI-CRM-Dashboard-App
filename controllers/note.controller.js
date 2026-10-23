import { Note } from "../models/Note.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/APIError.js";

/* ----------------------------- Get all notes ----------------------------- */
export const getNotes = asyncHandler(async (req, res) => {
  // Read optional filters from the URL, for example ?lead=id&search=meeting.
  const { lead, contact, search } = req.query;

  // Always limit results to notes owned by the authenticated user.
  const filter = { owner: req.user._id };

  // Add relationship filters only when the client provides them.
  if (lead) filter.lead = lead;
  if (contact) filter.contact = contact;

  // Search note content without requiring an exact, case-sensitive match.
  if (search) filter.content = new RegExp(search, "i");

  // Show pinned notes first, then show newer notes before older ones.
  // Populate replaces lead/contact IDs with a small set of useful fields.
  const notes = await Note.find(filter)
    .sort({ pinned: -1, createdAt: -1 })
    .populate("lead", "name company")
    .populate("contact", "name company");

  res.json({ success: true, count: notes.length, notes });
});

/* ----------------------------- Create note ----------------------------- */
export const createNote = asyncHandler(async (req, res) => {
  const { content, lead, contact, pinned } = req.body;

  // A note without content is not useful, so reject it before writing to MongoDB.
  if (!content) throw new ApiError(400, "Note content is required");

  // The owner comes from the authenticated request, never from client input.
  const note = await Note.create({
    owner: req.user._id,
    content,
    lead: lead || null,
    contact: contact || null,
    pinned: Boolean(pinned),
  });

  res.status(201).json({ success: true, note });
});

/* ----------------------------- Update note ----------------------------- */
export const updateNote = asyncHandler(async (req, res) => {
  // Remove owner so a client cannot transfer the note to another user.
  const { owner, ...updates } = req.body;

  // Matching both the note ID and owner prevents cross-user updates.
  const note = await Note.findOneAndUpdate(
    { _id: req.params.id, owner: req.user._id },
    updates,
    { new: true, runValidators: true }
  );

  // Mongoose returns null when the note does not exist or belongs to another user.
  if (!note) throw new ApiError(404, "Note not found");
  res.json({ success: true, note });
});

/* ----------------------------- Delete note ----------------------------- */
export const deleteNote = asyncHandler(async (req, res) => {
  // Delete only when both the note ID and authenticated owner match.
  const note = await Note.findOneAndDelete({
    _id: req.params.id,
    owner: req.user._id,
  });

  // Do not reveal whether another user's note exists.
  if (!note) throw new ApiError(404, "Note not found");
  res.json({ success: true, message: "Note deleted" });
});
