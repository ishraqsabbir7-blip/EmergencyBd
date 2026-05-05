import express from "express";
import SOSEvent from "../models/SOSEvent.js";
import User from "../models/User.js";
import Notification from "../models/Notification.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

const typeIcon = {
  fire: "🔥",
  robbery: "🔫",
  accident: "💥",
  harassment: "⚠️",
  medical: "🏥",
  flood: "🌊",
  other: "🚨",
};

// ── POST /api/sos/trigger ─────────────────────────────────────────────────
router.post("/trigger", authMiddleware, async (req, res) => {
  try {
    const { emergencyType, title, description, latitude, longitude, address, radius } = req.body;

    if (!emergencyType || !title || !description || !latitude || !longitude) {
      return res.status(400).json({ message: "All fields are required." });
    }

    // Check if user is blocked
    const user = await User.findById(req.user.id).select("status");
    if (user.status === "blocked") {
      return res.status(403).json({ message: "Blocked users cannot trigger SOS." });
    }

    const sosEvent = new SOSEvent({
      sender: req.user.id,
      emergencyType,
      title,
      description,
      location: {
        type: "Point",
        coordinates: [parseFloat(longitude), parseFloat(latitude)],
        address: address || "",
      },
      radius: parseFloat(radius) || 5,
      status: "active",
    });

    await sosEvent.save();

    // Find users within radius
    let notifiedUserIds = [];
    try {
      const radiusInMeters = sosEvent.radius * 1000;
      const usersInRadius = await User.find({
        _id: { $ne: req.user.id },
        role: { $ne: "admin" },
        status: "active", // Only notify active users
        location: {
          $nearSphere: {
            $geometry: {
              type: "Point",
              coordinates: [parseFloat(longitude), parseFloat(latitude)],
            },
            $maxDistance: radiusInMeters,
          },
        },
      }).select("_id");
      notifiedUserIds = usersInRadius.map((u) => u._id);
    } catch (geoErr) {
      console.warn("Geo radius query skipped:", geoErr.message);
    }

    // Send in-app notifications to users in radius
    if (notifiedUserIds.length > 0) {
      const notifications = notifiedUserIds.map((userId) => ({
        userId: userId,
        type: "emergency_alert",
        title: `${typeIcon[emergencyType] || "🚨"} SOS Alert: ${title}`,
        message: `An emergency (${emergencyType}) has been reported near your location. Tap to view on map.`,
        priority: "high",
        isRead: false,
      }));
      await Notification.insertMany(notifications);
      sosEvent.notifiedUsers = notifiedUserIds;
      await sosEvent.save();
    }

    // Notify admins
    try {
      const admins = await User.find({ role: "admin" }).select("_id");
      if (admins.length > 0) {
        const adminNotifs = admins.map((admin) => ({
          userId: admin._id,
          type: "emergency_alert",
          title: `${typeIcon[emergencyType] || "🚨"} New SOS: ${title}`,
          message: `${description} — ${address || `${latitude}, ${longitude}`}`,
          priority: "high",
          isRead: false,
        }));
        await Notification.insertMany(adminNotifs);
      }
    } catch (notifErr) {
      console.warn("Admin notification skipped:", notifErr.message);
    }

    res.status(201).json({
      message: "SOS triggered successfully.",
      sosEvent,
      notifiedCount: notifiedUserIds.length,
    });
  } catch (err) {
    console.error("SOS trigger error:", err);
    res.status(500).json({ message: "Server error while triggering SOS." });
  }
});

// ── GET /api/sos/active ───────────────────────────────────────────────────
router.get("/active", authMiddleware, async (req, res) => {
  try {
    const events = await SOSEvent.find({ status: "active" })
      .populate("sender", "name email")
      .sort({ createdAt: -1 });
    res.json(events);
  } catch (err) {
    console.error("Fetch active SOS error:", err);
    res.status(500).json({ message: "Server error." });
  }
});

