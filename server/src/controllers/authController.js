import User from "../models/User.js";
import Admin from "../models/Admin.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import cloudinary from "../config/cloudinary.js";

// Register User
export const registerUser = async (req, res) => {
  try {
    const { name, email, password, contactInfo, area } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      contactInfo,
      area
    });

    await newUser.save();
    res.status(201).json({ message: "User registered successfully" });

  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

// Login User or Admin - MODIFIED with block check
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check user collection
    let account = await User.findOne({ email });

    if (!account) {
      return res.status(404).json({ message: "Account not found" });
    }

    // ⭐ NEW: Check if user account is blocked
    if (account.status === "blocked") {
      return res.status(403).json({ 
        message: "Your account has been blocked. Please contact admin for assistance.",
        code: "ACCOUNT_BLOCKED"
      });
    }

    // ⭐ NEW: Check if user account is suspended (optional but good)
    if (account.status === "suspended") {
      return res.status(403).json({ 
        message: "Your account has been suspended. Please contact admin.",
        code: "ACCOUNT_SUSPENDED"
      });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, account.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Use role from database directly
    const role = account.role;

    const token = jwt.sign(
      { id: account._id, role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    // ⭐ IMPROVED: Send back more user info for frontend
    res.status(200).json({
      message: "Login successful",
      token,
      role,
      name: account.name,
      user: {  // Added user object for frontend convenience
        id: account._id,
        name: account.name,
        email: account.email,
        role: account.role,
        status: account.status  // Frontend can use this to show warnings
      }
    });

  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

// Get User Profile - MODIFIED to check status
export const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    // ⭐ NEW: Check if user is blocked (extra safety)
    if (user.status === "blocked") {
      return res.status(403).json({ 
        message: "Your account has been blocked",
        code: "ACCOUNT_BLOCKED"
      });
    }
    
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

// Update User Profile - MODIFIED to check status
export const updateUserProfile = async (req, res) => {
  try {
    // First check if user exists and is not blocked
    const currentUser = await User.findById(req.user.id);
    
    if (!currentUser) {
      return res.status(404).json({ message: "User not found" });
    }
    
    // ⭐ NEW: Blocked users cannot update profile
    if (currentUser.status === "blocked") {
      return res.status(403).json({ 
        message: "Blocked users cannot update their profile",
        code: "ACCOUNT_BLOCKED"
      });
    }
    
    const { name, contactInfo, area, profilePicture } = req.body;
    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      { name, contactInfo, area, ...(profilePicture && { profilePicture }) },
      { new: true }
    ).select("-password");
    
    res.status(200).json(updatedUser);
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

// Upload Profile Picture - MODIFIED to check status
export const uploadProfilePicture = async (req, res) => {
  try {
    // First check if user is blocked
    const currentUser = await User.findById(req.user.id);
    
    if (!currentUser) {
      return res.status(404).json({ message: "User not found" });
    }
    
    // ⭐ NEW: Blocked users cannot upload pictures
    if (currentUser.status === "blocked") {
      return res.status(403).json({ 
        message: "Blocked users cannot upload profile pictures",
        code: "ACCOUNT_BLOCKED"
      });
    }
    
    const { imageBase64 } = req.body;
    if (!imageBase64) return res.status(400).json({ message: "No image provided" });

    const result = await cloudinary.uploader.upload(imageBase64, {
      folder: "profile_pictures",
      transformation: [{ width: 300, height: 300, crop: "fill", gravity: "face" }],
    });

    res.status(200).json({ url: result.secure_url });
  } catch (error) {
    res.status(500).json({ message: "Upload failed", error });
  }
};