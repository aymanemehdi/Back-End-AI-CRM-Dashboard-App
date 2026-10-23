import { Contact } from "../models/Contact.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/APIError.js";

/* ----------------------------- Get all contacts ----------------------------- */
export const getContacts = asyncHandler(async (req, res) => {
  // Read optional filters from the URL, for example ?search=acme&tag=customer.
  const { search, tag } = req.query;

  // Only return contacts owned by the authenticated user.
  const filter = { owner: req.user._id };

  // Match a contact that contains the requested tag.
  if (tag) filter.tags = tag;
  if (search) {
    // Search names, email addresses, and companies without caring about case.
    const rx = new RegExp(search, "i");
    filter.$or = [{ name: rx }, { email: rx }, { company: rx }];
  }

  // Favorites appear first, followed by contacts sorted alphabetically.
  const contacts = await Contact.find(filter).sort({ favorite: -1, name: 1 });
  res.json({ success: true, count: contacts.length, contacts });
});

/* ----------------------------- Get single contact ----------------------------- */
export const getContact = asyncHandler(async (req, res) => {
  // Include the owner in the query so users cannot read another user's contact.
  const contact = await Contact.findOne({ _id: req.params.id, owner: req.user._id });

  // Throwing ApiError lets the central error middleware create the response.
  if (!contact) throw new ApiError(404, "Contact not found");
  res.json({ success: true, contact });
});

/* ----------------------------- Create contact ----------------------------- */
export const createContact = asyncHandler(async (req, res) => {
  // Copy the submitted fields and assign ownership from the authenticated user,
  // rather than trusting the client to choose an owner.
  const contact = await Contact.create({ ...req.body, owner: req.user._id });
  res.status(201).json({ success: true, contact });
});

/* ----------------------------- Update contact ----------------------------- */
export const updateContact = asyncHandler(async (req, res) => {
  // Remove owner so a client cannot transfer the contact to another user.
  const { owner, ...updates } = req.body;

  // Find only this user's contact, return the updated document, and validate it.
  const contact = await Contact.findOneAndUpdate(
    { _id: req.params.id, owner: req.user._id },
    updates,
    { new: true, runValidators: true }
  );

  if (!contact) throw new ApiError(404, "Contact not found");
  res.json({ success: true, contact });
});

/* ----------------------------- Delete contact ----------------------------- */
export const deleteContact = asyncHandler(async (req, res) => {
  // Delete only when both the contact ID and authenticated owner match.
  const contact = await Contact.findOneAndDelete({
    _id: req.params.id,
    owner: req.user._id,
  });

  if (!contact) throw new ApiError(404, "Contact not found");
  res.json({ success: true, message: "Contact deleted" });
});
