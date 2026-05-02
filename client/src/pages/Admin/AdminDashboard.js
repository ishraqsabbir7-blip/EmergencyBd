import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import useAuth from "../../hooks/useAuth";
import Navbar from "../../components/Navbar";
import { useNavigate } from "react-router-dom";

// ─────────────────────────────────────────────────────────────────────────────
// CHART COMPONENTS (pure SVG — no external libraries)
// ─────────────────────────────────────────────────────────────────────────────

// Bar Chart
const BarChart = ({ data, valueKey, labelKey, color = "#00ff88", height = 180, title }) => {
  const max = Math.max(...data.map(d => d[valueKey] || 0), 1);
  return (
    <div style={{ width: "100%" }}>
      {title && <p style={{ color: "#888", fontSize: 11, fontWeight: 700, letterSpacing: "0.8px", textTransform: "uppercase", marginBottom: 10 }}>{title}</p>}
      <svg width="100%" height={height} viewBox={`0 0 ${data.length * 52} ${height}`} preserveAspectRatio="none">
        <defs>
          <linearGradient id={`bar-grad-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.9" />
            <stop offset="100%" stopColor={color} stopOpacity="0.3" />
          </linearGradient>
        </defs>
        {data.map((d, i) => {
          const val = d[valueKey] || 0;
          const barH = Math.max((val / max) * (height - 30), val > 0 ? 4 : 0);
          const x = i * 52 + 6;
          const y = height - barH - 20;
          return (
            <g key={i}>
              <rect x={x} y={y} width={40} height={barH}
                fill={`url(#bar-grad-${color.replace("#", "")})`}
                rx={4} style={{ transition: "all 0.5s ease" }} />
              <text x={x + 20} y={height - 4} textAnchor="middle"
                fill="#444" fontSize="10" fontFamily="inherit">
                {d[labelKey]}
              </text>
              {val > 0 && (
                <text x={x + 20} y={y - 4} textAnchor="middle"
                  fill={color} fontSize="11" fontWeight="700" fontFamily="inherit">
                  {val}
                </text>
              )}
            </g>
          );
        })}
        {/* baseline */}
        <line x1={0} y1={height - 20} x2={data.length * 52} y2={height - 20} stroke="#222" strokeWidth="1" />
      </svg>
    </div>
  );
};

// Multi-bar Chart (grouped)
const GroupedBarChart = ({ data, keys, colors, labelKey, height = 180, title }) => {
  const max = Math.max(...data.flatMap(d => keys.map(k => d[k] || 0)), 1);
  const barW = Math.floor(36 / keys.length);
  const groupW = 52;
  return (
    <div style={{ width: "100%" }}>
      {title && <p style={{ color: "#888", fontSize: 11, fontWeight: 700, letterSpacing: "0.8px", textTransform: "uppercase", marginBottom: 10 }}>{title}</p>}
      <svg width="100%" height={height} viewBox={`0 0 ${data.length * groupW} ${height}`} preserveAspectRatio="none">
        {data.map((d, i) => (
          <g key={i}>
            {keys.map((k, ki) => {
              const val = d[k] || 0;
              const barH = Math.max((val / max) * (height - 30), val > 0 ? 3 : 0);
              const x = i * groupW + 6 + ki * (barW + 2);
              const y = height - barH - 20;
              return (
                <rect key={k} x={x} y={y} width={barW} height={barH}
                  fill={colors[ki]} rx={2} opacity={0.85} />
              );
            })}
            <text x={i * groupW + 26} y={height - 4} textAnchor="middle"
              fill="#444" fontSize="9" fontFamily="inherit">
              {d[labelKey]}
            </text>
          </g>
        ))}
        <line x1={0} y1={height - 20} x2={data.length * groupW} y2={height - 20} stroke="#222" strokeWidth="1" />
      </svg>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 8 }}>
        {keys.map((k, i) => (
          <div key={k} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: colors[i] }} />
            <span style={{ color: "#555", fontSize: 11, textTransform: "capitalize" }}>{k}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// Area / Line Chart
const AreaChart = ({ data, valueKey, labelKey, color = "#00ff88", height = 160, title }) => {
  const max = Math.max(...data.map(d => d[valueKey] || 0), 1);
  const w = 320;
  const h = height - 24;
  const step = w / Math.max(data.length - 1, 1);

  const points = data.map((d, i) => ({
    x: i * step,
    y: h - ((d[valueKey] || 0) / max) * (h - 10),
  }));

  const polyline = points.map(p => `${p.x},${p.y}`).join(" ");
  const area = `M${points[0]?.x},${h} ` + points.map(p => `L${p.x},${p.y}`).join(" ") + ` L${points[points.length - 1]?.x},${h} Z`;

  return (
    <div style={{ width: "100%" }}>
      {title && <p style={{ color: "#888", fontSize: 11, fontWeight: 700, letterSpacing: "0.8px", textTransform: "uppercase", marginBottom: 10 }}>{title}</p>}
      <svg width="100%" height={height} viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none">
        <defs>
          <linearGradient id={`area-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.25" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <path d={area} fill={`url(#area-${color.replace("#", "")})`} />
        <polyline points={polyline} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r={4} fill={color} />
            <circle cx={p.x} cy={p.y} r={7} fill={color} opacity={0.15} />
            <text x={p.x} y={h + 16} textAnchor="middle" fill="#444" fontSize="9" fontFamily="inherit">
              {data[i][labelKey]}
            </text>
            {(data[i][valueKey] || 0) > 0 && (
              <text x={p.x} y={p.y - 10} textAnchor="middle" fill={color} fontSize="10" fontWeight="700" fontFamily="inherit">
                {data[i][valueKey]}
              </text>
            )}
          </g>
        ))}
        <line x1={0} y1={h} x2={w} y2={h} stroke="#222" strokeWidth="1" />
      </svg>
    </div>
  );
};

