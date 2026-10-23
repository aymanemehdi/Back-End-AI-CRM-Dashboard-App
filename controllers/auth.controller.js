import { User } from "../models/User.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/APIError.js";
import { generateToken } from "../utils/generateToken.js";

// Return only the user fields that are safe and useful for the client.
// The password is intentionally excluded from every response.
const toClientUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  company: user.company,
  avatar: user.avatar,
  createdAt: user.createdAt,
});

export const register = asyncHandler(async (req, res) => {
  // Read the values submitted by the registration form.
  const { name, email, password, company } = req.body;

  // Reject the request before querying the database when required data is missing.
  if (!name || !email || !password) {
    throw new ApiError(400, "Name, email and password are required");
  }

  // Normalize the email before checking it so different letter casing cannot
  // create multiple accounts for the same email address.
  const exists = await User.findOne({ email: email.toLowerCase() });
  if (exists) {
    throw new ApiError(409, "An account with that email already exists");
  }

  // User model hooks are responsible for hashing the password before storage.
  const user = await User.create({ name, email, password, company });

  // Return a token immediately so the newly registered user is authenticated.
  res.status(201).json({
    success: true,
    token: generateToken(user._id),
    user: toClientUser(user),
  });
});

export const login = asyncHandler(async (req, res) => {
  // Read the credentials submitted by the login form.
  const { email, password } = req.body;

  // Both credentials are required to attempt authentication.
  if (!email || !password) {
    throw new ApiError(400, "Email and password are required");
  }

  // Passwords are hidden by default in the User model, so explicitly select it
  // here for the model's password comparison method.
  const user = await User.findOne({ email: email.toLowerCase() }).select("+password");
  if (!user || !(await user.matchPassword(password))) {
    // Use one generic message so callers cannot tell whether the email exists.
    throw new ApiError(401, "Invalid email or password");
  }

  // A valid login receives a signed token and the safe user representation.
  res.json({
    success: true,
    token: generateToken(user._id),
    user: toClientUser(user),
  });
});

export const getMe = asyncHandler(async (req, res) => {
  // The authentication middleware places the verified user on req.user.
  res.json({ success: true, user: toClientUser(req.user) });
});

export const updateProfile = asyncHandler(async (req, res) => {
  // Only these profile fields may be changed through this endpoint.
  const { name, company, avatar, password } = req.body;
  const user = req.user;

  // Check for undefined so clients can intentionally set a field to an empty value.
  if (name !== undefined) user.name = name;
  if (company !== undefined) user.company = company;
  if (avatar !== undefined) user.avatar = avatar;
  // An empty password is ignored; a non-empty password is hashed by the model hook.
  if (password) user.password = password;

  // Save all changed fields, then return the updated safe user representation.
  await user.save();
  res.json({ success: true, user: toClientUser(user) });
});
