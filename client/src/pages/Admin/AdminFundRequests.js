import { useState, useEffect } from "react";
import axios from "axios";
import useAuth from "../../hooks/useAuth";
import Navbar from "../../components/Navbar";

const statusConfig = {
  Pending:  { color: "#ffaa00", bg: "rgba(255,170,0,0.08)",  icon: "⏳" },
  Approved: { color: "#00ff88", bg: "rgba(0,255,136,0.08)",  icon: "✅" },
  Rejected: { color: "#ff6b6b", bg: "rgba(255,107,107,0.08)", icon: "❌" },
};

const WARN_LIMIT = 3;

const AdminFundRequests = () => {
  const { token } = useAuth();
  const [requests, setRequests]               = useState([]);
  const [loading, setLoading]                 = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [updatingStatus, setUpdatingStatus]   = useState(false);
  const [filter, setFilter]                   = useState("all");
  const [search, setSearch]                   = useState("");

  // Warn modal
  const [showWarnModal, setShowWarnModal] = useState(false);
  const [warnReason, setWarnReason]       = useState("");
  const [warnLoading, setWarnLoading]     = useState(false);
  const [warnError, setWarnError]         = useState("");
  const [warnSuccess, setWarnSuccess]     = useState("");

  useEffect(() => { fetchRequests(); }, []);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await axios.get("http://localhost:3001/api/admin/fund-requests", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setRequests(res.data);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const handleStatusUpdate = async (requestId, newStatus) => {
    setUpdatingStatus(true);
    try {
      await axios.put(
        `http://localhost:3001/api/admin/fund-requests/${requestId}/status`,
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setRequests(prev => prev.map(r => r._id === requestId ? { ...r, status: newStatus } : r));
      setSelectedRequest(prev => ({ ...prev, status: newStatus }));
    } catch (err) { console.error("Status update failed:", err); }
    setUpdatingStatus(false);
  };

  const handleIssueWarning = async () => {
    if (!warnReason.trim()) { setWarnError("Please enter a reason."); return; }
    setWarnLoading(true); setWarnError("");
    try {
      const res = await axios.post(
        `http://localhost:3001/api/admin/users/${selectedRequest.userId?._id}/fund-warning`,
        { reason: warnReason },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      // Update local state so warning count refreshes in the panel immediately
      const newCount   = res.data.fundWarningCount;
      const nowBlocked = res.data.fundFeaturesBlocked;
      setSelectedRequest(prev => ({
        ...prev,
        userId: {
          ...prev.userId,
          fundWarningCount:    newCount,
          fundFeaturesBlocked: nowBlocked,
        },
      }));
      setRequests(prev => prev.map(r =>
        r._id === selectedRequest._id
          ? { ...r, userId: { ...r.userId, fundWarningCount: newCount, fundFeaturesBlocked: nowBlocked } }
          : r
      ));
      setWarnSuccess(
        `Warning issued (${newCount}/${WARN_LIMIT}).` +
        (nowBlocked ? " User's fund features are now BLOCKED." : "")
      );
      setShowWarnModal(false);
      setWarnReason("");
      setTimeout(() => setWarnSuccess(""), 5000);
    } catch (err) {
      setWarnError(err.response?.data?.message || "Failed to issue warning.");
    }
    setWarnLoading(false);
  };

  const displayed = requests.filter(r => {
    const matchFilter = filter === "all" || r.status === filter;
    const matchSearch =
      (r.title || "").toLowerCase().includes(search.toLowerCase()) ||
      (r.description || "").toLowerCase().includes(search.toLowerCase()) ||
      (r.userId?.name || "").toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  if (loading) return (
    <div style={S.loadingScreen}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div style={S.spinner} />
      <p style={S.loadingText}>{"Loading fund requests..."}</p>
    </div>
  );

  return (
    <div style={S.page}>
      <style>{`
        @keyframes spin    { to { transform: rotate(360deg); } }
        @keyframes fadeUp  { from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)} }
        @keyframes slideIn { from{opacity:0;transform:translateX(30px)}to{opacity:1;transform:translateX(0)} }
        @keyframes fadeIn  { from{opacity:0}to{opacity:1} }
        .fund-card { transition: all 0.3s ease !important; }
        .fund-card:hover { transform:translateY(-2px)!important; border-color:rgba(0,255,136,0.2)!important; box-shadow:0 12px 30px rgba(0,0,0,0.3)!important; }
        .fund-card.selected { border-color:#00ff88!important; background:rgba(0,255,136,0.04)!important; }
        .filter-btn { transition: all 0.2s ease !important; }
        .filter-btn:hover { color:#00ff88!important; }
        .status-btn { transition: all 0.3s ease !important; }
        .status-btn:hover { transform:translateY(-2px)!important; }
        .status-btn:disabled { opacity:0.5!important; cursor:not-allowed!important; transform:none!important; }
        .warn-btn:hover { background:rgba(255,170,0,0.18)!important; }
        input:focus, textarea:focus { border-color:#00ff88!important; outline:none!important; }
        .overlay-fade { animation: fadeIn 0.2s ease !important; }
      `}</style>

      {/* ── Warn Modal ── */}
      {showWarnModal && (
        <div className="overlay-fade" style={S.overlay}>
          <div style={S.modal}>
            <div style={{ fontSize: 36 }}>{"⚠️"}</div>
            <h3 style={S.modalTitle}>{"Issue Fund Warning"}</h3>
            <p style={S.modalDesc}>
              {"Issuing a warning to "}
              <span style={{ color: "#e0e0e0", fontWeight: 700 }}>{selectedRequest?.userId?.name}</span>
              {" for this fund request. After " + WARN_LIMIT + " warnings their fund features will be auto-blocked."}
            </p>

            {/* Current warning count in modal */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, width: "100%" }}>
              {Array.from({ length: WARN_LIMIT }).map((_, i) => (
                <div key={i} style={{
                  flex: 1, height: 10, borderRadius: 5,
                  backgroundColor: i < (selectedRequest?.userId?.fundWarningCount || 0)
                    ? "#ff6b6b" : "#2a2a2a",
                  transition: "background 0.3s ease",
                }} />
              ))}
              <span style={{ color: "#666", fontSize: 11, whiteSpace: "nowrap" }}>
                {(selectedRequest?.userId?.fundWarningCount || 0) + "/" + WARN_LIMIT}
              </span>
            </div>

            <textarea rows={3}
              placeholder="Reason for warning (e.g. Submitted a fake fund request)..."
              value={warnReason}
              onChange={e => { setWarnReason(e.target.value); setWarnError(""); }}
              style={S.warnTextarea} />
            {warnError && <p style={{ color: "#ff6b6b", fontSize: 12, margin: 0 }}>{warnError}</p>}
            <div style={{ display: "flex", gap: 10, width: "100%" }}>
              <button style={S.modalCancel}
                onClick={() => { setShowWarnModal(false); setWarnReason(""); setWarnError(""); }}>
                {"Cancel"}
              </button>
              <button
                style={{ ...S.modalConfirm, backgroundColor: "rgba(255,170,0,0.15)", borderColor: "#ffaa00", color: "#ffaa00" }}
                onClick={handleIssueWarning} disabled={warnLoading}>
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
            <h2 style={S.leftTitle}>{"Fund Requests"}</h2>
            <p style={S.leftSubtitle}>{requests.length + " total"}</p>
          </div>
          <div style={S.searchBox}>
            <span>{"🔍"}</span>
            <input type="text" placeholder="Search..." value={search}
              onChange={e => setSearch(e.target.value)} style={S.searchInput} />
          </div>
          <div style={S.filterSection}>
            <p style={S.filterTitle}>{"FILTER BY STATUS"}</p>
            {["all", "Pending", "Approved", "Rejected"].map(f => (
              <button key={f} className="filter-btn"
                style={{ ...S.filterBtn, ...(filter === f ? S.filterActive : {}) }}
                onClick={() => setFilter(f)}>
                <span>{f === "all" ? "🗂 All" : statusConfig[f].icon + " " + f}</span>
                <span style={S.filterCount}>
                  {f === "all" ? requests.length : requests.filter(r => r.status === f).length}
                </span>
              </button>
            ))}
          </div>
          <div style={S.summarySection}>
            <p style={S.filterTitle}>{"TOTAL AMOUNT"}</p>
            {[
              { label: "Pending",  color: "#ffaa00", status: "Pending"  },
              { label: "Approved", color: "#00ff88", status: "Approved" },
            ].map(s => (
              <div key={s.status} style={S.summaryAmountBox}>
                <p style={S.summaryAmountLabel}>{s.label}</p>
                <p style={{ ...S.summaryAmount, color: s.color }}>
                  {"BDT " + requests.filter(r => r.status === s.status).reduce((sum, r) => sum + (r.amountNeeded || 0), 0).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* ── MIDDLE PANEL ── */}
        <div style={S.middlePanel}>
          {displayed.length === 0 ? (
            <div style={S.emptyState}>
              <div style={{ fontSize: "48px", opacity: 0.3 }}>{"💰"}</div>
              <p style={{ color: "#555555", fontSize: "15px" }}>{"No fund requests found"}</p>
            </div>
          ) : displayed.map((req, i) => {
            const sc = statusConfig[req.status] || {};
            return (
              <div key={req._id}
                className={"fund-card" + (selectedRequest?._id === req._id ? " selected" : "")}
                style={{ ...S.fundCard, animationDelay: `${i * 0.04}s` }}
                onClick={() => setSelectedRequest(selectedRequest?._id === req._id ? null : req)}>
                <div style={S.cardTop}>
                  <div style={S.cardLeft}>
                    <div style={S.cardIconBox}>{"💰"}</div>
                    <div>
                      <p style={S.cardTitle}>{req.title}</p>
                      <p style={S.cardUser}>{"👤 " + (req.userId?.name || "Unknown")}</p>
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                    <span style={{ ...S.statusBadge, color: sc.color, backgroundColor: sc.bg }}>
                      {sc.icon + " " + req.status}
                    </span>
                    {/* Warning badge on card */}
                    {req.userId?.fundFeaturesBlocked && (
                      <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 10, color: "#ff6b6b", backgroundColor: "rgba(255,107,107,0.1)", border: "1px solid rgba(255,107,107,0.2)" }}>
                        {"🚫 Fund Blocked"}
                      </span>
                    )}
                    {!req.userId?.fundFeaturesBlocked && (req.userId?.fundWarningCount || 0) > 0 && (
                      <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 10, color: "#ffaa00", backgroundColor: "rgba(255,170,0,0.1)", border: "1px solid rgba(255,170,0,0.2)" }}>
                        {"⚠️ " + req.userId.fundWarningCount + "/" + WARN_LIMIT + " warns"}
                      </span>
                    )}
                  </div>
                </div>
                <p style={S.cardDesc}>
                  {(req.description || "").substring(0, 90)}{(req.description || "").length > 90 ? "..." : ""}
                </p>
                <div style={S.cardAmount}>
                  <span style={S.amountLabel}>{"Amount: "}</span>
                  <span style={S.amountValue}>{"BDT " + (req.amountNeeded || 0).toLocaleString()}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── RIGHT PANEL ── */}
        <div style={S.rightPanel}>
          {selectedRequest ? (
            <div style={{ animation: "slideIn 0.3s ease" }}>
              <div style={S.detailHeader}>
                <h3 style={S.detailTitle}>{"Request Details"}</h3>
                <button style={S.closeBtn} onClick={() => setSelectedRequest(null)}>{"✕"}</button>
              </div>

              {/* Warn success banner */}
              {warnSuccess && (
                <div style={{ backgroundColor: "rgba(255,170,0,0.08)", border: "1px solid rgba(255,170,0,0.25)", borderRadius: 10, padding: "10px 14px", marginBottom: 14, color: "#ffaa00", fontSize: 12, fontWeight: 600 }}>
                  {"⚠️ " + warnSuccess}
                </div>
              )}

              {/* Amount highlight */}
              <div style={S.amountCard}>
                <p style={S.amountCardLabel}>{"💰 Amount Requested"}</p>
                <p style={S.amountCardValue}>{"BDT " + (selectedRequest.amountNeeded || 0).toLocaleString()}</p>
              </div>

              {/* Fix 4: Warning count box — always visible when there are warnings */}
              {(selectedRequest.userId?.fundWarningCount > 0 || selectedRequest.userId?.fundFeaturesBlocked) && (
                <div style={{
                  backgroundColor: selectedRequest.userId.fundFeaturesBlocked
                    ? "rgba(255,107,107,0.08)" : "rgba(255,170,0,0.08)",
                  border: `1px solid ${selectedRequest.userId.fundFeaturesBlocked ? "rgba(255,107,107,0.3)" : "rgba(255,170,0,0.3)"}`,
                  borderRadius: 12, padding: "14px 16px", marginBottom: 14,
                  display: "flex", alignItems: "flex-start", gap: 12,
                }}>
                  <span style={{ fontSize: 22, flexShrink: 0 }}>
                    {selectedRequest.userId.fundFeaturesBlocked ? "🚫" : "⚠️"}
                  </span>
                  <div style={{ flex: 1 }}>
                    <p style={{
                      color: selectedRequest.userId.fundFeaturesBlocked ? "#ff6b6b" : "#ffaa00",
                      fontSize: 13, fontWeight: 700, margin: "0 0 4px",
                    }}>
                      {selectedRequest.userId.fundFeaturesBlocked
                        ? "Fund Features BLOCKED"
                        : `${selectedRequest.userId.fundWarningCount}/${WARN_LIMIT} warnings issued to this user`}
                    </p>
                    <p style={{ color: "#666", fontSize: 11, margin: "0 0 8px", lineHeight: 1.5 }}>
                      {selectedRequest.userId.fundFeaturesBlocked
                        ? "This user cannot submit fund or mass fund requests."
                        : "User will be auto-blocked after " + WARN_LIMIT + " warnings."}
                    </p>
                    {/* Warning progress dots */}
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      {Array.from({ length: WARN_LIMIT }).map((_, i) => (
                        <div key={i} style={{
                          width: 24, height: 10, borderRadius: 5,
                          backgroundColor: i < (selectedRequest.userId.fundWarningCount || 0)
                            ? (selectedRequest.userId.fundFeaturesBlocked ? "#ff6b6b" : "#ffaa00")
                            : "#2a2a2a",
                        }} />
                      ))}
                      <span style={{ color: "#444", fontSize: 10 }}>
                        {(selectedRequest.userId.fundWarningCount || 0) + "/" + WARN_LIMIT}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Status update */}
              <div style={S.statusUpdateBox}>
                <p style={S.statusUpdateTitle}>{"🔄 Update Status"}</p>
                <p style={S.statusCurrentText}>
                  {"Current: "}
                  <span style={{ color: statusConfig[selectedRequest.status]?.color, fontWeight: "700" }}>
                    {statusConfig[selectedRequest.status]?.icon + " " + selectedRequest.status}
                  </span>
                </p>
                <div style={S.statusBtns}>
                  {["Pending", "Approved", "Rejected"].map(status => (
                    <button key={status} className="status-btn"
                      disabled={selectedRequest.status === status || updatingStatus}
                      style={{
                        ...S.statusBtn,
                        borderColor: statusConfig[status]?.color,
                        color: selectedRequest.status === status ? "#0a0a0a" : statusConfig[status]?.color,
                        backgroundColor: selectedRequest.status === status
                          ? statusConfig[status]?.color
                          : statusConfig[status]?.color + "12",
                      }}
                      onClick={() => handleStatusUpdate(selectedRequest._id, status)}>
                      {updatingStatus ? "..." : statusConfig[status]?.icon + " " + status + (selectedRequest.status === status ? " ✓" : "")}
                    </button>
                  ))}
                </div>
              </div>

              {/* Warn button box */}
              <div style={{ backgroundColor: "#1a1a1a", border: "1px solid #222", borderRadius: 12, padding: "16px", marginBottom: 16 }}>
                <p style={{ color: "#fff", fontSize: 13, fontWeight: 700, marginBottom: 6 }}>{"⚠️ Fund Warning"}</p>
                <p style={{ color: "#555", fontSize: 12, lineHeight: 1.5, marginBottom: 10 }}>
                  {"Issue a warning to this user for submitting a fake or fraudulent request. After " + WARN_LIMIT + " warnings their fund features will be blocked."}
                </p>
                <button className="warn-btn"
                  style={{ width: "100%", padding: "10px 14px", backgroundColor: "rgba(255,170,0,0.1)", border: "1px solid rgba(255,170,0,0.3)", borderRadius: 9, color: "#ffaa00", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", transition: "all 0.2s ease" }}
                  onClick={() => { setShowWarnModal(true); setWarnError(""); setWarnReason(""); }}>
                  {"⚠️ Issue Fund Warning"}
                </button>
              </div>

              {/* Description */}
              <div style={S.detailSection}>
                <p style={S.detailSectionTitle}>{"📝 Description"}</p>
                <p style={S.detailDesc}>{selectedRequest.description}</p>
              </div>

              {/* Meta */}
              <div style={S.detailMeta}>
                {[
                  ["Title",        selectedRequest.title],
                  ["Requested By", selectedRequest.userId?.name || "Unknown"],
                  ["Email",        selectedRequest.userId?.email || "N/A"],
                  ["Contact",      selectedRequest.userId?.contactInfo || "N/A"],
                  ["User Area",    selectedRequest.userId?.area || "N/A"],
                  ["Submitted",    new Date(selectedRequest.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })],
                  ["Time",         new Date(selectedRequest.createdAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })],
                ].map(([l, v], i) => (
                  <div key={i} style={S.metaRow}>
                    <span style={S.metaLabel}>{l}</span>
                    <span style={S.metaValue}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={S.detailEmpty}>
              <div style={{ fontSize: "36px", opacity: 0.3 }}>{"👆"}</div>
              <p style={S.detailEmptyText}>{"Click a request to review it"}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const S = {
  page:        { backgroundColor: "#111111", minHeight: "100vh" },
  loadingScreen:{ backgroundColor: "#111111", minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "16px" },
  spinner:     { width: "40px", height: "40px", border: "3px solid rgba(0,255,136,0.1)", borderTop: "3px solid #00ff88", borderRadius: "50%", animation: "spin 0.8s linear infinite" },
  loadingText: { color: "#00ff88", fontSize: "14px" },
  overlay:     { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.85)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" },
  modal:       { backgroundColor: "#161616", border: "1px solid #2a2a2a", borderRadius: 18, padding: "32px 28px", maxWidth: 420, width: "90%", display: "flex", flexDirection: "column", alignItems: "center", gap: 14, boxShadow: "0 40px 80px rgba(0,0,0,0.8)" },
  modalTitle:  { color: "#fff", fontSize: 17, fontWeight: 700, textAlign: "center" },
  modalDesc:   { color: "#666", fontSize: 13, textAlign: "center", lineHeight: 1.6 },
  warnTextarea:{ width: "100%", padding: "10px 12px", backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 10, color: "#e0e0e0", fontSize: 13, fontFamily: "inherit", resize: "vertical", boxSizing: "border-box" },
  modalCancel: { flex: 1, padding: "12px", backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 10, color: "#666", fontSize: 14, cursor: "pointer", fontFamily: "inherit" },
  modalConfirm:{ flex: 1, padding: "12px", border: "1px solid", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" },
  layout:      { display: "flex", minHeight: "calc(100vh - 80px)" },
  leftPanel:   { width: "240px", minWidth: "240px", backgroundColor: "#0d0d0d", borderRight: "1px solid #1e1e1e", padding: "28px 20px", display: "flex", flexDirection: "column", gap: "16px", overflowY: "auto" },
  leftHeader:  { paddingBottom: "16px", borderBottom: "1px solid #1e1e1e" },
  leftTitle:   { color: "#ffffff", fontSize: "18px", fontWeight: "700" },
  leftSubtitle:{ color: "#555555", fontSize: "12px", marginTop: "4px" },
  searchBox:   { display: "flex", alignItems: "center", gap: "10px", backgroundColor: "#1a1a1a", border: "1px solid #222222", borderRadius: "10px", padding: "10px 14px" },
  searchInput: { backgroundColor: "transparent", border: "none", color: "#e0e0e0", fontSize: "13px", width: "100%", outline: "none", fontFamily: "inherit" },
  filterSection:{ display: "flex", flexDirection: "column", gap: "4px" },
  filterTitle: { color: "#333333", fontSize: "10px", fontWeight: "700", letterSpacing: "1px", marginBottom: "4px" },
  filterBtn:   { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 12px", borderRadius: "8px", border: "1px solid transparent", backgroundColor: "transparent", color: "#666666", fontSize: "13px", cursor: "pointer", width: "100%", fontFamily: "inherit" },
  filterActive:{ backgroundColor: "rgba(0,255,136,0.08)", border: "1px solid rgba(0,255,136,0.2)", color: "#00ff88" },
  filterCount: { backgroundColor: "#222222", color: "#555555", fontSize: "11px", padding: "2px 8px", borderRadius: "10px" },
  summarySection:{ display: "flex", flexDirection: "column", gap: "8px" },
  summaryAmountBox:{ backgroundColor: "#1a1a1a", border: "1px solid #222222", borderRadius: "8px", padding: "10px 12px" },
  summaryAmountLabel:{ color: "#444444", fontSize: "11px", marginBottom: "4px" },
  summaryAmount:{ fontSize: "14px", fontWeight: "700" },
  middlePanel: { flex: 1, overflowY: "auto", borderRight: "1px solid #1e1e1e" },
  emptyState:  { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: "12px", padding: "60px" },
  fundCard:    { padding: "20px 24px", borderBottom: "1px solid #1a1a1a", cursor: "pointer", animation: "fadeUp 0.4s ease both", border: "1px solid transparent", borderBottomColor: "#1a1a1a" },
  cardTop:     { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" },
  cardLeft:    { display: "flex", alignItems: "center", gap: "12px" },
  cardIconBox: { width: "38px", height: "38px", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", backgroundColor: "rgba(0,255,136,0.08)", border: "1px solid rgba(0,255,136,0.15)" },
  cardTitle:   { color: "#e0e0e0", fontSize: "13px", fontWeight: "700" },
  cardUser:    { color: "#555555", fontSize: "11px", marginTop: "2px" },
  statusBadge: { fontSize: "11px", fontWeight: "600", padding: "4px 10px", borderRadius: "20px" },
  cardDesc:    { color: "#888888", fontSize: "13px", lineHeight: "1.6", marginBottom: "10px" },
  cardAmount:  { display: "flex", alignItems: "center", gap: "6px" },
  amountLabel: { color: "#444444", fontSize: "12px" },
  amountValue: { color: "#00ff88", fontSize: "13px", fontWeight: "700" },
  rightPanel:  { width: "300px", minWidth: "300px", backgroundColor: "#0d0d0d", padding: "28px 20px", overflowY: "auto" },
  detailHeader:{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" },
  detailTitle: { color: "#ffffff", fontSize: "16px", fontWeight: "700" },
  closeBtn:    { backgroundColor: "#1a1a1a", border: "1px solid #222222", color: "#666666", width: "28px", height: "28px", borderRadius: "50%", cursor: "pointer", fontSize: "12px", display: "flex", alignItems: "center", justifyContent: "center" },
  amountCard:  { backgroundColor: "rgba(0,255,136,0.05)", border: "1px solid rgba(0,255,136,0.15)", borderRadius: "12px", padding: "16px", marginBottom: "14px", textAlign: "center" },
  amountCardLabel:{ color: "#444444", fontSize: "11px", marginBottom: "8px" },
  amountCardValue:{ color: "#00ff88", fontSize: "24px", fontWeight: "800" },
  statusUpdateBox:{ backgroundColor: "#1a1a1a", border: "1px solid #222222", borderRadius: "14px", padding: "18px", marginBottom: "16px", display: "flex", flexDirection: "column", gap: "12px" },
  statusUpdateTitle:{ color: "#ffffff", fontSize: "13px", fontWeight: "700" },
  statusCurrentText:{ color: "#666666", fontSize: "12px" },
  statusBtns:  { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" },
  statusBtn:   { padding: "9px 6px", borderRadius: "8px", border: "1px solid", fontSize: "11px", fontWeight: "600", cursor: "pointer", fontFamily: "inherit", textAlign: "center" },
  detailSection:{ marginBottom: "16px" },
  detailSectionTitle:{ color: "#444444", fontSize: "11px", fontWeight: "600", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.5px" },
  detailDesc:  { color: "#cccccc", fontSize: "13px", lineHeight: "1.7", backgroundColor: "#1a1a1a", border: "1px solid #222222", borderRadius: "10px", padding: "12px" },
  detailMeta:  { backgroundColor: "#1a1a1a", border: "1px solid #222222", borderRadius: "12px", padding: "16px", display: "flex", flexDirection: "column", gap: "10px" },
  metaRow:     { display: "flex", justifyContent: "space-between" },
  metaLabel:   { color: "#444444", fontSize: "12px" },
  metaValue:   { color: "#e0e0e0", fontSize: "12px", fontWeight: "500", textAlign: "right", maxWidth: "160px" },
  detailEmpty: { height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "12px", textAlign: "center", padding: "40px" },
  detailEmptyText:{ color: "#333333", fontSize: "13px" },
};

export default AdminFundRequests;