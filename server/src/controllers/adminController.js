import EmergencyReport from "../models/EmergencyReport.js";
import FundRequest from "../models/FundRequest.js";
import User from "../models/User.js";
import EmergencyContact from "../models/EmergencyContact.js";
import Notification from "../models/Notification.js";

const FUND_WARNING_LIMIT = 3;

// ── REPORTS ───────────────────────────────────────────────────────────────────

export const getAllReports = async (req, res) => {
  try {
    const reports = await EmergencyReport.find()
      .populate("userId", "name email contactInfo area")
      .sort({ createdAt: -1 });
    res.status(200).json(reports);
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

export const getFilteredReports = async (req, res) => {
  try {
    const { emergencyType, area, startDate, endDate } = req.query;
    const filter = {};
    if (emergencyType) filter.emergencyType = emergencyType;
    if (area) filter["location.area"] = { $regex: area, $options: "i" };
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }
    const reports = await EmergencyReport.find(filter)
      .populate("userId", "name email contactInfo area")
      .sort({ createdAt: -1 });
    res.status(200).json(reports);
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

export const updateReportStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const validStatuses = ["Pending", "Verified", "Resolved"];
    if (!validStatuses.includes(status))
      return res.status(400).json({ message: "Invalid status value" });

    const report = await EmergencyReport.findByIdAndUpdate(
      id, { status }, { new: true }
    ).populate("userId", "name email contactInfo area");
    if (!report) return res.status(404).json({ message: "Report not found" });

    const statusMessages = {
      Verified: "Your emergency report has been verified by our team and is being acted upon.",
      Resolved: "Your emergency report has been marked as resolved. Thank you for reporting.",
      Pending:  "Your emergency report status has been updated to Pending.",
    };
    const statusEmojis  = { Verified: "✅", Resolved: "🎯", Pending: "⏳" };
    const priorities    = { Verified: "high", Resolved: "medium", Pending: "low" };

    await Notification.create({
      userId:   report.userId._id,
      title:    `${statusEmojis[status]} Report ${status}`,
      message:  statusMessages[status],
      type:     "status_change",
      reportId: report._id,
      priority: priorities[status],
    });

    res.status(200).json({ message: "Status updated successfully", report });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

// ── FUND REQUESTS ─────────────────────────────────────────────────────────────

export const getAllFundRequests = async (req, res) => {
  try {
    const fundRequests = await FundRequest.find()
      .populate("userId", "name email contactInfo area")
      .sort({ createdAt: -1 });
    res.status(200).json(fundRequests);
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

export const updateFundRequestStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const validStatuses = ["Pending", "Approved", "Rejected"];
    if (!validStatuses.includes(status))
      return res.status(400).json({ message: "Invalid status value" });

    const fundRequest = await FundRequest.findByIdAndUpdate(
      id, { status }, { new: true }
    ).populate("userId", "name email contactInfo area");
    if (!fundRequest) return res.status(404).json({ message: "Fund request not found" });

    const fundMessages = {
      Approved: `Your fund request "${fundRequest.title}" for BDT ${fundRequest.amountNeeded.toLocaleString()} has been approved!`,
      Rejected: `Your fund request "${fundRequest.title}" has been reviewed and was not approved at this time.`,
      Pending:  `Your fund request "${fundRequest.title}" status has been updated to Pending.`,
    };
    const fundEmojis = { Approved: "✅", Rejected: "❌", Pending: "⏳" };
    const priorities = { Approved: "high", Rejected: "medium", Pending: "low" };

    await Notification.create({
      userId:   fundRequest.userId._id,
      title:    `${fundEmojis[status]} Fund Request ${status}`,
      message:  fundMessages[status],
      type:     "fund_update",
      fundId:   fundRequest._id,
      priority: priorities[status],
    });

    res.status(200).json({ message: "Status updated successfully", fundRequest });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

// ── USERS ─────────────────────────────────────────────────────────────────────

export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({ role: "user" })
      .select("-password")
      .sort({ createdAt: -1 });
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

export const updateUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const validStatuses = ["active", "suspended", "blocked"];
    if (!validStatuses.includes(status))
      return res.status(400).json({ message: "Invalid status value" });

    const user = await User.findByIdAndUpdate(
      id, { status }, { new: true }
    ).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });

    res.status(200).json({ message: `User status updated to ${status}`, user });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

// ── F20: FUND WARNING SYSTEM ──────────────────────────────────────────────────

// Admin: issue a fund warning to a user
export const issueFundWarning = async (req, res) => {
  try {
    const { id } = req.params;          // target user id
    const { reason } = req.body;
    const adminId = req.user.id;

    if (!reason || !reason.trim())
      return res.status(400).json({ message: "A reason is required for issuing a warning." });

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.role === "admin")
      return res.status(400).json({ message: "Cannot warn an admin." });

    // Increment warning count and add to history
    const newCount = (user.fundWarningCount || 0) + 1;
    const willBlock = newCount >= FUND_WARNING_LIMIT;

    await User.findByIdAndUpdate(id, {
      $inc: { fundWarningCount: 1 },
      $push: {
        warningHistory: {
          reason: reason.trim(),
          issuedAt: new Date(),
          issuedBy: adminId,
        },
      },
      ...(willBlock ? { fundFeaturesBlocked: true } : {}),
    });

    // Notify user about the warning
    await Notification.create({
      userId:   id,
      title:    `⚠️ Fund Warning Issued (${newCount}/${FUND_WARNING_LIMIT})`,
      message:  `You have received a warning for your fund or mass funding activity. Reason: ${reason.trim()}. You have ${FUND_WARNING_LIMIT - newCount} warning(s) remaining before your fund features are blocked.`,
      type:     "system",
      priority: "high",
    });

    // If limit reached, send a second notification about blocking
    if (willBlock) {
      await Notification.create({
        userId:   id,
        title:    "🚫 Fund Features Blocked",
        message:  `You have reached ${FUND_WARNING_LIMIT} warnings. Your ability to submit Fund Requests and Mass Funding requests has been blocked. Please contact the admin to resolve this. Admin Email: admin@emergencybd.com | Phone: +8801700000000`,
        type:     "system",
        priority: "high",
      });
    }

    res.status(200).json({
      message: willBlock
        ? `Warning issued. User has reached ${FUND_WARNING_LIMIT} warnings — fund features blocked.`
        : `Warning issued. User now has ${newCount}/${FUND_WARNING_LIMIT} warnings.`,
      fundWarningCount: newCount,
      fundFeaturesBlocked: willBlock,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

// Admin: unblock fund features for a user
export const unblockFundFeatures = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: "User not found" });
    if (!user.fundFeaturesBlocked)
      return res.status(400).json({ message: "Fund features are not blocked for this user." });

    await User.findByIdAndUpdate(id, {
      fundFeaturesBlocked: false,
      fundWarningCount: 0,
      warningHistory: [],
    });

    // Notify user they have been unblocked
    await Notification.create({
      userId:   id,
      title:    "✅ Fund Features Restored",
      message:  "Your Fund Request and Mass Funding features have been restored by the admin. Your warning count has been reset to 0. Please ensure all future requests are genuine.",
      type:     "system",
      priority: "high",
    });

    res.status(200).json({ message: "Fund features unblocked and warning count reset." });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

// ── EMERGENCY CONTACTS ────────────────────────────────────────────────────────

export const getAllContacts = async (req, res) => {
  try {
    const contacts = await EmergencyContact.find().sort({ createdAt: -1 });
    res.status(200).json(contacts);
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

export const addContact = async (req, res) => {
  try {
    const { name, number, type, area, notes } = req.body;
    if (!name || !number || !type || !area)
      return res.status(400).json({ message: "Name, number, type and area are required" });
    const contact = new EmergencyContact({ name, number, type, area, notes });
    await contact.save();
    res.status(201).json({ message: "Contact added successfully", contact });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

export const updateContact = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, number, type, area, notes } = req.body;
    const contact = await EmergencyContact.findByIdAndUpdate(
      id, { name, number, type, area, notes }, { new: true, runValidators: true }
    );
    if (!contact) return res.status(404).json({ message: "Contact not found" });
    res.status(200).json({ message: "Contact updated successfully", contact });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

export const deleteContact = async (req, res) => {
  try {
    const { id } = req.params;
    const contact = await EmergencyContact.findByIdAndDelete(id);
    if (!contact) return res.status(404).json({ message: "Contact not found" });
    res.status(200).json({ message: "Contact deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};