// Donut Chart
const DonutChart = ({ segments, title, centerLabel, centerValue }) => {
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  let offset = 0;
  const r = 52;
  const cx = 70;
  const cy = 70;
  const circ = 2 * Math.PI * r;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
      <div style={{ position: "relative", flexShrink: 0 }}>
        <svg width={140} height={140}>
          {segments.map((seg, i) => {
            const pct = total > 0 ? seg.value / total : 0;
            const dash = pct * circ;
            const gap  = circ - dash;
            const el = (
              <circle key={i} cx={cx} cy={cy} r={r}
                fill="none" stroke={seg.color}
                strokeWidth={18}
                strokeDasharray={`${dash} ${gap}`}
                strokeDashoffset={-offset * circ}
                transform={`rotate(-90 ${cx} ${cy})`}
                opacity={0.85}
              />
            );
            offset += pct;
            return el;
          })}
          <circle cx={cx} cy={cy} r={r - 9} fill="#1a1a1a" />
          <text x={cx} y={cy - 6} textAnchor="middle" fill="#fff" fontSize="20" fontWeight="800" fontFamily="inherit">
            {centerValue}
          </text>
          <text x={cx} y={cy + 12} textAnchor="middle" fill="#555" fontSize="10" fontFamily="inherit">
            {centerLabel}
          </text>
        </svg>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {segments.map((seg, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: seg.color, flexShrink: 0 }} />
            <span style={{ color: "#888", fontSize: 12 }}>{seg.label}</span>
            <span style={{ color: seg.color, fontSize: 13, fontWeight: 700, marginLeft: "auto" }}>{seg.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// Horizontal Bar Chart (for type breakdown)
const HorizontalBarChart = ({ data, title }) => {
  const max = Math.max(...data.map(d => d.count), 1);
  return (
    <div style={{ width: "100%" }}>
      {title && <p style={{ color: "#888", fontSize: 11, fontWeight: 700, letterSpacing: "0.8px", textTransform: "uppercase", marginBottom: 12 }}>{title}</p>}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {data.map((d, i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "#aaa", fontSize: 12 }}>{d.icon} {d.label}</span>
              <span style={{ color: d.color, fontSize: 12, fontWeight: 700 }}>{d.count}</span>
            </div>
            <div style={{ height: 8, backgroundColor: "#1e1e1e", borderRadius: 4, overflow: "hidden" }}>
              <div style={{
                height: "100%", borderRadius: 4,
                width: `${(d.count / max) * 100}%`,
                backgroundColor: d.color,
                transition: "width 0.8s ease",
                boxShadow: `0 0 8px ${d.color}44`,
              }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Timeline Component
const Timeline = ({ events }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
    {events.map((ev, i) => {
      const statusColors = {
        Pending: "#ffaa00", Verified: "#00ff88", Resolved: "#6bcbff",
        Approved: "#00ff88", Rejected: "#ff4444",
      };
      const sc = statusColors[ev.status] || "#555";
      return (
        <div key={i} style={{ display: "flex", gap: 12, position: "relative" }}>
          {/* vertical line */}
          {i < events.length - 1 && (
            <div style={{ position: "absolute", left: 7, top: 20, bottom: -8, width: 1, backgroundColor: "#1e1e1e" }} />
          )}
          {/* dot */}
          <div style={{ flexShrink: 0, marginTop: 4 }}>
            <div style={{ width: 15, height: 15, borderRadius: "50%", backgroundColor: ev.color + "20", border: `2px solid ${ev.color}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ width: 5, height: 5, borderRadius: "50%", backgroundColor: ev.color }} />
            </div>
          </div>
          <div style={{ flex: 1, paddingBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <p style={{ color: "#e0e0e0", fontSize: 12, fontWeight: 600, margin: 0, lineHeight: 1.4 }}>{ev.label}</p>
              <span style={{ color: sc, fontSize: 10, fontWeight: 700, backgroundColor: sc + "15", padding: "2px 8px", borderRadius: 10, flexShrink: 0, marginLeft: 8 }}>
                {ev.status}
              </span>
            </div>
            <p style={{ color: "#444", fontSize: 10, margin: "3px 0 0" }}>
              {new Date(ev.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}
            </p>
          </div>
        </div>
      );
    })}
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────

const EMERGENCY_TYPE_CONFIG = {
  robbery:    { icon: "🔫", color: "#ff6b6b", label: "Robbery" },
  fire:       { icon: "🔥", color: "#ff9f43", label: "Fire" },
  accident:   { icon: "💥", color: "#ffd93d", label: "Accident" },
  harassment: { icon: "⚠️", color: "#a29bfe", label: "Harassment" },
  medical:    { icon: "🏥", color: "#00bfff", label: "Medical" },
  flood:      { icon: "🌊", color: "#1e90ff", label: "Flood" },
  other:      { icon: "🚨", color: "#ff0066", label: "Other" },
};

const timeAgo = (date) => {
  const diff = (Date.now() - new Date(date)) / 1000;
  if (diff < 60)   return `${Math.floor(diff)}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
};

const AdminDashboard = () => {
  const { token } = useAuth();
  const navigate  = useNavigate();
  const [reports, setReports] = useState([]);
  const [funds,   setFunds]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("dashboard"); // "dashboard" | "analytics"

  // Analytics state
  const [analytics, setAnalytics]         = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsError, setAnalyticsError]     = useState("");

  // SOS state
  const [sosEvents,     setSosEvents]     = useState([]);
  const [sosLoading,    setSosLoading]    = useState(true);
  const [resolvingId,   setResolvingId]   = useState(null);
  const [resolveSuccess, setResolveSuccess] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [reportsRes, fundsRes] = await Promise.all([
          axios.get("http://localhost:3001/api/admin/reports",       { headers: { Authorization: `Bearer ${token}` } }),
          axios.get("http://localhost:3001/api/admin/fund-requests", { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        setReports(reportsRes.data);
        setFunds(fundsRes.data);
      } catch (err) { console.error(err); }
      setLoading(false);
    };
    fetchData();
  }, [token]);

  // Fetch analytics when tab switches
  useEffect(() => {
    if (activeTab !== "analytics" || analytics) return;
    const fetchAnalytics = async () => {
      setAnalyticsLoading(true);
      setAnalyticsError("");
      try {
        const res = await axios.get("http://localhost:3001/api/admin/analytics", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setAnalytics(res.data);
      } catch (err) {
        setAnalyticsError("Failed to load analytics. Please try again.");
        console.error(err);
      }
      setAnalyticsLoading(false);
    };
    fetchAnalytics();
  }, [activeTab, token]);

  const fetchSOS = useCallback(async () => {
    try {
      const res = await axios.get("http://localhost:3001/api/sos/active", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSosEvents(res.data);
    } catch (err) { console.error("SOS fetch error:", err); }
    finally { setSosLoading(false); }
  }, [token]);

  useEffect(() => {
    fetchSOS();
    const interval = setInterval(fetchSOS, 15000);
    return () => clearInterval(interval);
  }, [fetchSOS]);

  const handleResolve = async (eventId, title) => {
    setResolvingId(eventId);
    try {
      await axios.patch(
        `http://localhost:3001/api/sos/${eventId}/resolve`, {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSosEvents(prev => prev.filter(e => e._id !== eventId));
      setResolveSuccess(`"${title}" has been marked as resolved.`);
      setTimeout(() => setResolveSuccess(null), 4000);
    } catch (err) { console.error("Resolve error:", err); }
    finally { setResolvingId(null); }
  };

  const stats = {
    totalReports:      reports.length,
    pendingReports:    reports.filter(r => r.status === "Pending").length,
    verifiedReports:   reports.filter(r => r.status === "Verified").length,
    resolvedReports:   reports.filter(r => r.status === "Resolved").length,
    totalFunds:        funds.length,
    pendingFunds:      funds.filter(f => f.status === "Pending").length,
    approvedFunds:     funds.filter(f => f.status === "Approved").length,
    rejectedFunds:     funds.filter(f => f.status === "Rejected").length,
    totalAmountRequested: funds.reduce((sum, f) => sum + f.amountNeeded, 0),
  };

  const emergencyTypeCounts = reports.reduce((acc, r) => {
    acc[r.emergencyType] = (acc[r.emergencyType] || 0) + 1;
    return acc;
  }, {});

  const typeConfig = {
    robbery:    { icon: "🔫", color: "#ff6b6b", label: "Robbery"    },
    fire:       { icon: "🔥", color: "#ff9f43", label: "Fire"       },
    accident:   { icon: "🚗", color: "#ffd93d", label: "Accident"   },
    harassment: { icon: "⚠️", color: "#a29bfe", label: "Harassment" },
    medical:    { icon: "🏥", color: "#00ff88", label: "Medical"    },
  };

  const recentReports = [...reports].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);
  const recentFunds   = [...funds].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);

  if (loading) return (
    <div style={S.loadingScreen}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div style={S.spinner} />
      <p style={S.loadingText}>{"Loading dashboard..."}</p>
    </div>
  );

  return (
    <div style={S.page}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp   { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        @keyframes slideIn  { from { opacity:0; transform:translateX(-20px); } to { opacity:1; transform:translateX(0); } }
        @keyframes glow     { 0%,100%{box-shadow:0 0 20px rgba(0,255,136,0.2);}50%{box-shadow:0 0 40px rgba(0,255,136,0.5);} }
        @keyframes fillBar  { from{width:0%;}to{width:var(--w);} }
        @keyframes sosPulseRing { 0%{transform:scale(1);opacity:0.8;}100%{transform:scale(2.4);opacity:0;} }
        @keyframes sosBlink { 0%,100%{opacity:1;}50%{opacity:0.3;} }
        @keyframes successPop { 0%{opacity:0;transform:translateY(10px) scale(0.95);}60%{transform:translateY(-2px) scale(1.02);}100%{opacity:1;transform:translateY(0) scale(1);} }

        .stat-card    { transition: all 0.3s ease !important; }
        .stat-card:hover { transform:translateY(-4px) !important; box-shadow:0 16px 40px rgba(0,0,0,0.3) !important; }
        .action-btn   { transition: all 0.3s ease !important; }
        .action-btn:hover { transform:translateY(-2px) !important; box-shadow:0 8px 20px rgba(0,255,136,0.3) !important; }
        .recent-row   { transition: all 0.3s ease !important; }
        .recent-row:hover { background:rgba(0,255,136,0.04) !important; transform:translateX(4px) !important; }
        .type-bar-item { transition: all 0.3s ease !important; }
        .type-bar-item:hover { transform:translateX(4px) !important; }
        .sos-event-card { transition:all 0.3s ease; animation:fadeUp 0.4s ease both; }
        .sos-event-card:hover { border-color:rgba(255,51,51,0.4) !important; transform:translateY(-2px); box-shadow:0 8px 24px rgba(255,0,0,0.15) !important; }
        .resolve-btn { transition:all 0.25s ease; cursor:pointer; font-family:inherit; }
        .resolve-btn:hover:not(:disabled) { transform:translateY(-1px); box-shadow:0 6px 20px rgba(0,255,136,0.35) !important; background:#00ff88 !important; color:#0a0a0a !important; }
        .resolve-btn:active:not(:disabled) { transform:scale(0.97); }
        .resolve-btn:disabled { opacity:0.5; cursor:not-allowed; }
        .tab-btn { transition: all 0.2s ease !important; }
        .tab-btn:hover { color: #00ff88 !important; }
        .analytics-card { animation: fadeUp 0.4s ease both; }
      `}</style>

      <Navbar />
      <div style={S.layout}>

        {/* ── LEFT SIDEBAR (unchanged) ── */}
        <div style={S.sidebar}>
          <div style={S.sidebarContent}>
            <div style={S.adminInfo}>
              <div style={S.adminAvatar}>{"A"}</div>
              <div>
                <p style={S.adminName}>{"Admin Panel"}</p>
                <p style={S.adminRole}>{"⚡ ADMINISTRATOR"}</p>
              </div>
            </div>
            <div style={S.quickNav}>
              <p style={S.navLabel}>{"QUICK ACCESS"}</p>
              {[
                { icon: "📊", label: "Dashboard",    path: "/admin/dashboard", active: activeTab === "dashboard" },
                { icon: "📈", label: "Analytics",    path: null, isAnalytics: true, active: activeTab === "analytics" },
                { icon: "🚨", label: "All Reports",  path: "/admin/reports" },
                { icon: "💰", label: "Fund Requests",path: "/admin/fund-requests" },
                { icon: "📡", label: "Live SOS Map", path: "/sos-map" },
              ].map((item, i) => (
                <button key={i}
                  style={{ ...S.navBtn, ...(item.active ? S.navBtnActive : {}) }}
                  onClick={() => {
                    if (item.isAnalytics) { setActiveTab("analytics"); return; }
                    if (item.path === "/admin/dashboard") { setActiveTab("dashboard"); return; }
                    navigate(item.path);
                  }}
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              ))}
            </div>

            {sosEvents.length > 0 && (
              <div style={{ background: "rgba(255,0,0,0.08)", border: "1px solid rgba(255,0,0,0.25)", borderRadius: "12px", padding: "14px" }}>
                <p style={{ ...S.navLabel, color: "#ff4444", marginBottom: 8 }}>{"🆘 ACTIVE SOS"}</p>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ position: "relative", width: 14, height: 14 }}>
                    <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "#ff3333", animation: "sosBlink 1s ease-in-out infinite" }} />
                  </div>
                  <span style={{ color: "#ff6666", fontWeight: 700, fontSize: 22 }}>{sosEvents.length}</span>
                  <span style={{ color: "#666", fontSize: 12 }}>{"event" + (sosEvents.length !== 1 ? "s" : "") + " active"}</span>
                </div>
              </div>
            )}

            <div style={S.systemStatus}>
              <p style={S.navLabel}>{"SYSTEM STATUS"}</p>
              {[
                { label: "Server",    status: "Online",     color: "#00ff88" },
                { label: "Database",  status: "Connected",  color: "#00ff88" },
                { label: "SOS Events", status: sosLoading ? "Loading..." : `${sosEvents.length} Active`, color: sosEvents.length > 0 ? "#ff4444" : "#00ff88" },
              ].map((item, i) => (
                <div key={i} style={S.statusRow}>
                  <span style={S.statusLabel}>{item.label}</span>
                  <span style={{ ...S.statusValue, color: item.color }}>{"● " + item.status}</span>
                </div>
              ))}
            </div>

            <div style={S.summaryBox}>
              <p style={S.navLabel}>{"SUMMARY"}</p>
              <div style={S.summaryItem}>
                <span style={S.summaryLabel}>{"Total Reports"}</span>
                <span style={S.summaryValue}>{stats.totalReports}</span>
              </div>
              <div style={S.summaryItem}>
                <span style={S.summaryLabel}>{"Total Fund Requests"}</span>
                <span style={S.summaryValue}>{stats.totalFunds}</span>
              </div>
              <div style={S.summaryItem}>
                <span style={S.summaryLabel}>{"Total Requested"}</span>
                <span style={{ ...S.summaryValue, color: "#00ff88" }}>{"৳" + stats.totalAmountRequested.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── MAIN CONTENT ── */}
        <div style={S.main}>

          {/* Tab Switcher */}
          <div style={S.tabRow}>
            {[
              { id: "dashboard", label: "📊 Dashboard", },
              { id: "analytics", label: "📈 Analytics", },
            ].map(tab => (
              <button key={tab.id} className="tab-btn"
                onClick={() => setActiveTab(tab.id)}
                style={{
                  ...S.tabBtn,
                  ...(activeTab === tab.id ? S.tabBtnActive : {}),
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* ═══════════════════ DASHBOARD TAB ═══════════════════ */}
          {activeTab === "dashboard" && (
            <>
              {/* Welcome Banner */}
              <div style={S.welcomeBanner}>
                <div style={S.bannerOverlay} />
                <div style={S.bannerContent}>
                  <div>
                    <h1 style={S.welcomeTitle}>{"Admin Dashboard 📊"}</h1>
                    <p style={S.welcomeSubtitle}>
                      {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
                    </p>
                  </div>
                  <div style={S.bannerStats}>
                    <div style={S.bannerStat}>
                      <span style={S.bannerStatValue}>{stats.pendingReports}</span>
                      <span style={S.bannerStatLabel}>{"Pending Reports"}</span>
                    </div>
                    <div style={S.bannerStatDivider} />
                    <div style={S.bannerStat}>
                      <span style={S.bannerStatValue}>{stats.pendingFunds}</span>
                      <span style={S.bannerStatLabel}>{"Pending Funds"}</span>
                    </div>
                    {sosEvents.length > 0 && (
                      <>
                        <div style={S.bannerStatDivider} />
                        <div style={S.bannerStat}>
                          <span style={{ ...S.bannerStatValue, color: "#ff4444", animation: "sosBlink 1.5s ease-in-out infinite" }}>
                            {sosEvents.length}
                          </span>
                          <span style={S.bannerStatLabel}>{"Active SOS"}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* SOS Panel (unchanged) */}
              <div style={{ background: "linear-gradient(135deg,#1a0a0a 0%,#1e1010 100%)", border: "1px solid rgba(255,51,51,0.25)", borderRadius: "16px", padding: "24px", boxShadow: sosEvents.length > 0 ? "0 0 40px rgba(255,0,0,0.08)" : "none" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ position: "relative", width: 36, height: 36 }}>
                      <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: "2px solid #ff3333", animation: sosEvents.length > 0 ? "sosPulseRing 2s ease-out infinite" : "none" }} />
                      <div style={{ position: "absolute", inset: 4, borderRadius: "50%", background: "rgba(255,51,51,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>{"🆘"}</div>
                    </div>
                    <div>
                      <h3 style={{ color: "#ffffff", fontSize: 16, fontWeight: 700, margin: 0 }}>{"SOS Event Management"}</h3>
                      <p style={{ color: "#555", fontSize: 11, margin: "3px 0 0", letterSpacing: 0.5 }}>{"LIVE · AUTO-REFRESHES EVERY 15s"}</p>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    {sosEvents.length > 0 && (
                      <div style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(255,51,51,0.1)", border: "1px solid rgba(255,51,51,0.3)", borderRadius: 20, padding: "5px 14px" }}>
                        <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#ff3333", animation: "sosBlink 1s ease-in-out infinite" }} />
                        <span style={{ color: "#ff6666", fontSize: 12, fontWeight: 700 }}>{sosEvents.length + " ACTIVE"}</span>
                      </div>
                    )}
                    <button onClick={() => navigate("/sos-map")}
                      style={{ background: "transparent", border: "1px solid #333", color: "#888", padding: "7px 16px", borderRadius: 20, fontSize: 12, cursor: "pointer", fontFamily: "inherit", transition: "all 0.2s" }}
                      onMouseEnter={e => { e.target.style.borderColor = "#00ff88"; e.target.style.color = "#00ff88"; }}
                      onMouseLeave={e => { e.target.style.borderColor = "#333";    e.target.style.color = "#888"; }}>
                      {"📡 View Live Map"}
                    </button>
                  </div>
                </div>
                {resolveSuccess && (
                  <div style={{ background: "rgba(0,255,136,0.08)", border: "1px solid rgba(0,255,136,0.3)", borderRadius: 10, padding: "12px 16px", marginBottom: 16, display: "flex", alignItems: "center", gap: 10, animation: "successPop 0.4s ease" }}>
                    <span style={{ fontSize: 18 }}>{"✅"}</span>
                    <span style={{ color: "#00ff88", fontSize: 13, fontWeight: 600 }}>{resolveSuccess}</span>
                  </div>
                )}
                {sosLoading ? (
                  <div style={{ textAlign: "center", padding: "32px", color: "#555" }}>
                    <div style={{ ...S.spinner, margin: "0 auto 12px", borderTopColor: "#ff3333" }} />
                    <p style={{ fontSize: 13 }}>{"Loading SOS events..."}</p>
                  </div>
                ) : sosEvents.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "40px 20px", border: "1px dashed #1e1e1e", borderRadius: 12 }}>
                    <div style={{ fontSize: 40, marginBottom: 12 }}>{"✅"}</div>
                    <p style={{ color: "#00ff88", fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{"All Clear"}</p>
                    <p style={{ color: "#444", fontSize: 13 }}>{"No active SOS events at this time."}</p>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {sosEvents.map((event, idx) => {
                      const et = EMERGENCY_TYPE_CONFIG[event.emergencyType] || EMERGENCY_TYPE_CONFIG.other;
                      const isResolving = resolvingId === event._id;
                      return (
                        <div key={event._id} className="sos-event-card" style={{ background: "#111", border: `1px solid ${et.color}22`, borderLeft: `4px solid ${et.color}`, borderRadius: 12, padding: "16px 20px", display: "flex", alignItems: "center", gap: 16, animationDelay: `${idx * 0.08}s`, boxShadow: "0 4px 20px rgba(0,0,0,0.3)" }}>
                          <div style={{ position: "relative", flexShrink: 0 }}>
                            <div style={{ width: 48, height: 48, borderRadius: "50%", background: `${et.color}18`, border: `2px solid ${et.color}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>{et.icon}</div>
                            <div style={{ position: "absolute", inset: -4, borderRadius: "50%", border: `1.5px solid ${et.color}`, animation: "sosPulseRing 2s ease-out infinite", animationDelay: `${idx * 0.3}s` }} />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, color: et.color, background: `${et.color}15`, padding: "2px 8px", borderRadius: 10 }}>{et.label.toUpperCase()}</span>
                              <span style={{ fontSize: 10, color: "#444", fontFamily: "monospace" }}>{timeAgo(event.createdAt)}</span>
                              <span style={{ fontSize: 10, color: "#333" }}>{"·"}</span>
                              <span style={{ fontSize: 10, color: "#444" }}>{event.radius + "km radius"}</span>
                              <span style={{ fontSize: 10, color: "#333" }}>{"·"}</span>
                              <span style={{ fontSize: 10, color: "#444" }}>{(event.notifiedUsers?.length || 0) + " notified"}</span>
                            </div>
                            <p style={{ color: "#e0e0e0", fontWeight: 700, fontSize: 14, margin: "0 0 4px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{event.title}</p>
                            <p style={{ color: "#666", fontSize: 12, margin: "0 0 6px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{event.description}</p>
                            {event.location?.address && <p style={{ color: "#444", fontSize: 11, fontFamily: "monospace", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{"📍 " + event.location.address}</p>}
                            {event.sender?.name && <p style={{ color: "#444", fontSize: 11, margin: "4px 0 0" }}>{"Reported by: "}<span style={{ color: "#666" }}>{event.sender.name}</span></p>}
                          </div>
                          <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
                            <button className="resolve-btn" disabled={isResolving} onClick={() => handleResolve(event._id, event.title)}
                              style={{ padding: "10px 22px", background: "transparent", border: "1.5px solid #00ff88", borderRadius: 8, color: "#00ff88", fontSize: 13, fontWeight: 700, letterSpacing: 0.5, display: "flex", alignItems: "center", gap: 7 }}>
                              {isResolving ? (
                                <><div style={{ width: 13, height: 13, border: "2px solid #00ff8833", borderTop: "2px solid #00ff88", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />{"Resolving..."}</>
                              ) : "✓ Mark Resolved"}
                            </button>
                            <button onClick={() => navigate(`/sos-map?id=${event._id}`)}
                              style={{ padding: "7px 16px", background: "transparent", border: `1px solid ${et.color}44`, borderRadius: 8, color: et.color, fontSize: 11, cursor: "pointer", fontFamily: "inherit", transition: "all 0.2s" }}
                              onMouseEnter={e => e.currentTarget.style.borderColor = et.color}
                              onMouseLeave={e => e.currentTarget.style.borderColor = `${et.color}44`}>
                              {"🗺️ View on Map"}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Stats Grid */}
              <div style={S.statsGrid}>
                {[
                  { icon: "🚨", label: "Total Reports",    value: stats.totalReports,    color: "#ff6b6b", sub: stats.pendingReports + " pending" },
                  { icon: "✅", label: "Verified Reports", value: stats.verifiedReports, color: "#00ff88", sub: stats.resolvedReports + " resolved" },
                  { icon: "💰", label: "Fund Requests",    value: stats.totalFunds,      color: "#ffd93d", sub: stats.pendingFunds + " pending" },
                  { icon: "✔️", label: "Approved Funds",   value: stats.approvedFunds,   color: "#6bcbff", sub: stats.rejectedFunds + " rejected" },
                ].map((stat, i) => (
                  <div key={i} className="stat-card" style={S.statCard}>
                    <div style={{ ...S.statIconCircle, backgroundColor: stat.color + "12", border: `1px solid ${stat.color}25` }}>
                      <span style={S.statIcon}>{stat.icon}</span>
                    </div>
                    <div style={S.statInfo}>
                      <p style={{ ...S.statValue, color: stat.color }}>{stat.value}</p>
                      <p style={S.statLabel}>{stat.label}</p>
                      <p style={S.statSub}>{stat.sub}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Middle Row */}
              <div style={S.middleRow}>
                <div style={S.breakdownCard}>
                  <div style={S.cardHeader}>
                    <h3 style={S.cardTitle}>{"📊 Emergency Breakdown"}</h3>
                    <span style={S.cardSubtitle}>{stats.totalReports + " total"}</span>
                  </div>
                  {Object.entries(typeConfig).map(([key, val]) => {
                    const count = emergencyTypeCounts[key] || 0;
                    const percent = stats.totalReports ? Math.round((count / stats.totalReports) * 100) : 0;
                    return (
                      <div key={key} className="type-bar-item" style={S.typeBarItem}>
                        <div style={S.typeBarTop}>
                          <span style={S.typeBarLabel}>{val.icon + " " + val.label}</span>
                          <span style={{ ...S.typeBarCount, color: val.color }}>{count}</span>
                        </div>
                        <div style={S.typeBarBg}>
                          <div style={{ ...S.typeBarFill, width: `${percent}%`, backgroundColor: val.color }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div style={S.fundOverviewCard}>
                  <div style={S.cardHeader}>
                    <h3 style={S.cardTitle}>{"💰 Fund Overview"}</h3>
                  </div>
                  <div style={S.amountHighlight}>
                    <p style={S.amountLabel}>{"Total Amount Requested"}</p>
                    <p style={S.amountValue}>{"৳ " + stats.totalAmountRequested.toLocaleString()}</p>
                  </div>
                  <div style={S.fundStats}>
                    {[
                      { label: "Pending Review", value: stats.pendingFunds,  color: "#ffaa00", icon: "⏳" },
                      { label: "Approved",       value: stats.approvedFunds, color: "#00ff88", icon: "✅" },
                      { label: "Rejected",       value: stats.rejectedFunds, color: "#ff4444", icon: "❌" },
                    ].map((item, i) => (
                      <div key={i} style={S.fundStatItem}>
                        <div style={{ ...S.fundStatIcon, backgroundColor: item.color + "10" }}>{item.icon}</div>
                        <div style={S.fundStatInfo}>
                          <span style={{ ...S.fundStatValue, color: item.color }}>{item.value}</span>
                          <span style={S.fundStatLabel}>{item.label}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={S.quickActions}>
                    <p style={S.navLabel}>{"QUICK ACTIONS"}</p>
                    <button className="action-btn" style={S.actionBtn} onClick={() => navigate("/admin/reports")}>{"🚨 Manage Reports"}</button>
                    <button className="action-btn" style={{ ...S.actionBtn, ...S.actionBtnSecondary }} onClick={() => navigate("/admin/fund-requests")}>{"💰 Manage Fund Requests"}</button>
                  </div>
                </div>
              </div>

              {/* Bottom Row */}
              <div style={S.bottomRow}>
                <div style={S.recentCard}>
                  <div style={S.cardHeader}>
                    <h3 style={S.cardTitle}>{"🚨 Recent Reports"}</h3>
                    <button style={S.viewAllBtn} onClick={() => navigate("/admin/reports")}>{"View All →"}</button>
                  </div>
                  {recentReports.length === 0 ? (
                    <div style={S.emptySmall}>{"No reports yet"}</div>
                  ) : recentReports.map(report => {
                    const type = typeConfig[report.emergencyType] || {};
                    const statusColors = { Pending: "#ffaa00", Verified: "#00ff88", Resolved: "#6bcbff" };
                    return (
                      <div key={report._id} className="recent-row" style={S.recentRow}>
                        <div style={{ ...S.recentIcon, backgroundColor: (type.color || "#00ff88") + "12" }}>{type.icon}</div>
                        <div style={S.recentInfo}>
                          <p style={S.recentTitle}>{type.label + " — " + (report.userId?.name || "Unknown")}</p>
                          <p style={S.recentDesc}>{report.description?.substring(0, 50) + "..."}</p>
                        </div>
                        <div style={S.recentRight}>
                          <span style={{ ...S.recentStatus, color: statusColors[report.status] }}>{"● " + report.status}</span>
                          <span style={S.recentDate}>{new Date(report.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div style={S.recentCard}>
                  <div style={S.cardHeader}>
                    <h3 style={S.cardTitle}>{"💰 Recent Fund Requests"}</h3>
                    <button style={S.viewAllBtn} onClick={() => navigate("/admin/fund-requests")}>{"View All →"}</button>
                  </div>
                  {recentFunds.length === 0 ? (
                    <div style={S.emptySmall}>{"No fund requests yet"}</div>
                  ) : recentFunds.map(fund => {
                    const statusColors = { Pending: "#ffaa00", Approved: "#00ff88", Rejected: "#ff4444" };
                    return (
                      <div key={fund._id} className="recent-row" style={S.recentRow}>
                        <div style={S.recentIcon}>{"💰"}</div>
                        <div style={S.recentInfo}>
                          <p style={S.recentTitle}>{fund.title}</p>
                          <p style={S.recentDesc}>{fund.userId?.name || "Unknown"}</p>
                        </div>
                        <div style={S.recentRight}>
                          <span style={{ color: "#00ff88", fontSize: "13px", fontWeight: "700" }}>{"৳" + fund.amountNeeded.toLocaleString()}</span>
                          <span style={{ ...S.recentStatus, color: statusColors[fund.status] }}>{"● " + fund.status}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {/* ═══════════════════ ANALYTICS TAB ═══════════════════ */}
          {activeTab === "analytics" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

              {analyticsLoading && (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 40px", gap: 16 }}>
                  <div style={S.spinner} />
                  <p style={{ color: "#00ff88", fontSize: 14 }}>{"Crunching the numbers..."}</p>
                </div>
              )}

              {analyticsError && (
                <div style={{ backgroundColor: "rgba(255,68,68,0.08)", border: "1px solid rgba(255,68,68,0.2)", borderRadius: 12, padding: "20px", textAlign: "center" }}>
                  <p style={{ color: "#ff6b6b", fontSize: 14 }}>{analyticsError}</p>
                  <button
                    onClick={() => { setAnalytics(null); setAnalyticsError(""); }}
                    style={{ marginTop: 12, padding: "8px 20px", background: "rgba(255,68,68,0.1)", border: "1px solid rgba(255,68,68,0.3)", borderRadius: 8, color: "#ff6b6b", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
                    {"Retry"}
                  </button>
                </div>
              )}

              {analytics && !analyticsLoading && (
                <>
                  {/* ── KPI Row ── */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
                    {[
                      { label: "Total Reports",     value: analytics.reportsByType.reduce((s, r) => s + r.count, 0), color: "#ff6b6b", icon: "🚨", sub: analytics.reportStatus.resolved + " resolved" },
                      { label: "Funds Disbursed",   value: "৳" + (analytics.fundTotals.totalApproved || 0).toLocaleString(), color: "#00ff88", icon: "💰", sub: analytics.fundTotals.approved + " approved requests" },
                      { label: "Registered Users",  value: analytics.userTotals.total, color: "#6bcbff", icon: "👥", sub: analytics.userTotals.active + " active" },
                      { label: "Volunteer Points",  value: analytics.volunteerStats.totalPointsAwarded || 0, color: "#ffd93d", icon: "⭐", sub: (analytics.volunteerStats.approved || 0) + " approved participations" },
                    ].map((kpi, i) => (
                      <div key={i} className="analytics-card stat-card" style={{ ...S.statCard, animationDelay: `${i * 0.08}s` }}>
                        <div style={{ ...S.statIconCircle, backgroundColor: kpi.color + "12", border: `1px solid ${kpi.color}25` }}>
                          <span style={S.statIcon}>{kpi.icon}</span>
                        </div>
                        <div style={S.statInfo}>
                          <p style={{ ...S.statValue, color: kpi.color, fontSize: typeof kpi.value === "string" ? 18 : 24 }}>{kpi.value}</p>
                          <p style={S.statLabel}>{kpi.label}</p>
                          <p style={S.statSub}>{kpi.sub}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* ── Row 1: Monthly Reports (Area) + Emergency Type (Horizontal Bar) ── */}
                  <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: 20 }}>

                    {/* Area Chart — monthly reports */}
                    <div className="analytics-card" style={{ ...S.aCard, animationDelay: "0.1s" }}>
                      <div style={S.aCardHeader}>
                        <h3 style={S.aCardTitle}>{"📈 Monthly Report Trend"}</h3>
                        <span style={S.aCardSub}>{"Last 6 months"}</span>
                      </div>
                      <AreaChart
                        data={analytics.reportsByMonth}
                        valueKey="total"
                        labelKey="label"
                        color="#ff6b6b"
                        height={180}
                      />
                      {/* mini legend */}
                      <div style={{ display: "flex", gap: 16, marginTop: 12, flexWrap: "wrap" }}>
                        {[
                          { key: "pending",  color: "#ffaa00", label: "Pending" },
                          { key: "verified", color: "#00ff88", label: "Verified" },
                          { key: "resolved", color: "#6bcbff", label: "Resolved" },
                        ].map(leg => (
                          <div key={leg.key} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <div style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: leg.color }} />
                            <span style={{ color: "#555", fontSize: 11 }}>
                              {leg.label + ": " + analytics.reportsByMonth.reduce((s, m) => s + (m[leg.key] || 0), 0)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Horizontal Bar — emergency by type */}
                    <div className="analytics-card" style={{ ...S.aCard, animationDelay: "0.15s" }}>
                      <div style={S.aCardHeader}>
                        <h3 style={S.aCardTitle}>{"🔥 By Emergency Type"}</h3>
                        <span style={S.aCardSub}>{"All time"}</span>
                      </div>
                      <HorizontalBarChart
                        data={analytics.reportsByType.map(r => ({
                          ...r,
                          label: r.type.charAt(0).toUpperCase() + r.type.slice(1),
                          icon:  typeConfig[r.type]?.icon || "🚨",
                          color: typeConfig[r.type]?.color || "#ff6b6b",
                        }))}
                      />
                    </div>
                  </div>

                  {/* ── Row 2: Fund Area Chart + Report Status Donut ── */}
                  <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: 20 }}>

                    {/* Area Chart — monthly fund amounts */}
                    <div className="analytics-card" style={{ ...S.aCard, animationDelay: "0.2s" }}>
                      <div style={S.aCardHeader}>
                        <h3 style={S.aCardTitle}>{"💰 Fund Amount Trend"}</h3>
                        <span style={S.aCardSub}>{"৳ requested per month"}</span>
                      </div>
                      <AreaChart
                        data={analytics.fundsByMonth}
                        valueKey="amountRequested"
                        labelKey="label"
                        color="#ffd93d"
                        height={180}
                      />
                      <div style={{ display: "flex", gap: 16, marginTop: 12 }}>
                        <div style={{ flex: 1, backgroundColor: "rgba(0,255,136,0.06)", border: "1px solid rgba(0,255,136,0.15)", borderRadius: 10, padding: "10px 14px" }}>
                          <p style={{ color: "#555", fontSize: 10, margin: "0 0 4px" }}>{"TOTAL REQUESTED"}</p>
                          <p style={{ color: "#00ff88", fontSize: 16, fontWeight: 800, margin: 0 }}>{"৳" + analytics.fundTotals.totalRequested.toLocaleString()}</p>
                        </div>
                        <div style={{ flex: 1, backgroundColor: "rgba(0,255,136,0.06)", border: "1px solid rgba(0,255,136,0.15)", borderRadius: 10, padding: "10px 14px" }}>
                          <p style={{ color: "#555", fontSize: 10, margin: "0 0 4px" }}>{"TOTAL APPROVED"}</p>
                          <p style={{ color: "#ffd93d", fontSize: 16, fontWeight: 800, margin: 0 }}>{"৳" + analytics.fundTotals.totalApproved.toLocaleString()}</p>
                        </div>
                      </div>
                    </div>

                    {/* Donut — report status distribution */}
                    <div className="analytics-card" style={{ ...S.aCard, animationDelay: "0.25s" }}>
                      <div style={S.aCardHeader}>
                        <h3 style={S.aCardTitle}>{"🍩 Report Status"}</h3>
                        <span style={S.aCardSub}>{"Distribution"}</span>
                      </div>
                      <DonutChart
                        centerValue={analytics.reportsByType.reduce((s, r) => s + r.count, 0)}
                        centerLabel="Total"
                        segments={[
                          { label: "Pending",  value: analytics.reportStatus.pending,  color: "#ffaa00" },
                          { label: "Verified", value: analytics.reportStatus.verified, color: "#00ff88" },
                          { label: "Resolved", value: analytics.reportStatus.resolved, color: "#6bcbff" },
                        ]}
                      />
                    </div>
                  </div>

                  {/* ── Row 3: Fund Bar Chart + User Growth ── */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>

                    {/* Grouped Bar — fund requests by month */}
                    <div className="analytics-card" style={{ ...S.aCard, animationDelay: "0.3s" }}>
                      <div style={S.aCardHeader}>
                        <h3 style={S.aCardTitle}>{"📊 Fund Requests by Month"}</h3>
                        <span style={S.aCardSub}>{"Approved vs Rejected"}</span>
                      </div>
                      <GroupedBarChart
                        data={analytics.fundsByMonth}
                        keys={["total", "approved", "rejected"]}
                        colors={["#ffd93d", "#00ff88", "#ff6b6b"]}
                        labelKey="label"
                        height={180}
                      />
                    </div>

                    {/* Bar chart — new users per month */}
                    <div className="analytics-card" style={{ ...S.aCard, animationDelay: "0.35s" }}>
                      <div style={S.aCardHeader}>
                        <h3 style={S.aCardTitle}>{"👥 New Users per Month"}</h3>
                        <span style={S.aCardSub}>{"Last 6 months"}</span>
                      </div>
                      <BarChart
                        data={analytics.usersByMonth}
                        valueKey="new"
                        labelKey="label"
                        color="#6bcbff"
                        height={180}
                      />
                      <div style={{ display: "flex", gap: 12, marginTop: 12, flexWrap: "wrap" }}>
                        {[
                          { label: "Total Users",   value: analytics.userTotals.total,       color: "#6bcbff" },
                          { label: "Active",        value: analytics.userTotals.active,       color: "#00ff88" },
                          { label: "Fund Blocked",  value: analytics.userTotals.fundBlocked,  color: "#ff6b6b" },
                          { label: "Warned",        value: analytics.userTotals.warned,       color: "#ffaa00" },
                        ].map((s, i) => (
                          <div key={i} style={{ flex: "1 1 80px", backgroundColor: s.color + "08", border: `1px solid ${s.color}20`, borderRadius: 8, padding: "8px 10px", textAlign: "center" }}>
                            <p style={{ color: s.color, fontSize: 18, fontWeight: 800, margin: 0 }}>{s.value}</p>
                            <p style={{ color: "#444", fontSize: 10, margin: "3px 0 0" }}>{s.label}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* ── Row 4: Volunteer Stats + Timeline ── */}
                  <div style={{ display: "grid", gridTemplateColumns: "0.8fr 1.2fr", gap: 20 }}>

                    {/* Volunteer Stats */}
                    <div className="analytics-card" style={{ ...S.aCard, animationDelay: "0.4s" }}>
                      <div style={S.aCardHeader}>
                        <h3 style={S.aCardTitle}>{"🤝 Volunteer Activity"}</h3>
                        <span style={S.aCardSub}>{"All time"}</span>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        {[
                          { label: "Total Opportunities",  value: analytics.volunteerStats.total || 0,             color: "#00ff88" },
                          { label: "Interested Signups",   value: analytics.volunteerStats.interested || 0,        color: "#6bcbff" },
                          { label: "Approved Participants",value: analytics.volunteerStats.approved || 0,          color: "#ffd93d" },
                          { label: "Total Points Awarded", value: analytics.volunteerStats.totalPointsAwarded || 0, color: "#a29bfe" },
                        ].map((v, i) => (
                          <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", backgroundColor: "#1a1a1a", borderRadius: 10, padding: "12px 16px" }}>
                            <span style={{ color: "#888", fontSize: 13 }}>{v.label}</span>
                            <span style={{ color: v.color, fontSize: 18, fontWeight: 800 }}>{v.value}</span>
                          </div>
                        ))}
                      </div>
                      {/* Top volunteers */}
                      {(analytics.volunteerStats.topVolunteers || []).length > 0 && (
                        <div style={{ marginTop: 16 }}>
                          <p style={{ color: "#333", fontSize: 10, fontWeight: 700, letterSpacing: "0.8px", marginBottom: 10 }}>{"TOP VOLUNTEERS"}</p>
                          {analytics.volunteerStats.topVolunteers.slice(0, 3).map((v, i) => {
                            const medals = ["🥇", "🥈", "🥉"];
                            return (
                              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid #1a1a1a" }}>
                                <span style={{ fontSize: 16 }}>{medals[i]}</span>
                                <div style={{ flex: 1 }}>
                                  <p style={{ color: "#e0e0e0", fontSize: 12, fontWeight: 600, margin: 0 }}>{v.name}</p>
                                  <p style={{ color: "#555", fontSize: 10, margin: "1px 0 0" }}>{"📍 " + (v.area || "N/A")}</p>
                                </div>
                                <span style={{ color: "#ffd93d", fontSize: 14, fontWeight: 800 }}>{v.points + " pts"}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Timeline */}
                    <div className="analytics-card" style={{ ...S.aCard, animationDelay: "0.45s" }}>
                      <div style={S.aCardHeader}>
                        <h3 style={S.aCardTitle}>{"🕐 Recent Activity Timeline"}</h3>
                        <span style={S.aCardSub}>{"Last 15 events"}</span>
                      </div>
                      <div style={{ maxHeight: 400, overflowY: "auto", paddingRight: 4 }}>
                        {analytics.timelineEvents.length === 0 ? (
                          <p style={{ color: "#444", fontSize: 13, textAlign: "center", padding: "40px 0" }}>{"No events yet"}</p>
                        ) : (
                          <Timeline events={analytics.timelineEvents} />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* ── Footer: Generated at ── */}
                  <div style={{ textAlign: "center", padding: "8px 0" }}>
                    <p style={{ color: "#333", fontSize: 11 }}>
                      {"Analytics generated at " + new Date(analytics.generatedAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      <button
                        onClick={() => setAnalytics(null)}
                        style={{ marginLeft: 12, background: "none", border: "none", color: "#00ff88", fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>
                        {"↻ Refresh"}
                      </button>
                    </p>
                  </div>
                </>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
const S = {
  page:         { backgroundColor: "#111111", minHeight: "100vh" },
  loadingScreen:{ backgroundColor: "#111111", minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "16px" },
  spinner:      { width: "40px", height: "40px", border: "3px solid rgba(0,255,136,0.1)", borderTop: "3px solid #00ff88", borderRadius: "50%", animation: "spin 0.8s linear infinite" },
  loadingText:  { color: "#00ff88", fontSize: "14px" },
  layout:       { display: "flex", minHeight: "calc(100vh - 70px)" },
  sidebar:      { width: "240px", minWidth: "240px", backgroundColor: "#0d0d0d", borderRight: "1px solid #1e1e1e", overflowY: "auto" },
  sidebarContent:{ padding: "28px 20px", display: "flex", flexDirection: "column", gap: "24px" },
  adminInfo:    { display: "flex", alignItems: "center", gap: "12px", paddingBottom: "20px", borderBottom: "1px solid #1e1e1e" },
  adminAvatar:  { width: "44px", height: "44px", background: "linear-gradient(135deg,#00ff88,#00cc6a)", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px", fontWeight: "700", color: "#0a0a0a", animation: "glow 3s ease-in-out infinite" },
  adminName:    { color: "#ffffff", fontSize: "14px", fontWeight: "700" },
  adminRole:    { color: "#00ff88", fontSize: "10px", fontWeight: "700", letterSpacing: "1px", marginTop: "2px" },
  quickNav:     { display: "flex", flexDirection: "column", gap: "8px" },
  navLabel:     { color: "#333333", fontSize: "10px", fontWeight: "700", letterSpacing: "1px", marginBottom: "4px" },
  navBtn:       { display: "flex", alignItems: "center", gap: "10px", padding: "10px 12px", borderRadius: "10px", border: "none", backgroundColor: "transparent", color: "#666666", fontSize: "13px", fontWeight: "500", cursor: "pointer", width: "100%", textAlign: "left", transition: "all 0.3s ease", fontFamily: "inherit" },
  navBtnActive: { backgroundColor: "rgba(0,255,136,0.1)", color: "#00ff88", borderLeft: "3px solid #00ff88" },
  systemStatus: { display: "flex", flexDirection: "column", gap: "8px" },
  statusRow:    { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "1px solid #1a1a1a" },
  statusLabel:  { color: "#555555", fontSize: "12px" },
  statusValue:  { fontSize: "11px", fontWeight: "600" },
  summaryBox:   { backgroundColor: "#1a1a1a", border: "1px solid #222222", borderRadius: "12px", padding: "16px", display: "flex", flexDirection: "column", gap: "10px" },
  summaryItem:  { display: "flex", justifyContent: "space-between", alignItems: "center" },
  summaryLabel: { color: "#555555", fontSize: "12px" },
  summaryValue: { color: "#e0e0e0", fontSize: "13px", fontWeight: "700" },
  main:         { flex: 1, padding: "28px", display: "flex", flexDirection: "column", gap: "24px", overflowY: "auto" },
  tabRow:       { display: "flex", gap: 4, borderBottom: "1px solid #1e1e1e", paddingBottom: 0 },
  tabBtn:       { padding: "10px 22px", background: "none", border: "none", color: "#555555", fontSize: "14px", fontWeight: "600", cursor: "pointer", fontFamily: "inherit", borderBottom: "2px solid transparent", marginBottom: -1, transition: "all 0.2s ease" },
  tabBtnActive: { color: "#00ff88", borderBottom: "2px solid #00ff88" },
  welcomeBanner:{ background: "linear-gradient(135deg,#1a1a2e 0%,#16213e 50%,#0f3460 100%)", borderRadius: "16px", padding: "32px", border: "1px solid rgba(0,255,136,0.15)", position: "relative", overflow: "hidden", boxShadow: "0 10px 40px rgba(0,0,0,0.3)" },
  bannerOverlay:{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, background: "radial-gradient(circle at top right,rgba(0,255,136,0.08) 0%,transparent 60%)", pointerEvents: "none" },
  bannerContent:{ display: "flex", justifyContent: "space-between", alignItems: "center", position: "relative", zIndex: 1 },
  welcomeTitle: { color: "#ffffff", fontSize: "26px", fontWeight: "700", marginBottom: "8px" },
  welcomeSubtitle:{ color: "rgba(255,255,255,0.4)", fontSize: "13px" },
  bannerStats:  { display: "flex", alignItems: "center", gap: "24px", backgroundColor: "rgba(0,0,0,0.2)", borderRadius: "12px", padding: "16px 24px", border: "1px solid rgba(255,255,255,0.05)" },
  bannerStat:   { display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" },
  bannerStatValue:{ color: "#00ff88", fontSize: "28px", fontWeight: "700" },
  bannerStatLabel:{ color: "rgba(255,255,255,0.4)", fontSize: "12px" },
  bannerStatDivider:{ width: "1px", height: "40px", backgroundColor: "rgba(255,255,255,0.1)" },
  statsGrid:    { display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "16px" },
  statCard:     { backgroundColor: "#1a1a1a", border: "1px solid #222222", borderRadius: "14px", padding: "20px", display: "flex", alignItems: "center", gap: "16px", boxShadow: "0 4px 20px rgba(0,0,0,0.2)" },
  statIconCircle:{ width: "48px", height: "48px", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  statIcon:     { fontSize: "22px" },
  statInfo:     { display: "flex", flexDirection: "column", gap: "2px" },
  statValue:    { fontSize: "24px", fontWeight: "700" },
  statLabel:    { color: "#888888", fontSize: "12px", fontWeight: "500" },
  statSub:      { color: "#444444", fontSize: "11px" },
  middleRow:    { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" },
  breakdownCard:{ backgroundColor: "#1a1a1a", border: "1px solid #222222", borderRadius: "16px", padding: "24px", display: "flex", flexDirection: "column", gap: "16px" },
  cardHeader:   { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" },
  cardTitle:    { color: "#ffffff", fontSize: "15px", fontWeight: "700" },
  cardSubtitle: { color: "#444444", fontSize: "12px" },
  typeBarItem:  { display: "flex", flexDirection: "column", gap: "6px", padding: "6px 0", borderRadius: "8px" },
  typeBarTop:   { display: "flex", justifyContent: "space-between", alignItems: "center" },
  typeBarLabel: { color: "#aaaaaa", fontSize: "13px" },
  typeBarCount: { fontSize: "13px", fontWeight: "700" },
  typeBarBg:    { height: "6px", backgroundColor: "#222222", borderRadius: "3px", overflow: "hidden" },
  typeBarFill:  { height: "100%", borderRadius: "3px", transition: "width 0.8s ease" },
  fundOverviewCard:{ backgroundColor: "#1a1a1a", border: "1px solid #222222", borderRadius: "16px", padding: "24px", display: "flex", flexDirection: "column", gap: "20px" },
  amountHighlight:{ backgroundColor: "rgba(0,255,136,0.06)", border: "1px solid rgba(0,255,136,0.15)", borderRadius: "12px", padding: "16px" },
  amountLabel:  { color: "#555555", fontSize: "12px", marginBottom: "6px" },
  amountValue:  { color: "#00ff88", fontSize: "26px", fontWeight: "700" },
  fundStats:    { display: "flex", flexDirection: "column", gap: "10px" },
  fundStatItem: { display: "flex", alignItems: "center", gap: "12px", padding: "10px 12px", backgroundColor: "#222222", borderRadius: "10px" },
  fundStatIcon: { width: "32px", height: "32px", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px" },
  fundStatInfo: { display: "flex", flexDirection: "column", gap: "2px" },
  fundStatValue:{ fontSize: "16px", fontWeight: "700" },
  fundStatLabel:{ color: "#555555", fontSize: "11px" },
  quickActions: { display: "flex", flexDirection: "column", gap: "10px" },
  actionBtn:    { backgroundColor: "#00ff88", color: "#0a0a0a", border: "none", padding: "12px", borderRadius: "10px", fontSize: "13px", fontWeight: "700", cursor: "pointer", width: "100%", fontFamily: "inherit" },
  actionBtnSecondary:{ backgroundColor: "transparent", border: "1px solid #00ff88", color: "#00ff88" },
  bottomRow:    { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" },
  recentCard:   { backgroundColor: "#1a1a1a", border: "1px solid #222222", borderRadius: "16px", padding: "24px", display: "flex", flexDirection: "column", gap: "4px" },
  viewAllBtn:   { backgroundColor: "transparent", border: "none", color: "#00ff88", fontSize: "12px", cursor: "pointer", fontFamily: "inherit" },
  recentRow:    { display: "flex", alignItems: "center", gap: "12px", padding: "12px 8px", borderRadius: "10px", borderBottom: "1px solid #1e1e1e", cursor: "default" },
  recentIcon:   { width: "36px", height: "36px", backgroundColor: "rgba(0,255,136,0.08)", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", flexShrink: 0 },
  recentInfo:   { flex: 1, minWidth: 0 },
  recentTitle:  { color: "#e0e0e0", fontSize: "13px", fontWeight: "600", marginBottom: "2px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  recentDesc:   { color: "#555555", fontSize: "11px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  recentRight:  { display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px", flexShrink: 0 },
  recentStatus: { fontSize: "11px", fontWeight: "600" },
  recentDate:   { color: "#444444", fontSize: "11px" },
  emptySmall:   { color: "#444444", fontSize: "13px", textAlign: "center", padding: "24px" },
  // Analytics card styles
  aCard:        { backgroundColor: "#1a1a1a", border: "1px solid #222222", borderRadius: "16px", padding: "24px", display: "flex", flexDirection: "column", gap: "16px" },
  aCardHeader:  { display: "flex", justifyContent: "space-between", alignItems: "center" },
  aCardTitle:   { color: "#ffffff", fontSize: "14px", fontWeight: "700", margin: 0 },
  aCardSub:     { color: "#444444", fontSize: "11px" },
};

export default AdminDashboard;