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

// Bug 3 fix: populate warning fields so admin sees warning count when reviewing
export const getAllFundRequests = async (req, res) => {
  try {
    const fundRequests = await FundRequest.find()
      .populate("userId", "name email contactInfo area fundWarningCount fundFeaturesBlocked")
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

// Bug 3 fix: include warning fields so they appear in fund req review panel
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
// ── ANALYTICS ─────────────────────────────────────────────────────────────────

export const getAnalytics = async (req, res) => {
  try {
    const now = new Date();

    // ── Helper: get last N months as labels ──────────────────────────────────
    const getLastNMonths = (n) => {
      const months = [];
      for (let i = n - 1; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        months.push({
          year: d.getFullYear(),
          month: d.getMonth(),
          label: d.toLocaleString("en-US", { month: "short", year: "2-digit" }),
          start: new Date(d.getFullYear(), d.getMonth(), 1),
          end: new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999),
        });
      }
      return months;
    };

    const months6 = getLastNMonths(6);
    const months12 = getLastNMonths(12);

    // ── 1. Emergency Reports ─────────────────────────────────────────────────
    const allReports = await EmergencyReport.find().lean();

    // Monthly report counts (last 6 months)
    const reportsByMonth = months6.map(m => ({
      label: m.label,
      total: allReports.filter(r => {
        const d = new Date(r.createdAt);
        return d >= m.start && d <= m.end;
      }).length,
      pending: allReports.filter(r => new Date(r.createdAt) >= m.start && new Date(r.createdAt) <= m.end && r.status === "Pending").length,
      verified: allReports.filter(r => new Date(r.createdAt) >= m.start && new Date(r.createdAt) <= m.end && r.status === "Verified").length,
      resolved: allReports.filter(r => new Date(r.createdAt) >= m.start && new Date(r.createdAt) <= m.end && r.status === "Resolved").length,
    }));

    // By type
    const reportsByType = ["robbery", "fire", "accident", "harassment", "medical"].map(type => ({
      type,
      count: allReports.filter(r => r.emergencyType === type).length,
    }));

    // Status distribution
    const reportStatus = {
      pending: allReports.filter(r => r.status === "Pending").length,
      verified: allReports.filter(r => r.status === "Verified").length,
      resolved: allReports.filter(r => r.status === "Resolved").length,
    };

    // ── 2. Fund Requests ─────────────────────────────────────────────────────
    const allFunds = await FundRequest.find().lean();

    // Monthly fund counts + amounts (last 6 months)
    const fundsByMonth = months6.map(m => ({
      label: m.label,
      total: allFunds.filter(f => new Date(f.createdAt) >= m.start && new Date(f.createdAt) <= m.end).length,
      approved: allFunds.filter(f => new Date(f.createdAt) >= m.start && new Date(f.createdAt) <= m.end && f.status === "Approved").length,
      rejected: allFunds.filter(f => new Date(f.createdAt) >= m.start && new Date(f.createdAt) <= m.end && f.status === "Rejected").length,
      amountRequested: allFunds
        .filter(f => new Date(f.createdAt) >= m.start && new Date(f.createdAt) <= m.end)
        .reduce((sum, f) => sum + (f.amountNeeded || 0), 0),
      amountApproved: allFunds
        .filter(f => new Date(f.createdAt) >= m.start && new Date(f.createdAt) <= m.end && f.status === "Approved")
        .reduce((sum, f) => sum + (f.amountNeeded || 0), 0),
    }));

    const fundTotals = {
      total: allFunds.length,
      approved: allFunds.filter(f => f.status === "Approved").length,
      rejected: allFunds.filter(f => f.status === "Rejected").length,
      pending: allFunds.filter(f => f.status === "Pending").length,
      totalRequested: allFunds.reduce((s, f) => s + (f.amountNeeded || 0), 0),
      totalApproved: allFunds.filter(f => f.status === "Approved").reduce((s, f) => s + (f.amountNeeded || 0), 0),
    };

    // ── 3. Users ─────────────────────────────────────────────────────────────
    const allUsers = await User.find({ role: "user" }).lean();

    const usersByMonth = months6.map(m => ({
      label: m.label,
      new: allUsers.filter(u => {
        const d = new Date(u.createdAt);
        return d >= m.start && d <= m.end;
      }).length,
    }));

    const userTotals = {
      total: allUsers.length,
      active: allUsers.filter(u => u.status === "active").length,
      suspended: allUsers.filter(u => u.status === "suspended").length,
      blocked: allUsers.filter(u => u.status === "blocked").length,
      fundBlocked: allUsers.filter(u => u.fundFeaturesBlocked).length,
      warned: allUsers.filter(u => (u.fundWarningCount || 0) > 0).length,
    };

    // ── 4. Volunteers ─────────────────────────────────────────────────────────
    let volunteerStats = { total: 0, approved: 0, totalPointsAwarded: 0, byMonth: [] };
    try {
      const VolunteerOpportunity = (await import("../models/VolunteerOpportunity.js")).default;
      const allOpps = await VolunteerOpportunity.find().lean();
      volunteerStats = {
        total: allOpps.length,
        approved: allOpps.reduce((s, o) => s + (o.approvedUsers?.length || 0), 0),
        interested: allOpps.reduce((s, o) => s + (o.interestedUsers?.length || 0), 0),
        totalPointsAwarded: allUsers.reduce((s, u) => s + (u.points || 0), 0),
        byMonth: months6.map(m => ({
          label: m.label,
          opportunities: allOpps.filter(o => new Date(o.createdAt) >= m.start && new Date(o.createdAt) <= m.end).length,
          approvals: allOpps.reduce((s, o) => {
            const approved = (o.approvedUsers || []).filter(() => true).length;
            return s;
          }, 0),
        })),
        topVolunteers: allUsers
          .filter(u => u.points > 0)
          .sort((a, b) => b.points - a.points)
          .slice(0, 5)
          .map(u => ({ name: u.name, area: u.area, points: u.points, activities: u.volunteerHistory?.length || 0 })),
      };
    } catch (e) {
      // VolunteerOpportunity model may not exist in all envs
    }

    // ── 5. Timeline — last 20 events across all categories ───────────────────
    const timelineEvents = [
      ...allReports.slice(-10).map(r => ({
        type: "report", label: `${r.emergencyType} report`, status: r.status,
        date: r.createdAt, color: "#ff6b6b",
      })),
      ...allFunds.slice(-10).map(f => ({
        type: "fund", label: `Fund: ${f.title?.substring(0, 30)}`, status: f.status,
        date: f.createdAt, color: "#ffd93d",
      })),
    ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 15);

    res.status(200).json({
      reportsByMonth,
      reportsByType,
      reportStatus,
      fundsByMonth,
      fundTotals,
      usersByMonth,
      userTotals,
      volunteerStats,
      timelineEvents,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};