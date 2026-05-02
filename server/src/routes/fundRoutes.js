import express from "express";
import {
  submitFundRequest, getMyFundRequests, getApprovedFundRequests,
  donateFund, getFundRequestById, deleteMyFundRequest,
  submitMassFundRequest, getApprovedMassFunds, getMyMassFunds,
  getMassFundById, getMassFundByIdAdmin, getAllMassFunds,
  updateMassFundStatus, deleteMassFund,
  donateToMassFund, getMassFundDonations, getMyMassDonations,
} from "../controllers/fundController.js";
import authMiddleware   from "../middleware/authMiddleware.js";
import checkFundBlock   from "../middleware/checkFundBlock.js";
import { massFundUpload } from "../middleware/uploadMiddleware.js";

const router = express.Router();

const uploadHandler = (req, res, next) => {
  massFundUpload(req, res, (err) => {
    if (err) return res.status(400).json({ message: err.message || "File upload failed." });
    next();
  });
};

// ── Fund Request ──────────────────────────────────────────────────────────────
router.post("/request",               authMiddleware, checkFundBlock, submitFundRequest);
router.get("/my-requests",            authMiddleware, getMyFundRequests);
router.get("/approved",               authMiddleware, getApprovedFundRequests);
router.delete("/my-requests/:id",     authMiddleware, deleteMyFundRequest);
router.post("/:fundRequestId/donate", authMiddleware, donateFund);
router.get("/:id",                    authMiddleware, getFundRequestById);

// ── Mass Fund Request ─────────────────────────────────────────────────────────
router.post("/mass/submit",            authMiddleware, checkFundBlock, uploadHandler, submitMassFundRequest);
router.get("/mass/approved",           authMiddleware, getApprovedMassFunds);
router.get("/mass/mine",               authMiddleware, getMyMassFunds);
router.get("/mass/my-donations",       authMiddleware, getMyMassDonations);
router.get("/mass/all",                authMiddleware, getAllMassFunds);
router.patch("/mass/:id/status",       authMiddleware, updateMassFundStatus);
router.delete("/mass/:id",             authMiddleware, deleteMassFund);
router.post("/mass/:id/donate",        authMiddleware, checkFundBlock, donateToMassFund);
router.get("/mass/:id/donations",      authMiddleware, getMassFundDonations);
router.get("/mass/:id/admin",          authMiddleware, getMassFundByIdAdmin);
router.get("/mass/:id",                authMiddleware, getMassFundById);

export default router;