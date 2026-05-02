import { useState, useEffect } from "react";
import axios from "axios";
import useAuth from "../../hooks/useAuth";
import Navbar from "../../components/Navbar";

const API = "http://localhost:3001/api";
const WARN_LIMIT = 3;

const STATUS_CONFIG = {
  Pending:  { color:"#ffaa00", bg:"rgba(255,170,0,0.08)",  border:"rgba(255,170,0,0.2)",  icon:"⏳" },
  Approved: { color:"#00ff88", bg:"rgba(0,255,136,0.08)",  border:"rgba(0,255,136,0.2)",  icon:"✅" },
  Rejected: { color:"#ff4444", bg:"rgba(255,68,68,0.08)",  border:"rgba(255,68,68,0.2)",  icon:"❌" },
};

const timeAgo = (date) => {
  const diff = (Date.now() - new Date(date)) / 1000;
  if (diff < 3600) return `${Math.floor(diff/60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff/3600)}h ago`;
  return `${Math.floor(diff/86400)}d ago`;
};

const ProgressBar = ({ raised=0, goal }) => {
  const pct = Math.min(goal>0 ? (raised/goal)*100 : 0, 100);
  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
        <span style={{ color:"#00ff88", fontSize:12, fontWeight:700 }}>{"৳" + raised.toLocaleString() + " raised"}</span>
        <span style={{ color:"#444", fontSize:11 }}>{"of ৳" + goal.toLocaleString()}</span>
      </div>
      <div style={{ height:6, background:"#222", borderRadius:3, overflow:"hidden" }}>
        <div style={{ height:"100%", borderRadius:3, width:`${pct}%`, background:"linear-gradient(90deg,#00cc6a,#00ff88)", transition:"width 0.8s ease" }} />
      </div>
      <span style={{ color:"#444", fontSize:11 }}>{pct.toFixed(0) + "% funded"}</span>
    </div>
  );
};

