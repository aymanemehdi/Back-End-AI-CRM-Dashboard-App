import { User } from "../models/User.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/APIError.js";
import jwt from "jsonwebtoken";

// Protect routes by making sure the request contains a valid logged-in user.
export const protect = asyncHandler(async (req, res, next) => {
  let token;
  const header = req.headers.authorization;

  // The client must send the token in the standard format:
  // Authorization: Bearer <JWT token>
  if (header && header.startsWith("Bearer ")) {
    token = header.split(" ")[1];
  }

  // Stop the request when the client did not provide an access token.
  if (!token) {
    throw new ApiError(401, "Not authorized, no token provided");
  }

  let decoded;
  try {
    // Verify the token signature and expiration using the server's secret.
    // The decoded payload contains the user's id created during login.
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    // A bad signature, malformed token, or expired token is unauthorized.
    throw new ApiError(401, "Not authorized, token invalid or expired");
  }

  // Confirm that the account in the token still exists in the database.
  const user = await User.findById(decoded.id);
  if (!user) {
    throw new ApiError(401, "Not authorized, user no longer exists");
  }

  // Make the authenticated user available to later route handlers.
  req.user = user;

  // Continue to the protected route after authentication succeeds.
  next();
});
