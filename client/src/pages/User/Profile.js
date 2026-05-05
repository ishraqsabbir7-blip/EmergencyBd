import { useState, useEffect, useRef } from "react";
import { getProfile, updateProfile } from "../../services/authService";
import useAuth from "../../hooks/useAuth";
import Navbar from "../../components/Navbar";

const Profile = () => {
  const { token, login, role } = useAuth();
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({ name: "", contactInfo: "", area: "" });
  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("info");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const fileInputRef = useRef(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await getProfile(token);
        setProfile(res.data);
        setForm({ name: res.data.name, contactInfo: res.data.contactInfo, area: res.data.area });
      } catch (err) {
        console.error(err);
      }
      setLoading(false);
    };
    fetchProfile();
  }, [token]);

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      const res = await updateProfile(form, token);
      setProfile(res.data);
      login(token, role, { name: res.data.name });
      setMessage("Profile updated successfully!");
      setEditing(false);
      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      setMessage("Update failed");
    }
  };

  const handlePhotoClick = () => {
    fileInputRef.current.click();
  };

  const handlePhotoChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      setPhotoError("Only JPG, PNG, or WEBP images are allowed.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setPhotoError("Image must be under 5MB.");
      return;
    }

    setPhotoError("");
    setUploadingPhoto(true);

    try {
      const base64 = await toBase64(file);

      const res = await fetch("http://localhost:3001/api/auth/upload-profile-picture", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ imageBase64: base64 }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      // Save the returned URL to the profile via updateProfile
      const updated = await updateProfile({ ...form, profilePicture: data.url }, token);
      setProfile(updated.data);
      login(token, role, { name: updated.data.name });
      setMessage("Profile picture updated!");
      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      setPhotoError("Photo upload failed. Please try again.");
    } finally {
      setUploadingPhoto(false);
      e.target.value = "";
    }
  };

  const toBase64 = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  if (loading) return (
    <div style={styles.loadingScreen}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div style={styles.spinner}></div>
      <p style={styles.loadingText}>Loading your profile...</p>
    </div>
  );

  return (
    <div style={styles.page}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes glow { 0%,100% { box-shadow: 0 0 20px rgba(0,255,136,0.3); } 50% { box-shadow: 0 0 50px rgba(0,255,136,0.7); } }
        @keyframes pulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.05); } }
        @keyframes float { 0%,100% { transform: translateY(0px); } 50% { transform: translateY(-8px); } }
        @keyframes slideIn { from { opacity: 0; transform: translateX(-20px); } to { opacity: 1; transform: translateX(0); } }

        .avatar-wrapper:hover .avatar-overlay { opacity: 1 !important; }
        .avatar-wrapper { cursor: pointer; }

        .info-row { transition: all 0.3s ease !important; }
        .info-row:hover { background: rgba(0,255,136,0.06) !important; transform: translateX(6px) !important; border-radius: 12px !important; }

        .stat-card { transition: all 0.3s ease !important; }
        .stat-card:hover { transform: translateY(-6px) !important; border-color: rgba(0,255,136,0.4) !important; box-shadow: 0 20px 40px rgba(0,0,0,0.4) !important; }

        .tab-btn { transition: all 0.3s ease !important; }
        .tab-btn:hover { color: #00ff88 !important; }

        .save-btn { transition: all 0.3s ease !important; }
        .save-btn:hover { transform: translateY(-2px) !important; box-shadow: 0 10px 30px rgba(0,255,136,0.4) !important; background-color: #00e67a !important; }

        .cancel-btn { transition: all 0.3s ease !important; }
        .cancel-btn:hover { background: rgba(255,255,255,0.05) !important; border-color: #555 !important; color: #fff !important; }

        .input-field { transition: all 0.3s ease !important; }
        .input-field:focus { border-color: #00ff88 !important; box-shadow: 0 0 0 3px rgba(0,255,136,0.1) !important; outline: none !important; }

        .sidebar-link { transition: all 0.3s ease !important; }
        .sidebar-link:hover { background: rgba(0,255,136,0.08) !important; color: #00ff88 !important; transform: translateX(4px) !important; }
      `}</style>

      <Navbar />

      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: "none" }}
        accept="image/jpeg,image/png,image/webp"
        onChange={handlePhotoChange}
      />

      <div style={styles.layout}>

        {/* LEFT SIDEBAR */}
        <div style={styles.sidebar}>

          {/* Avatar Section */}
          <div style={styles.sidebarTop}>

            {/* Clickable Avatar */}
            <div style={styles.avatarRing}>
              <div
                className="avatar-wrapper"
                style={styles.avatarWrapper}
                onClick={handlePhotoClick}
                title="Click to change photo"
              >
                {uploadingPhoto ? (
                  <div style={styles.avatarSpinnerWrap}>
                    <div style={styles.avatarSpinner}></div>
                  </div>
                ) : profile?.profilePicture ? (
                  <img
                    src={profile.profilePicture}
                    alt="Profile"
                    style={styles.avatarImg}
                  />
                ) : (
                  <div style={styles.avatarInitial}>
                    {profile?.name?.charAt(0).toUpperCase()}
                  </div>
                )}

                {/* Hover overlay */}
                <div className="avatar-overlay" style={styles.avatarOverlay}>
                  <span style={styles.cameraIcon}>📷</span>
                  <span style={styles.overlayText}>Change</span>
                </div>
              </div>
            </div>

            <div style={styles.onlineDot}></div>

            {/* Photo error */}
            {photoError && (
              <p style={styles.photoError}>{photoError}</p>
            )}

            <h2 style={styles.sidebarName}>{profile?.name}</h2>
            <div style={styles.roleBadge}>
              {role === "admin" ? "⚡" : "👤"} {role?.toUpperCase()}
            </div>
            <p style={styles.sidebarEmail}>{profile?.email}</p>

            {/* Upload hint */}
            <p style={styles.uploadHint}>Click avatar to update photo</p>
          </div>

          {/* Sidebar Nav */}
          <div style={styles.sidebarNav}>
            <button
              className="sidebar-link"
              style={{ ...styles.sidebarLink, ...(activeTab === "info" ? styles.activeSidebarLink : {}) }}
              onClick={() => { setActiveTab("info"); setEditing(false); }}
            >
              <span>📋</span> My Information
            </button>
            <button
              className="sidebar-link"
              style={{ ...styles.sidebarLink, ...(activeTab === "edit" ? styles.activeSidebarLink : {}) }}
              onClick={() => { setActiveTab("edit"); setEditing(true); }}
            >
              <span>✏️</span> Edit Profile
            </button>
            <button
              className="sidebar-link"
              style={{ ...styles.sidebarLink, ...(activeTab === "activity" ? styles.activeSidebarLink : {}) }}
              onClick={() => setActiveTab("activity")}
            >
              <span>📊</span> Activity
            </button>
            <button
              className="sidebar-link"
              style={{ ...styles.sidebarLink, ...(activeTab === "notifications" ? styles.activeSidebarLink : {}) }}
              onClick={() => setActiveTab("notifications")}
            >
              <span>🔔</span> Notifications
            </button>
          </div>

          {/* Sidebar Stats */}
          <div style={styles.sidebarStats}>
            <div style={styles.sidebarStat}>
              <span style={styles.sidebarStatValue}>
                {new Date(profile?.createdAt).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
              </span>
              <span style={styles.sidebarStatLabel}>Member Since</span>
            </div>
            <div style={styles.sidebarStatDivider}></div>
            <div style={styles.sidebarStat}>
              <span style={styles.sidebarStatValue}>{profile?.area}</span>
              <span style={styles.sidebarStatLabel}>Area</span>
            </div>
          </div>
        </div>

        {/* RIGHT CONTENT */}
        <div style={styles.content}>

          {/* Top Stats Bar */}
          <div style={styles.statsBar}>
            {[
              { icon: "🚨", label: "Reports", value: "—", color: "#ff6b6b" },
              { icon: "💰", label: "Fund Requests", value: "—", color: "#ffd93d" },
              { icon: "✅", label: "Resolved", value: "—", color: "#00ff88" },
              { icon: "🔔", label: "Notifications", value: "—", color: "#6bcbff" },
            ].map((stat, i) => (
              <div key={i} className="stat-card" style={styles.statCard}>
                <div style={{ ...styles.statIconCircle, backgroundColor: `${stat.color}15`, border: `1px solid ${stat.color}30` }}>
                  <span style={styles.statIcon}>{stat.icon}</span>
                </div>
                <div style={styles.statInfo}>
                  <span style={{ ...styles.statValue, color: stat.color }}>{stat.value}</span>
                  <span style={styles.statLabel}>{stat.label}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Main Content Card */}
          <div style={styles.mainCard}>

            {message && (
              <div style={styles.successMsg}>
                ✅ {message}
              </div>
            )}

            {/* INFO TAB */}
            {activeTab === "info" && (
              <div style={{ animation: "slideIn 0.3s ease" }}>
                <div style={styles.cardHeader}>
                  <h3 style={styles.cardTitle}>Personal Information</h3>
                  <button
                    className="save-btn"
                    style={styles.editTopBtn}
                    onClick={() => { setActiveTab("edit"); setEditing(true); }}
                  >
                    ✏️ Edit
                  </button>
                </div>

                <div style={styles.infoGrid}>
                  {[
                    { icon: "👤", label: "Full Name", value: profile?.name },
                    { icon: "📧", label: "Email Address", value: profile?.email },
                    { icon: "📱", label: "Contact Number", value: profile?.contactInfo },
                    { icon: "📍", label: "Area", value: profile?.area },
                    { icon: "🛡️", label: "Account Role", value: role?.toUpperCase() },
                    { icon: "📅", label: "Member Since", value: new Date(profile?.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) },
                    { icon: "🔄", label: "Last Updated", value: new Date(profile?.updatedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) },
                    { icon: "🔔", label: "Notifications", value: "active" },
                  ].map((item, index) => (
                    <div key={index} className="info-row" style={styles.infoRow}>
                      <div style={styles.infoLeft}>
                        <div style={styles.infoIconBox}>{item.icon}</div>
                        <span style={styles.infoLabel}>{item.label}</span>
                      </div>
                      <span style={styles.infoValue}>{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* EDIT TAB */}
            {activeTab === "edit" && (
              <div style={{ animation: "slideIn 0.3s ease" }}>
                <div style={styles.cardHeader}>
                  <h3 style={styles.cardTitle}>Edit Profile</h3>
                </div>

                <form onSubmit={handleUpdate} style={styles.editForm}>
                  <div style={styles.formGrid}>
                    {[
                      { label: "Full Name", key: "name", type: "text", placeholder: "Your full name", icon: "👤" },
                      { label: "Contact Number", key: "contactInfo", type: "text", placeholder: "Your phone number", icon: "📱" },
                      { label: "Area", key: "area", type: "text", placeholder: "Your area", icon: "📍" },
                    ].map((field) => (
                      <div key={field.key} style={styles.formField}>
                        <label style={styles.formLabel}>{field.icon} {field.label}</label>
                        <input
                          className="input-field"
                          type={field.type}
                          placeholder={field.placeholder}
                          value={form[field.key]}
                          onChange={e => setForm({ ...form, [field.key]: e.target.value })}
                          style={styles.input}
                        />
                      </div>
                    ))}

                    <div style={styles.formField}>
                      <label style={styles.formLabel}>📧 Email Address</label>
                      <input
                        className="input-field"
                        style={{ ...styles.input, opacity: 0.4, cursor: "not-allowed" }}
                        value={profile?.email}
                        disabled
                      />
                      <span style={styles.disabledNote}>⚠️ Email cannot be changed</span>
                    </div>
                  </div>

                  <div style={styles.btnRow}>
                    <button type="submit" className="save-btn" style={styles.saveBtn}>
                      💾 Save Changes
                    </button>
                    <button
                      type="button"
                      className="cancel-btn"
                      style={styles.cancelBtn}
                      onClick={() => { setActiveTab("info"); setEditing(false); }}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* ACTIVITY TAB */}
            {activeTab === "activity" && (
              <div style={{ animation: "slideIn 0.3s ease" }}>
                <div style={styles.cardHeader}>
                  <h3 style={styles.cardTitle}>Recent Activity</h3>
                </div>
                <div style={styles.emptyState}>
                  <div style={styles.emptyIcon}>📊</div>
                  <h4 style={styles.emptyTitle}>No Activity Yet</h4>
                  <p style={styles.emptyText}>Your emergency reports and fund requests will appear here once submitted.</p>
                </div>
              </div>
            )}

            {/* NOTIFICATIONS TAB */}
            {activeTab === "notifications" && (
              <div style={{ animation: "slideIn 0.3s ease" }}>
                <div style={styles.cardHeader}>
                  <h3 style={styles.cardTitle}>Notifications</h3>
                  <span style={styles.phaseBadge}>active</span>
                </div>
                <div style={styles.emptyState}>
                  <div style={{ ...styles.emptyIcon, animation: "float 3s ease-in-out infinite" }}>🔔</div>
                  <h4 style={styles.emptyTitle}>Notifications Coming Soon</h4>
                  <p style={styles.emptyText}>Real-time emergency alerts and notifications are now active.</p>
                  <div style={styles.phaseInfo}>
                    <div style={styles.phaseItem}>⚡ Real-time alerts</div>
                    <div style={styles.phaseItem}>📍 Radius-based notifications</div>
                    <div style={styles.phaseItem}>🔔 Push notifications</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const styles = {
  page: {
    backgroundColor: "#111111",
    minHeight: "100vh",
  },
  loadingScreen: {
    backgroundColor: "#111111",
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "16px",
  },
  spinner: {
    width: "44px",
    height: "44px",
    border: "3px solid rgba(0,255,136,0.1)",
    borderTop: "3px solid #00ff88",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
  loadingText: {
    color: "#00ff88",
    fontSize: "15px",
  },
  layout: {
    display: "flex",
    minHeight: "calc(100vh - 70px)",
  },

  // SIDEBAR
  sidebar: {
    width: "280px",
    minWidth: "280px",
    backgroundColor: "#0f0f0f",
    borderRight: "1px solid #1e1e1e",
    display: "flex",
    flexDirection: "column",
    padding: "32px 20px",
    gap: "24px",
  },
  sidebarTop: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    textAlign: "center",
    gap: "10px",
    paddingBottom: "24px",
    borderBottom: "1px solid #1e1e1e",
    position: "relative",
  },
  avatarRing: {
    width: "88px",
    height: "88px",
    borderRadius: "50%",
    background: "linear-gradient(135deg, #00ff88, #00cc6a)",
    padding: "3px",
    animation: "glow 3s ease-in-out infinite",
  },
  avatarWrapper: {
    width: "100%",
    height: "100%",
    borderRadius: "50%",
    overflow: "hidden",
    position: "relative",
    backgroundColor: "#111111",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarImg: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    borderRadius: "50%",
  },
  avatarInitial: {
    width: "100%",
    height: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "30px",
    fontWeight: "700",
    color: "#00ff88",
    backgroundColor: "#111111",
    borderRadius: "50%",
  },
  avatarSpinnerWrap: {
    width: "100%",
    height: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#111111",
    borderRadius: "50%",
  },
  avatarSpinner: {
    width: "28px",
    height: "28px",
    border: "3px solid rgba(0,255,136,0.1)",
    borderTop: "3px solid #00ff88",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
  avatarOverlay: {
    position: "absolute",
    inset: 0,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: "50%",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    opacity: 0,
    transition: "opacity 0.3s ease",
    gap: "2px",
  },
  cameraIcon: {
    fontSize: "18px",
  },
  overlayText: {
    color: "#fff",
    fontSize: "10px",
    fontWeight: "600",
    letterSpacing: "0.5px",
  },
  onlineDot: {
    position: "absolute",
    top: "68px",
    left: "calc(50% + 26px)",
    width: "14px",
    height: "14px",
    backgroundColor: "#00ff88",
    borderRadius: "50%",
    border: "2px solid #0f0f0f",
    animation: "pulse 2s ease-in-out infinite",
  },
  photoError: {
    color: "#ff6b6b",
    fontSize: "11px",
    textAlign: "center",
    margin: "0",
    maxWidth: "200px",
  },
  uploadHint: {
    color: "#444444",
    fontSize: "10px",
    marginTop: "-4px",
    letterSpacing: "0.3px",
  },
  sidebarName: {
    color: "#ffffff",
    fontSize: "18px",
    fontWeight: "700",
    marginTop: "4px",
  },
  roleBadge: {
    backgroundColor: "rgba(0,255,136,0.1)",
    border: "1px solid rgba(0,255,136,0.25)",
    color: "#00ff88",
    fontSize: "11px",
    fontWeight: "700",
    letterSpacing: "1.5px",
    padding: "4px 14px",
    borderRadius: "20px",
  },
  sidebarEmail: {
    color: "#555555",
    fontSize: "12px",
  },
  sidebarNav: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  sidebarLink: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "12px 16px",
    borderRadius: "10px",
    border: "none",
    backgroundColor: "transparent",
    color: "#666666",
    fontSize: "14px",
    fontWeight: "500",
    cursor: "pointer",
    textAlign: "left",
    width: "100%",
  },
  activeSidebarLink: {
    backgroundColor: "rgba(0,255,136,0.1)",
    color: "#00ff88",
    borderLeft: "3px solid #00ff88",
  },
  sidebarStats: {
    marginTop: "auto",
    backgroundColor: "#1a1a1a",
    borderRadius: "12px",
    padding: "16px",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    border: "1px solid #222222",
  },
  sidebarStat: {
    display: "flex",
    flexDirection: "column",
    gap: "2px",
  },
  sidebarStatValue: {
    color: "#ffffff",
    fontSize: "13px",
    fontWeight: "600",
  },
  sidebarStatLabel: {
    color: "#555555",
    fontSize: "11px",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  sidebarStatDivider: {
    height: "1px",
    backgroundColor: "#222222",
  },

  // CONTENT
  content: {
    flex: 1,
    padding: "32px",
    display: "flex",
    flexDirection: "column",
    gap: "24px",
    overflowY: "auto",
  },
  statsBar: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: "16px",
  },
  statCard: {
    backgroundColor: "#1a1a1a",
    border: "1px solid #222222",
    borderRadius: "14px",
    padding: "20px",
    display: "flex",
    alignItems: "center",
    gap: "16px",
    cursor: "default",
    boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
  },
  statIconCircle: {
    width: "44px",
    height: "44px",
    borderRadius: "12px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  statIcon: {
    fontSize: "20px",
  },
  statInfo: {
    display: "flex",
    flexDirection: "column",
    gap: "2px",
  },
  statValue: {
    fontSize: "15px",
    fontWeight: "700",
  },
  statLabel: {
    color: "#555555",
    fontSize: "11px",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  mainCard: {
    flex: 1,
    backgroundColor: "#1a1a1a",
    border: "1px solid #222222",
    borderRadius: "20px",
    padding: "32px",
    boxShadow: "0 4px 30px rgba(0,0,0,0.2)",
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "28px",
    paddingBottom: "20px",
    borderBottom: "1px solid #222222",
  },
  cardTitle: {
    color: "#ffffff",
    fontSize: "18px",
    fontWeight: "700",
  },
  editTopBtn: {
    backgroundColor: "#00ff88",
    color: "#0a0a0a",
    border: "none",
    padding: "8px 20px",
    borderRadius: "8px",
    fontSize: "13px",
    fontWeight: "700",
    cursor: "pointer",
  },
  successMsg: {
    backgroundColor: "rgba(0,255,136,0.08)",
    border: "1px solid rgba(0,255,136,0.2)",
    color: "#00ff88",
    padding: "14px 20px",
    borderRadius: "10px",
    fontSize: "14px",
    marginBottom: "24px",
  },
  infoGrid: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  infoRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "16px 12px",
    borderBottom: "1px solid #1e1e1e",
    cursor: "default",
  },
  infoLeft: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
  },
  infoIconBox: {
    width: "36px",
    height: "36px",
    backgroundColor: "#222222",
    borderRadius: "10px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "16px",
  },
  infoLabel: {
    color: "#666666",
    fontSize: "13px",
    fontWeight: "500",
  },
  infoValue: {
    color: "#e0e0e0",
    fontSize: "14px",
    fontWeight: "500",
  },
  formGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "20px",
    marginBottom: "28px",
  },
  editForm: {
    display: "flex",
    flexDirection: "column",
  },
  formField: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  formLabel: {
    color: "#888888",
    fontSize: "13px",
    fontWeight: "500",
  },
  input: {
    backgroundColor: "#222222",
    border: "1px solid #2e2e2e",
    color: "#e0e0e0",
    padding: "13px 16px",
    borderRadius: "10px",
    fontSize: "14px",
    width: "100%",
    fontFamily: "inherit",
  },
  disabledNote: {
    color: "#444444",
    fontSize: "11px",
  },
  btnRow: {
    display: "flex",
    gap: "12px",
  },
  saveBtn: {
    flex: 1,
    backgroundColor: "#00ff88",
    color: "#0a0a0a",
    border: "none",
    padding: "14px",
    borderRadius: "10px",
    fontSize: "14px",
    fontWeight: "700",
    cursor: "pointer",
    letterSpacing: "0.5px",
  },
  cancelBtn: {
    padding: "14px 28px",
    backgroundColor: "transparent",
    border: "1px solid #333333",
    color: "#888888",
    borderRadius: "10px",
    fontSize: "14px",
    cursor: "pointer",
  },
  emptyState: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "60px 20px",
    gap: "16px",
    textAlign: "center",
  },
  emptyIcon: {
    fontSize: "56px",
    marginBottom: "8px",
  },
  emptyTitle: {
    color: "#ffffff",
    fontSize: "18px",
    fontWeight: "600",
  },
  emptyText: {
    color: "#555555",
    fontSize: "14px",
    maxWidth: "400px",
    lineHeight: "1.7",
  },
  phaseBadge: {
    backgroundColor: "rgba(107,203,255,0.1)",
    border: "1px solid rgba(107,203,255,0.2)",
    color: "#6bcbff",
    fontSize: "11px",
    fontWeight: "700",
    padding: "4px 12px",
    borderRadius: "20px",
    letterSpacing: "1px",
  },
  phaseInfo: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    marginTop: "8px",
  },
  phaseItem: {
    backgroundColor: "#222222",
    border: "1px solid #2a2a2a",
    color: "#888888",
    padding: "10px 20px",
    borderRadius: "8px",
    fontSize: "13px",
  },
};

export default Profile;