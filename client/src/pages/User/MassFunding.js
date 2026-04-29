import { useState, useEffect, useRef } from "react";
import axios from "axios";
import useAuth from "../../hooks/useAuth";
import Navbar from "../../components/Navbar";

const API = "http://localhost:3001/api";

const PAYMENT_METHODS = [
  { id: "bkash",  label: "bKash",  color: "#E2136E", logo: "💗", desc: "Mobile Banking" },
  { id: "nagad",  label: "Nagad",  color: "#F6821F", logo: "🔶", desc: "Digital Wallet"  },
  { id: "rocket", label: "Rocket", color: "#8B2FC9", logo: "🚀", desc: "DBBL Mobile"     },
  { id: "upay",   label: "Upay",   color: "#00A651", logo: "💚", desc: "UCB Digital"     },
  { id: "card",   label: "Card",   color: "#1a56db", logo: "💳", desc: "Credit / Debit"  },
];

const COUNTRY_CODES = [
  { code: "+880", label: "🇧🇩 +880 (BD)" },
  { code: "+91",  label: "🇮🇳 +91 (IN)"  },
  { code: "+1",   label: "🇺🇸 +1 (US/CA)" },
  { code: "+44",  label: "🇬🇧 +44 (UK)"  },
  { code: "+971", label: "🇦🇪 +971 (UAE)" },
  { code: "+60",  label: "🇲🇾 +60 (MY)"  },
  { code: "+65",  label: "🇸🇬 +65 (SG)"  },
  { code: "+61",  label: "🇦🇺 +61 (AU)"  },
];

const PHONE_LENGTH = {
  "+880": { min: 10, max: 10, hint: "10 digits (e.g. 1712345678)" },
  "+91":  { min: 10, max: 10, hint: "10 digits" },
  "+1":   { min: 10, max: 10, hint: "10 digits" },
  "+44":  { min: 10, max: 11, hint: "10–11 digits" },
  "+971": { min: 9,  max: 9,  hint: "9 digits" },
  "+60":  { min: 9,  max: 11, hint: "9–11 digits" },
  "+65":  { min: 8,  max: 8,  hint: "8 digits" },
  "+61":  { min: 9,  max: 9,  hint: "9 digits" },
};

