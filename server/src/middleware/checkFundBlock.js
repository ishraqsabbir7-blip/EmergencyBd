import User from "../models/User.js";

// Blocks the request if the user's fund features are blocked.
// Must come after authMiddleware (requires req.user.id).
const checkFundBlock = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select("fundFeaturesBlocked");
    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.fundFeaturesBlocked) {
      return res.status(403).json({
        message: "Your fund request and mass funding features have been blocked due to warnings. Please contact the admin to resolve this. Admin Email: admin@emergencybd.com | Phone: +8801700000000",
        fundFeaturesBlocked: true,
      });
    }
    next();
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

export default checkFundBlock;