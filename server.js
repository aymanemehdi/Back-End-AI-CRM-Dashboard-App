import "dotenv/config";
import express from "express";
import cors from "cors";
import morgan from "morgan";

import authRoutes from "./routes/auth.routes.js";
import contactRoutes from "./routes/contact.routes.js";
import noteRoutes from "./routes/note.routes.js";
import leadRoutes from "./routes/lead.routes.js";
import taskRoutes from "./routes/task.routes.js";

import { connectDB } from "./config/database.js";
import { notFound, errorHandler } from "./middleware/error.middleware.js";

const app = express();

/* ----------------------------- Middleware ----------------------------- */
// Allow the front-end to call this API from another origin, such as localhost:5173.
// `credentials: true` allows cookies or other browser credentials to be included.
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  })
);

// Parse JSON request bodies so data sent by the frontend is available in `req.body`.
// The limit prevents unexpectedly large JSON payloads from reaching the application.
app.use(express.json({ limit: "1mb" }));

// Parse form submissions. `extended: true` supports nested form values.
app.use(express.urlencoded({ extended: true }));

// Morgan logs HTTP requests during development, which helps with debugging.
if (process.env.NODE_ENV !== "production") app.use(morgan("dev"));

/* ----------------------------- Routes ----------------------------- */
// A small health-check endpoint confirms that the API process is responding.
app.get("/api", (req, res) =>
  res.json({ success: true, status: "ok", service: "CRM API" })
);

app.use("/api/auth", authRoutes);
app.use("/api/contacts", contactRoutes);
app.use("/api/notes", noteRoutes);
app.use("/api/leads", leadRoutes);
app.use("/api/tasks", taskRoutes);

/* ----------------------------- Error handling (last) ----------------------------- */
// This middleware should be the last one registered to catch any unmatched routes.
app.use(notFound);
// This middleware should be the last one registered to handle any errors that occur.
app.use(errorHandler);

/* ----------------------------- Boot ----------------------------- */
// Use the port from the environment when deployed; otherwise use port 8000 locally.
const PORT = process.env.PORT || 8000;

// Connect to MongoDB before accepting requests so the API does not start half-configured.
const start = async () => {
  try {
    // Wait until the database connection succeeds.
    await connectDB();

    // Start listening for incoming HTTP requests only after the database is ready.
    app.listen(PORT, () => {
      console.log(`CRM API running on http://localhost:${PORT}`);
    });
  } catch (err) {
    // A startup failure should be visible and should terminate the process.
    console.error("Failed to start server:", err.message);
    process.exit(1);
  }
};

// Run the startup function when this module is loaded.
start();

// Export the app so automated tests or another module can use it without opening a port.
export default app;