// Image lightbox (Bug 1)
const Lightbox = ({ url, onClose }) => {
  useEffect(() => {
    const onKey = e => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const download = async () => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = window.URL.createObjectURL(blob);
      a.download = url.split("/").pop() || "image.jpg";
      document.body.appendChild(a); a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(a.href);
    } catch (err) { console.error(err); }
  };

  return (
    <div onClick={onClose} style={{ position:"fixed", inset:0, zIndex:10000, background:"rgba(0,0,0,0.92)", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
      <div onClick={e => e.stopPropagation()} style={{ background:"#111", border:"1px solid #222", borderRadius:14, overflow:"hidden", maxWidth:"90vw", maxHeight:"90vh", display:"flex", flexDirection:"column" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"12px 18px", borderBottom:"1px solid #1e1e1e" }}>
          <span style={{ color:"#e0e0e0", fontSize:13, fontWeight:600 }}>{"📷 Image"}</span>
          <div style={{ display:"flex", gap:8 }}>
            <button onClick={download} style={{ padding:"6px 14px", background:"rgba(0,255,136,0.1)", border:"1px solid rgba(0,255,136,0.25)", borderRadius:7, color:"#00ff88", fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>{"⬇️ Download"}</button>
            <button onClick={onClose} style={{ width:28, height:28, background:"#1a1a1a", border:"1px solid #222", borderRadius:"50%", color:"#888", cursor:"pointer", fontSize:12 }}>{"✕"}</button>
          </div>
        </div>
        <div style={{ overflow:"auto", padding:20, maxHeight:"75vh", display:"flex", alignItems:"center", justifyContent:"center" }}>
          <img src={url} alt="full" style={{ maxWidth:"100%", maxHeight:"70vh", objectFit:"contain", borderRadius:8 }} />
        </div>
        <div style={{ padding:"8px 18px", borderTop:"1px solid #1a1a1a", textAlign:"center" }}>
          <span style={{ color:"#333", fontSize:11 }}>{"Press ESC or click outside to close"}</span>
        </div>
      </div>
    </div>
  );
};

const AdminMassFunding = () => {
  const { token } = useAuth();
  const [funds, setFunds]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [selected, setSelected]   = useState(null);
  const [filter, setFilter]       = useState("all");
  const [search, setSearch]       = useState("");
  const [updating, setUpdating]   = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  // Bug 1: lightbox
  const [lightboxUrl, setLightboxUrl] = useState(null);

  // Bug 6: delete
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleting, setDeleting]           = useState(false);

  // Bug 5: warn modal
  const [showWarnModal, setShowWarnModal] = useState(false);
  const [warnReason, setWarnReason]       = useState("");
  const [warnLoading, setWarnLoading]     = useState(false);
  const [warnError, setWarnError]         = useState("");
  const [warnSuccess, setWarnSuccess]     = useState("");

  // Bug 8: donation history
  const [historyFundId, setHistoryFundId]   = useState(null);
  const [historyData, setHistoryData]       = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/fund/mass/all`, { headers: { Authorization:`Bearer ${token}` } });
      setFunds(res.data);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const handleStatus = async (id, status) => {
    setUpdating(true);
    try {
      await axios.patch(`${API}/fund/mass/${id}/status`, { status }, { headers: { Authorization:`Bearer ${token}` } });
      setFunds(prev => prev.map(f => f._id===id ? { ...f, status } : f));
      setSelected(prev => prev?._id===id ? { ...prev, status } : prev);
      setSuccessMsg(`Status updated to ${status}`);
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err) { console.error(err); }
    setUpdating(false);
  };

  // Bug 6: admin delete
  const handleDelete = async (id) => {
    setDeleting(true);
    try {
      await axios.delete(`${API}/fund/mass/${id}`, { headers: { Authorization:`Bearer ${token}` } });
      setFunds(prev => prev.filter(f => f._id !== id));
      if (selected?._id === id) setSelected(null);
      setSuccessMsg("Request deleted successfully.");
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err) { console.error(err); }
    setDeleting(false);
    setConfirmDelete(null);
  };

  // Bug 5: warn
  const handleIssueWarning = async () => {
    if (!warnReason.trim()) { setWarnError("Please enter a reason."); return; }
    setWarnLoading(true);
    setWarnError("");
    try {
      const res = await axios.post(
        `${API.replace("/api","")}/api/admin/users/${selected.userId?._id}/fund-warning`,
        { reason: warnReason },
        { headers: { Authorization:`Bearer ${token}` } }
      );
      setWarnSuccess(`Warning issued (${res.data.fundWarningCount}/${WARN_LIMIT}).${res.data.fundFeaturesBlocked ? " Fund features BLOCKED." : ""}`);
      setShowWarnModal(false);
      setWarnReason("");
      setTimeout(() => setWarnSuccess(""), 5000);
    } catch (err) {
      setWarnError(err.response?.data?.message || "Failed to issue warning.");
    }
    setWarnLoading(false);
  };

  // Bug 8: load donation history
  const loadHistory = async (fundId) => {
    if (historyFundId === fundId) { setHistoryFundId(null); return; }
    setHistoryFundId(fundId);
    setHistoryLoading(true);
    try {
      const res = await axios.get(`${API}/fund/mass/${fundId}/donations`, { headers: { Authorization:`Bearer ${token}` } });
      setHistoryData(res.data);
    } catch (err) { console.error(err); }
    setHistoryLoading(false);
  };

  // Bug 2: download document
  const downloadDoc = async (url, i) => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = window.URL.createObjectURL(blob);
      a.download = `document-${i+1}.${url.split(".").pop()?.split("?")[0] || "pdf"}`;
      document.body.appendChild(a); a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(a.href);
    } catch (err) { window.open(url, "_blank"); }
  };

  const stats = {
    total: funds.length,
    pending:  funds.filter(f => f.status==="Pending").length,
    approved: funds.filter(f => f.status==="Approved").length,
    rejected: funds.filter(f => f.status==="Rejected").length,
    totalGoal:   funds.reduce((s,f) => s+f.goalAmount, 0),
    totalRaised: funds.reduce((s,f) => s+(f.amountRaised||0), 0),
  };

  const displayed = funds
    .filter(f => filter==="all" || f.status===filter)
    .filter(f => !search ||
      f.title.toLowerCase().includes(search.toLowerCase()) ||
      (f.userId?.name||"").toLowerCase().includes(search.toLowerCase()) ||
      (f.area||"").toLowerCase().includes(search.toLowerCase())
    );

  if (loading) return (
    <div style={{ background:"#111", minHeight:"100vh" }}>
      <Navbar />
      <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", height:"60vh", gap:14 }}>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <div style={{ width:36, height:36, border:"3px solid rgba(0,255,136,0.1)", borderTop:"3px solid #00ff88", borderRadius:"50%", animation:"spin 0.8s linear infinite" }} />
        <p style={{ color:"#00ff88", fontSize:14 }}>{"Loading mass fund requests..."}</p>
      </div>
    </div>
  );

  return (
    <div style={{ background:"#111", minHeight:"100vh" }}>
      <style>{`
        @keyframes spin    { to { transform:rotate(360deg); } }
        @keyframes fadeUp  { from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)} }
        @keyframes slideIn { from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:translateX(0)} }
        @keyframes fadeIn  { from{opacity:0}to{opacity:1} }
        .mf-card { transition:all 0.22s ease; cursor:pointer; }
        .mf-card:hover { transform:translateY(-2px); border-color:rgba(0,255,136,0.15)!important; box-shadow:0 10px 28px rgba(0,0,0,0.3)!important; }
        .mf-card.sel { border-color:#00ff88!important; background:rgba(0,255,136,0.02)!important; }
        .st-btn { transition:all 0.2s ease; cursor:pointer; font-family:inherit; }
        .st-btn:hover:not(:disabled) { transform:translateY(-1px); }
        .st-btn:disabled { opacity:0.45; cursor:not-allowed; }
        .img-thumb:hover { opacity:0.8; }
        .warn-btn:hover { background:rgba(255,170,0,0.18)!important; }
        .del-btn:hover  { background:rgba(255,68,68,0.18)!important; }
        input:focus, select:focus, textarea:focus { border-color:#00ff88!important; outline:none!important; }
        .overlay-anim { animation: fadeIn 0.2s ease; }
      `}</style>

      {/* ── Lightbox (Bug 1) ── */}
      {lightboxUrl && <Lightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />}

      {/* ── Delete Confirm Modal (Bug 6) ── */}
      {confirmDelete && (
        <div className="overlay-anim" style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.88)", zIndex:9999, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <div style={{ background:"#161616", border:"1px solid #2a2a2a", borderRadius:18, padding:"32px 28px", maxWidth:360, width:"90%", display:"flex", flexDirection:"column", alignItems:"center", gap:14, boxShadow:"0 40px 80px rgba(0,0,0,0.8)" }}>
            <div style={{ fontSize:36 }}>{"🗑️"}</div>
            <h3 style={{ color:"#fff", fontSize:17, fontWeight:700, textAlign:"center" }}>{"Delete Request?"}</h3>
            <p style={{ color:"#666", fontSize:13, textAlign:"center", lineHeight:1.6 }}>{"This mass fund request will be permanently deleted. This cannot be undone."}</p>
            <div style={{ display:"flex", gap:10, width:"100%" }}>
              <button style={{ flex:1, padding:"12px", background:"#1a1a1a", border:"1px solid #2a2a2a", borderRadius:10, color:"#666", fontSize:14, cursor:"pointer", fontFamily:"inherit" }}
                onClick={() => setConfirmDelete(null)}>{"Cancel"}</button>
              <button style={{ flex:1, padding:"12px", background:"rgba(255,68,68,0.12)", border:"1px solid #ff4444", borderRadius:10, color:"#ff4444", fontSize:14, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}
                onClick={() => handleDelete(confirmDelete)}
                disabled={deleting}>
                {deleting ? "⏳ Deleting..." : "🗑️ Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Warn Modal (Bug 5) ── */}
      {showWarnModal && (
        <div className="overlay-anim" style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.88)", zIndex:9999, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <div style={{ background:"#161616", border:"1px solid #2a2a2a", borderRadius:18, padding:"32px 28px", maxWidth:420, width:"90%", display:"flex", flexDirection:"column", alignItems:"center", gap:14, boxShadow:"0 40px 80px rgba(0,0,0,0.8)" }}>
            <div style={{ fontSize:36 }}>{"⚠️"}</div>
            <h3 style={{ color:"#fff", fontSize:17, fontWeight:700, textAlign:"center" }}>{"Issue Fund Warning"}</h3>
            <p style={{ color:"#666", fontSize:13, textAlign:"center", lineHeight:1.6 }}>
              {"Issuing a warning to "}
              <span style={{ color:"#e0e0e0", fontWeight:700 }}>{selected?.userId?.name}</span>
              {" for this mass fund request. After " + WARN_LIMIT + " warnings their fund features will be auto-blocked."}
            </p>
            <textarea rows={3} placeholder="Reason (e.g. Fake mass fund request)..."
              value={warnReason} onChange={e => { setWarnReason(e.target.value); setWarnError(""); }}
              style={{ width:"100%", padding:"10px 12px", background:"#1a1a1a", border:"1px solid #2a2a2a", borderRadius:10, color:"#e0e0e0", fontSize:13, fontFamily:"inherit", resize:"vertical", boxSizing:"border-box" }} />
            {warnError && <p style={{ color:"#ff6b6b", fontSize:12, margin:0 }}>{warnError}</p>}
            <div style={{ display:"flex", gap:10, width:"100%" }}>
              <button style={{ flex:1, padding:"12px", background:"#1a1a1a", border:"1px solid #2a2a2a", borderRadius:10, color:"#666", fontSize:14, cursor:"pointer", fontFamily:"inherit" }}
                onClick={() => { setShowWarnModal(false); setWarnReason(""); setWarnError(""); }}>{"Cancel"}</button>
              <button style={{ flex:1, padding:"12px", background:"rgba(255,170,0,0.15)", border:"1px solid #ffaa00", borderRadius:10, color:"#ffaa00", fontSize:14, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}
                onClick={handleIssueWarning} disabled={warnLoading}>
                {warnLoading ? "⏳ Issuing..." : "⚠️ Issue Warning"}
              </button>
            </div>
          </div>
        </div>
      )}

      <Navbar />

      {/* Bug 9: use height:100% + overflow:hidden on layout, each panel scrolls independently */}
      <div style={{ display:"flex", height:"calc(100vh - 68px)", overflow:"hidden" }}>

        {/* ── Left sidebar ── */}
        <div style={{ width:230, minWidth:230, background:"#0d0d0d", borderRight:"1px solid #1e1e1e", padding:"24px 18px", display:"flex", flexDirection:"column", gap:16, overflowY:"auto", flexShrink:0 }}>
          <div style={{ paddingBottom:16, borderBottom:"1px solid #1e1e1e" }}>
            <h2 style={{ color:"#fff", fontSize:17, fontWeight:700, margin:0 }}>{"Mass Funding"}</h2>
            <p style={{ color:"#444", fontSize:12, margin:"4px 0 0" }}>{funds.length + " total requests"}</p>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            <p style={{ color:"#333", fontSize:10, fontWeight:700, letterSpacing:1 }}>{"OVERVIEW"}</p>
            {[
              { label:"Pending Review", value:stats.pending,  color:"#ffaa00" },
              { label:"Approved",       value:stats.approved, color:"#00ff88" },
              { label:"Rejected",       value:stats.rejected, color:"#ff4444" },
            ].map((s,i) => (
              <div key={i} style={{ display:"flex", justifyContent:"space-between", padding:"8px 10px", background:"#1a1a1a", borderRadius:8 }}>
                <span style={{ color:"#555", fontSize:12 }}>{s.label}</span>
                <span style={{ color:s.color, fontWeight:700, fontSize:13 }}>{s.value}</span>
              </div>
            ))}
            <div style={{ padding:"10px", background:"rgba(0,255,136,0.05)", border:"1px solid rgba(0,255,136,0.15)", borderRadius:8, marginTop:4 }}>
              <p style={{ color:"#444", fontSize:10, marginBottom:4 }}>{"TOTAL RAISED"}</p>
              <p style={{ color:"#00ff88", fontWeight:700, fontSize:15 }}>{"৳" + stats.totalRaised.toLocaleString()}</p>
              <p style={{ color:"#333", fontSize:10 }}>{"of ৳" + stats.totalGoal.toLocaleString() + " goal"}</p>
            </div>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
            <p style={{ color:"#333", fontSize:10, fontWeight:700, letterSpacing:1 }}>{"FILTER STATUS"}</p>
            {["all","Pending","Approved","Rejected"].map(f => (
              <button key={f} onClick={() => setFilter(f)} style={{
                display:"flex", justifyContent:"space-between", alignItems:"center",
                padding:"9px 10px", borderRadius:8,
                border:`1px solid ${filter===f ? "rgba(0,255,136,0.2)" : "transparent"}`,
                background: filter===f ? "rgba(0,255,136,0.08)" : "transparent",
                color: filter===f ? "#00ff88" : "#555",
                fontSize:13, cursor:"pointer", fontFamily:"inherit", width:"100%",
              }}>
                <span>{f==="all" ? "🗂 All" : STATUS_CONFIG[f].icon + " " + f}</span>
                <span style={{ background:"#222", color:"#444", fontSize:10, padding:"1px 7px", borderRadius:10 }}>
                  {f==="all" ? funds.length : funds.filter(x=>x.status===f).length}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* ── Middle: list (independently scrollable) ── */}
        <div style={{ flex:1, borderRight:"1px solid #1e1e1e", overflowY:"auto", display:"flex", flexDirection:"column" }}>
          {/* Sticky search bar */}
          <div style={{ padding:"16px 20px", borderBottom:"1px solid #1a1a1a", display:"flex", alignItems:"center", gap:10, background:"#111", position:"sticky", top:0, zIndex:10, flexShrink:0 }}>
            <span style={{ color:"#444" }}>{"🔍"}</span>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by title, user, or area..."
              style={{ background:"none", border:"none", color:"#e0e0e0", fontSize:13, width:"100%", outline:"none", fontFamily:"inherit" }} />
          </div>

          {successMsg && (
            <div style={{ margin:"12px 20px", padding:"10px 14px", background:"rgba(0,255,136,0.08)", border:"1px solid rgba(0,255,136,0.2)", borderRadius:8, color:"#00ff88", fontSize:13 }}>
              {"✅ " + successMsg}
            </div>
          )}

          {displayed.length === 0 ? (
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", flex:1, gap:12, padding:40 }}>
              <div style={{ fontSize:40, opacity:0.2 }}>{"🌍"}</div>
              <p style={{ color:"#444", fontSize:14 }}>{"No mass fund requests found"}</p>
            </div>
          ) : (
            displayed.map((fund, i) => {
              const sc = STATUS_CONFIG[fund.status] || STATUS_CONFIG.Pending;
              const isSel = selected?._id === fund._id;
              return (
                <div key={fund._id} className={`mf-card ${isSel?"sel":""}`}
                  onClick={() => setSelected(isSel ? null : fund)}
                  style={{ padding:"18px 20px", borderBottom:"1px solid #1a1a1a", border:"1px solid transparent", borderBottomColor:"#1a1a1a", animation:`fadeUp 0.3s ease ${i*0.04}s both`, flexShrink:0 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8 }}>
                    <div style={{ flex:1, minWidth:0, paddingRight:10 }}>
                      <p style={{ color:"#e0e0e0", fontSize:14, fontWeight:700, margin:"0 0 3px", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{fund.title}</p>
                      <div style={{ display:"flex", gap:10, alignItems:"center" }}>
                        <span style={{ color:"#555", fontSize:12 }}>{"👤 " + (fund.userId?.name || "Unknown")}</span>
                        {fund.area && <span style={{ color:"#333", fontSize:11 }}>{"📍 " + fund.area}</span>}
                        <span style={{ color:"#2a2a2a", fontSize:11 }}>{timeAgo(fund.createdAt)}</span>
                      </div>
                    </div>
                    <span style={{ padding:"4px 10px", borderRadius:20, fontSize:11, fontWeight:700, background:sc.bg, color:sc.color, border:`1px solid ${sc.border}`, flexShrink:0 }}>
                      {sc.icon + " " + fund.status}
                    </span>
                  </div>
                  <p style={{ color:"#666", fontSize:12, lineHeight:1.5, margin:"0 0 10px", display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical", overflow:"hidden" }}>{fund.description}</p>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <span style={{ color:"#00ff88", fontSize:13, fontWeight:700 }}>{"Goal: ৳" + fund.goalAmount.toLocaleString()}</span>
                    {fund.status === "Approved" && (
                      <span style={{ color:"#6bcbff", fontSize:12 }}>{"Raised: ৳" + (fund.amountRaised||0).toLocaleString()}</span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* ── Right: detail panel (Bug 9: independently scrollable, stays fixed) ── */}
        <div style={{ width:340, minWidth:340, background:"#0d0d0d", overflowY:"auto", flexShrink:0, borderLeft:"1px solid #1e1e1e" }}>
          <div style={{ padding:"24px 20px" }}>
            {selected ? (
              <div style={{ animation:"slideIn 0.25s ease" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
                  <h3 style={{ color:"#fff", fontSize:15, fontWeight:700, margin:0 }}>{"Request Details"}</h3>
                  <button onClick={() => setSelected(null)} style={{ background:"#1a1a1a", border:"1px solid #222", color:"#666", width:26, height:26, borderRadius:"50%", cursor:"pointer", fontSize:12, display:"flex", alignItems:"center", justifyContent:"center" }}>{"✕"}</button>
                </div>

                {warnSuccess && (
                  <div style={{ background:"rgba(255,170,0,0.08)", border:"1px solid rgba(255,170,0,0.25)", borderRadius:10, padding:"10px 14px", marginBottom:12, color:"#ffaa00", fontSize:12, fontWeight:600 }}>
                    {"⚠️ " + warnSuccess}
                  </div>
                )}

                {/* Goal amount */}
                <div style={{ background:"rgba(0,255,136,0.05)", border:"1px solid rgba(0,255,136,0.15)", borderRadius:12, padding:"14px", textAlign:"center", marginBottom:12 }}>
                  <p style={{ color:"#444", fontSize:10, marginBottom:6, letterSpacing:0.8 }}>{"GOAL AMOUNT"}</p>
                  <p style={{ color:"#00ff88", fontSize:22, fontWeight:800 }}>{"৳" + selected.goalAmount.toLocaleString()}</p>
                  {selected.status === "Approved" && <ProgressBar raised={selected.amountRaised||0} goal={selected.goalAmount} />}
                </div>

                {/* Bug 3: warning count for this user */}
                {(selected?.userId?.fundWarningCount > 0 || selected?.userId?.fundFeaturesBlocked) && (
                  <div style={{
                    background: selected.userId.fundFeaturesBlocked ? "rgba(255,107,107,0.08)" : "rgba(255,170,0,0.08)",
                    border: `1px solid ${selected.userId.fundFeaturesBlocked ? "rgba(255,107,107,0.25)" : "rgba(255,170,0,0.25)"}`,
                    borderRadius: 12, padding: "12px 14px", marginBottom: 12,
                    display: "flex", alignItems: "center", gap: 10,
                  }}>
                    <span style={{ fontSize: 20 }}>
                      {selected.userId.fundFeaturesBlocked ? "🚫" : "⚠️"}
                    </span>
                    <div>
                      <p style={{ color: selected.userId.fundFeaturesBlocked ? "#ff6b6b" : "#ffaa00", fontSize: 13, fontWeight: 700, margin: "0 0 2px" }}>
                        {selected.userId.fundFeaturesBlocked
                          ? "Fund Features BLOCKED"
                          : `${selected.userId.fundWarningCount}/${WARN_LIMIT} warnings issued`}
                      </p>
                      <p style={{ color: "#555", fontSize: 11, margin: 0 }}>
                        {selected.userId.fundFeaturesBlocked
                          ? "This user cannot submit fund or mass fund requests or donate."
                          : "Auto-blocked at 3 warnings."}
                      </p>
                    </div>
                  </div>
                )}
                {/* Status update */}
                <div style={{ background:"#1a1a1a", border:"1px solid #222", borderRadius:12, padding:"16px", marginBottom:12 }}>
                  <p style={{ color:"#fff", fontSize:13, fontWeight:700, marginBottom:8 }}>{"🔄 Update Status"}</p>
                  <p style={{ color:"#555", fontSize:12, marginBottom:10 }}>
                    {"Current: "}
                    <span style={{ color:STATUS_CONFIG[selected.status]?.color, fontWeight:700 }}>
                      {STATUS_CONFIG[selected.status]?.icon + " " + selected.status}
                    </span>
                  </p>
                  <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                    {["Approved","Rejected","Pending"].map(s => {
                      const sc = STATUS_CONFIG[s];
                      const isCurrent = selected.status === s;
                      return (
                        <button key={s} className="st-btn" disabled={isCurrent || updating}
                          onClick={() => handleStatus(selected._id, s)}
                          style={{ padding:"10px 14px", borderRadius:8, border:`1.5px solid ${sc.color}${isCurrent?"":"66"}`, background: isCurrent ? sc.color : sc.color + "10", color: isCurrent ? "#0a0a0a" : sc.color, fontSize:13, fontWeight:700, display:"flex", alignItems:"center", gap:8 }}>
                          <span>{sc.icon}</span>
                          <span>{updating && !isCurrent ? "Updating..." : s}{isCurrent ? " ✓ Current" : ""}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Bug 5: Warn button */}
                <div style={{ background:"#1a1a1a", border:"1px solid #222", borderRadius:12, padding:"14px", marginBottom:12 }}>
                  <p style={{ color:"#fff", fontSize:13, fontWeight:700, marginBottom:6 }}>{"⚠️ Fund Warning"}</p>
                  <p style={{ color:"#555", fontSize:12, lineHeight:1.5, marginBottom:10 }}>
                    {"Issue a warning for fake or fraudulent fund activity. " + WARN_LIMIT + " warnings = auto-block."}
                  </p>
                  <button className="warn-btn"
                    style={{ width:"100%", padding:"10px 14px", background:"rgba(255,170,0,0.1)", border:"1px solid rgba(255,170,0,0.3)", borderRadius:9, color:"#ffaa00", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit", transition:"all 0.2s" }}
                    onClick={() => { setShowWarnModal(true); setWarnError(""); setWarnReason(""); }}>
                    {"⚠️ Issue Fund Warning"}
                  </button>
                </div>

                {/* Bug 6: Admin delete */}
                <div style={{ marginBottom:12 }}>
                  <button className="del-btn"
                    style={{ width:"100%", padding:"10px 14px", background:"rgba(255,68,68,0.07)", border:"1px solid rgba(255,68,68,0.25)", borderRadius:9, color:"#ff6b6b", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit", transition:"all 0.2s" }}
                    onClick={() => setConfirmDelete(selected._id)}>
                    {"🗑️ Delete This Request"}
                  </button>
                </div>

                {/* Description */}
                <div style={{ marginBottom:12 }}>
                  <p style={{ color:"#333", fontSize:10, fontWeight:600, letterSpacing:0.8, marginBottom:6 }}>{"DESCRIPTION"}</p>
                  <p style={{ color:"#ccc", fontSize:13, lineHeight:1.7, background:"#1a1a1a", border:"1px solid #222", borderRadius:10, padding:"12px" }}>{selected.description}</p>
                </div>

                {/* Bug 1: Images with lightbox + download */}
                {selected.images?.length > 0 && (
                  <div style={{ marginBottom:12 }}>
                    <p style={{ color:"#333", fontSize:10, fontWeight:600, letterSpacing:0.8, marginBottom:8 }}>{"IMAGES"}</p>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6 }}>
                      {selected.images.map((img,i) => (
                        <div key={i} style={{ position:"relative", borderRadius:8, overflow:"hidden" }}>
                          <img className="img-thumb" src={img} alt="" onClick={() => setLightboxUrl(img)}
                            style={{ width:"100%", height:80, objectFit:"cover", cursor:"pointer", display:"block", transition:"opacity 0.2s" }} />
                          <div style={{ position:"absolute", bottom:0, left:0, right:0, display:"flex" }}>
                            <button onClick={() => setLightboxUrl(img)}
                              style={{ flex:1, padding:"5px", background:"rgba(0,0,0,0.7)", border:"none", color:"#e0e0e0", fontSize:10, cursor:"pointer", fontFamily:"inherit" }}>
                              {"🔍 View"}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Bug 2: Documents with download */}
                {selected.documents?.length > 0 && (
                  <div style={{ marginBottom:12 }}>
                    <p style={{ color:"#333", fontSize:10, fontWeight:600, letterSpacing:0.8, marginBottom:6 }}>{"DOCUMENTS"}</p>
                    {selected.documents.map((doc,i) => (
                      <button key={i} onClick={() => downloadDoc(doc, i)}
                        style={{ display:"flex", alignItems:"center", gap:8, padding:"10px 12px", background:"#1a1a1a", border:"1px solid #2a2a2a", borderRadius:8, color:"#6bcbff", fontSize:12, textDecoration:"none", marginBottom:6, width:"100%", cursor:"pointer", fontFamily:"inherit", transition:"all 0.2s" }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = "#6bcbff"; e.currentTarget.style.background = "rgba(107,203,255,0.08)"; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = "#2a2a2a"; e.currentTarget.style.background = "#1a1a1a"; }}>
                        <span style={{ fontSize:16 }}>{"📄"}</span>
                        <span style={{ flex:1, textAlign:"left" }}>{"Document " + (i+1)}</span>
                        <span style={{ fontSize:10, color:"#444" }}>{"⬇️ Click to download"}</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Bug 8: Donation history */}
                <div style={{ marginBottom:12 }}>
                  <button onClick={() => loadHistory(selected._id)}
                    style={{ width:"100%", padding:"10px 14px", background:"#1a1a1a", border:"1px solid #2a2a2a", borderRadius:9, color:"#888", fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                    <span>{"📊 Donation History (" + (selected.donations?.length || 0) + " donors)"}</span>
                    <span>{historyFundId === selected._id ? "▲" : "▼"}</span>
                  </button>
                  {historyFundId === selected._id && (
                    <div style={{ background:"#141414", border:"1px solid #1e1e1e", borderRadius:"0 0 9px 9px", overflow:"hidden" }}>
                      {historyLoading ? (
                        <div style={{ textAlign:"center", padding:20 }}>
                          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
                          <div style={{ width:20, height:20, border:"2px solid rgba(0,255,136,0.1)", borderTop:"2px solid #00ff88", borderRadius:"50%", animation:"spin 0.8s linear infinite", margin:"0 auto" }} />
                        </div>
                      ) : historyData.length === 0 ? (
                        <p style={{ color:"#444", fontSize:12, textAlign:"center", padding:"16px" }}>{"No donations yet"}</p>
                      ) : historyData.map((d,i) => (
                        <div key={i} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 14px", borderBottom:"1px solid #1a1a1a" }}>
                          <div style={{ width:30, height:30, borderRadius:"50%", background:"rgba(0,255,136,0.1)", border:"1px solid rgba(0,255,136,0.2)", display:"flex", alignItems:"center", justifyContent:"center", color:"#00ff88", fontSize:12, fontWeight:700, flexShrink:0 }}>
                            {(d.donorId?.name || "?").charAt(0).toUpperCase()}
                          </div>
                          <div style={{ flex:1 }}>
                            <p style={{ color:"#e0e0e0", fontSize:12, fontWeight:600, margin:0 }}>{d.donorId?.name || "Anonymous"}</p>
                            <p style={{ color:"#444", fontSize:10, margin:"2px 0 0" }}>{new Date(d.createdAt).toLocaleDateString("en-US", { month:"short", day:"numeric", year:"numeric" })}</p>
                            {d.note && <p style={{ color:"#555", fontSize:10, margin:"1px 0 0", fontStyle:"italic" }}>{'"' + d.note + '"'}</p>}
                          </div>
                          <span style={{ color:"#00ff88", fontSize:13, fontWeight:800, flexShrink:0 }}>{"৳" + d.amount.toLocaleString()}</span>
                        </div>
                      ))}
                      {historyData.length > 0 && (
                        <div style={{ padding:"10px 14px", background:"rgba(0,255,136,0.04)", borderTop:"1px solid #1e1e1e" }}>
                          <span style={{ color:"#555", fontSize:11 }}>{"Total: "}</span>
                          <span style={{ color:"#00ff88", fontSize:13, fontWeight:700 }}>{"৳" + historyData.reduce((s,d) => s+d.amount,0).toLocaleString()}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Meta */}
                <div style={{ background:"#1a1a1a", border:"1px solid #222", borderRadius:12, padding:"14px", display:"flex", flexDirection:"column", gap:8 }}>
                  {[
                    ["Requester",  selected.userId?.name || "Unknown"],
                    ["Email",      selected.userId?.email || "N/A"],
                    ["Contact",    selected.contactNumber],
                    ["Area",       selected.area || "N/A"],
                    ["Donors",     (selected.donations?.length || 0) + " people"],
                    ["Submitted",  new Date(selected.createdAt).toLocaleDateString("en-US", { year:"numeric", month:"long", day:"numeric" })],
                  ].map(([l,v],i) => (
                    <div key={i} style={{ display:"flex", justifyContent:"space-between" }}>
                      <span style={{ color:"#444", fontSize:12 }}>{l}</span>
                      <span style={{ color:"#e0e0e0", fontSize:12, fontWeight:500, textAlign:"right", maxWidth:180, wordBreak:"break-all" }}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", minHeight:300, gap:12, textAlign:"center" }}>
                <div style={{ fontSize:32, opacity:0.2 }}>{"👆"}</div>
                <p style={{ color:"#333", fontSize:13 }}>{"Select a request to review and approve or reject it"}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminMassFunding;