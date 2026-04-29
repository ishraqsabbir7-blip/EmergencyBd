import express from "express";
import {
  getAllReports,
  getAllFundRequests,
  updateReportStatus,
  getFilteredReports,
  updateFundRequestStatus,
  getAllUsers,
  updateUserStatus,
  issueFundWarning,
  unblockFundFeatures,
  getAllContacts,
  addContact,
  updateContact,
  deleteContact,
} from "../controllers/adminController.js";
import authMiddleware from "../middleware/authMiddleware.js";
import adminMiddleware from "../middleware/adminMiddleware.js";

const router = express.Router();

// ── Reports ───────────────────────────────────────────────────────────────────
router.get("/reports",            authMiddleware, adminMiddleware, getAllReports);
router.get("/reports/filter",     authMiddleware, adminMiddleware, getFilteredReports);
router.put("/reports/:id/status", authMiddleware, adminMiddleware, updateReportStatus);

// ── Fund Requests ─────────────────────────────────────────────────────────────
router.get("/fund-requests",            authMiddleware, adminMiddleware, getAllFundRequests);
router.put("/fund-requests/:id/status", authMiddleware, adminMiddleware, updateFundRequestStatus);

// ── Users ─────────────────────────────────────────────────────────────────────
router.get("/users",                   authMiddleware, adminMiddleware, getAllUsers);
router.put("/users/:id/status",        authMiddleware, adminMiddleware, updateUserStatus);

// F20: Fund warning system
router.post("/users/:id/fund-warning", authMiddleware, adminMiddleware, issueFundWarning);
router.put("/users/:id/fund-unblock",  authMiddleware, adminMiddleware, unblockFundFeatures);

// ── Emergency Contacts ────────────────────────────────────────────────────────
router.get("/contacts",     authMiddleware, getAllContacts);
router.post("/contacts",    authMiddleware, adminMiddleware, addContact);
router.put("/contacts/:id", authMiddleware, adminMiddleware, updateContact);
router.delete("/contacts/:id", authMiddleware, adminMiddleware, deleteContact);

export default router;