// ── GET /api/sos/all (NEW - Admin only) ───────────────────────────────────
router.get("/all", authMiddleware, async (req, res) => {
  try {
    // Check if user is admin
    const user = await User.findById(req.user.id).select("role");
    if (user.role !== "admin") {
      return res.status(403).json({ message: "Admin access required." });
    }
    
    const { status, emergencyType, startDate, endDate } = req.query;
    const filter = {};
    
    if (status) filter.status = status;
    if (emergencyType) filter.emergencyType = emergencyType;
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }
    
    const events = await SOSEvent.find(filter)
      .populate("sender", "name email contactInfo area")
      .sort({ createdAt: -1 });
    res.json(events);
  } catch (err) {
    console.error("Fetch all SOS error:", err);
    res.status(500).json({ message: "Server error." });
  }
});

// ── GET /api/sos/nearby/me ────────────────────────────────────────────────
router.get("/nearby/me", authMiddleware, async (req, res) => {
  try {
    const { latitude, longitude, maxDistance = 20000 } = req.query;
    if (!latitude || !longitude) {
      return res.status(400).json({ message: "Location required." });
    }
    const events = await SOSEvent.find({
      status: "active",
      location: {
        $nearSphere: {
          $geometry: {
            type: "Point",
            coordinates: [parseFloat(longitude), parseFloat(latitude)],
          },
          $maxDistance: parseFloat(maxDistance),
        },
      },
    }).populate("sender", "name");
    res.json(events);
  } catch (err) {
    console.error("Nearby SOS error:", err);
    res.status(500).json({ message: "Server error." });
  }
});

// ── GET /api/sos/user/my-events (NEW - Get user's own SOS events) ─────────
router.get("/user/my-events", authMiddleware, async (req, res) => {
  try {
    const events = await SOSEvent.find({ sender: req.user.id })
      .sort({ createdAt: -1 });
    res.json(events);
  } catch (err) {
    console.error("Fetch user SOS error:", err);
    res.status(500).json({ message: "Server error." });
  }
});

// ── GET /api/sos/:id ──────────────────────────────────────────────────────
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const event = await SOSEvent.findById(req.params.id).populate("sender", "name email");
    if (!event) return res.status(404).json({ message: "SOS event not found." });
    res.json(event);
  } catch (err) {
    res.status(500).json({ message: "Server error." });
  }
});

// ── PUT /api/sos/:id (NEW - Full update) ──────────────────────────────────
router.put("/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { emergencyType, title, description, latitude, longitude, address, radius, status } = req.body;
    
    const event = await SOSEvent.findById(id);
    if (!event) return res.status(404).json({ message: "SOS event not found." });
    
    // Check authorization (owner or admin)
    const isOwner = event.sender.toString() === req.user.id;
    const user = await User.findById(req.user.id).select("role");
    const isAdmin = user.role === "admin";
    
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: "Not authorized to update this SOS event." });
    }
    
    // Update fields
    if (emergencyType) event.emergencyType = emergencyType;
    if (title) event.title = title;
    if (description) event.description = description;
    if (latitude && longitude) {
      event.location = {
        type: "Point",
        coordinates: [parseFloat(longitude), parseFloat(latitude)],
        address: address || event.location.address,
      };
    }
    if (radius) event.radius = parseFloat(radius);
    if (status && isAdmin) event.status = status; // Only admin can change status
    
    await event.save();
    
    res.json({ message: "SOS event updated successfully.", event });
  } catch (err) {
    console.error("Update SOS error:", err);
    res.status(500).json({ message: "Server error." });
  }
});

// ── PATCH /api/sos/:id (NEW - Partial update) ─────────────────────────────
router.patch("/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const event = await SOSEvent.findById(id);
    if (!event) return res.status(404).json({ message: "SOS event not found." });
    
    // Check authorization
    const isOwner = event.sender.toString() === req.user.id;
    const user = await User.findById(req.user.id).select("role");
    const isAdmin = user.role === "admin";
    
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: "Not authorized to update this SOS event." });
    }
    
    // Prevent non-admins from changing status
    if (updates.status && !isAdmin) {
      delete updates.status;
    }
    
    // Update only provided fields
    Object.keys(updates).forEach(key => {
      if (key !== '_id' && key !== '__v') {
        event[key] = updates[key];
      }
    });
    
    await event.save();
    
    res.json({ message: "SOS event updated successfully.", event });
  } catch (err) {
    console.error("Patch SOS error:", err);
    res.status(500).json({ message: "Server error." });
  }
});

