// server/src/config/testDb.js

import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config({ path: "./.env" });

export const connectTestDB = async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGO_URI);
  }
};

export const disconnectTestDB = async () => {
  await mongoose.disconnect();
};