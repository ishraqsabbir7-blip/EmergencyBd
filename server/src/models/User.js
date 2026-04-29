import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
  name:        { type: String, required: true },
  email:       { type: String, required: true, unique: true },
  password:    { type: String, required: true },
  contactInfo: { type: String, required: true },
  area:        { type: String, required: true },
  role:        { type: String, default: "user" },
  profilePicture: { type: String, default: "" },
  notifications:  { type: Boolean, default: false },
  status: {
    type: String,
    enum: ["active", "suspended", "blocked"],
    default: "active",
  },

  // F11: geospatial location for radius-based SOS targeting
  location: {
    type:        { type: String, enum: ["Point"], default: "Point" },
    coordinates: { type: [Number], default: [90.4125, 23.8103] },
  },

  // Volunteer points system
  points: { type: Number, default: 0 },
  volunteerHistory: [
    {
      opportunityId:    { type: mongoose.Schema.Types.ObjectId, ref: "VolunteerOpportunity" },
      opportunityTitle: { type: String },
      organization:     { type: String },
      date:             { type: Date },
      pointsEarned:     { type: Number, default: 1 },
      approvedAt:       { type: Date, default: Date.now },
    },
  ],

  // F20: Fund warning system
  fundWarningCount:    { type: Number, default: 0 },
  fundFeaturesBlocked: { type: Boolean, default: false },
  warningHistory: [
    {
      reason:     { type: String },
      issuedAt:   { type: Date, default: Date.now },
      issuedBy:   { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    },
  ],
}, { timestamps: true });

UserSchema.index({ location: "2dsphere" });

export default mongoose.model("User", UserSchema);