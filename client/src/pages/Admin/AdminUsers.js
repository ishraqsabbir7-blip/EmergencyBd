import { useState, useEffect } from "react";
import axios from "axios";
import useAuth from "../../hooks/useAuth";
import Navbar from "../../components/Navbar";

const statusConfig = {
  active:    { color: "#00ff88", bg: "rgba(0,255,136,0.08)",  icon: "✅", label: "Active"    },
  suspended: { color: "#ffaa00", bg: "rgba(255,170,0,0.08)",  icon: "⏸️", label: "Suspended" },
  blocked:   { color: "#ff6b6b", bg: "rgba(255,107,107,0.08)", icon: "🚫", label: "Blocked"   },
};

const WARN_LIMIT = 3;

const AdminUsers = () => {
  const { token } = useAuth();
  const [users, setUsers]               = useState([]);
  const [loading, setLoading]           = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [updating, setUpdating]         = useState(false);
  const [search, setSearch]             = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [confirmAction, setConfirmAction] = useState(null);

  // Warning modal state
  const [showWarnModal, setShowWarnModal]   = useState(false);
  const [warnReason, setWarnReason]         = useState("");
  const [warnLoading, setWarnLoading]       = useState(false);
  const [warnError, setWarnError]           = useState("");
  const [unblockLoading, setUnblockLoading] = useState(false);

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await axios.get("http://localhost:3001/api/admin/users", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsers(res.data);
    } catch (err) {
      console.error("Failed to fetch users:", err);
    }
    setLoading(false);
  };

  const handleStatusUpdate = async (userId, newStatus) => {
    setUpdating(true);
    try {
      await axios.put(
        `http://localhost:3001/api/admin/users/${userId}/status`,
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setUsers(prev => prev.map(u => u._id === userId ? { ...u, status: newStatus } : u));
      if (selectedUser?._id === userId)
        setSelectedUser(prev => ({ ...prev, status: newStatus }));
    } catch (err) {
      console.error("Status update failed:", err);
    }
    setUpdating(false);
    setConfirmAction(null);
  };

  // Issue a fund warning
  const handleIssueWarning = async () => {
    if (!warnReason.trim()) { setWarnError("Please enter a reason."); return; }
    setWarnLoading(true);
    setWarnError("");
    try {
      const res = await axios.post(
        `http://localhost:3001/api/admin/users/${selectedUser._id}/fund-warning`,
        { reason: warnReason },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const updated = {
        ...selectedUser,
        fundWarningCount:    res.data.fundWarningCount,
        fundFeaturesBlocked: res.data.fundFeaturesBlocked,
        warningHistory: [
          ...(selectedUser.warningHistory || []),
          { reason: warnReason, issuedAt: new Date().toISOString() },
        ],
      };
      setSelectedUser(updated);
      setUsers(prev => prev.map(u => u._id === selectedUser._id ? updated : u));
      setShowWarnModal(false);
      setWarnReason("");
    } catch (err) {
      setWarnError(err.response?.data?.message || "Failed to issue warning.");
    }
    setWarnLoading(false);
  };

  // Unblock fund features
  const handleUnblock = async () => {
    setUnblockLoading(true);
    try {
      await axios.put(
        `http://localhost:3001/api/admin/users/${selectedUser._id}/fund-unblock`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const updated = {
        ...selectedUser,
        fundFeaturesBlocked: false,
        fundWarningCount:    0,
        warningHistory:      [],
      };
      setSelectedUser(updated);
      setUsers(prev => prev.map(u => u._id === selectedUser._id ? updated : u));
    } catch (err) {
      console.error("Unblock failed:", err);
    }
    setUnblockLoading(false);
  };

  const displayed = users.filter(u => {
    const matchStatus = filterStatus === "all" || u.status === filterStatus;
    const matchSearch =
      (u.name  || "").toLowerCase().includes(search.toLowerCase()) ||
      (u.email || "").toLowerCase().includes(search.toLowerCase()) ||
      (u.area  || "").toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  if (loading) return (
    <div style={S.loadingScreen}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div style={S.spinner} />
      <p style={S.loadingText}>{"Loading users..."}</p>
    </div>
  );

  return (
    <div style={S.page}>
      <style>{`
        @keyframes spin    { to { transform: rotate(360deg); } }
        @keyframes fadeUp  { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        @keyframes slideIn { from { opacity:0; transform:translateX(30px); } to { opacity:1; transform:translateX(0); } }
        @keyframes fadeIn  { from { opacity:0; } to { opacity:1; } }
        .user-card { transition: all 0.3s ease !important; }
        .user-card:hover { transform:translateY(-2px) !important; border-color:rgba(0,255,136,0.2) !important; box-shadow:0 12px 30px rgba(0,0,0,0.3) !important; }
        .user-card.selected { border-color:#00ff88 !important; background:rgba(0,255,136,0.04) !important; }
        .filter-btn { transition: all 0.2s ease !important; }
        .filter-btn:hover { color:#00ff88 !important; }
        .action-btn { transition: all 0.3s ease !important; }
        .action-btn:hover { transform:translateY(-2px) !important; }
        .action-btn:disabled { opacity:0.4 !important; cursor:not-allowed !important; transform:none !important; }
        .warn-btn:hover { background:rgba(255,170,0,0.18) !important; }
        .unblock-btn:hover { background:rgba(0,255,136,0.18) !important; }
        input:focus,textarea:focus { border-color:#00ff88 !important; outline:none !important; }
        .confirm-overlay { animation: fadeIn 0.2s ease !important; }
      `}</style>

      {/* ── Status Confirm Modal ── */}
      {confirmAction && (
        <div className="confirm-overlay" style={S.overlay}>
          <div style={S.modal}>
            <div style={S.modalIcon}>{statusConfig[confirmAction.status]?.icon}</div>
            <h3 style={S.modalTitle}>
              {confirmAction.status === "active" ? "Reactivate User?"
                : confirmAction.status === "suspended" ? "Suspend User?" : "Block User?"}
            </h3>
            <p style={S.modalDesc}>
              {confirmAction.status === "active" ? "This will restore full access for "
                : confirmAction.status === "suspended" ? "This will temporarily restrict access for "
                : "This will permanently block "}
              <span style={{ color: "#e0e0e0", fontWeight: "700" }}>{confirmAction.userName}</span>{"."}
            </p>
            <div style={S.modalBtns}>
              <button style={S.modalCancel} onClick={() => setConfirmAction(null)}>{"Cancel"}</button>
              <button
                style={{ ...S.modalConfirm, backgroundColor: statusConfig[confirmAction.status]?.color + "18", borderColor: statusConfig[confirmAction.status]?.color, color: statusConfig[confirmAction.status]?.color }}
                onClick={() => handleStatusUpdate(confirmAction.userId, confirmAction.status)}
                disabled={updating}
              >
                {updating ? "⏳ Updating..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Warn Modal ── */}
      {showWarnModal && (
        <div className="confirm-overlay" style={S.overlay}>
          <div style={{ ...S.modal, maxWidth: 420 }}>
            <div style={S.modalIcon}>{"⚠️"}</div>
            <h3 style={S.modalTitle}>{"Issue Fund Warning"}</h3>
            <p style={S.modalDesc}>
              {"Issuing a warning to "}
              <span style={{ color: "#e0e0e0", fontWeight: 700 }}>{selectedUser?.name}</span>
              {". After " + WARN_LIMIT + " warnings their fund features will be automatically blocked."}
            </p>

            {/* Warning count indicator */}
            <div style={S.warnCountRow}>
              {Array.from({ length: WARN_LIMIT }).map((_, i) => (
                <div key={i} style={{
                  ...S.warnDot,
                  backgroundColor: i < (selectedUser?.fundWarningCount || 0)
                    ? "#ff6b6b"
                    : i === (selectedUser?.fundWarningCount || 0)
                    ? "#ffaa00"
                    : "#2a2a2a",
                }} />
              ))}
              <span style={{ color: "#666", fontSize: 11 }}>
                {(selectedUser?.fundWarningCount || 0) + "/" + WARN_LIMIT + " warnings"}
              </span>
            </div>

            <textarea
              rows={3}
              placeholder="Reason for warning (e.g. Submitted a fake fund request)..."
              value={warnReason}
              onChange={e => { setWarnReason(e.target.value); setWarnError(""); }}
              style={S.warnTextarea}
            />
            {warnError && <p style={S.warnError}>{warnError}</p>}
            <div style={S.modalBtns}>
              <button style={S.modalCancel} onClick={() => { setShowWarnModal(false); setWarnReason(""); setWarnError(""); }}>
                {"Cancel"}
              </button>
              <button
                style={{ ...S.modalConfirm, backgroundColor: "rgba(255,170,0,0.15)", borderColor: "#ffaa00", color: "#ffaa00" }}
                onClick={handleIssueWarning}
                disabled={warnLoading}
              >
                {warnLoading ? "⏳ Issuing..." : "⚠️ Issue Warning"}
              </button>
            </div>
          </div>
        </div>
      )}

      <Navbar />
      <div style={S.layout}>

        {/* ── LEFT PANEL ── */}
        <div style={S.leftPanel}>
          <div style={S.leftHeader}>
            <h2 style={S.leftTitle}>{"Users"}</h2>
            <p style={S.leftSubtitle}>{users.length}{" total"}</p>
          </div>

          <div style={S.searchBox}>
            <span>{"🔍"}</span>
            <input
              type="text"
              placeholder="Search name, email, area..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={S.searchInput}
            />
          </div>

          <div style={S.filterSection}>
            <p style={S.filterTitle}>{"FILTER BY STATUS"}</p>
            {["all", "active", "suspended", "blocked"].map(f => (
              <button
                key={f}
                className="filter-btn"
                style={{ ...S.filterBtn, ...(filterStatus === f ? S.filterActive : {}) }}
                onClick={() => setFilterStatus(f)}
              >
                <span>{f === "all" ? "🗂 All" : statusConfig[f].icon + " " + statusConfig[f].label}</span>
                <span style={S.filterCount}>
                  {f === "all" ? users.length : users.filter(u => u.status === f).length}
                </span>
              </button>
            ))}
          </div>

          <div style={S.summarySection}>
            <p style={S.filterTitle}>{"SUMMARY"}</p>
            {[
              { key: "active",    label: "Active",    color: "#00ff88" },
              { key: "suspended", label: "Suspended", color: "#ffaa00" },
              { key: "blocked",   label: "Blocked",   color: "#ff6b6b" },
            ].map(s => (
              <div key={s.key} style={S.summaryRow}>
                <span style={{ color: "#555555", fontSize: "12px" }}>{s.label}</span>
                <span style={{ color: s.color, fontSize: "13px", fontWeight: "700", backgroundColor: s.color + "12", padding: "2px 10px", borderRadius: "10px" }}>
                  {users.filter(u => u.status === s.key).length}
                </span>
              </div>
            ))}
            <div style={S.summaryRow}>
              <span style={{ color: "#555555", fontSize: "12px" }}>{"Fund Blocked"}</span>
              <span style={{ color: "#ff6b6b", fontSize: "13px", fontWeight: "700", backgroundColor: "#ff6b6b12", padding: "2px 10px", borderRadius: "10px" }}>
                {users.filter(u => u.fundFeaturesBlocked).length}
              </span>
            </div>
          </div>
        </div>

        {/* ── MIDDLE PANEL ── */}
        <div style={S.middlePanel}>
          {displayed.length === 0 ? (
            <div style={S.emptyState}>
              <div style={{ fontSize: "48px", opacity: 0.3 }}>{"👥"}</div>
              <p style={{ color: "#555555", fontSize: "15px" }}>{"No users found"}</p>
            </div>
          ) : (
            displayed.map((user, i) => {
              const sc = statusConfig[user.status] || statusConfig.active;
              return (
                <div
                  key={user._id}
                  className={"user-card" + (selectedUser?._id === user._id ? " selected" : "")}
                  style={{ ...S.userCard, animationDelay: `${i * 0.04}s` }}
                  onClick={() => setSelectedUser(selectedUser?._id === user._id ? null : user)}
                >
                  <div style={S.cardTop}>
                    <div style={S.cardLeft}>
                      <div style={S.avatar}>{(user.name || "?").charAt(0).toUpperCase()}</div>
                      <div>
                        <p style={S.cardName}>{user.name}</p>
                        <p style={S.cardEmail}>{user.email}</p>
                      </div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                      <span style={{ ...S.statusBadge, color: sc.color, backgroundColor: sc.bg }}>
                        {sc.icon + " " + sc.label}
                      </span>
                      {user.fundFeaturesBlocked && (
                        <span style={S.fundBlockedBadge}>{"🚫 Fund Blocked"}</span>
                      )}
                      {!user.fundFeaturesBlocked && (user.fundWarningCount || 0) > 0 && (
                        <span style={S.warnBadge}>
                          {"⚠️ " + user.fundWarningCount + "/" + WARN_LIMIT + " warns"}
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={S.cardMeta}>
                    <span style={S.cardMetaItem}>{"📍 " + (user.area || "N/A")}</span>
                    <span style={S.cardMetaItem}>{"📞 " + (user.contactInfo || "N/A")}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* ── RIGHT PANEL ── */}
        <div style={S.rightPanel}>
          {selectedUser ? (
            <div style={{ animation: "slideIn 0.3s ease" }}>
              <div style={S.detailHeader}>
                <h3 style={S.detailTitle}>{"User Details"}</h3>
                <button style={S.closeBtn} onClick={() => setSelectedUser(null)}>{"✕"}</button>
              </div>

              <div style={S.profileCard}>
                <div style={S.profileAvatar}>{(selectedUser.name || "?").charAt(0).toUpperCase()}</div>
                <div>
                  <p style={S.profileName}>{selectedUser.name}</p>
                  <p style={S.profileEmail}>{selectedUser.email}</p>
                  <span style={{ ...S.statusBadge, color: statusConfig[selectedUser.status]?.color, backgroundColor: statusConfig[selectedUser.status]?.bg, fontSize: "11px", marginTop: "6px", display: "inline-block" }}>
                    {statusConfig[selectedUser.status]?.icon + " " + statusConfig[selectedUser.status]?.label}
                  </span>
                </div>
              </div>

              <div style={S.infoBox}>
                {[
                  { label: "Area",    value: selectedUser.area || "N/A" },
                  { label: "Contact", value: selectedUser.contactInfo || "N/A" },
                  { label: "Joined",  value: new Date(selectedUser.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) },
                ].map((item, i) => (
                  <div key={i} style={S.infoRow}>
                    <span style={S.infoLabel}>{item.label}</span>
                    <span style={S.infoValue}>{item.value}</span>
                  </div>
                ))}
              </div>

              {/* ── Account Status Box ── */}
              <div style={S.actionBox}>
                <p style={S.actionTitle}>{"⚙️ Account Status"}</p>
                <p style={S.actionSubtitle}>
                  {"Current: "}
                  <span style={{ color: statusConfig[selectedUser.status]?.color, fontWeight: "700" }}>
                    {statusConfig[selectedUser.status]?.label}
                  </span>
                </p>
                <div style={S.actionBtns}>
                  {[
                    { status: "active",    icon: "✅", label: "Reactivate", activeLabel: "Active ✓",    color: "#00ff88" },
                    { status: "suspended", icon: "⏸️", label: "Suspend",    activeLabel: "Suspended ✓", color: "#ffaa00" },
                    { status: "blocked",   icon: "🚫", label: "Block",      activeLabel: "Blocked ✓",   color: "#ff6b6b" },
                  ].map(btn => (
                    <button
                      key={btn.status}
                      className="action-btn"
                      disabled={selectedUser.status === btn.status || updating}
                      style={{
                        ...S.actionBtn,
                        borderColor: btn.color,
                        color: selectedUser.status === btn.status ? "#0a0a0a" : btn.color,
                        backgroundColor: selectedUser.status === btn.status ? btn.color : btn.color + "12",
                      }}
                      onClick={() => setConfirmAction({ userId: selectedUser._id, status: btn.status, userName: selectedUser.name })}
                    >
                      {btn.icon + " " + (selectedUser.status === btn.status ? btn.activeLabel : btn.label)}
                    </button>
                  ))}
                </div>
                <div style={S.actionHint}>
                  <p style={S.hintRow}>{"✅ Active — full access"}</p>
                  <p style={S.hintRow}>{"⏸️ Suspended — temporary restriction"}</p>
                  <p style={S.hintRow}>{"🚫 Blocked — permanent ban"}</p>
                </div>
              </div>

              {/* ── Fund Warning Box ── */}
              <div style={{ ...S.actionBox, marginTop: 12, borderColor: selectedUser.fundFeaturesBlocked ? "rgba(255,107,107,0.3)" : "#222222" }}>
                <p style={S.actionTitle}>{"⚠️ Fund Warning System"}</p>

                {/* Warning count visual */}
                <div style={S.warnCountRow}>
                  {Array.from({ length: WARN_LIMIT }).map((_, i) => (
                    <div key={i} style={{
                      ...S.warnDot,
                      backgroundColor: i < (selectedUser.fundWarningCount || 0)
                        ? "#ff6b6b" : "#2a2a2a",
                    }} />
                  ))}
                  <span style={{ color: "#555", fontSize: 11 }}>
                    {(selectedUser.fundWarningCount || 0) + "/" + WARN_LIMIT + " warnings"}
                  </span>
                </div>

                {selectedUser.fundFeaturesBlocked ? (
                  <div style={S.blockedNotice}>
                    <p style={S.blockedNoticeTitle}>{"🚫 Fund Features Blocked"}</p>
                    <p style={S.blockedNoticeText}>
                      {"This user has reached " + WARN_LIMIT + " warnings. Their Fund Request and Mass Funding features are currently blocked."}
                    </p>
                    <button
                      className="unblock-btn"
                      style={S.unblockBtn}
                      onClick={handleUnblock}
                      disabled={unblockLoading}
                    >
                      {unblockLoading ? "⏳ Unblocking..." : "✅ Unblock Fund Features"}
                    </button>
                  </div>
                ) : (
                  <>
                    <p style={S.actionSubtitle}>
                      {"Issue a warning for submitting a fake or fraudulent fund/mass fund request."}
                    </p>

                    {/* Warning history */}
                    {(selectedUser.warningHistory || []).length > 0 && (
                      <div style={S.warnHistory}>
                        <p style={{ color: "#444", fontSize: 10, fontWeight: 700, letterSpacing: "0.5px", marginBottom: 6 }}>
                          {"PREVIOUS WARNINGS"}
                        </p>
                        {[...(selectedUser.warningHistory || [])].reverse().map((w, i) => (
                          <div key={i} style={S.warnHistoryItem}>
                            <span style={{ color: "#ffaa00", fontSize: 10 }}>{"⚠️"}</span>
                            <div style={{ flex: 1 }}>
                              <p style={{ color: "#aaa", fontSize: 11, margin: 0 }}>{w.reason}</p>
                              <p style={{ color: "#444", fontSize: 10, margin: "2px 0 0" }}>
                                {new Date(w.issuedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <button
                      className="warn-btn"
                      style={S.warnBtn}
                      onClick={() => { setShowWarnModal(true); setWarnError(""); setWarnReason(""); }}
                    >
                      {"⚠️ Issue Fund Warning"}
                    </button>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div style={S.detailEmpty}>
              <div style={{ fontSize: "36px", opacity: 0.3 }}>{"👆"}</div>
              <p style={S.detailEmptyText}>{"Click a user to manage them"}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const S = {
  page:         { backgroundColor: "#111111", minHeight: "100vh" },
  loadingScreen:{ backgroundColor: "#111111", minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "16px" },
  spinner:      { width: "40px", height: "40px", border: "3px solid rgba(0,255,136,0.1)", borderTop: "3px solid #00ff88", borderRadius: "50%", animation: "spin 0.8s linear infinite" },
  loadingText:  { color: "#00ff88", fontSize: "14px" },
  overlay:      { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.85)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" },
  modal:        { backgroundColor: "#161616", border: "1px solid #2a2a2a", borderRadius: "18px", padding: "32px", maxWidth: "380px", width: "90%", display: "flex", flexDirection: "column", alignItems: "center", gap: "16px", boxShadow: "0 40px 80px rgba(0,0,0,0.8)" },
  modalIcon:    { fontSize: "40px" },
  modalTitle:   { color: "#ffffff", fontSize: "18px", fontWeight: "700", textAlign: "center" },
  modalDesc:    { color: "#666666", fontSize: "13px", textAlign: "center", lineHeight: "1.6" },
  modalBtns:    { display: "flex", gap: "12px", width: "100%", marginTop: "8px" },
  modalCancel:  { flex: 1, padding: "12px", backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: "10px", color: "#666666", fontSize: "14px", cursor: "pointer", fontFamily: "inherit" },
  modalConfirm: { flex: 1, padding: "12px", border: "1px solid", borderRadius: "10px", fontSize: "14px", fontWeight: "700", cursor: "pointer", fontFamily: "inherit" },
  warnCountRow: { display: "flex", alignItems: "center", gap: 6, width: "100%" },
  warnDot:      { width: 22, height: 22, borderRadius: "50%", transition: "background 0.3s ease" },
  warnTextarea: { width: "100%", padding: "10px 12px", backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: "10px", color: "#e0e0e0", fontSize: "13px", fontFamily: "inherit", resize: "vertical", boxSizing: "border-box" },
  warnError:    { color: "#ff6b6b", fontSize: "12px", margin: 0 },
  layout:       { display: "flex", minHeight: "calc(100vh - 80px)" },
  leftPanel:    { width: "240px", minWidth: "240px", backgroundColor: "#0d0d0d", borderRight: "1px solid #1e1e1e", padding: "28px 20px", display: "flex", flexDirection: "column", gap: "16px", overflowY: "auto" },
  leftHeader:   { paddingBottom: "16px", borderBottom: "1px solid #1e1e1e" },
  leftTitle:    { color: "#ffffff", fontSize: "18px", fontWeight: "700" },
  leftSubtitle: { color: "#555555", fontSize: "12px", marginTop: "4px" },
  searchBox:    { display: "flex", alignItems: "center", gap: "10px", backgroundColor: "#1a1a1a", border: "1px solid #222222", borderRadius: "10px", padding: "10px 14px" },
  searchInput:  { backgroundColor: "transparent", border: "none", color: "#e0e0e0", fontSize: "13px", width: "100%", outline: "none", fontFamily: "inherit" },
  filterSection:{ display: "flex", flexDirection: "column", gap: "4px" },
  filterTitle:  { color: "#333333", fontSize: "10px", fontWeight: "700", letterSpacing: "1px", marginBottom: "4px" },
  filterBtn:    { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 12px", borderRadius: "8px", border: "1px solid transparent", backgroundColor: "transparent", color: "#666666", fontSize: "13px", cursor: "pointer", width: "100%", fontFamily: "inherit" },
  filterActive: { backgroundColor: "rgba(0,255,136,0.08)", border: "1px solid rgba(0,255,136,0.2)", color: "#00ff88" },
  filterCount:  { backgroundColor: "#222222", color: "#555555", fontSize: "11px", padding: "2px 8px", borderRadius: "10px" },
  summarySection:{ display: "flex", flexDirection: "column", gap: "8px" },
  summaryRow:   { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0" },
  middlePanel:  { flex: 1, overflowY: "auto", borderRight: "1px solid #1e1e1e" },
  emptyState:   { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: "12px", padding: "60px" },
  userCard:     { padding: "18px 24px", borderBottom: "1px solid #1a1a1a", cursor: "pointer", animation: "fadeUp 0.4s ease both", border: "1px solid transparent", borderBottomColor: "#1a1a1a" },
  cardTop:      { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" },
  cardLeft:     { display: "flex", alignItems: "center", gap: "12px" },
  avatar:       { width: "40px", height: "40px", backgroundColor: "rgba(0,255,136,0.1)", border: "1px solid rgba(0,255,136,0.2)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "#00ff88", fontSize: "16px", fontWeight: "700" },
  cardName:     { color: "#e0e0e0", fontSize: "14px", fontWeight: "600" },
  cardEmail:    { color: "#555555", fontSize: "12px", marginTop: "2px" },
  statusBadge:  { fontSize: "11px", fontWeight: "600", padding: "4px 10px", borderRadius: "20px" },
  fundBlockedBadge: { fontSize: "10px", fontWeight: "700", padding: "3px 8px", borderRadius: "20px", color: "#ff6b6b", backgroundColor: "rgba(255,107,107,0.1)", border: "1px solid rgba(255,107,107,0.2)" },
  warnBadge:    { fontSize: "10px", fontWeight: "700", padding: "3px 8px", borderRadius: "20px", color: "#ffaa00", backgroundColor: "rgba(255,170,0,0.1)", border: "1px solid rgba(255,170,0,0.2)" },
  cardMeta:     { display: "flex", gap: "16px", flexWrap: "wrap" },
  cardMetaItem: { color: "#444444", fontSize: "12px" },
  rightPanel:   { width: "300px", minWidth: "300px", backgroundColor: "#0d0d0d", padding: "28px 20px", overflowY: "auto" },
  detailHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" },
  detailTitle:  { color: "#ffffff", fontSize: "16px", fontWeight: "700" },
  closeBtn:     { backgroundColor: "#1a1a1a", border: "1px solid #222222", color: "#666666", width: "28px", height: "28px", borderRadius: "50%", cursor: "pointer", fontSize: "12px", display: "flex", alignItems: "center", justifyContent: "center" },
  profileCard:  { display: "flex", alignItems: "center", gap: "14px", backgroundColor: "#1a1a1a", border: "1px solid #222222", borderRadius: "14px", padding: "16px", marginBottom: "16px" },
  profileAvatar:{ width: "52px", height: "52px", minWidth: "52px", backgroundColor: "rgba(0,255,136,0.1)", border: "2px solid rgba(0,255,136,0.25)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "#00ff88", fontSize: "22px", fontWeight: "700" },
  profileName:  { color: "#ffffff", fontSize: "15px", fontWeight: "700" },
  profileEmail: { color: "#555555", fontSize: "12px", marginTop: "2px" },
  infoBox:      { backgroundColor: "#1a1a1a", border: "1px solid #222222", borderRadius: "12px", padding: "16px", display: "flex", flexDirection: "column", gap: "10px", marginBottom: "16px" },
  infoRow:      { display: "flex", justifyContent: "space-between" },
  infoLabel:    { color: "#444444", fontSize: "12px" },
  infoValue:    { color: "#e0e0e0", fontSize: "12px", fontWeight: "500" },
  actionBox:    { backgroundColor: "#1a1a1a", border: "1px solid #222222", borderRadius: "14px", padding: "18px", display: "flex", flexDirection: "column", gap: "12px" },
  actionTitle:  { color: "#ffffff", fontSize: "13px", fontWeight: "700" },
  actionSubtitle:{ color: "#666666", fontSize: "12px", lineHeight: 1.5 },
  actionBtns:   { display: "flex", flexDirection: "column", gap: "8px" },
  actionBtn:    { width: "100%", padding: "11px 16px", border: "1px solid", borderRadius: "9px", fontSize: "13px", fontWeight: "600", cursor: "pointer", fontFamily: "inherit", textAlign: "left" },
  actionHint:   { borderTop: "1px solid #222222", paddingTop: "12px", display: "flex", flexDirection: "column", gap: "4px" },
  hintRow:      { color: "#333333", fontSize: "11px" },
  warnBtn:      { width: "100%", padding: "11px 16px", backgroundColor: "rgba(255,170,0,0.1)", border: "1px solid rgba(255,170,0,0.3)", borderRadius: "9px", color: "#ffaa00", fontSize: "13px", fontWeight: "700", cursor: "pointer", fontFamily: "inherit", transition: "all 0.2s ease" },
  blockedNotice:{ backgroundColor: "rgba(255,107,107,0.07)", border: "1px solid rgba(255,107,107,0.2)", borderRadius: "10px", padding: "14px", display: "flex", flexDirection: "column", gap: "8px" },
  blockedNoticeTitle:{ color: "#ff6b6b", fontSize: "13px", fontWeight: "700", margin: 0 },
  blockedNoticeText: { color: "#888888", fontSize: "12px", lineHeight: "1.6", margin: 0 },
  unblockBtn:   { width: "100%", padding: "11px 16px", backgroundColor: "rgba(0,255,136,0.1)", border: "1px solid rgba(0,255,136,0.3)", borderRadius: "9px", color: "#00ff88", fontSize: "13px", fontWeight: "700", cursor: "pointer", fontFamily: "inherit", transition: "all 0.2s ease" },
  warnHistory:  { backgroundColor: "#141414", border: "1px solid #1e1e1e", borderRadius: "8px", padding: "10px", display: "flex", flexDirection: "column", gap: "8px" },
  warnHistoryItem: { display: "flex", gap: "8px", alignItems: "flex-start" },
  detailEmpty:  { height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "12px", textAlign: "center", padding: "40px" },
  detailEmptyText: { color: "#333333", fontSize: "13px" },
};

export default AdminUsers;