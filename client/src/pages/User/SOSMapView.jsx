import React, { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Circle, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { 
  getActiveSOSEvents, 
  getSOSEventById,
  deleteSOSEvent,
  patchSOSEvent,
  resolveSOSEvent 
} from "../../services/sosService";

// ── Fix leaflet icon ─────────────────────────────────────────────────────────
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const EMERGENCY_TYPES = [
  { value: "fire",       label: "Fire",       icon: "🔥", color: "#ff4500" },
  { value: "robbery",    label: "Robbery",    icon: "🔫", color: "#8b0000" },
  { value: "accident",   label: "Accident",   icon: "💥", color: "#ff8c00" },
  { value: "harassment", label: "Harassment", icon: "⚠️", color: "#ffd700" },
  { value: "medical",    label: "Medical",    icon: "🏥", color: "#00bfff" },
  { value: "flood",      label: "Flood",      icon: "🌊", color: "#1e90ff" },
  { value: "other",      label: "Other",      icon: "🚨", color: "#ff0066" },
];

const getTypeConfig = (type) =>
  EMERGENCY_TYPES.find((e) => e.value === type) || EMERGENCY_TYPES[6];

// ── Custom animated SOS marker ───────────────────────────────────────────────
const createLiveSOSIcon = (type, isSelected = false, isOwn = false) => {
  const et = getTypeConfig(type);
  const size = isSelected ? 72 : 60;
  const innerSize = isSelected ? 36 : 30;
  const ownBorder = isOwn ? "3px solid #00ff88" : "";
  const ownShadow = isOwn ? "0 0 20px #00ff88" : "";
  
  return L.divIcon({
    className: "",
    html: `
      <div style="
        position:relative;
        display:flex; align-items:center; justify-content:center;
        width:${size}px; height:${size}px;
      ">
        <!-- Wave rings -->
        <div style="
          position:absolute; border-radius:50%;
          width:${size}px; height:${size}px;
          border:2px solid ${et.color};
          animation:liveWave1 2s ease-out infinite;
          opacity:0.8;
        "></div>
        <div style="
          position:absolute; border-radius:50%;
          width:${size * 0.75}px; height:${size * 0.75}px;
          border:2px solid ${et.color};
          animation:liveWave2 2s ease-out infinite 0.5s;
          opacity:0.6;
        "></div>
        <div style="
          position:absolute; border-radius:50%;
          width:${size * 0.5}px; height:${size * 0.5}px;
          border:2px solid ${et.color};
          animation:liveWave3 2s ease-out infinite 1s;
          opacity:0.4;
        "></div>
        <!-- Core -->
        <div style="
          position:relative;
          width:${innerSize}px; height:${innerSize}px;
          border-radius:50%;
          background: radial-gradient(circle, ${et.color}cc, ${et.color}88);
          border: ${ownBorder || "2.5px solid " + et.color};
          display:flex; align-items:center; justify-content:center;
          font-size:${isSelected ? 18 : 15}px;
          box-shadow: 0 0 ${isSelected ? 20 : 14}px ${et.color}99 ${ownShadow ? ',' + ownShadow : ''};
          z-index:10;
          ${isSelected ? `animation: selectedPulse 1s ease-in-out infinite;` : ""}
        ">${et.icon}</div>
        ${isOwn ? `
          <div style="
            position:absolute;
            bottom:-8px; right:-8px;
            width:20px; height:20px;
            border-radius:50%;
            background:#00ff88;
            border:2px solid #0a0a0a;
            display:flex;
            align-items:center;
            justify-content:center;
            font-size:10px;
            z-index:15;
          ">👤</div>
        ` : ""}
        ${isSelected ? `
          <div style="
            position:absolute;
            width:${size + 10}px; height:${size + 10}px;
            border-radius:50%;
            border:2px solid ${et.color};
            box-shadow:0 0 12px ${et.color}66;
          "></div>
        ` : ""}
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
};

// ── User location marker ─────────────────────────────────────────────────────
const userIcon = L.divIcon({
  className: "",
  html: `
    <div style="position:relative;width:20px;height:20px;display:flex;align-items:center;justify-content:center;">
      <div style="position:absolute;width:20px;height:20px;border-radius:50%;border:2px solid #00ff88;animation:userPing 2s ease-out infinite;"></div>
      <div style="width:10px;height:10px;border-radius:50%;background:#00ff88;box-shadow:0 0 8px #00ff88;"></div>
    </div>
  `,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

// ── Auto-fit map to show all events ─────────────────────────────────────────
function MapFitter({ events, focusEvent, userLocation }) {
  const map = useMap();
  const fitted = useRef(false);

  useEffect(() => {
    if (focusEvent) {
      const [lng, lat] = focusEvent.location.coordinates;
      map.flyTo([lat, lng], 15, { duration: 1.5 });
      fitted.current = true;
      return;
    }
    if (!fitted.current && events.length > 0) {
      const pts = events.map((e) => [e.location.coordinates[1], e.location.coordinates[0]]);
      if (userLocation) pts.push([userLocation.lat, userLocation.lng]);
      if (pts.length === 1) {
        map.flyTo(pts[0], 14);
      } else {
        map.fitBounds(L.latLngBounds(pts), { padding: [60, 60] });
      }
      fitted.current = true;
    }
  }, [events, focusEvent, userLocation, map]);

  return null;
}

// ── Inject styles ────────────────────────────────────────────────────────────
const injectStyles = () => {
  if (document.getElementById("sos-mapview-styles")) return;
  const s = document.createElement("style");
  s.id = "sos-mapview-styles";
  s.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;600;700&family=Share+Tech+Mono&display=swap');

    @keyframes liveWave1 {
      0%   { transform:scale(1);   opacity:0.8; }
      100% { transform:scale(2.2); opacity:0; }
    }
    @keyframes liveWave2 {
      0%   { transform:scale(1);   opacity:0.6; }
      100% { transform:scale(2.5); opacity:0; }
    }
    @keyframes liveWave3 {
      0%   { transform:scale(1);   opacity:0.4; }
      100% { transform:scale(3.0); opacity:0; }
    }
    @keyframes selectedPulse {
      0%,100% { box-shadow:0 0 20px currentColor,0 0 40px currentColor; }
      50%     { box-shadow:0 0 8px currentColor,0 0 16px currentColor; }
    }
    @keyframes userPing {
      0%   { transform:scale(1); opacity:1; }
      100% { transform:scale(2.5); opacity:0; }
    }
    @keyframes slideInLeft {
      from { transform:translateX(-100%); opacity:0; }
      to   { transform:translateX(0);     opacity:1; }
    }
    @keyframes slideInRight {
      from { transform:translateX(100%); opacity:0; }
      to   { transform:translateX(0);    opacity:1; }
    }
    @keyframes fadeIn {
      from { opacity:0; transform:translateY(8px); }
      to   { opacity:1; transform:translateY(0); }
    }
    @keyframes liveBlink {
      0%,100% { opacity:1; }
      50%     { opacity:0.3; }
    }
    @keyframes successPop {
      0% { opacity:0; transform:scale(0.95) translateY(10px); }
      60% { transform:scale(1.02) translateY(-2px); }
      100% { opacity:1; transform:scale(1) translateY(0); }
    }

    .sos-mapview { font-family:'Rajdhani',sans-serif; }
    .sos-mono   { font-family:'Share Tech Mono',monospace; }

    .event-card {
      cursor:pointer;
      transition:all 0.2s ease;
      border-left:3px solid transparent;
    }
    .event-card:hover { background:#1e1e1e !important; }
    .event-card.active { background:#1a1a1a !important; }

    .sidebar-scroll::-webkit-scrollbar { width:4px; }
    .sidebar-scroll::-webkit-scrollbar-track { background:#111; }
    .sidebar-scroll::-webkit-scrollbar-thumb { background:#333; border-radius:2px; }

    .detail-panel { animation:slideInRight 0.3s ease; }
    .time-ago { font-size:11px; }
    
    .edit-modal {
      position:fixed; top:0; left:0; right:0; bottom:0;
      background:rgba(0,0,0,0.9); backdrop-filter:blur(8px);
      display:flex; align-items:center; justify-content:center;
      z-index:10000; animation:fadeIn 0.2s ease;
    }
    .edit-modal-content {
      background:#141414; border-radius:16px; padding:28px;
      width:500px; max-width:90%; border:1px solid #333;
    }
  `;
  document.head.appendChild(s);
};

// ── Time ago helper ──────────────────────────────────────────────────────────
const timeAgo = (date) => {
  const diff = (Date.now() - new Date(date)) / 1000;
  if (diff < 60) return `${Math.floor(diff)}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
};

// ════════════════════════════════════════════════════════════════════════════
// Main Component
// ════════════════════════════════════════════════════════════════════════════
const SOSMapView = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const focusId = searchParams.get("id");
  
  const [currentUserId, setCurrentUserId] = useState(null);
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const pollRef = useRef(null);
  
  // CRUD state
  const [editingEvent, setEditingEvent] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [actionMessage, setActionMessage] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Get current user ID from token
  useEffect(() => {
    try {
      const token = localStorage.getItem("token");
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setCurrentUserId(payload.id);
      }
    } catch (e) {
      console.error("Failed to parse token", e);
    }
  }, []);

  useEffect(() => {
    injectStyles();
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {}
    );
  }, []);

  // ── Fetch active events (polls every 15s) ────────────────────────────────
  const fetchEvents = useCallback(async () => {
    try {
      const res = await getActiveSOSEvents();
      setEvents(res.data);

      if (focusId && !selectedEvent) {
        const found = res.data.find((e) => e._id === focusId);
        if (found) setSelectedEvent(found);
      }
    } catch (err) {
      console.error("Failed to fetch SOS events:", err);
    } finally {
      setLoading(false);
    }
  }, [focusId, selectedEvent]);

  useEffect(() => {
    fetchEvents();
    pollRef.current = setInterval(fetchEvents, 15000);
    return () => clearInterval(pollRef.current);
  }, [fetchEvents]);

  // ── CRUD Handlers ─────────────────────────────────────────────────────────
  const handleEditClick = (event) => {
    setEditingEvent(event);
    setEditForm({
      title: event.title,
      description: event.description,
      emergencyType: event.emergencyType,
    });
  };

  const handleUpdateEvent = async () => {
    setActionLoading(true);
    try {
      await patchSOSEvent(editingEvent._id, editForm);
      await fetchEvents();
      setEditingEvent(null);
      setEditForm({});
      setActionMessage({ type: "success", text: "✅ SOS event updated successfully!" });
      setTimeout(() => setActionMessage(null), 3000);
      
      // Update selected event if it was the one being edited
      if (selectedEvent && selectedEvent._id === editingEvent._id) {
        setSelectedEvent({ ...selectedEvent, ...editForm });
      }
    } catch (error) {
      console.error("Update error:", error);
      setActionMessage({ type: "error", text: "❌ Failed to update SOS event" });
      setTimeout(() => setActionMessage(null), 3000);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteEvent = async (eventId) => {
    setActionLoading(true);
    try {
      await deleteSOSEvent(eventId);
      await fetchEvents();
      setShowDeleteConfirm(null);
      if (selectedEvent && selectedEvent._id === eventId) {
        setSelectedEvent(null);
      }
      setActionMessage({ type: "success", text: "🗑️ SOS event deleted successfully!" });
      setTimeout(() => setActionMessage(null), 3000);
    } catch (error) {
      console.error("Delete error:", error);
      setActionMessage({ type: "error", text: "❌ Failed to delete SOS event" });
      setTimeout(() => setActionMessage(null), 3000);
    } finally {
      setActionLoading(false);
    }
  };

  const handleResolveEvent = async (eventId, title) => {
    setActionLoading(true);
    try {
      await resolveSOSEvent(eventId);
      await fetchEvents();
      if (selectedEvent && selectedEvent._id === eventId) {
        setSelectedEvent(null);
      }
      setActionMessage({ type: "success", text: `✅ "${title}" has been marked as resolved!` });
      setTimeout(() => setActionMessage(null), 3000);
    } catch (error) {
      console.error("Resolve error:", error);
      setActionMessage({ type: "error", text: "❌ Failed to resolve SOS event" });
      setTimeout(() => setActionMessage(null), 3000);
    } finally {
      setActionLoading(false);
    }
  };

  const filteredEvents = filter === "all"
    ? events
    : events.filter((e) => e.emergencyType === filter);

  const focusEvent = selectedEvent
    ? events.find((e) => e._id === selectedEvent._id)
    : null;

  const defaultCenter = userLocation
    ? [userLocation.lat, userLocation.lng]
    : events.length > 0
      ? [events[0].location.coordinates[1], events[0].location.coordinates[0]]
      : [23.8103, 90.4125];

  const isOwnEvent = (event) => {
    return currentUserId && event.sender && event.sender._id === currentUserId;
  };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="sos-mapview" style={{ height: "100vh", background: "#0a0a0a", display: "flex", flexDirection: "column" }}>
      {/* Top bar */}
      <div style={{
        padding: "12px 20px", background: "#111",
        borderBottom: "1px solid #1e1e1e",
        display: "flex", alignItems: "center", gap: 16, flexShrink: 0,
        zIndex: 100,
      }}>
        <button
          onClick={() => setSidebarOpen((o) => !o)}
          style={{ background: "none", border: "1px solid #333", color: "#888", padding: "6px 12px", borderRadius: 6, cursor: "pointer" }}
        >
          ☰
        </button>
        <button
          onClick={() => navigate(-1)}
          style={{
            background: "none", border: "1px solid #2a2a2a", color: "#666",
            padding: "6px 16px", borderRadius: 6, cursor: "pointer",
            fontSize: 13, fontFamily: "Rajdhani,sans-serif",
            display: "flex", alignItems: "center", gap: 6,
            transition: "all 0.2s",
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = "#00ff88"; e.currentTarget.style.color = "#00ff88"; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = "#2a2a2a"; e.currentTarget.style.color = "#666"; }}
        >
          ← Back
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#ff3333", animation: "liveBlink 1s ease-in-out infinite" }} />
          <span style={{ fontWeight: 700, fontSize: 16, letterSpacing: 2, color: "#e0e0e0" }}>LIVE SOS MAP</span>
          <span className="sos-mono" style={{ fontSize: 12, color: "#555", marginLeft: 4 }}>
            {events.length} ACTIVE EVENT{events.length !== 1 ? "S" : ""}
          </span>
        </div>

        {/* Action Message */}
        {actionMessage && (
          <div style={{
            marginLeft: "auto",
            background: actionMessage.type === "success" ? "#00ff8822" : "#ff000022",
            border: `1px solid ${actionMessage.type === "success" ? "#00ff88" : "#ff0000"}`,
            borderRadius: 8, padding: "6px 16px",
            animation: "successPop 0.3s ease"
          }}>
            <span style={{ color: actionMessage.type === "success" ? "#00ff88" : "#ff6666", fontSize: 13 }}>
              {actionMessage.text}
            </span>
          </div>
        )}

        {/* Type filters */}
        <div style={{ display: "flex", gap: 6, marginLeft: "auto", overflowX: "auto" }}>
          <button
            onClick={() => setFilter("all")}
            style={{
              padding: "5px 12px", borderRadius: 20, fontSize: 12, cursor: "pointer",
              background: filter === "all" ? "#00ff8822" : "#1a1a1a",
              border: `1px solid ${filter === "all" ? "#00ff88" : "#333"}`,
              color: filter === "all" ? "#00ff88" : "#666",
              fontFamily: "Rajdhani,sans-serif", fontWeight: 600, whiteSpace: "nowrap",
            }}
          >
            ALL
          </button>
          {EMERGENCY_TYPES.map((et) => (
            <button
              key={et.value}
              onClick={() => setFilter(et.value)}
              style={{
                padding: "5px 12px", borderRadius: 20, fontSize: 12, cursor: "pointer",
                background: filter === et.value ? `${et.color}22` : "#1a1a1a",
                border: `1px solid ${filter === et.value ? et.color : "#333"}`,
                color: filter === et.value ? et.color : "#666",
                fontFamily: "Rajdhani,sans-serif", fontWeight: 600, whiteSpace: "nowrap",
              }}
            >
              {et.icon} {et.label}
            </button>
          ))}
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Sidebar */}
        {sidebarOpen && (
          <div style={{
            width: 320, background: "#111", borderRight: "1px solid #1e1e1e",
            display: "flex", flexDirection: "column", flexShrink: 0,
            animation: "slideInLeft 0.3s ease",
          }}>
            <div style={{ padding: "14px 16px", borderBottom: "1px solid #1e1e1e" }}>
              <span style={{ fontSize: 12, letterSpacing: 2, color: "#555", fontWeight: 600 }}>
                {filteredEvents.length} EVENT{filteredEvents.length !== 1 ? "S" : ""}
              </span>
            </div>

            <div className="sidebar-scroll" style={{ overflowY: "auto", flex: 1 }}>
              {loading ? (
                <div style={{ padding: 24, color: "#555", textAlign: "center", fontSize: 14 }}>Loading events...</div>
              ) : filteredEvents.length === 0 ? (
                <div style={{ padding: 24, color: "#555", textAlign: "center" }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
                  <div style={{ fontSize: 14 }}>No active SOS events</div>
                </div>
              ) : (
                filteredEvents.map((event) => {
                  const et = getTypeConfig(event.emergencyType);
                  const isActive = selectedEvent?._id === event._id;
                  const isOwn = isOwnEvent(event);
                  
                  return (
                    <div
                      key={event._id}
                      className={`event-card ${isActive ? "active" : ""}`}
                      onClick={() => setSelectedEvent(isActive ? null : event)}
                      style={{
                        padding: "14px 16px",
                        borderBottom: "1px solid #1a1a1a",
                        background: isActive ? "#1a1a1a" : "transparent",
                        borderLeft: `3px solid ${isActive ? et.color : "transparent"}`,
                        position: "relative",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                        <div style={{
                          width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
                          background: `${et.color}22`, border: `1.5px solid ${et.color}55`,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 16, position: "relative",
                        }}>
                          {et.icon}
                          {isOwn && (
                            <div style={{
                              position: "absolute", bottom: -4, right: -4,
                              width: 14, height: 14, borderRadius: "50%",
                              background: "#00ff88", border: "1px solid #111",
                              fontSize: 8, display: "flex", alignItems: "center", justifyContent: "center",
                            }}>✓</div>
                          )}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: 14, color: "#e0e0e0", marginBottom: 3 }}>
                            {event.title}
                            {isOwn && <span style={{ fontSize: 10, color: "#00ff88", marginLeft: 8 }}>(Yours)</span>}
                          </div>
                          <div style={{ fontSize: 12, color: "#666", marginBottom: 6, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {event.description}
                          </div>
                          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                            <span style={{ fontSize: 11, color: et.color, fontWeight: 600, letterSpacing: 0.5 }}>
                              {et.label.toUpperCase()}
                            </span>
                            <span style={{ fontSize: 11, color: "#444" }}>·</span>
                            <span className="sos-mono time-ago" style={{ color: "#444" }}>
                              {timeAgo(event.createdAt)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Map */}
        <div style={{ flex: 1, position: "relative" }}>
          <MapContainer
            center={defaultCenter}
            zoom={13}
            style={{ height: "100%", width: "100%" }}
          >
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              attribution="© CartoDB"
            />

            <MapFitter events={events} focusEvent={focusEvent} userLocation={userLocation} />

            {userLocation && (
              <Marker position={[userLocation.lat, userLocation.lng]} icon={userIcon} />
            )}

            {filteredEvents.map((event) => {
              const [lng, lat] = event.location.coordinates;
              const et = getTypeConfig(event.emergencyType);
              const isSelected = selectedEvent?._id === event._id;
              const isOwn = isOwnEvent(event);

              return (
                <React.Fragment key={event._id}>
                  <Circle
                    center={[lat, lng]}
                    radius={event.radius * 1000}
                    pathOptions={{
                      color: et.color,
                      fillOpacity: isSelected ? 0.1 : 0.04,
                      weight: isSelected ? 2 : 1,
                      dashArray: isSelected ? undefined : "5 5",
                    }}
                  />

                  <Marker
                    position={[lat, lng]}
                    icon={createLiveSOSIcon(event.emergencyType, isSelected, isOwn)}
                    eventHandlers={{ click: () => setSelectedEvent(isSelected ? null : event) }}
                  >
                    <Popup
                      closeButton={false}
                      className="sos-popup"
                      maxWidth={320}
                    >
                      <div style={{
                        background: "#141414",
                        border: `1px solid ${et.color}44`,
                        borderRadius: 10, padding: "14px 16px",
                        fontFamily: "Rajdhani,sans-serif",
                        color: "#e0e0e0",
                        minWidth: 260,
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                          <span style={{ fontSize: 22 }}>{et.icon}</span>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 14, color: et.color, letterSpacing: 0.5 }}>
                              {event.emergencyType.toUpperCase()}
                            </div>
                            <div style={{ fontSize: 13, color: "#e0e0e0" }}>{event.title}</div>
                          </div>
                          {isOwn && (
                            <div style={{
                              marginLeft: "auto",
                              background: "#00ff8822",
                              border: "1px solid #00ff88",
                              borderRadius: 12,
                              padding: "2px 8px",
                              fontSize: 10,
                              color: "#00ff88"
                            }}>
                              Your Event
                            </div>
                          )}
                        </div>
                        <p style={{ margin: "0 0 10px", fontSize: 13, color: "#aaa", lineHeight: 1.5 }}>
                          {event.description}
                        </p>
                        {event.location?.address && (
                          <div style={{ fontSize: 11, color: "#555", marginBottom: 8, fontFamily: "Share Tech Mono,monospace" }}>
                            📍 {event.location.address.slice(0, 80)}{event.location.address.length > 80 ? "..." : ""}
                          </div>
                        )}
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#444", fontFamily: "Share Tech Mono,monospace", marginBottom: 12 }}>
                          <span>RADIUS: {event.radius}km</span>
                          <span>{timeAgo(event.createdAt)}</span>
                        </div>
                        
                        {/* CRUD Actions for Own Events */}
                        {isOwn && (
                          <div style={{ 
                            display: "flex", gap: 8, marginTop: 12, paddingTop: 12,
                            borderTop: "1px solid #222"
                          }}>
                            <button
                              onClick={() => handleEditClick(event)}
                              style={{
                                flex: 1, padding: "6px 12px", borderRadius: 6,
                                background: "transparent", border: "1px solid #00ff88",
                                color: "#00ff88", fontSize: 12, cursor: "pointer",
                                fontFamily: "inherit", fontWeight: 600,
                                transition: "all 0.2s"
                              }}
                              onMouseEnter={e => { e.target.style.background = "#00ff8822"; }}
                              onMouseLeave={e => { e.target.style.background = "transparent"; }}
                            >
                              ✏️ Edit
                            </button>
                            <button
                              onClick={() => handleResolveEvent(event._id, event.title)}
                              style={{
                                flex: 1, padding: "6px 12px", borderRadius: 6,
                                background: "transparent", border: "1px solid #ffd93d",
                                color: "#ffd93d", fontSize: 12, cursor: "pointer",
                                fontFamily: "inherit", fontWeight: 600,
                                transition: "all 0.2s"
                              }}
                              onMouseEnter={e => { e.target.style.background = "#ffd93d22"; }}
                              onMouseLeave={e => { e.target.style.background = "transparent"; }}
                            >
                              ✓ Resolve
                            </button>
                            <button
                              onClick={() => setShowDeleteConfirm(event._id)}
                              style={{
                                flex: 1, padding: "6px 12px", borderRadius: 6,
                                background: "transparent", border: "1px solid #ff4444",
                                color: "#ff6666", fontSize: 12, cursor: "pointer",
                                fontFamily: "inherit", fontWeight: 600,
                                transition: "all 0.2s"
                              }}
                              onMouseEnter={e => { e.target.style.background = "#ff444422"; }}
                              onMouseLeave={e => { e.target.style.background = "transparent"; }}
                            >
                              🗑️ Delete
                            </button>
                          </div>
                        )}
                        
                        {event.sender?.name && !isOwn && (
                          <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid #222", fontSize: 11, color: "#555" }}>
                            Reported by: <span style={{ color: "#888" }}>{event.sender.name}</span>
                          </div>
                        )}
                      </div>
                    </Popup>
                  </Marker>
                </React.Fragment>
              );
            })}
          </MapContainer>

          {/* No events overlay */}
          {!loading && events.length === 0 && (
            <div style={{
              position: "absolute", top: "50%", left: "50%",
              transform: "translate(-50%,-50%)", zIndex: 1000,
              background: "#111111cc", backdropFilter: "blur(10px)",
              border: "1px solid #00ff8822", borderRadius: 16,
              padding: "32px 40px", textAlign: "center",
            }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
              <div style={{ fontWeight: 700, fontSize: 18, color: "#00ff88", marginBottom: 6 }}>ALL CLEAR</div>
              <div style={{ fontSize: 13, color: "#555" }}>No active SOS events in your area</div>
            </div>
          )}

          {/* Legend */}
          <div style={{
            position: "absolute", bottom: 20, right: 20, zIndex: 1000,
            background: "#111111ee", backdropFilter: "blur(8px)",
            border: "1px solid #1e1e1e", borderRadius: 10,
            padding: "12px 14px", minWidth: 140,
          }}>
            <div style={{ fontSize: 10, letterSpacing: 2, color: "#555", marginBottom: 10, fontFamily: "Share Tech Mono,monospace" }}>LEGEND</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#00ff88" }} />
              <span style={{ fontSize: 12, color: "#888" }}>Your location</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#ff3333", animation: "liveBlink 1s ease-in-out infinite" }} />
              <span style={{ fontSize: 12, color: "#888" }}>Active SOS</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#00ff88", border: "2px solid #00ff88" }} />
              <span style={{ fontSize: 12, color: "#888" }}>Your SOS event</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, border: "1px dashed #555" }} />
              <span style={{ fontSize: 12, color: "#888" }}>Alert radius</span>
            </div>
          </div>

          {/* Live auto-refresh indicator */}
          <div style={{
            position: "absolute", top: 16, left: sidebarOpen ? 16 : 16, zIndex: 1000,
            background: "#111111cc", border: "1px solid #00ff8822",
            borderRadius: 20, padding: "5px 12px",
            display: "flex", alignItems: "center", gap: 6,
          }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#00ff88", animation: "liveBlink 2s ease-in-out infinite" }} />
            <span className="sos-mono" style={{ fontSize: 10, color: "#00ff88", letterSpacing: 1 }}>AUTO-REFRESH 15s</span>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {editingEvent && (
        <div className="edit-modal" onClick={() => setEditingEvent(null)}>
          <div className="edit-modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ color: "#fff", marginBottom: 20, fontSize: 20 }}>✏️ Edit SOS Event</h3>
            
            <div style={{ marginBottom: 16 }}>
              <label style={{ color: "#888", fontSize: 12, display: "block", marginBottom: 6 }}>Emergency Type</label>
              <select
                value={editForm.emergencyType}
                onChange={(e) => setEditForm({ ...editForm, emergencyType: e.target.value })}
                style={{ width: "100%", background: "#1a1a1a", border: "1px solid #333", color: "#e0e0e0", padding: "10px", borderRadius: 6 }}
              >
                {EMERGENCY_TYPES.map(type => (
                  <option key={type.value} value={type.value}>{type.icon} {type.label}</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ color: "#888", fontSize: 12, display: "block", marginBottom: 6 }}>Title</label>
              <input
                value={editForm.title}
                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                style={{ width: "100%", background: "#1a1a1a", border: "1px solid #333", color: "#e0e0e0", padding: "10px", borderRadius: 6 }}
              />
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ color: "#888", fontSize: 12, display: "block", marginBottom: 6 }}>Description</label>
              <textarea
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                rows={4}
                style={{ width: "100%", background: "#1a1a1a", border: "1px solid #333", color: "#e0e0e0", padding: "10px", borderRadius: 6 }}
              />
            </div>

            <div style={{ display: "flex", gap: 12 }}>
              <button
                onClick={handleUpdateEvent}
                disabled={actionLoading}
                style={{
                  flex: 1, background: "#00ff8822", border: "1px solid #00ff88",
                  color: "#00ff88", padding: "12px", borderRadius: 6,
                  cursor: actionLoading ? "not-allowed" : "pointer", opacity: actionLoading ? 0.6 : 1,
                  fontWeight: 600
                }}
              >
                {actionLoading ? "Saving..." : "💾 Save Changes"}
              </button>
              <button
                onClick={() => setEditingEvent(null)}
                style={{
                  flex: 1, background: "#1a1a1a", border: "1px solid #333",
                  color: "#888", padding: "12px", borderRadius: 6, cursor: "pointer"
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="edit-modal" onClick={() => setShowDeleteConfirm(null)}>
          <div className="edit-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 400, textAlign: "center" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
            <h3 style={{ color: "#ff6666", marginBottom: 12 }}>Delete SOS Event?</h3>
            <p style={{ color: "#888", marginBottom: 24 }}>This action cannot be undone. The event will be permanently removed.</p>
            <div style={{ display: "flex", gap: 12 }}>
              <button
                onClick={() => handleDeleteEvent(showDeleteConfirm)}
                disabled={actionLoading}
                style={{
                  flex: 1, background: "#ff000022", border: "1px solid #ff0000",
                  color: "#ff6666", padding: "12px", borderRadius: 6,
                  cursor: actionLoading ? "not-allowed" : "pointer", fontWeight: 600
                }}
              >
                {actionLoading ? "Deleting..." : "🗑️ Yes, Delete"}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(null)}
                style={{
                  flex: 1, background: "#1a1a1a", border: "1px solid #333",
                  color: "#888", padding: "12px", borderRadius: 6, cursor: "pointer"
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SOSMapView;