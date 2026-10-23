import mongoose from "mongoose";

// Open the shared MongoDB connection used by the API.
export const connectDB = async () => {
  // Read the connection string from the environment instead of hard-coding credentials.
  const mongoURI = process.env.MONGO_URI;
  if (!mongoURI) {
    // Fail early with a useful message when the .env configuration is missing.
    throw new Error("MONGO_URI is not defined in environment variables");
  }

  // Reject unknown query fields so database queries behave predictably.
  mongoose.set("strictQuery", true);

  // Try to reach MongoDB for at most 10 seconds during startup.
  const mongooseConnection = await mongoose.connect(mongoURI, {
    serverSelectionTimeoutMS: 10000,
  });

  // Show which MongoDB host and database accepted the connection.
  console.log(
    `MongoDB connected: ${mongooseConnection.connection.host}/${mongooseConnection.connection.name}`,
  );

  // Return the Mongoose connection for callers that need connection details.
  return mongooseConnection;
};
