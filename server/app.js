// server/app.js
import express from "express";
import cors from "cors";
import authRoutes from "./src/routes/authRoutes.js";
import emergencyRoutes from "./src/routes/emergencyRoutes.js";
import fundRoutes from "./src/routes/fundRoutes.js";
import adminRoutes from "./src/routes/adminRoutes.js";
import notificationRoutes from "./src/routes/notificationRoutes.js";
import bloodRoutes from "./src/routes/bloodRoutes.js";
import volunteerRoutes from "./src/routes/volunteerRoutes.js";
import sosRoutes from "./src/routes/sosRoutes.js";

const app = express();

app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));
app.use("/uploads", express.static("uploads"));

app.use("/api/auth",          authRoutes);
app.use("/api/emergency",     emergencyRoutes);
app.use("/api/fund",          fundRoutes);
app.use("/api/admin",         adminRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/blood",         bloodRoutes);
app.use("/api/volunteer",     volunteerRoutes);
app.use("/api/sos",           sosRoutes);

export default app;