const timeAgo = (date) => {
  const diff = (Date.now() - new Date(date)) / 1000;
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

// ── Progress Bar ───────────────────────────────────────────────────────────────
const ProgressBar = ({ raised = 0, goal }) => {
  const pct  = Math.min(goal > 0 ? (raised / goal) * 100 : 0, 100);
  const done = raised >= goal;
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
        <span style={{ color: "#00ff88", fontSize: 13, fontWeight: 700 }}>{"৳" + raised.toLocaleString() + " raised"}</span>
        <span style={{ color: "#444", fontSize: 12 }}>{"of ৳" + goal.toLocaleString()}</span>
      </div>
      <div style={{ height: 7, background: "#1e1e1e", borderRadius: 4, overflow: "hidden" }}>
        <div style={{
          height: "100%", borderRadius: 4, width: `${pct}%`, transition: "width 0.8s ease",
          background: done
            ? "linear-gradient(90deg,#00ff88,#00cc6a)"
            : "linear-gradient(90deg,#00cc6a,#00ff88)",
          boxShadow: "0 0 8px rgba(0,255,136,0.35)",
        }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
        <span style={{ color: "#444", fontSize: 11 }}>{pct.toFixed(0) + "% funded"}</span>
        {done
          ? <span style={{ color: "#00ff88", fontSize: 11, fontWeight: 600 }}>{"🎉 Goal reached!"}</span>
          : <span style={{ color: "#333", fontSize: 11 }}>{"৳" + (goal - raised).toLocaleString() + " to go"}</span>}
      </div>
    </div>
  );
};

// ── Payment Modal ──────────────────────────────────────────────────────────────
const PaymentModal = ({ fund, token, onClose, onSuccess }) => {
  const [step,   setStep]   = useState("method");
  const [method, setMethod] = useState(null);
  const [amount, setAmount] = useState("");
  const [note,   setNote]   = useState("");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  const confirm = async () => {
    setLoading(true);
    setError("");
    try {
      await axios.post(
        `${API}/fund/mass/${fund._id}/donate`,
        { amount: Number(amount), paymentMethod: method.id, note },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      onSuccess(fund._id, Number(amount));
      setStep("success");
    } catch (err) {
      setError(err.response?.data?.message || "Donation failed. Please try again.");
    }
    setLoading(false);
  };

  const inputStyle = {
    width: "100%", padding: "13px 14px", background: "#1a1a1a",
    border: "1px solid #2a2a2a", borderRadius: 10, color: "#e0e0e0",
    fontSize: 15, fontFamily: "inherit", boxSizing: "border-box", outline: "none",
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.78)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: "#141414", border: "1px solid #2a2a2a", borderRadius: 20, width: "100%", maxWidth: 460, boxShadow: "0 24px 80px rgba(0,0,0,0.7)", overflow: "hidden" }}>

        <div style={{ padding: "18px 22px", borderBottom: "1px solid #1e1e1e", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ color: "#00ff88", fontSize: 10, fontWeight: 700, letterSpacing: 1.2, marginBottom: 3 }}>{"DONATING TO"}</div>
            <div style={{ color: "#fff", fontSize: 14, fontWeight: 700 }}>{fund.title}</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#555", fontSize: 18, cursor: "pointer" }}>{"✕"}</button>
        </div>

        {error && (
          <div style={{ margin: "12px 22px 0", padding: "10px 14px", background: "rgba(255,68,68,0.08)", border: "1px solid rgba(255,68,68,0.2)", borderRadius: 8, color: "#ff6666", fontSize: 13 }}>
            {error}
          </div>
        )}

        {step === "method" && (
          <div style={{ padding: 22 }}>
            <p style={{ color: "#666", fontSize: 13, marginBottom: 14 }}>{"Choose payment method:"}</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {PAYMENT_METHODS.map(m => (
                <div key={m.id} onClick={() => setMethod(m)} style={{
                  display: "flex", alignItems: "center", gap: 12, padding: "12px 14px",
                  borderRadius: 10, cursor: "pointer",
                  border: `1.5px solid ${method?.id === m.id ? m.color : "#252525"}`,
                  background: method?.id === m.id ? `${m.color}14` : "#1a1a1a",
                  transition: "all 0.18s ease",
                }}>
                  <span style={{ fontSize: 22 }}>{m.logo}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: "#e0e0e0", fontWeight: 700, fontSize: 14 }}>{m.label}</div>
                    <div style={{ color: "#555", fontSize: 11 }}>{m.desc}</div>
                  </div>
                  {method?.id === m.id && (
                    <div style={{ width: 18, height: 18, borderRadius: "50%", background: m.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#fff", fontWeight: 700 }}>{"✓"}</div>
                  )}
                </div>
              ))}
            </div>
            <button onClick={() => method && setStep("amount")} style={{ width: "100%", marginTop: 16, padding: "12px", background: method ? "#00ff88" : "#222", color: method ? "#0a0a0a" : "#444", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: method ? "pointer" : "default", fontFamily: "inherit" }}>
              {"Continue →"}
            </button>
          </div>
        )}

        {step === "amount" && (
          <div style={{ padding: 22 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, padding: "9px 12px", background: "#1a1a1a", borderRadius: 8 }}>
              <span style={{ fontSize: 18 }}>{method.logo}</span>
              <span style={{ color: "#e0e0e0", fontWeight: 600, fontSize: 13 }}>{method.label}</span>
              <button onClick={() => setStep("method")} style={{ marginLeft: "auto", background: "none", border: "none", color: "#555", fontSize: 11, cursor: "pointer" }}>{"Change"}</button>
            </div>
            <p style={{ color: "#666", fontSize: 13, marginBottom: 8 }}>{"Donation amount (৳ Taka):"}</p>
            <div style={{ position: "relative", marginBottom: 12 }}>
              <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#00ff88", fontWeight: 700, fontSize: 18 }}>{"৳"}</span>
              <input type="number" min="1" placeholder="0" value={amount} onChange={e => setAmount(e.target.value)}
                style={{ ...inputStyle, paddingLeft: 32, fontSize: 18, fontWeight: 700 }}
                onFocus={e => e.target.style.borderColor = "#00ff88"}
                onBlur={e => e.target.style.borderColor = "#2a2a2a"} />
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
              {[100, 250, 500, 1000, 2000, 5000].map(a => (
                <button key={a} onClick={() => setAmount(a.toString())} style={{
                  padding: "5px 11px", borderRadius: 8, fontSize: 12, cursor: "pointer",
                  fontFamily: "inherit", fontWeight: 600,
                  background: Number(amount) === a ? "rgba(0,255,136,0.1)" : "#1e1e1e",
                  border: `1px solid ${Number(amount) === a ? "#00ff88" : "#2a2a2a"}`,
                  color: Number(amount) === a ? "#00ff88" : "#666",
                }}>{"৳" + a.toLocaleString()}</button>
              ))}
            </div>
            <textarea placeholder="Note (optional)" value={note} onChange={e => setNote(e.target.value)} rows={2}
              style={{ ...inputStyle, resize: "none", marginBottom: 14, fontSize: 13 }}
              onFocus={e => e.target.style.borderColor = "#00ff88"}
              onBlur={e => e.target.style.borderColor = "#2a2a2a"} />
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setStep("method")} style={{ padding: "11px 18px", background: "none", border: "1px solid #333", borderRadius: 10, color: "#666", cursor: "pointer", fontSize: 13, fontFamily: "inherit" }}>{"← Back"}</button>
              <button onClick={() => Number(amount) >= 1 && setStep("confirm")} style={{ flex: 1, padding: "12px", background: Number(amount) >= 1 ? "#00ff88" : "#222", color: Number(amount) >= 1 ? "#0a0a0a" : "#444", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: Number(amount) >= 1 ? "pointer" : "default", fontFamily: "inherit" }}>{"Review →"}</button>
            </div>
          </div>
        )}

        {step === "confirm" && (
          <div style={{ padding: 22 }}>
            <div style={{ background: "#1a1a1a", border: "1px solid #222", borderRadius: 12, padding: 18, marginBottom: 16 }}>
              {[["Amount", `৳${Number(amount).toLocaleString()} Taka`, "#00ff88"], ["Via", `${method.logo} ${method.label}`, "#e0e0e0"], ["To", fund.title, "#e0e0e0"]].map(([l, v, c], i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", marginBottom: i < 2 ? 10 : 0 }}>
                  <span style={{ color: "#555", fontSize: 13 }}>{l}</span>
                  <span style={{ color: c, fontWeight: l === "Amount" ? 700 : 500, fontSize: 13, textAlign: "right", maxWidth: 220 }}>{v}</span>
                </div>
              ))}
              {note && (
                <div style={{ marginTop: 10, padding: "8px 10px", background: "#111", borderRadius: 8 }}>
                  <span style={{ color: "#555", fontSize: 11 }}>{"NOTE: "}</span>
                  <span style={{ color: "#777", fontSize: 12 }}>{note}</span>
                </div>
              )}
            </div>
            <div style={{ background: "rgba(255,170,0,0.05)", border: "1px solid rgba(255,170,0,0.15)", borderRadius: 8, padding: "10px 12px", marginBottom: 16, color: "#ffaa00", fontSize: 12 }}>
              {"⚠️ Demo only — no real transaction will occur. Donation will be recorded in the system."}
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setStep("amount")} style={{ padding: "11px 18px", background: "none", border: "1px solid #333", borderRadius: 10, color: "#666", cursor: "pointer", fontSize: 13, fontFamily: "inherit" }}>{"← Back"}</button>
              <button onClick={confirm} disabled={loading} style={{ flex: 1, padding: "12px", background: loading ? "#1a1a1a" : `linear-gradient(135deg,${method.color},${method.color}bb)`, color: "#fff", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", fontFamily: "inherit", opacity: loading ? 0.7 : 1 }}>
                {loading ? "Processing..." : `Confirm & Donate via ${method.label}`}
              </button>
            </div>
          </div>
        )}

        {step === "success" && (
          <div style={{ padding: 40, textAlign: "center" }}>
            <div style={{ fontSize: 52, marginBottom: 14 }}>{"🎉"}</div>
            <h3 style={{ color: "#00ff88", fontSize: 20, fontWeight: 700, marginBottom: 8 }}>{"Donation Successful!"}</h3>
            <p style={{ color: "#888", fontSize: 13, marginBottom: 4 }}>
              {"You donated "}
              <span style={{ color: "#00ff88", fontWeight: 700 }}>{"৳" + Number(amount).toLocaleString() + " Taka"}</span>
              {" via " + method.label}
            </p>
            <p style={{ color: "#555", fontSize: 12, marginBottom: 24 }}>{"Thank you for supporting this campaign!"}</p>
            <button onClick={onClose} style={{ padding: "11px 28px", background: "#00ff88", color: "#0a0a0a", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>{"Done ✓"}</button>
          </div>
        )}
      </div>
    </div>
  );
};

// ── Detail Panel ───────────────────────────────────────────────────────────────
const DetailPanel = ({ fund, onClose, onDonate, isOwn, onDelete }) => {
  const done = (fund.amountRaised || 0) >= fund.goalAmount;
  const [deleting, setDeleting] = useState(false);
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 900, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "flex-end" }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ width: "100%", maxWidth: 480, height: "100%", background: "#141414", borderLeft: "1px solid #222", overflowY: "auto" }}>
        <div style={{ padding: "18px 22px", borderBottom: "1px solid #1e1e1e", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, background: "#141414", zIndex: 10 }}>
          <span style={{ color: "#00ff88", fontSize: 11, fontWeight: 700, letterSpacing: 1 }}>{"CAMPAIGN DETAILS"}</span>
          <button onClick={onClose} style={{ background: "#1e1e1e", border: "1px solid #2a2a2a", color: "#888", width: 28, height: 28, borderRadius: "50%", cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center" }}>{"✕"}</button>
        </div>
        <div style={{ padding: "22px" }}>
          <h2 style={{ color: "#fff", fontSize: 20, fontWeight: 700, marginBottom: 12, lineHeight: 1.3 }}>{fund.title}</h2>
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: "#1a1a1a", border: "1px solid #222", borderRadius: 12, marginBottom: 18 }}>
            <div style={{ width: 40, height: 40, borderRadius: "50%", background: "linear-gradient(135deg,#ff3333,#ff6666)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, color: "#fff", fontWeight: 700, flexShrink: 0 }}>
              {fund.userId?.name?.charAt(0).toUpperCase() || "?"}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ color: "#e0e0e0", fontWeight: 600, fontSize: 14 }}>{fund.userId?.name || "Anonymous"}</div>
              {fund.userId?.area && <div style={{ color: "#555", fontSize: 12 }}>{"📍 " + fund.userId.area}</div>}
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ color: "#444", fontSize: 11 }}>{"Contact"}</div>
              <div style={{ color: "#888", fontSize: 12, fontWeight: 600 }}>{fund.contactNumber}</div>
            </div>
          </div>
          <div style={{ background: "#1a1a1a", border: "1px solid #222", borderRadius: 12, padding: "16px", marginBottom: 18 }}>
            <ProgressBar raised={fund.amountRaised || 0} goal={fund.goalAmount} />
            <div style={{ display: "flex", justifyContent: "space-around", marginTop: 12, paddingTop: 12, borderTop: "1px solid #1e1e1e" }}>
              {[
                { label: "Raised",  value: "৳" + (fund.amountRaised || 0).toLocaleString(), color: "#00ff88" },
                { label: "Goal",    value: "৳" + fund.goalAmount.toLocaleString(),           color: "#ffd93d" },
                { label: "Donors",  value: fund.donations?.length || 0,                      color: "#6bcbff" },
              ].map((s, i) => (
                <div key={i} style={{ textAlign: "center" }}>
                  <div style={{ color: s.color, fontWeight: 700, fontSize: 16 }}>{s.value}</div>
                  <div style={{ color: "#444", fontSize: 11 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <p style={{ color: "#333", fontSize: 11, fontWeight: 600, letterSpacing: 0.8, marginBottom: 8 }}>{"DESCRIPTION"}</p>
            <p style={{ color: "#ccc", fontSize: 14, lineHeight: 1.7 }}>{fund.description}</p>
          </div>
          {fund.area && (
            <div style={{ marginBottom: 14, padding: "8px 12px", background: "#1a1a1a", borderRadius: 8, color: "#666", fontSize: 13 }}>
              {"📍 " + fund.area}
            </div>
          )}
          {fund.images?.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <p style={{ color: "#333", fontSize: 11, fontWeight: 600, letterSpacing: 0.8, marginBottom: 10 }}>{"IMAGES"}</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(120px,1fr))", gap: 8 }}>
                {fund.images.map((img, i) => (
                  <img key={i} src={img} alt="" style={{ width: "100%", height: 100, objectFit: "cover", borderRadius: 8, border: "1px solid #222" }} />
                ))}
              </div>
            </div>
          )}
          {fund.documents?.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <p style={{ color: "#333", fontSize: 11, fontWeight: 600, letterSpacing: 0.8, marginBottom: 8 }}>{"DOCUMENTS"}</p>
              {fund.documents.map((doc, i) => (
                <a key={i} href={doc} target="_blank" rel="noreferrer" style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 12px", background: "#1a1a1a", border: "1px solid #222", borderRadius: 8, color: "#6bcbff", fontSize: 13, textDecoration: "none", marginBottom: 6 }}>
                  {"📄 Document " + (i + 1)}
                </a>
              ))}
            </div>
          )}
          <div style={{ color: "#333", fontSize: 11, marginBottom: 18 }}>{"Posted " + timeAgo(fund.createdAt)}</div>
          {!isOwn && !done && (
            <button onClick={onDonate} style={{ width: "100%", padding: "13px", background: "linear-gradient(135deg,#00ff88,#00cc6a)", border: "none", borderRadius: 12, color: "#0a0a0a", fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", marginBottom: 10, boxShadow: "0 6px 20px rgba(0,255,136,0.25)" }}>
              {"💚 Donate Now"}
            </button>
          )}
          {done && (
            <div style={{ padding: "13px", background: "rgba(0,255,136,0.06)", border: "1px solid rgba(0,255,136,0.2)", borderRadius: 12, color: "#00ff88", textAlign: "center", fontWeight: 600, fontSize: 14, marginBottom: 10 }}>
              {"🎉 Campaign Goal Reached!"}
            </div>
          )}
          {isOwn && (
            <button
              onClick={() => { if (window.confirm("Delete this campaign? This cannot be undone.")) onDelete(fund._id); }}
              disabled={deleting}
              style={{ width: "100%", padding: "11px", background: "rgba(255,68,68,0.08)", border: "1px solid rgba(255,68,68,0.25)", borderRadius: 12, color: "#ff6666", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
              {"🗑️ Delete My Campaign"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Submit Form ────────────────────────────────────────────────────────────────
const SubmitForm = ({ token, onClose, onSubmitted }) => {
  const [isBlocked, setIsBlocked]       = useState(false);
  const [blockChecking, setBlockChecking] = useState(true);
  const [form, setForm] = useState({
    title: "", description: "", goalAmount: "",
    contactNumber: "", area: "", countryCode: "+880",
  });
  const [images, setImages]         = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [documents, setDocuments]   = useState([]);
  const [docNames, setDocNames]     = useState([]);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState("");
  const [phoneError, setPhoneError] = useState("");

  const imgRef = useRef();
  const docRef = useRef();

  // Check if user's fund features are blocked
  useEffect(() => {
    const checkBlock = async () => {
      try {
        const res = await axios.get(`${API}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setIsBlocked(res.data.fundFeaturesBlocked || false);
      } catch (err) {
        console.error(err);
      }
      setBlockChecking(false);
    };
    checkBlock();
  }, [token]);

  const validatePhone = (number, code) => {
    const digits = number.replace(/\D/g, "");
    const rule = PHONE_LENGTH[code];
    if (!rule) return true;
    if (digits.length < rule.min || digits.length > rule.max) {
      setPhoneError(`Phone number must be ${rule.hint} for ${code}`);
      return false;
    }
    setPhoneError("");
    return true;
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    setImages(prev => [...prev, ...files]);
    setImagePreviews(prev => [...prev, ...files.map(f => URL.createObjectURL(f))]);
  };

  const handleDocChange = (e) => {
    const files = Array.from(e.target.files);
    setDocuments(prev => [...prev, ...files]);
    setDocNames(prev => [...prev, ...files.map(f => f.name)]);
  };

  const removeImage = (idx) => {
    setImages(prev => prev.filter((_, i) => i !== idx));
    setImagePreviews(prev => prev.filter((_, i) => i !== idx));
  };

  const removeDoc = (idx) => {
    setDocuments(prev => prev.filter((_, i) => i !== idx));
    setDocNames(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async () => {
    if (isBlocked) return;
    setError("");
    if (!form.title.trim())                              return setError("Title is required.");
    if (!form.description.trim())                        return setError("Description is required.");
    if (!form.goalAmount || Number(form.goalAmount) < 1) return setError("Please enter a valid goal amount.");
    if (Number(form.goalAmount) > 10000000)              return setError("Goal amount cannot exceed ৳1,00,00,000 (1 Crore Taka).");
    if (!form.contactNumber.trim())                      return setError("Contact number is required.");
    if (!validatePhone(form.contactNumber, form.countryCode)) return;

    setLoading(true);
    try {
      const hasFiles = images.length > 0 || documents.length > 0;
      if (hasFiles) {
        const formData = new FormData();
        formData.append("title",         form.title.trim());
        formData.append("description",   form.description.trim());
        formData.append("goalAmount",    form.goalAmount);
        formData.append("contactNumber", `${form.countryCode}${form.contactNumber.trim()}`);
        if (form.area.trim()) formData.append("area", form.area.trim());
        images.forEach(img  => formData.append("images",    img));
        documents.forEach(doc => formData.append("documents", doc));
        await axios.post(`${API}/fund/mass/submit`, formData, {
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" },
        });
      } else {
        await axios.post(`${API}/fund/mass/submit`, {
          title:         form.title.trim(),
          description:   form.description.trim(),
          goalAmount:    Number(form.goalAmount),
          contactNumber: `${form.countryCode}${form.contactNumber.trim()}`,
          area:          form.area.trim() || "",
        }, { headers: { Authorization: `Bearer ${token}` } });
      }
      onSubmitted();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || "Submission failed. Please try again.");
    }
    setLoading(false);
  };

  const inputStyle = {
    width: "100%", padding: "11px 14px", background: "#1a1a1a",
    border: "1px solid #2a2a2a", borderRadius: 10, color: "#e0e0e0",
    fontSize: 14, fontFamily: "inherit", boxSizing: "border-box", outline: "none",
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.78)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: "#141414", border: "1px solid #2a2a2a", borderRadius: 20, width: "100%", maxWidth: 540, maxHeight: "92vh", overflowY: "auto", boxShadow: "0 24px 80px rgba(0,0,0,0.7)" }}>

        <div style={{ padding: "18px 24px", borderBottom: "1px solid #1e1e1e", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, background: "#141414", zIndex: 10 }}>
          <div>
            <div style={{ color: "#00ff88", fontSize: 10, fontWeight: 700, letterSpacing: 1.2, marginBottom: 3 }}>{"NEW REQUEST"}</div>
            <div style={{ color: "#fff", fontSize: 16, fontWeight: 700 }}>{"🌍 Request Mass Funding"}</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#555", fontSize: 18, cursor: "pointer" }}>{"✕"}</button>
        </div>

        <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>

          {/* ── Blocked Banner ── */}
          {blockChecking ? (
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <style>{"@keyframes spin{to{transform:rotate(360deg)}}"}</style>
              <div style={{ width: 28, height: 28, border: "2px solid rgba(0,255,136,0.1)", borderTop: "2px solid #00ff88", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto" }} />
            </div>
          ) : isBlocked ? (
            <div style={{ backgroundColor: "rgba(255,107,107,0.08)", border: "1px solid rgba(255,107,107,0.25)", borderRadius: 12, padding: "16px 18px", display: "flex", flexDirection: "column", gap: 8 }}>
              <p style={{ color: "#ff6b6b", fontSize: 14, fontWeight: 700, margin: 0 }}>{"🚫 Mass Funding Feature Blocked"}</p>
              <p style={{ color: "#888", fontSize: 12, lineHeight: 1.6, margin: 0 }}>
                {"Your mass funding feature has been blocked due to warnings for submitting fake or fraudulent requests. Please contact the admin to resolve this."}
              </p>
              <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 4 }}>
                <span style={{ color: "#00ff88", fontSize: 12, fontWeight: 600 }}>{"📧 admin@emergencybd.com"}</span>
                <span style={{ color: "#00ff88", fontSize: 12, fontWeight: 600 }}>{"📞 +8801700000000"}</span>
              </div>
            </div>
          ) : null}

          {error && (
            <div style={{ padding: "10px 14px", background: "rgba(255,68,68,0.08)", border: "1px solid rgba(255,68,68,0.2)", borderRadius: 8, color: "#ff6666", fontSize: 13 }}>
              {error}
            </div>
          )}

          {/* Dim form when blocked */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16, opacity: isBlocked ? 0.4 : 1, pointerEvents: isBlocked ? "none" : "auto" }}>

            {!isBlocked && (
              <div style={{ padding: "10px 14px", background: "rgba(255,170,0,0.05)", border: "1px solid rgba(255,170,0,0.15)", borderRadius: 8, color: "#ffaa00", fontSize: 12 }}>
                {"⚠️ Your request will be reviewed by admin before appearing publicly."}
              </div>
            )}

            {/* Title */}
            <div>
              <label style={{ color: "#666", fontSize: 12, fontWeight: 600, display: "block", marginBottom: 6 }}>
                {"Campaign Title "}<span style={{ color: "#ff4444" }}>{"*"}</span>
              </label>
              <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                placeholder="e.g. Help rebuild home after flood" style={inputStyle}
                onFocus={e => e.target.style.borderColor = "#00ff88"}
                onBlur={e => e.target.style.borderColor = "#2a2a2a"} />
            </div>

            {/* Description */}
            <div>
              <label style={{ color: "#666", fontSize: 12, fontWeight: 600, display: "block", marginBottom: 6 }}>
                {"Description "}<span style={{ color: "#ff4444" }}>{"*"}</span>
              </label>
              <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                placeholder="Describe your situation, why you need funds, and how they will be used..."
                rows={5} style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }}
                onFocus={e => e.target.style.borderColor = "#00ff88"}
                onBlur={e => e.target.style.borderColor = "#2a2a2a"} />
            </div>

            {/* Goal Amount */}
            <div>
              <label style={{ color: "#666", fontSize: 12, fontWeight: 600, display: "block", marginBottom: 6 }}>
                {"Goal Amount (৳ Taka) "}<span style={{ color: "#ff4444" }}>{"*"}</span>
              </label>
              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#00ff88", fontWeight: 700, fontSize: 16 }}>{"৳"}</span>
                <input type="number" min="1" max="10000000" value={form.goalAmount}
                  onChange={e => { const val = e.target.value; if (Number(val) > 10000000) return; setForm(p => ({ ...p, goalAmount: val })); }}
                  placeholder="0 (max ৳1 Crore)" style={{ ...inputStyle, paddingLeft: 28 }}
                  onFocus={e => e.target.style.borderColor = "#00ff88"}
                  onBlur={e => e.target.style.borderColor = "#2a2a2a"} />
                <p style={{ color: "#333", fontSize: 11, marginTop: 4 }}>{"Maximum: ৳1,00,00,000 (1 Crore Taka)"}</p>
              </div>
            </div>

            {/* Contact Number */}
            <div>
              <label style={{ color: "#666", fontSize: 12, fontWeight: 600, display: "block", marginBottom: 6 }}>
                {"Contact Number "}<span style={{ color: "#ff4444" }}>{"*"}</span>
              </label>
              <div style={{ display: "flex", gap: 8 }}>
                <select value={form.countryCode}
                  onChange={e => { setForm(p => ({ ...p, countryCode: e.target.value })); setPhoneError(""); }}
                  style={{ ...inputStyle, width: "auto", minWidth: 140, paddingRight: 8, cursor: "pointer" }}
                  onFocus={e => e.target.style.borderColor = "#00ff88"}
                  onBlur={e => e.target.style.borderColor = "#2a2a2a"}>
                  {COUNTRY_CODES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
                </select>
                <input type="tel" value={form.contactNumber}
                  onChange={e => {
                    const val = e.target.value.replace(/\D/g, "");
                    setForm(p => ({ ...p, contactNumber: val }));
                    if (val) validatePhone(val, form.countryCode);
                    else setPhoneError("");
                  }}
                  placeholder={PHONE_LENGTH[form.countryCode]?.hint || "Phone number"}
                  style={{ ...inputStyle, flex: 1 }}
                  onFocus={e => e.target.style.borderColor = "#00ff88"}
                  onBlur={e => { e.target.style.borderColor = "#2a2a2a"; if (form.contactNumber) validatePhone(form.contactNumber, form.countryCode); }} />
              </div>
              {phoneError && <p style={{ color: "#ff6666", fontSize: 11, marginTop: 4 }}>{phoneError}</p>}
              {!phoneError && form.contactNumber && (
                <p style={{ color: "#00ff88", fontSize: 11, marginTop: 4 }}>{"✓ " + form.countryCode + " " + form.contactNumber}</p>
              )}
            </div>

            {/* Area */}
            <div>
              <label style={{ color: "#666", fontSize: 12, fontWeight: 600, display: "block", marginBottom: 6 }}>
                {"Area / Location "}<span style={{ color: "#444" }}>{"(optional)"}</span>
              </label>
              <input value={form.area} onChange={e => setForm(p => ({ ...p, area: e.target.value }))}
                placeholder="e.g. Gulshan, Dhaka" style={inputStyle}
                onFocus={e => e.target.style.borderColor = "#00ff88"}
                onBlur={e => e.target.style.borderColor = "#2a2a2a"} />
            </div>

            {/* Images */}
            <div>
              <label style={{ color: "#666", fontSize: 12, fontWeight: 600, display: "block", marginBottom: 6 }}>
                {"📷 Upload Images "}<span style={{ color: "#444" }}>{"(optional)"}</span>
              </label>
              <input ref={imgRef} type="file" accept="image/*" multiple style={{ display: "none" }} onChange={handleImageChange} />
              <button onClick={() => imgRef.current?.click()} style={{ width: "100%", padding: "12px", background: "#1a1a1a", border: "2px dashed #2a2a2a", borderRadius: 10, color: "#666", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}
                onMouseEnter={e => { e.target.style.borderColor = "#00ff88"; e.target.style.color = "#00ff88"; }}
                onMouseLeave={e => { e.target.style.borderColor = "#2a2a2a"; e.target.style.color = "#666"; }}>
                {"📷 Click to upload images (JPG, PNG)"}
              </button>
              {imagePreviews.length > 0 && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(90px,1fr))", gap: 8, marginTop: 10 }}>
                  {imagePreviews.map((src, i) => (
                    <div key={i} style={{ position: "relative" }}>
                      <img src={src} alt="" style={{ width: "100%", height: 80, objectFit: "cover", borderRadius: 8, border: "1px solid #333" }} />
                      <button onClick={() => removeImage(i)} style={{ position: "absolute", top: 3, right: 3, width: 18, height: 18, borderRadius: "50%", background: "#ff4444", border: "none", color: "#fff", fontSize: 10, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>{"✕"}</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Documents */}
            <div>
              <label style={{ color: "#666", fontSize: 12, fontWeight: 600, display: "block", marginBottom: 6 }}>
                {"📄 Upload Documents "}<span style={{ color: "#444" }}>{"(optional)"}</span>
              </label>
              <input ref={docRef} type="file" accept=".pdf,.doc,.docx,.txt" multiple style={{ display: "none" }} onChange={handleDocChange} />
              <button onClick={() => docRef.current?.click()} style={{ width: "100%", padding: "12px", background: "#1a1a1a", border: "2px dashed #2a2a2a", borderRadius: 10, color: "#666", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}
                onMouseEnter={e => { e.target.style.borderColor = "#00ff88"; e.target.style.color = "#00ff88"; }}
                onMouseLeave={e => { e.target.style.borderColor = "#2a2a2a"; e.target.style.color = "#666"; }}>
                {"📄 Click to upload documents (PDF, DOC)"}
              </button>
              {docNames.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 10 }}>
                  {docNames.map((name, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 8 }}>
                      <span style={{ color: "#6bcbff", fontSize: 13, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{"📄 " + name}</span>
                      <button onClick={() => removeDoc(i)} style={{ background: "none", border: "none", color: "#666", cursor: "pointer", fontSize: 14 }}>{"✕"}</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Submit button — always visible, disabled when blocked */}
          <button
            onClick={handleSubmit}
            disabled={loading || !!phoneError || isBlocked || blockChecking}
            style={{
              padding: "13px",
              background: (loading || !!phoneError || isBlocked || blockChecking) ? "#1a1a1a" : "linear-gradient(135deg,#00ff88,#00cc6a)",
              color: (loading || !!phoneError || isBlocked || blockChecking) ? "#444" : "#0a0a0a",
              border: "none", borderRadius: 12, fontSize: 15, fontWeight: 700,
              cursor: (loading || !!phoneError || isBlocked || blockChecking) ? "not-allowed" : "pointer",
              fontFamily: "inherit",
            }}
          >
            {loading ? "Submitting..." : isBlocked ? "🚫 Feature Blocked — Contact Admin" : "Submit Request"}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Main Page ──────────────────────────────────────────────────────────────────
const MassFunding = () => {
  const { token, user } = useAuth();
  const [funds, setFunds]           = useState([]);
  const [myFunds, setMyFunds]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [tab, setTab]               = useState("browse");
  const [sort, setSort]             = useState("newest");
  const [areaFilter, setAreaFilter] = useState("");
  const [search, setSearch]         = useState("");
  const [selectedFund, setSelectedFund] = useState(null);
  const [donatingTo, setDonatingTo]     = useState(null);
  const [showSubmit, setShowSubmit]     = useState(false);

  const fetchFunds = async () => {
    try {
      const [approvedRes, mineRes] = await Promise.all([
        axios.get(`${API}/fund/mass/approved`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/fund/mass/mine`,     { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      setFunds(approvedRes.data);
      setMyFunds(mineRes.data);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  useEffect(() => { fetchFunds(); }, [token]);

  const handleDonateSuccess = (fundId, amount) => {
    setFunds(prev => prev.map(f => f._id === fundId ? { ...f, amountRaised: (f.amountRaised || 0) + amount } : f));
    if (selectedFund?._id === fundId) setSelectedFund(prev => ({ ...prev, amountRaised: (prev.amountRaised || 0) + amount }));
  };

  const handleDelete = async (fundId) => {
    try {
      await axios.delete(`${API}/fund/mass/${fundId}`, { headers: { Authorization: `Bearer ${token}` } });
      setFunds(prev  => prev.filter(f => f._id !== fundId));
      setMyFunds(prev => prev.filter(f => f._id !== fundId));
      setSelectedFund(null);
    } catch (err) { console.error(err); }
  };

  const areas = [...new Set(funds.map(f => f.area).filter(Boolean))];

  const displayed = funds
    .filter(f => !areaFilter || f.area === areaFilter)
    .filter(f => !search ||
      f.title.toLowerCase().includes(search.toLowerCase()) ||
      (f.area || "").toLowerCase().includes(search.toLowerCase()) ||
      (f.description || "").toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sort === "newest")       return new Date(b.createdAt) - new Date(a.createdAt);
      if (sort === "oldest")       return new Date(a.createdAt) - new Date(b.createdAt);
      if (sort === "highestRaised") return (b.amountRaised || 0) - (a.amountRaised || 0);
      if (sort === "lowestRaised")  return (a.amountRaised || 0) - (b.amountRaised || 0);
      return 0;
    });

  const totalRaised = funds.reduce((s, f) => s + (f.amountRaised || 0), 0);

  const MY_STATUS = {
    Pending:  { color: "#ffaa00", icon: "⏳" },
    Approved: { color: "#00ff88", icon: "✅" },
    Rejected: { color: "#ff4444", icon: "❌" },
  };

  return (
    <div style={{ background: "#111", minHeight: "100vh" }}>
      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        @keyframes shimmer { 0%{background-position:-400px 0} 100%{background-position:400px 0} }
        .fc { transition:all 0.22s ease; }
        .fc:hover { transform:translateY(-3px); box-shadow:0 12px 36px rgba(0,0,0,0.4) !important; }
        .tab-btn { transition:all 0.2s ease; cursor:pointer; border:none; font-family:inherit; }
        .del-btn { transition:all 0.2s ease; }
        .del-btn:hover { background:rgba(255,68,68,0.12) !important; border-color:rgba(255,68,68,0.4) !important; }
      `}</style>

      <Navbar />

      {/* ── Hero ── */}
      <div style={{ background: "linear-gradient(135deg,#0c1a0c,#101a18,#0d0d1a)", borderBottom: "1px solid #1e1e1e", padding: "32px 48px 24px", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 65% 50%,rgba(0,255,136,0.04),transparent 60%)", pointerEvents: "none" }} />
        <div style={{ maxWidth: 1200, margin: "0 auto", position: "relative" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <span style={{ fontSize: 34 }}>{"🌍"}</span>
              <div>
                <h1 style={{ color: "#fff", fontSize: 24, fontWeight: 800, margin: 0 }}>{"Mass Funding"}</h1>
                <p style={{ color: "#555", fontSize: 13, margin: "4px 0 0" }}>{"Community-powered fundraising · Browse & donate in ৳ Taka"}</p>
              </div>
            </div>
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
              {[
                { label: "Active Campaigns", value: funds.length,                    color: "#00ff88" },
                { label: "Total Raised",      value: "৳" + totalRaised.toLocaleString(), color: "#ffd93d" },
              ].map((s, i) => (
                <div key={i} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid #1e1e1e", borderRadius: 12, padding: "12px 18px", textAlign: "center" }}>
                  <div style={{ color: s.color, fontWeight: 800, fontSize: 18 }}>{s.value}</div>
                  <div style={{ color: "#444", fontSize: 11, marginTop: 2 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ marginTop: 18 }}>
            <button onClick={() => setShowSubmit(true)} style={{ padding: "9px 20px", background: "linear-gradient(135deg,#00ff88,#00cc6a)", border: "none", borderRadius: 10, color: "#0a0a0a", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
              {"+ Request Mass Funding"}
            </button>
            <span style={{ color: "#333", fontSize: 12, marginLeft: 12 }}>{"Needs admin approval before going public"}</span>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "22px 48px" }}>

        {/* ── Tabs ── */}
        <div style={{ display: "flex", gap: 4, marginBottom: 24, borderBottom: "1px solid #1e1e1e" }}>
          {[["browse", "🌍 Browse Campaigns"], ["mine", "📂 My Requests"]].map(([t, label]) => (
            <button key={t} className="tab-btn" onClick={() => setTab(t)} style={{
              padding: "10px 20px", background: "none",
              color: tab === t ? "#00ff88" : "#555", fontSize: 14, fontWeight: 600,
              borderBottom: `2px solid ${tab === t ? "#00ff88" : "transparent"}`,
              marginBottom: -1,
            }}>
              {label}
            </button>
          ))}
        </div>

        {/* ── BROWSE TAB ── */}
        {tab === "browse" && (
          <>
            <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
              <input
                placeholder="🔍 Search by title, area, description..."
                value={search} onChange={e => setSearch(e.target.value)}
                style={{ flex: 1, minWidth: 200, padding: "9px 14px", background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 10, color: "#e0e0e0", fontSize: 13, fontFamily: "inherit", outline: "none" }}
                onFocus={e => e.target.style.borderColor = "#00ff88"}
                onBlur={e => e.target.style.borderColor = "#2a2a2a"} />
              <select value={sort} onChange={e => setSort(e.target.value)} style={{ padding: "9px 12px", background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 10, color: "#e0e0e0", fontSize: 13, fontFamily: "inherit", cursor: "pointer" }}>
                <option value="newest">{"📅 Newest First"}</option>
                <option value="oldest">{"📅 Oldest First"}</option>
                <option value="highestRaised">{"💰 Highest Raised"}</option>
                <option value="lowestRaised">{"💰 Lowest Raised"}</option>
              </select>
              {areas.length > 0 && (
                <select value={areaFilter} onChange={e => setAreaFilter(e.target.value)} style={{ padding: "9px 12px", background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 10, color: "#e0e0e0", fontSize: 13, fontFamily: "inherit", cursor: "pointer" }}>
                  <option value="">{"📍 All Areas"}</option>
                  {areas.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              )}
            </div>

            {loading ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(320px,1fr))", gap: 16 }}>
                {[1, 2, 3].map(i => (
                  <div key={i} style={{ height: 260, borderRadius: 14, background: "linear-gradient(90deg,#1a1a1a 25%,#222 50%,#1a1a1a 75%)", backgroundSize: "400px 100%", animation: "shimmer 1.4s ease infinite" }} />
                ))}
              </div>
            ) : displayed.length === 0 ? (
              <div style={{ textAlign: "center", padding: "70px 20px" }}>
                <div style={{ fontSize: 44, marginBottom: 12 }}>{"🌱"}</div>
                <p style={{ color: "#00ff88", fontWeight: 700, fontSize: 17, marginBottom: 6 }}>{"No campaigns yet"}</p>
                <p style={{ color: "#444", fontSize: 13 }}>{"Be the first to request mass funding."}</p>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(320px,1fr))", gap: 16 }}>
                {displayed.map((fund, idx) => {
                  const raised = fund.amountRaised || 0;
                  const isOwn  = fund.userId?._id === user?._id || fund.userId === user?._id;
                  const done   = raised >= fund.goalAmount;
                  return (
                    <div key={fund._id} className="fc" onClick={() => setSelectedFund(fund)} style={{
                      background: "#1a1a1a", border: `1px solid ${done ? "#00ff8833" : "#222"}`,
                      borderRadius: 14, padding: "20px", display: "flex", flexDirection: "column", gap: 14,
                      boxShadow: "0 4px 16px rgba(0,0,0,0.2)", cursor: "pointer",
                      animation: `fadeUp 0.35s ease ${idx * 0.05}s both`, position: "relative", overflow: "hidden",
                    }}>
                      {done && (
                        <div style={{ position: "absolute", top: 12, right: -26, background: "#00ff88", color: "#0a0a0a", fontSize: 9, fontWeight: 800, padding: "3px 36px", transform: "rotate(35deg)" }}>
                          {"FUNDED"}
                        </div>
                      )}
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                        <div style={{ width: 40, height: 40, borderRadius: "50%", background: "linear-gradient(135deg,#ff3333,#ff6666)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, color: "#fff", fontWeight: 700, flexShrink: 0 }}>
                          {(fund.userId?.name || "?").charAt(0).toUpperCase()}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3, flexWrap: "wrap" }}>
                            {fund.area && <span style={{ fontSize: 10, color: "#555", background: "#1e1e1e", padding: "2px 7px", borderRadius: 10 }}>{"📍 " + fund.area}</span>}
                            <span style={{ color: "#333", fontSize: 10 }}>{timeAgo(fund.createdAt)}</span>
                          </div>
                          <h3 style={{ color: "#e0e0e0", fontSize: 14, fontWeight: 700, margin: 0, lineHeight: 1.3, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                            {fund.title}
                          </h3>
                        </div>
                      </div>
                      <p style={{ color: "#666", fontSize: 12, lineHeight: 1.6, margin: 0, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                        {fund.description}
                      </p>
                      <ProgressBar raised={raised} goal={fund.goalAmount} />
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span style={{ color: "#444", fontSize: 11 }}>{(fund.donations?.length || 0) + " donors"}</span>
                        {!isOwn && !done
                          ? <span style={{ color: "#00ff88", fontSize: 12, fontWeight: 600 }}>{"💚 Click to donate"}</span>
                          : isOwn
                          ? <span style={{ color: "#555", fontSize: 12 }}>{"✓ Your campaign"}</span>
                          : <span style={{ color: "#00ff88", fontSize: 12 }}>{"🎉 Funded!"}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ── MY REQUESTS TAB ── */}
        {tab === "mine" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {myFunds.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 20px", border: "1px dashed #1e1e1e", borderRadius: 14 }}>
                <div style={{ fontSize: 40, marginBottom: 10 }}>{"📭"}</div>
                <p style={{ color: "#555", fontSize: 14 }}>{"You haven't submitted any mass funding requests yet."}</p>
                <button onClick={() => setShowSubmit(true)} style={{ marginTop: 14, padding: "9px 20px", background: "#00ff88", border: "none", borderRadius: 10, color: "#0a0a0a", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                  {"Submit Your First Request"}
                </button>
              </div>
            ) : myFunds.map((fund, idx) => {
              const sc = MY_STATUS[fund.status] || MY_STATUS.Pending;
              return (
                <div key={fund._id} style={{ background: "#1a1a1a", border: "1px solid #222", borderLeft: `4px solid ${sc.color}`, borderRadius: 12, padding: "18px 22px", animation: `fadeUp 0.3s ease ${idx * 0.05}s both` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                    <h3 style={{ color: "#e0e0e0", fontSize: 15, fontWeight: 700, margin: 0, flex: 1, paddingRight: 12 }}>{fund.title}</h3>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 20, background: sc.color + "15", border: `1px solid ${sc.color}33`, flexShrink: 0 }}>
                        <span style={{ fontSize: 11 }}>{sc.icon}</span>
                        <span style={{ color: sc.color, fontSize: 11, fontWeight: 700 }}>{fund.status}</span>
                      </div>
                      <button className="del-btn"
                        onClick={() => { if (window.confirm("Delete this request?")) handleDelete(fund._id); }}
                        style={{ padding: "4px 10px", background: "rgba(255,68,68,0.06)", border: "1px solid rgba(255,68,68,0.2)", borderRadius: 20, color: "#ff6666", fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>
                        {"🗑️ Delete"}
                      </button>
                    </div>
                  </div>
                  <p style={{ color: "#666", fontSize: 13, margin: "0 0 12px", lineHeight: 1.5 }}>
                    {fund.description?.slice(0, 120)}{fund.description?.length > 120 ? "..." : ""}
                  </p>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                    <div style={{ display: "flex", gap: 16 }}>
                      <div>
                        <span style={{ color: "#444", fontSize: 11 }}>{"Goal: "}</span>
                        <span style={{ color: "#00ff88", fontWeight: 700, fontSize: 13 }}>{"৳" + fund.goalAmount.toLocaleString() + " Taka"}</span>
                      </div>
                      {fund.status === "Approved" && (
                        <div>
                          <span style={{ color: "#444", fontSize: 11 }}>{"Raised: "}</span>
                          <span style={{ color: "#6bcbff", fontWeight: 700, fontSize: 13 }}>{"৳" + (fund.amountRaised || 0).toLocaleString() + " Taka"}</span>
                        </div>
                      )}
                    </div>
                    <span style={{ color: "#333", fontSize: 11 }}>
                      {new Date(fund.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </span>
                  </div>
                  {fund.status === "Approved" && (
                    <div style={{ marginTop: 12 }}>
                      <ProgressBar raised={fund.amountRaised || 0} goal={fund.goalAmount} />
                    </div>
                  )}
                  {fund.status === "Pending" && (
                    <div style={{ marginTop: 10, padding: "8px 12px", background: "rgba(255,170,0,0.05)", border: "1px solid rgba(255,170,0,0.15)", borderRadius: 8, color: "#ffaa0099", fontSize: 12 }}>
                      {"⏳ Awaiting admin review."}
                    </div>
                  )}
                  {fund.status === "Rejected" && (
                    <div style={{ marginTop: 10, padding: "8px 12px", background: "rgba(255,68,68,0.05)", border: "1px solid rgba(255,68,68,0.15)", borderRadius: 8, color: "#ff444499", fontSize: 12 }}>
                      {"❌ Not approved. You may submit a new request."}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {selectedFund && (
        <DetailPanel
          fund={selectedFund}
          onClose={() => setSelectedFund(null)}
          onDonate={() => { setDonatingTo(selectedFund); setSelectedFund(null); }}
          onDelete={handleDelete}
          isOwn={selectedFund.userId?._id === user?._id || selectedFund.userId === user?._id}
        />
      )}

      {donatingTo && (
        <PaymentModal
          fund={donatingTo} token={token}
          onClose={() => setDonatingTo(null)}
          onSuccess={handleDonateSuccess}
        />
      )}

      {showSubmit && (
        <SubmitForm token={token} onClose={() => setShowSubmit(false)} onSubmitted={fetchFunds} />
      )}
    </div>
  );
};

export default MassFunding;