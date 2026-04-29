import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import useAuth from "../../hooks/useAuth";
import Navbar from "../../components/Navbar";

const fundCategories = [
  { value: "medical",   label: "Medical",        icon: "🏥", color: "#00ff88", description: "Hospital bills, medicine, treatment" },
  { value: "disaster",  label: "Disaster Relief", icon: "🌊", color: "#6bcbff", description: "Flood, fire, natural disaster" },
  { value: "education", label: "Education",       icon: "📚", color: "#ffd93d", description: "School fees, books, supplies" },
  { value: "food",      label: "Food & Shelter",  icon: "🏠", color: "#ff9f43", description: "Basic needs and housing" },
  { value: "other",     label: "Other",           icon: "💡", color: "#a29bfe", description: "Any other emergency need" },
];

const FundRequestForm = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [form, setForm] = useState({ title: "", description: "", amountNeeded: "" });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [blocked, setBlocked] = useState(false);
  const [blockChecking, setBlockChecking] = useState(true);

  // Check if user's fund features are blocked
  useEffect(() => {
    const checkBlock = async () => {
      try {
        const res = await axios.get("http://localhost:3001/api/auth/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setBlocked(res.data.fundFeaturesBlocked || false);
      } catch (err) {
        console.error(err);
      }
      setBlockChecking(false);
    };
    checkBlock();
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (blocked) return;
    setLoading(true);
    setError("");
    try {
      await axios.post("http://localhost:3001/api/fund/request", {
        title: form.title,
        description: form.description,
        amountNeeded: Number(form.amountNeeded),
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMessage("Fund request submitted successfully!");
      setTimeout(() => navigate("/user/fund/list"), 2000);
    } catch (err) {
      setError(err.response?.data?.message || "Submission failed");
    }
    setLoading(false);
  };

  const selectedCategoryData = fundCategories.find(c => c.value === selectedCategory);
  const progress = Math.min((Number(form.amountNeeded) / 100000) * 100, 100);

  if (blockChecking) return (
    <div style={{ backgroundColor: "#111111", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <style>{"@keyframes spin{to{transform:rotate(360deg)}}"}</style>
      <div style={{ width: 36, height: 36, border: "2px solid rgba(0,255,136,0.1)", borderTop: "2px solid #00ff88", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
    </div>
  );

  return (
    <div style={styles.page}>
      <style>{`
        @keyframes spin    { to { transform: rotate(360deg); } }
        @keyframes fadeUp  { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
        @keyframes slideIn { from { opacity:0; transform:translateX(-20px); } to { opacity:1; transform:translateX(0); } }
        @keyframes fillBar { from { width:0%; } to { width:${progress}%; } }

        .cat-card { transition: all 0.3s ease !important; cursor: pointer; }
        .cat-card:hover { transform: translateY(-4px) !important; box-shadow: 0 12px 30px rgba(0,0,0,0.3) !important; }
        .next-btn { transition: all 0.3s ease !important; }
        .next-btn:hover { transform: translateY(-2px) !important; box-shadow: 0 10px 30px rgba(0,255,136,0.3) !important; }
        .back-btn { transition: all 0.3s ease !important; }
        .back-btn:hover { background: rgba(255,255,255,0.05) !important; color: #fff !important; }
        .submit-btn { transition: all 0.3s ease !important; }
        .submit-btn:hover:not(:disabled) { transform: translateY(-2px) !important; box-shadow: 0 10px 30px rgba(0,255,136,0.4) !important; }
        .input-field:focus { border-color: #00ff88 !important; box-shadow: 0 0 0 3px rgba(0,255,136,0.1) !important; outline: none !important; }
        textarea:focus { border-color: #00ff88 !important; box-shadow: 0 0 0 3px rgba(0,255,136,0.1) !important; outline: none !important; }
      `}</style>

      <Navbar />

      {/* ── Fund Features Blocked Banner ── */}
      {blocked && (
        <div style={blockedStyles.banner}>
          <div style={blockedStyles.iconWrap}>{"🚫"}</div>
          <div style={{ flex: 1 }}>
            <p style={blockedStyles.title}>{"Fund Request Feature Blocked"}</p>
            <p style={blockedStyles.desc}>
              {"Your fund request feature has been blocked due to multiple warnings for submitting fake or fraudulent requests. Please contact the admin to resolve this."}
            </p>
            <div style={blockedStyles.contactRow}>
              <span style={blockedStyles.contactItem}>{"📧 admin@emergencybd.com"}</span>
              <span style={blockedStyles.contactItem}>{"📞 +8801700000000"}</span>
            </div>
          </div>
        </div>
      )}

      <div style={{
        ...styles.layout,
        opacity: blocked ? 0.4 : 1,
        pointerEvents: blocked ? "none" : "auto",
      }}>

        {/* ── LEFT PANEL ── */}
        <div style={styles.leftPanel}>
          <div style={styles.leftContent}>

            <div style={styles.leftHeader}>
              <div style={styles.headerIcon}>{"💰"}</div>
              <h2 style={styles.leftTitle}>{"Fund Request"}</h2>
              <p style={styles.leftSubtitle}>{"Request emergency funds from the community quickly and transparently"}</p>
            </div>

            {/* Step Tracker */}
            <div style={styles.stepsContainer}>
              {[
                { num: 1, label: "Choose Category", icon: "🏷️" },
                { num: 2, label: "Add Details",      icon: "📝" },
                { num: 3, label: "Review & Submit",  icon: "✅" },
              ].map((s, i) => (
                <div key={s.num} style={styles.stepWrapper}>
                  <div style={styles.stepRow}>
                    <div style={{
                      ...styles.stepCircle,
                      ...(step >= s.num ? styles.stepActive : {}),
                      ...(step > s.num ? styles.stepDone : {}),
                    }}>
                      {step > s.num ? "✓" : s.icon}
                    </div>
                    <div style={styles.stepText}>
                      <p style={{ ...styles.stepLabel, ...(step >= s.num ? styles.stepLabelActive : {}) }}>
                        {s.label}
                      </p>
                      <p style={styles.stepNum}>{"Step " + s.num}</p>
                    </div>
                  </div>
                  {i < 2 && (
                    <div style={{ ...styles.stepConnector, ...(step > s.num ? styles.stepConnectorDone : {}) }} />
                  )}
                </div>
              ))}
            </div>

            {/* Selected Category Preview */}
            {selectedCategoryData && (
              <div style={{
                ...styles.categoryPreview,
                borderColor: selectedCategoryData.color + "40",
                backgroundColor: selectedCategoryData.color + "08",
              }}>
                <span style={styles.previewIcon}>{selectedCategoryData.icon}</span>
                <div>
                  <p style={{ ...styles.previewLabel, color: selectedCategoryData.color }}>
                    {selectedCategoryData.label}
                  </p>
                  <p style={styles.previewDesc}>{selectedCategoryData.description}</p>
                </div>
              </div>
            )}

            {/* Amount Visualizer */}
            {form.amountNeeded && (
              <div style={styles.amountVisualizer}>
                <div style={styles.amountHeader}>
                  <span style={styles.amountLabel}>{"Requested Amount"}</span>
                  <span style={styles.amountValue}>{"৳ " + Number(form.amountNeeded).toLocaleString()}</span>
                </div>
                <div style={styles.progressBg}>
                  <div style={{ ...styles.progressFill, width: `${progress}%`, animation: "fillBar 0.8s ease" }} />
                </div>
                <p style={styles.amountNote}>{"Relative to ৳1,00,000 reference"}</p>
              </div>
            )}

            {/* Tips */}
            <div style={styles.tipsBox}>
              <h4 style={styles.tipsTitle}>{"💡 Tips for Approval"}</h4>
              {[
                "Be specific about how funds will be used",
                "Provide a realistic amount needed",
                "Include all relevant context",
                "Admin will review before publishing",
              ].map((tip, i) => (
                <div key={i} style={styles.tipItem}>
                  <span style={styles.tipDot}>{"▸"}</span>
                  <span style={styles.tipText}>{tip}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── RIGHT PANEL ── */}
        <div style={styles.rightPanel}>

          {message && <div style={styles.successMsg}>{"✅ " + message}</div>}
          {error   && <div style={styles.errorMsg}>{"❌ " + error}</div>}

          <form onSubmit={handleSubmit} style={styles.form}>

            {/* STEP 1 */}
            {step === 1 && (
              <div style={{ animation: "slideIn 0.3s ease" }}>
                <div style={styles.stepHeader}>
                  <h3 style={styles.stepTitle}>{"Choose a Category"}</h3>
                  <p style={styles.stepSubtitle}>{"What type of fund request is this?"}</p>
                </div>

                <div style={styles.categoryGrid}>
                  {fundCategories.map((cat) => (
                    <div
                      key={cat.value}
                      className="cat-card"
                      style={{
                        ...styles.catCard,
                        ...(selectedCategory === cat.value ? {
                          borderColor: cat.color,
                          backgroundColor: cat.color + "10",
                          boxShadow: `0 0 24px ${cat.color}20`,
                        } : {}),
                      }}
                      onClick={() => setSelectedCategory(cat.value)}
                    >
                      <div style={{ ...styles.catIconBox, backgroundColor: cat.color + "15", border: `1px solid ${cat.color}25` }}>
                        <span style={styles.catIcon}>{cat.icon}</span>
                      </div>
                      <p style={{ ...styles.catLabel, color: selectedCategory === cat.value ? cat.color : "#e0e0e0" }}>
                        {cat.label}
                      </p>
                      <p style={styles.catDesc}>{cat.description}</p>
                      {selectedCategory === cat.value && (
                        <div style={{ ...styles.checkBadge, backgroundColor: cat.color }}>{"✓"}</div>
                      )}
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  className="next-btn"
                  style={{ ...styles.nextBtn, opacity: selectedCategory ? 1 : 0.4 }}
                  onClick={() => selectedCategory && setStep(2)}
                >
                  {"Continue →"}
                </button>
              </div>
            )}

            {/* STEP 2 */}
            {step === 2 && (
              <div style={{ animation: "slideIn 0.3s ease" }}>
                <div style={styles.stepHeader}>
                  <h3 style={styles.stepTitle}>{"Request Details"}</h3>
                  <p style={styles.stepSubtitle}>{"Provide clear details about your fund request"}</p>
                </div>

                <div style={styles.formFields}>
                  <div style={styles.field}>
                    <label style={styles.fieldLabel}>
                      {"📌 Request Title "}
                      <span style={styles.required}>{"*"}</span>
                    </label>
                    <input
                      className="input-field"
                      type="text"
                      placeholder="e.g. Emergency medical treatment for flood victim"
                      value={form.title}
                      onChange={e => setForm({ ...form, title: e.target.value })}
                      required
                      style={styles.input}
                    />
                  </div>

                  <div style={styles.field}>
                    <label style={styles.fieldLabel}>
                      {"📝 Description "}
                      <span style={styles.required}>{"*"}</span>
                    </label>
                    <textarea
                      rows="7"
                      placeholder="Describe your situation in detail..."
                      value={form.description}
                      onChange={e => setForm({ ...form, description: e.target.value })}
                      required
                      style={styles.textarea}
                    />
                    <span style={styles.charCount}>{form.description.length + " characters"}</span>
                  </div>

                  <div style={styles.field}>
                    <label style={styles.fieldLabel}>
                      {"💵 Amount Needed (BDT) "}
                      <span style={styles.required}>{"*"}</span>
                    </label>
                    <div style={styles.amountInputWrapper}>
                      <span style={styles.currencySymbol}>{"৳"}</span>
                      <input
                        className="input-field"
                        type="number"
                        placeholder="0"
                        value={form.amountNeeded}
                        onChange={e => setForm({ ...form, amountNeeded: e.target.value })}
                        min="1"
                        required
                        style={{ ...styles.input, paddingLeft: "40px" }}
                      />
                    </div>
                  </div>

                  <div style={styles.quickAmounts}>
                    <p style={styles.quickLabel}>{"Quick Select:"}</p>
                    <div style={styles.quickBtns}>
                      {[5000, 10000, 25000, 50000].map(amt => (
                        <button
                          key={amt}
                          type="button"
                          style={{
                            ...styles.quickBtn,
                            ...(Number(form.amountNeeded) === amt ? styles.quickBtnActive : {}),
                          }}
                          onClick={() => setForm({ ...form, amountNeeded: amt.toString() })}
                        >
                          {"৳" + amt.toLocaleString()}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div style={styles.btnRow}>
                  <button type="button" className="back-btn" style={styles.backBtn} onClick={() => setStep(1)}>
                    {"← Back"}
                  </button>
                  <button
                    type="button"
                    className="next-btn"
                    style={{ ...styles.nextBtn, flex: 1, opacity: form.title && form.description && form.amountNeeded ? 1 : 0.4 }}
                    onClick={() => form.title && form.description && form.amountNeeded && setStep(3)}
                  >
                    {"Continue →"}
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3 */}
            {step === 3 && (
              <div style={{ animation: "slideIn 0.3s ease" }}>
                <div style={styles.stepHeader}>
                  <h3 style={styles.stepTitle}>{"Review & Submit"}</h3>
                  <p style={styles.stepSubtitle}>{"Confirm your fund request details"}</p>
                </div>

                <div style={styles.reviewCard}>
                  <div style={styles.reviewHeader}>
                    <span style={{ fontSize: "28px" }}>{selectedCategoryData?.icon}</span>
                    <div>
                      <p style={{ ...styles.reviewCatLabel, color: selectedCategoryData?.color }}>
                        {selectedCategoryData?.label}
                      </p>
                      <p style={styles.reviewTitle}>{form.title}</p>
                    </div>
                  </div>
                  <div style={styles.reviewDivider} />
                  <div style={styles.reviewRows}>
                    {[
                      { label: "Category", value: selectedCategoryData?.label },
                      { label: "Title",    value: form.title },
                      { label: "Status",   value: "⏳ Pending Admin Review" },
                    ].map((row, i) => (
                      <div key={i} style={styles.reviewRow}>
                        <span style={styles.reviewLabel}>{row.label}</span>
                        <span style={styles.reviewValue}>{row.value}</span>
                      </div>
                    ))}
                  </div>
                  <div style={styles.reviewDivider} />
                  <div style={styles.reviewDesc}>
                    <p style={styles.reviewDescLabel}>{"Description"}</p>
                    <p style={styles.reviewDescText}>{form.description}</p>
                  </div>
                  <div style={styles.reviewDivider} />
                  <div style={styles.reviewAmount}>
                    <p style={styles.reviewAmountLabel}>{"Total Amount Requested"}</p>
                    <p style={styles.reviewAmountValue}>{"৳ " + Number(form.amountNeeded).toLocaleString()}</p>
                    <div style={styles.progressBg}>
                      <div style={{ ...styles.progressFill, width: `${progress}%` }} />
                    </div>
                  </div>
                </div>

                <div style={styles.warningBox}>
                  {"⚠️ Your request will be reviewed by an admin before it goes public. Please ensure all information is accurate."}
                </div>

                <div style={styles.btnRow}>
                  <button type="button" className="back-btn" style={styles.backBtn} onClick={() => setStep(2)}>
                    {"← Back"}
                  </button>
                  <button
                    type="submit"
                    className="submit-btn"
                    style={{ ...styles.submitBtn, flex: 1 }}
                    disabled={loading || blocked}
                  >
                    {loading ? (
                      <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                        <span style={styles.btnSpinner} />
                        {"Submitting..."}
                      </span>
                    ) : "💰 Submit Fund Request"}
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

const blockedStyles = {
  banner:      { backgroundColor: "rgba(255,107,107,0.07)", borderBottom: "1px solid rgba(255,107,107,0.2)", padding: "20px 32px", display: "flex", alignItems: "flex-start", gap: "16px" },
  iconWrap:    { fontSize: "32px", flexShrink: 0 },
  title:       { color: "#ff6b6b", fontSize: "15px", fontWeight: "700", margin: "0 0 6px" },
  desc:        { color: "#888888", fontSize: "13px", lineHeight: "1.6", margin: "0 0 10px" },
  contactRow:  { display: "flex", gap: "20px", flexWrap: "wrap" },
  contactItem: { color: "#00ff88", fontSize: "13px", fontWeight: "600" },
};

const styles = {
  page:        { backgroundColor: "#111111", minHeight: "100vh" },
  layout:      { display: "flex", minHeight: "calc(100vh - 70px)", transition: "opacity 0.3s ease" },
  leftPanel:   { width: "300px", minWidth: "300px", backgroundColor: "#0d0d0d", borderRight: "1px solid #1e1e1e", overflowY: "auto" },
  leftContent: { padding: "32px 24px", display: "flex", flexDirection: "column", gap: "24px" },
  leftHeader:  { display: "flex", flexDirection: "column", gap: "10px" },
  headerIcon:  { fontSize: "40px" },
  leftTitle:   { color: "#ffffff", fontSize: "22px", fontWeight: "700" },
  leftSubtitle:{ color: "#555555", fontSize: "13px", lineHeight: "1.7" },

  stepsContainer:    { display: "flex", flexDirection: "column", gap: "0px" },
  stepWrapper:       { display: "flex", flexDirection: "column" },
  stepRow:           { display: "flex", alignItems: "center", gap: "14px", padding: "6px 0" },
  stepCircle:        { width: "36px", height: "36px", borderRadius: "50%", backgroundColor: "#1e1e1e", border: "1px solid #333333", color: "#444444", fontSize: "14px", fontWeight: "700", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.3s ease" },
  stepActive:        { backgroundColor: "rgba(0,255,136,0.12)", border: "1px solid #00ff88", color: "#00ff88" },
  stepDone:          { backgroundColor: "#00ff88", border: "1px solid #00ff88", color: "#0a0a0a" },
  stepText:          { display: "flex", flexDirection: "column", gap: "2px" },
  stepLabel:         { color: "#444444", fontSize: "13px", fontWeight: "600", transition: "color 0.3s ease" },
  stepLabelActive:   { color: "#e0e0e0" },
  stepNum:           { color: "#333333", fontSize: "11px" },
  stepConnector:     { width: "2px", height: "20px", backgroundColor: "#222222", marginLeft: "17px", transition: "background-color 0.3s ease" },
  stepConnectorDone: { backgroundColor: "#00ff88" },

  categoryPreview: { border: "1px solid", borderRadius: "12px", padding: "16px", display: "flex", alignItems: "center", gap: "14px" },
  previewIcon:     { fontSize: "28px" },
  previewLabel:    { fontSize: "14px", fontWeight: "700" },
  previewDesc:     { color: "#555555", fontSize: "12px", marginTop: "2px" },

  amountVisualizer: { backgroundColor: "#1a1a1a", border: "1px solid #222222", borderRadius: "12px", padding: "16px", display: "flex", flexDirection: "column", gap: "10px" },
  amountHeader:     { display: "flex", justifyContent: "space-between", alignItems: "center" },
  amountLabel:      { color: "#555555", fontSize: "12px" },
  amountValue:      { color: "#00ff88", fontSize: "16px", fontWeight: "700" },
  progressBg:       { height: "6px", backgroundColor: "#222222", borderRadius: "3px", overflow: "hidden" },
  progressFill:     { height: "100%", background: "linear-gradient(90deg,#00ff88,#00cc6a)", borderRadius: "3px", transition: "width 0.8s ease" },
  amountNote:       { color: "#333333", fontSize: "11px" },

  tipsBox:   { backgroundColor: "#1a1a1a", border: "1px solid #222222", borderRadius: "12px", padding: "18px", display: "flex", flexDirection: "column", gap: "10px" },
  tipsTitle: { color: "#ffffff", fontSize: "13px", fontWeight: "600" },
  tipItem:   { display: "flex", alignItems: "flex-start", gap: "10px" },
  tipDot:    { color: "#00ff88", fontSize: "10px", marginTop: "2px", flexShrink: 0 },
  tipText:   { color: "#666666", fontSize: "12px", lineHeight: "1.5" },

  rightPanel:  { flex: 1, padding: "40px 48px", overflowY: "auto" },
  successMsg:  { backgroundColor: "rgba(0,255,136,0.08)", border: "1px solid rgba(0,255,136,0.2)", color: "#00ff88", padding: "14px 20px", borderRadius: "10px", fontSize: "14px", marginBottom: "24px" },
  errorMsg:    { backgroundColor: "rgba(255,68,68,0.08)", border: "1px solid rgba(255,68,68,0.2)", color: "#ff4444", padding: "14px 20px", borderRadius: "10px", fontSize: "14px", marginBottom: "24px" },
  form:        { display: "flex", flexDirection: "column" },
  stepHeader:  { marginBottom: "28px" },
  stepTitle:   { color: "#ffffff", fontSize: "22px", fontWeight: "700", marginBottom: "6px" },
  stepSubtitle:{ color: "#555555", fontSize: "13px" },

  categoryGrid: { display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "16px", marginBottom: "28px" },
  catCard:      { backgroundColor: "#1a1a1a", border: "1px solid #222222", borderRadius: "14px", padding: "20px 16px", display: "flex", flexDirection: "column", alignItems: "center", gap: "10px", position: "relative", textAlign: "center" },
  catIconBox:   { width: "52px", height: "52px", borderRadius: "14px", display: "flex", alignItems: "center", justifyContent: "center" },
  catIcon:      { fontSize: "24px" },
  catLabel:     { fontSize: "14px", fontWeight: "600", transition: "color 0.3s ease" },
  catDesc:      { color: "#555555", fontSize: "11px", lineHeight: "1.4" },
  checkBadge:   { position: "absolute", top: "10px", right: "10px", width: "20px", height: "20px", borderRadius: "50%", color: "#0a0a0a", fontSize: "11px", fontWeight: "700", display: "flex", alignItems: "center", justifyContent: "center" },
  nextBtn:      { width: "100%", backgroundColor: "#00ff88", color: "#0a0a0a", border: "none", padding: "15px", borderRadius: "10px", fontSize: "15px", fontWeight: "700", cursor: "pointer", letterSpacing: "0.5px" },

  formFields:         { display: "flex", flexDirection: "column", gap: "24px", marginBottom: "28px" },
  field:              { display: "flex", flexDirection: "column", gap: "8px" },
  fieldLabel:         { color: "#888888", fontSize: "13px", fontWeight: "500" },
  required:           { color: "#ff4444" },
  input:              { backgroundColor: "#1a1a1a", border: "1px solid #2e2e2e", color: "#e0e0e0", padding: "13px 16px", borderRadius: "10px", fontSize: "14px", width: "100%", fontFamily: "inherit", transition: "all 0.3s ease" },
  textarea:           { backgroundColor: "#1a1a1a", border: "1px solid #2e2e2e", color: "#e0e0e0", padding: "14px 16px", borderRadius: "10px", fontSize: "14px", resize: "vertical", fontFamily: "inherit", lineHeight: "1.6", transition: "all 0.3s ease" },
  charCount:          { color: "#444444", fontSize: "11px", textAlign: "right" },
  amountInputWrapper: { position: "relative" },
  currencySymbol:     { position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "#00ff88", fontSize: "16px", fontWeight: "700", zIndex: 1 },
  quickAmounts:       { display: "flex", flexDirection: "column", gap: "10px" },
  quickLabel:         { color: "#555555", fontSize: "12px" },
  quickBtns:          { display: "flex", gap: "10px", flexWrap: "wrap" },
  quickBtn:           { backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a", color: "#888888", padding: "8px 16px", borderRadius: "8px", fontSize: "13px", cursor: "pointer", transition: "all 0.3s ease", fontFamily: "inherit" },
  quickBtnActive:     { backgroundColor: "rgba(0,255,136,0.1)", border: "1px solid #00ff88", color: "#00ff88" },
  btnRow:             { display: "flex", gap: "12px" },
  backBtn:            { padding: "15px 24px", backgroundColor: "transparent", border: "1px solid #333333", color: "#888888", borderRadius: "10px", fontSize: "14px", cursor: "pointer", transition: "all 0.3s ease" },

  reviewCard:       { backgroundColor: "#1a1a1a", border: "1px solid #222222", borderRadius: "16px", padding: "28px", marginBottom: "20px", display: "flex", flexDirection: "column", gap: "20px" },
  reviewHeader:     { display: "flex", alignItems: "center", gap: "16px" },
  reviewCatLabel:   { fontSize: "12px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "1px" },
  reviewTitle:      { color: "#ffffff", fontSize: "16px", fontWeight: "600", marginTop: "4px" },
  reviewDivider:    { height: "1px", backgroundColor: "#222222" },
  reviewRows:       { display: "flex", flexDirection: "column", gap: "12px" },
  reviewRow:        { display: "flex", justifyContent: "space-between", alignItems: "center" },
  reviewLabel:      { color: "#555555", fontSize: "13px" },
  reviewValue:      { color: "#e0e0e0", fontSize: "13px", fontWeight: "500" },
  reviewDesc:       { display: "flex", flexDirection: "column", gap: "8px" },
  reviewDescLabel:  { color: "#555555", fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.5px" },
  reviewDescText:   { color: "#cccccc", fontSize: "13px", lineHeight: "1.7" },
  reviewAmount:     { display: "flex", flexDirection: "column", gap: "10px" },
  reviewAmountLabel:{ color: "#555555", fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.5px" },
  reviewAmountValue:{ color: "#00ff88", fontSize: "28px", fontWeight: "700" },

  warningBox: { backgroundColor: "rgba(255,170,0,0.06)", border: "1px solid rgba(255,170,0,0.2)", color: "#ffaa00", padding: "14px 18px", borderRadius: "10px", fontSize: "13px", lineHeight: "1.6", marginBottom: "20px" },
  submitBtn:  { backgroundColor: "#00ff88", color: "#0a0a0a", border: "none", padding: "15px", borderRadius: "10px", fontSize: "15px", fontWeight: "700", cursor: "pointer", letterSpacing: "0.5px" },
  btnSpinner: { width: "16px", height: "16px", border: "2px solid rgba(0,0,0,0.2)", borderTop: "2px solid #0a0a0a", borderRadius: "50%", animation: "spin 0.8s linear infinite", display: "inline-block" },
};

export default FundRequestForm;