// ── DELETE /api/sos/:id (NEW - Delete SOS event) ──────────────────────────
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    
    const event = await SOSEvent.findById(id);
    if (!event) return res.status(404).json({ message: "SOS event not found." });
    
    // Check authorization (owner or admin)
    const isOwner = event.sender.toString() === req.user.id;
    const user = await User.findById(req.user.id).select("role");
    const isAdmin = user.role === "admin";
    
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: "Not authorized to delete this SOS event." });
    }
    
    // Optional: Notify affected users before deletion
    if (event.notifiedUsers && event.notifiedUsers.length > 0) {
      await Notification.create({
        userId: event.sender,
        type: "system",
        title: "⚠️ SOS Event Removed",
        message: `Your SOS event "${event.title}" has been ${isAdmin ? 'removed by admin' : 'cancelled by you'}.`,
        priority: "medium",
      });
    }
    
    await SOSEvent.findByIdAndDelete(id);
    
    res.json({ message: "SOS event deleted successfully." });
  } catch (err) {
    console.error("Delete SOS error:", err);
    res.status(500).json({ message: "Server error." });
  }
});

// ── PATCH /api/sos/:id/resolve ────────────────────────────────────────────
router.patch("/:id/resolve", authMiddleware, async (req, res) => {
  try {
    const event = await SOSEvent.findById(req.params.id);
    if (!event) return res.status(404).json({ message: "SOS event not found." });

    const isOwner = event.sender.toString() === req.user.id;
    const user = await User.findById(req.user.id).select("role");
    const isAdmin = user.role === "admin";
    
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: "Not authorized." });
    }

    event.status = "resolved";
    event.resolvedAt = new Date();
    await event.save();
    
    // Notify the sender that their SOS was resolved
    await Notification.create({
      userId: event.sender,
      type: "system",
      title: "✅ SOS Event Resolved",
      message: `Your SOS event "${event.title}" has been marked as resolved.`,
      priority: "medium",
    });
    
    res.json({ message: "SOS event resolved.", event });
  } catch (err) {
    console.error("Resolve SOS error:", err);
    res.status(500).json({ message: "Server error." });
  }
});

// ── POST /api/sos/:id/reactivate (NEW - Reactivate resolved SOS) ──────────
router.post("/:id/reactivate", authMiddleware, async (req, res) => {
  try {
    const event = await SOSEvent.findById(req.params.id);
    if (!event) return res.status(404).json({ message: "SOS event not found." });
    
    const user = await User.findById(req.user.id).select("role");
    const isAdmin = user.role === "admin";
    
    if (!isAdmin) {
      return res.status(403).json({ message: "Only admins can reactivate SOS events." });
    }
    
    event.status = "active";
    event.resolvedAt = null;
    await event.save();
    
    res.json({ message: "SOS event reactivated.", event });
  } catch (err) {
    console.error("Reactivate SOS error:", err);
    res.status(500).json({ message: "Server error." });
  }
});

// ── PATCH /api/sos/user/location ──────────────────────────────────────────
router.patch("/user/location", authMiddleware, async (req, res) => {
  try {
    const { latitude, longitude } = req.body;
    if (!latitude || !longitude) {
      return res.status(400).json({ message: "Latitude and longitude required." });
    }
    
    // Check if user is blocked
    const user = await User.findById(req.user.id).select("status");
    if (user.status === "blocked") {
      return res.status(403).json({ message: "Blocked users cannot update location." });
    }
    
    await User.findByIdAndUpdate(req.user.id, {
      location: {
        type: "Point",
        coordinates: [parseFloat(longitude), parseFloat(latitude)],
      },
    });
    res.json({ message: "Location updated." });
  } catch (err) {
    console.error("Location update error:", err);
    res.status(500).json({ message: "Server error." });
  }
});

export default router;