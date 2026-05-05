import axios from "axios";

const API = axios.create({ baseURL: "http://localhost:3001/api" });

API.interceptors.request.use((req) => {
  const token = localStorage.getItem("token");
  if (token) req.headers.Authorization = `Bearer ${token}`;
  return req;
});

// ── EXISTING FUNCTIONS (unchanged) ─────────────────────────────────────────
export const triggerSOS = (sosData) => API.post("/sos/trigger", sosData);
export const getActiveSOSEvents = () => API.get("/sos/active");
export const getSOSEventById = (id) => API.get(`/sos/${id}`);
export const resolveSOSEvent = (id) => API.patch(`/sos/${id}/resolve`);
export const getNearbySOS = (latitude, longitude, maxDistance = 20000) =>
  API.get(`/sos/nearby/me?latitude=${latitude}&longitude=${longitude}&maxDistance=${maxDistance}`);

// ── NEW CRUD FUNCTIONS (for SOS management) ─────────────────────────────────

// Get all SOS events (admin only) - with optional filters
export const getAllSOSEventsAdmin = (filters = {}) => {
  const queryParams = new URLSearchParams(filters).toString();
  return API.get(`/sos/all${queryParams ? `?${queryParams}` : ""}`);
};

// Get current user's own SOS events
export const getMySOSEvents = () => API.get("/sos/user/my-events");

// Full update of SOS event (PUT)
export const updateSOSEvent = (id, eventData) => 
  API.put(`/sos/${id}`, eventData);

// Partial update of SOS event (PATCH) - for quick edits
export const patchSOSEvent = (id, updates) => 
  API.patch(`/sos/${id}`, updates);

// Delete SOS event
export const deleteSOSEvent = (id) => 
  API.delete(`/sos/${id}`);

// Reactivate a resolved SOS event (admin only)
export const reactivateSOSEvent = (id) => 
  API.post(`/sos/${id}/reactivate`);