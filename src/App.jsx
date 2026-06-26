import { useState, useRef, useEffect } from "react";
import {
  SignedIn, SignedOut, SignInButton, SignUpButton,
  UserButton, useUser
} from "@clerk/clerk-react";
import { supabase } from "./supabase";

const YT_API_KEY = import.meta.env.VITE_YT_API_KEY;

const TOPICS = [
  "Fix a leaking pipe", "Break into tech sales", "Learn Python programming",
  "Start a small business", "Master public speaking", "Learn guitar from scratch",
  "Build a personal brand", "Get fit without a gym",
];

const PHASE_META = {
  "Foundation":  { color: "#2563eb", icon: "◎", tags: ["Beginner", "Essential"] },
  "Core Skills": { color: "#7c3aed", icon: "◉", tags: ["Intermediate", "Hands-On"] },
  "Advanced":    { color: "#059669", icon: "●", tags: ["Advanced", "Pro Tips"] },
};

function parseDuration(iso) {
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return "? min";
  const h = parseInt(m[1] || 0), min = parseInt(m[2] || 0);
  if (h > 0) return `${h}h ${min}m`;
  if (min > 0) return `${min} min`;
  return "<1 min";
}

function formatViews(n) {
  const v = parseInt(n || 0);
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(1) + "M";
  if (v >= 1_000) return Math.round(v / 1_000) + "K";
  return String(v);
}

// ── Shared Nav ────────────────────────────────────────────────────────────────
function Nav({ showHomeLink = false, onHomeClick }) {
  return (
    <nav style={{ background: "white", borderBottom: "1px solid #e8e8e4", padding: "14px 40px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 50 }}>
      <span
        onClick={onHomeClick}
        style={{ fontSize: "17px", fontWeight: "800", color: "#0f172a", cursor: onHomeClick ? "pointer" : "default", letterSpacing: "-0.3px" }}>
        Leveling<span style={{ color: "#2563eb" }}>Path</span>
      </span>
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        {showHomeLink && (
          <button onClick={onHomeClick} style={{ background: "none", border: "none", color: "#6b7280", fontSize: "14px", cursor: "pointer", fontFamily: "Inter, sans-serif", padding: "6px 12px", borderRadius: "7px" }}>
            Home
          </button>
        )}
        <SignedOut>
          <SignInButton mode="modal">
            <button style={{ background: "none", border: "1.5px solid #e2e8f0", borderRadius: "8px", color: "#374151", fontSize: "14px", fontWeight: "600", padding: "8px 18px", cursor: "pointer", fontFamily: "Inter, sans-serif" }}>Sign in</button>
          </SignInButton>
          <SignUpButton mode="modal">
            <button style={{ background: "#2563eb", border: "none", borderRadius: "8px", color: "white", fontSize: "14px", fontWeight: "700", padding: "8px 18px", cursor: "pointer", fontFamily: "Inter, sans-serif" }}>Get started free</button>
          </SignUpButton>
        </SignedOut>
        <SignedIn>
          <UserButton afterSignOutUrl="/" />
        </SignedIn>
      </div>
    </nav>
  );
}

// ── CompletionModal ───────────────────────────────────────────────────────────
function CompletionModal({ path, user, onClose }) {
  const cardRef = useRef(null);
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const completedDate = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const videoCount = path?.videos?.length || 0;
  const firstName = user?.firstName || user?.username || "You";
  const lastName = user?.lastName || "";
  const fullName = [firstName, lastName].filter(Boolean).join(" ");

  async function handleDownload() {
    setDownloading(true);
    try {
      const script = document.createElement("script");
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";
      script.onload = async () => {
        const canvas = await window.html2canvas(cardRef.current, { scale: 3, backgroundColor: null, useCORS: true });
        const link = document.createElement("a");
        link.download = `levelingpath-${path.goal.replace(/\s+/g, "-").toLowerCase()}.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
        setDownloading(false);
      };
      document.head.appendChild(script);
    } catch (e) { setDownloading(false); }
  }

  async function handleCopyLink() {
    const text = `🏆 I just completed "${path.goal}" on LevelingPath!\n\nFree AI-curated YouTube learning paths → levelingpath.com`;
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2500); } catch (e) {}
  }

  return (
    <div onClick={e => e.target === e.currentTarget && onClose()} style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(15,23,42,0.5)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
      <style>{`@keyframes slideUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}`}</style>
      <div style={{ animation: "slideUp 0.3s ease", width: "100%", maxWidth: "460px" }}>
        <div ref={cardRef} style={{ background: "white", borderRadius: "16px", padding: "40px 36px 32px", position: "relative", overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,0.15)" }}>
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "4px", background: "linear-gradient(90deg, #2563eb, #7c3aed)" }} />
          <div style={{ textAlign: "center", marginBottom: "20px" }}>
            <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "64px", height: "64px", borderRadius: "50%", background: "#fef9c3", border: "2px solid #fbbf24", fontSize: "32px" }}>🏆</div>
          </div>
          <div style={{ textAlign: "center", marginBottom: "20px" }}>
            <p style={{ fontSize: "11px", fontWeight: "700", letterSpacing: "2px", color: "#7c3aed", marginBottom: "10px" }}>SKILL COMPLETED</p>
            <p style={{ fontSize: "20px", fontWeight: "700", color: "#0f172a", lineHeight: "1.3", marginBottom: "8px" }}>{path.goal}</p>
            <p style={{ fontSize: "14px", color: "#6b7280" }}>Completed by <strong style={{ color: "#0f172a" }}>{fullName}</strong></p>
          </div>
          <div style={{ height: "1px", background: "#f1f5f9", margin: "20px 0" }} />
          <div style={{ display: "flex", justifyContent: "center", gap: "40px", marginBottom: "20px" }}>
            {[[videoCount, "Videos watched"], [completedDate, "Completed"]].map(([val, label]) => (
              <div key={label} style={{ textAlign: "center" }}>
                <p style={{ fontSize: "16px", fontWeight: "700", color: "#0f172a" }}>{val}</p>
                <p style={{ fontSize: "11px", color: "#94a3b8", marginTop: "2px" }}>{label}</p>
              </div>
            ))}
          </div>
          <div style={{ textAlign: "center" }}>
            <span style={{ fontSize: "12px", color: "#94a3b8", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "20px", padding: "4px 14px" }}>levelingpath.com</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: "10px", marginTop: "14px" }}>
          <button onClick={handleDownload} disabled={downloading} style={{ flex: 1, padding: "12px", borderRadius: "10px", background: "#0f172a", border: "none", color: "white", fontWeight: "700", fontSize: "14px", cursor: "pointer", fontFamily: "Inter, sans-serif" }}>
            {downloading ? "Saving…" : "⬇ Download PNG"}
          </button>
          <button onClick={handleCopyLink} style={{ flex: 1, padding: "12px", borderRadius: "10px", background: copied ? "#059669" : "white", border: "1px solid #e2e8f0", color: copied ? "white" : "#0f172a", fontWeight: "700", fontSize: "14px", cursor: "pointer", transition: "all 0.2s", fontFamily: "Inter, sans-serif" }}>
            {copied ? "✓ Copied!" : "🔗 Copy share text"}
          </button>
        </div>
        <div style={{ textAlign: "center", marginTop: "12px" }}>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.6)", fontSize: "13px", cursor: "pointer" }}>Close</button>
        </div>
      </div>
    </div>
  );
}

// ── VideoCard ─────────────────────────────────────────────────────────────────
function VideoCard({ video, globalIndex, visible, phaseColor, watched, onToggle }) {
  const [open, setOpen] = useState(false);
  const [imgErr, setImgErr] = useState(false);
  return (
    <div onClick={() => setOpen(v => !v)} style={{
      opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(16px)",
      transition: `opacity 0.35s ease ${globalIndex * 0.07}s, transform 0.35s ease ${globalIndex * 0.07}s`,
      background: "white", border: `1px solid ${open ? phaseColor + "40" : watched ? phaseColor + "25" : "#e8e8e4"}`,
      borderRadius: "10px", marginBottom: "8px", cursor: "pointer", overflow: "hidden",
    }}>
      <div style={{ display: "flex", gap: "12px", padding: "12px", alignItems: "center" }}>
        <div onClick={e => { e.stopPropagation(); onToggle(); }} style={{
          minWidth: "26px", height: "26px", borderRadius: "50%",
          border: `1.5px solid ${watched ? phaseColor : "#d1d5db"}`,
          background: watched ? phaseColor : "transparent",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: watched ? "white" : "#9ca3af", fontWeight: "600", fontSize: "11px", flexShrink: 0, transition: "all 0.2s",
        }}>{watched ? "✓" : globalIndex + 1}</div>
        <div style={{ position: "relative", borderRadius: "6px", overflow: "hidden", flexShrink: 0 }}>
          {!imgErr && video.thumbnail
            ? <img src={video.thumbnail} alt="" onError={() => setImgErr(true)} style={{ width: "88px", height: "50px", objectFit: "cover", display: "block", opacity: watched ? 0.5 : 1 }} />
            : <div style={{ width: "88px", height: "50px", background: "#f3f4f6", display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af", fontSize: "18px" }}>▶</div>
          }
          {video.duration && <div style={{ position: "absolute", bottom: "2px", right: "3px", background: "rgba(0,0,0,0.75)", color: "white", fontSize: "9px", padding: "1px 4px", borderRadius: "2px" }}>{video.duration}</div>}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ color: watched ? "#9ca3af" : "#0f172a", fontWeight: "600", fontSize: "13px", lineHeight: "1.4", marginBottom: "3px", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", textDecoration: watched ? "line-through" : "none" }}>{video.title}</p>
          <p style={{ color: "#6b7280", fontSize: "12px" }}>{video.channel}{video.views && video.views !== "0" ? ` · ${video.views} views` : ""}</p>
        </div>
        <div style={{ textAlign: "center", flexShrink: 0 }}>
          <p style={{ fontSize: "16px", fontWeight: "700", color: phaseColor }}>{video.relevanceScore}</p>
          <p style={{ fontSize: "9px", color: "#9ca3af", letterSpacing: "0.5px" }}>MATCH</p>
        </div>
      </div>
      {open && (
        <div style={{ padding: "12px 14px 14px", borderTop: "1px solid #f1f5f9" }}>
          <div style={{ background: "#f8fafc", borderLeft: `3px solid ${phaseColor}`, borderRadius: "0 6px 6px 0", padding: "10px 12px", fontSize: "13px", color: "#475569", lineHeight: "1.7", marginBottom: "12px" }}>
            <span style={{ color: phaseColor, fontSize: "10px", fontWeight: "700", letterSpacing: "1px" }}>AI ANALYSIS · </span>{video.reason}
          </div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {video.videoId && (
              <a href={`https://youtube.com/watch?v=${video.videoId}`} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "8px 16px", background: "#dc2626", borderRadius: "7px", color: "white", fontSize: "13px", fontWeight: "600", textDecoration: "none" }}>
                ▶ Watch on YouTube
              </a>
            )}
            <button onClick={e => { e.stopPropagation(); onToggle(); }} style={{ padding: "8px 16px", background: watched ? "#f0fdf4" : "#f8fafc", border: `1px solid ${watched ? "#bbf7d0" : "#e2e8f0"}`, borderRadius: "7px", color: watched ? "#15803d" : "#374151", fontSize: "13px", fontWeight: "600", cursor: "pointer" }}>
              {watched ? "✓ Watched" : "Mark as watched"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Landing Page ──────────────────────────────────────────────────────────────
function LandingPage() {
  const topics = ["Fix a leaking pipe","Break into tech sales","Learn Python","Start a business","Master public speaking","Learn guitar","Build a personal brand","Get fit without a gym","Learn to cook","Real estate investing","Learn Spanish","Graphic design","Video editing","Digital marketing","Investing basics","Home renovation"];

  return (
    <div style={{ minHeight: "100vh", background: "#f8f9fa", fontFamily: "'Inter', -apple-system, sans-serif", color: "#0f172a" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        .btn-blue{background:#2563eb;color:white;border:none;border-radius:8px;font-weight:700;cursor:pointer;transition:all .15s;font-family:inherit;}
        .btn-blue:hover{background:#1d4ed8;transform:translateY(-1px);}
        .btn-outline{background:white;border:1.5px solid #e2e8f0;border-radius:8px;color:#374151;font-weight:600;cursor:pointer;transition:all .15s;font-family:inherit;}
        .btn-outline:hover{border-color:#2563eb;color:#2563eb;}
        .feature-card{background:white;border:1px solid #e8e8e4;border-radius:14px;padding:28px;border-left:4px solid #2563eb;transition:box-shadow .2s;}
        .feature-card:hover{box-shadow:0 4px 20px rgba(37,99,235,0.08);}
        .step-num{background:#eff6ff;color:#2563eb;width:36px;height:36px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:15px;margin-bottom:16px;}
        .topic-pill{padding:7px 16px;background:white;border:1px solid #e2e8f0;border-radius:20px;color:#374151;font-size:13px;display:inline-block;margin:4px;cursor:default;font-weight:500;}
      `}</style>

      <Nav />

      {/* Hero — dark navy for strong first impression */}
      <div style={{ background: "#0f172a", padding: "100px 24px 90px", textAlign: "center" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", fontSize: "12px", padding: "6px 16px", borderRadius: "20px", background: "rgba(37,99,235,0.15)", border: "1px solid rgba(37,99,235,0.3)", color: "#93c5fd", marginBottom: "28px", fontWeight: "600", letterSpacing: "0.06em" }}>
          <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#60a5fa", display: "inline-block" }}></span>
          POWERED BY YOUTUBE + AI
        </div>
        <h1 style={{ fontSize: "clamp(38px,6vw,64px)", fontWeight: "900", lineHeight: "1.05", letterSpacing: "-2px", marginBottom: "24px", color: "white" }}>
          Learn any skill.<br />
          <span style={{ color: "#60a5fa" }}>Free. Organized. Fast.</span>
        </h1>
        <p style={{ color: "#94a3b8", fontSize: "18px", lineHeight: "1.75", marginBottom: "40px", maxWidth: "540px", margin: "0 auto 40px" }}>
          Type what you want to learn. Our AI searches YouTube, scores thousands of videos for quality, and builds you a step-by-step path — in seconds.
        </p>
        <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap", marginBottom: "16px" }}>
          <SignUpButton mode="modal">
            <button className="btn-blue" style={{ padding: "14px 36px", fontSize: "16px", borderRadius: "10px" }}>Build my free learning path →</button>
          </SignUpButton>
          <SignInButton mode="modal">
            <button style={{ background: "transparent", border: "1.5px solid rgba(255,255,255,0.2)", borderRadius: "10px", color: "white", fontSize: "16px", fontWeight: "600", padding: "14px 28px", cursor: "pointer", fontFamily: "Inter, sans-serif" }}>Sign in</button>
          </SignInButton>
        </div>
        <p style={{ fontSize: "13px", color: "#475569" }}>Free forever · No credit card · 100% YouTube content</p>
      </div>

      {/* Product preview — white section */}
      <div style={{ background: "white", padding: "80px 24px" }}>
        <div style={{ maxWidth: "820px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "40px" }}>
            <p style={{ fontSize: "12px", fontWeight: "700", letterSpacing: "3px", color: "#2563eb", marginBottom: "12px" }}>THE PRODUCT</p>
            <h2 style={{ fontSize: "clamp(26px,4vw,38px)", fontWeight: "800", letterSpacing: "-1px", color: "#0f172a" }}>See exactly what you're getting</h2>
          </div>
          <div style={{ background: "#f8f9fa", border: "1px solid #e8e8e4", borderRadius: "16px", overflow: "hidden" }}>
            <div style={{ background: "white", borderBottom: "1px solid #e8e8e4", padding: "12px 20px", display: "flex", alignItems: "center", gap: "8px" }}>
              <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#ff5f57" }} />
              <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#ffbd2e" }} />
              <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#28ca41" }} />
              <span style={{ fontSize: "12px", color: "#9ca3af", marginLeft: "8px" }}>LevelingPath — Learn Python programming</span>
            </div>
            <div style={{ padding: "24px" }}>
              <div style={{ background: "white", border: "1px solid #e8e8e4", borderRadius: "12px", padding: "20px", marginBottom: "14px" }}>
                <p style={{ fontSize: "10px", fontWeight: "700", color: "#2563eb", letterSpacing: "2px", marginBottom: "8px" }}>YOUR LEARNING PATH</p>
                <p style={{ fontSize: "16px", fontWeight: "700", color: "#0f172a", marginBottom: "12px" }}>Gain proficiency in Python from beginner to real-world projects</p>
                <div style={{ display: "flex", gap: "20px", fontSize: "13px", color: "#6b7280", marginBottom: "12px" }}>
                  <span>▶ 9 videos</span><span>⏱ ~25 hours</span><span>◈ Real YouTube results</span>
                </div>
                <div style={{ height: "5px", background: "#f1f5f9", borderRadius: "3px" }}>
                  <div style={{ height: "5px", width: "44%", background: "#2563eb", borderRadius: "3px" }} />
                </div>
                <p style={{ fontSize: "12px", color: "#9ca3af", marginTop: "6px" }}>4 of 9 videos watched · 44%</p>
              </div>
              {[
                { num: 1, title: "Python Tutorial for Beginners — Full Course", channel: "Programming with Mosh", views: "8.1M", score: 98, done: true },
                { num: 2, title: "Python Functions Explained Simply", channel: "Bro Code", views: "1.2M", score: 95, done: false },
              ].map(v => (
                <div key={v.num} style={{ background: "white", border: `1px solid ${v.done ? "#bfdbfe" : "#e8e8e4"}`, borderRadius: "10px", padding: "12px 14px", display: "flex", gap: "12px", alignItems: "center", marginBottom: "8px" }}>
                  <div style={{ width: "24px", height: "24px", borderRadius: "50%", background: v.done ? "#2563eb" : "transparent", border: `1.5px solid ${v.done ? "#2563eb" : "#d1d5db"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", color: v.done ? "white" : "#9ca3af", flexShrink: 0, fontWeight: "700" }}>{v.done ? "✓" : v.num}</div>
                  <div style={{ width: "72px", height: "42px", background: "#f3f4f6", borderRadius: "5px", flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: "13px", fontWeight: "600", color: v.done ? "#9ca3af" : "#0f172a", textDecoration: v.done ? "line-through" : "none", marginBottom: "2px" }}>{v.title}</p>
                    <p style={{ fontSize: "11px", color: "#9ca3af" }}>{v.channel} · {v.views} views</p>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <p style={{ fontSize: "15px", fontWeight: "700", color: "#2563eb" }}>{v.score}</p>
                    <p style={{ fontSize: "9px", color: "#9ca3af" }}>MATCH</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* How it works — soft grey */}
      <div style={{ background: "#f8f9fa", padding: "80px 24px", borderTop: "1px solid #e8e8e4", borderBottom: "1px solid #e8e8e4" }}>
        <div style={{ maxWidth: "960px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "52px" }}>
            <p style={{ fontSize: "12px", fontWeight: "700", letterSpacing: "3px", color: "#2563eb", marginBottom: "12px" }}>HOW IT WORKS</p>
            <h2 style={{ fontSize: "clamp(26px,4vw,38px)", fontWeight: "800", letterSpacing: "-1px", color: "#0f172a" }}>From idea to learning path<br />in under 10 seconds</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: "16px" }}>
            {[
              { num: "01", title: "Create your free account", desc: "Sign up in seconds. No credit card, no catch. Your progress is saved forever across all your devices." },
              { num: "02", title: "Type what you want to learn", desc: "Anything from Python to plumbing. Our AI searches YouTube and scores thousands of videos for you." },
              { num: "03", title: "Follow your path", desc: "Watch in order, mark videos done as you go. Come back anytime — your progress is always waiting." },
            ].map(s => (
              <div key={s.num} style={{ background: "white", border: "1px solid #e8e8e4", borderRadius: "14px", padding: "28px 24px" }}>
                <div className="step-num">{s.num}</div>
                <p style={{ fontSize: "16px", fontWeight: "700", color: "#0f172a", marginBottom: "10px", lineHeight: "1.3" }}>{s.title}</p>
                <p style={{ color: "#6b7280", fontSize: "14px", lineHeight: "1.7" }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Features — white */}
      <div style={{ background: "white", padding: "80px 24px" }}>
        <div style={{ maxWidth: "960px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "52px" }}>
            <p style={{ fontSize: "12px", fontWeight: "700", letterSpacing: "3px", color: "#2563eb", marginBottom: "12px" }}>FEATURES</p>
            <h2 style={{ fontSize: "clamp(26px,4vw,38px)", fontWeight: "800", letterSpacing: "-1px", color: "#0f172a" }}>Everything you need to<br />learn anything</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: "16px" }}>
            {[
              { icon: "🧠", title: "AI-curated paths", desc: "Every video scored for relevance and quality. No filler, no rabbit holes — just the best content for your goal.", color: "#2563eb" },
              { icon: "📈", title: "Progress tracking", desc: "Mark videos watched and see your progress bar grow. Your journey is saved to the cloud.", color: "#7c3aed" },
              { icon: "🏆", title: "Completion certificates", desc: "Finish a path and earn a shareable achievement card to post on LinkedIn.", color: "#059669" },
              { icon: "▶️", title: "100% free content", desc: "Every video is free on YouTube. We organize the best ones so you don't waste hours searching.", color: "#2563eb" },
              { icon: "📱", title: "Works everywhere", desc: "Pick up exactly where you left off on any device — phone, tablet, or laptop.", color: "#7c3aed" },
              { icon: "∞", title: "Unlimited paths", desc: "Build as many learning paths as you want. No limits, no upsells, no paywalls — ever.", color: "#059669" },
            ].map(f => (
              <div key={f.title} className="feature-card" style={{ borderLeftColor: f.color }}>
                <div style={{ fontSize: "26px", marginBottom: "14px" }}>{f.icon}</div>
                <p style={{ fontSize: "15px", fontWeight: "700", color: "#0f172a", marginBottom: "8px" }}>{f.title}</p>
                <p style={{ color: "#6b7280", fontSize: "13px", lineHeight: "1.7" }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Topics — blue tint */}
      <div style={{ background: "#eff6ff", padding: "80px 24px", borderTop: "1px solid #bfdbfe", borderBottom: "1px solid #bfdbfe" }}>
        <div style={{ maxWidth: "820px", margin: "0 auto", textAlign: "center" }}>
          <p style={{ fontSize: "12px", fontWeight: "700", letterSpacing: "3px", color: "#2563eb", marginBottom: "12px" }}>LEARN ANYTHING</p>
          <h2 style={{ fontSize: "clamp(24px,3.5vw,36px)", fontWeight: "800", letterSpacing: "-1px", color: "#0f172a", marginBottom: "32px" }}>From any skill, in any field</h2>
          <div>{topics.map(t => <span key={t} className="topic-pill">{t}</span>)}</div>
        </div>
      </div>

      {/* Dashboard preview — grey */}
      <div style={{ background: "#f8f9fa", padding: "80px 24px", borderBottom: "1px solid #e8e8e4" }}>
        <div style={{ maxWidth: "820px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "40px" }}>
            <p style={{ fontSize: "12px", fontWeight: "700", letterSpacing: "3px", color: "#2563eb", marginBottom: "12px" }}>YOUR DASHBOARD</p>
            <h2 style={{ fontSize: "clamp(24px,3.5vw,36px)", fontWeight: "800", letterSpacing: "-1px", color: "#0f172a", marginBottom: "12px" }}>Track every skill, every step</h2>
            <p style={{ color: "#6b7280", fontSize: "16px" }}>Your personal learning hub — see what you're building, what you've finished, and what's next.</p>
          </div>
          <div style={{ background: "white", borderRadius: "16px", overflow: "hidden", border: "1px solid #e8e8e4", boxShadow: "0 4px 24px rgba(0,0,0,0.06)" }}>
            <div style={{ background: "white", borderBottom: "1px solid #e8e8e4", padding: "14px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "15px", fontWeight: "800", color: "#0f172a" }}>Leveling<span style={{ color: "#2563eb" }}>Path</span></span>
              <span style={{ fontSize: "13px", color: "#6b7280" }}>Hey, David 👋</span>
            </div>
            <div style={{ padding: "24px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "12px", marginBottom: "20px" }}>
                {[["4","Paths created"],["1","Completed"],["18","Videos watched"]].map(([val,label]) => (
                  <div key={label} style={{ background: "#f8f9fa", border: "1px solid #e8e8e4", borderRadius: "10px", padding: "16px", textAlign: "center" }}>
                    <p style={{ fontSize: "28px", fontWeight: "800", color: "#0f172a", marginBottom: "4px" }}>{val}</p>
                    <p style={{ fontSize: "12px", color: "#9ca3af" }}>{label}</p>
                  </div>
                ))}
              </div>
              {[["Learn Python programming","67%",67,"#2563eb","4 of 6 videos · In progress"],["Break into tech sales","100%",100,"#059669","6 of 6 · Completed ✓"],["Master public speaking","17%",17,"#7c3aed","1 of 6 videos · Just started"]].map(([name,pct,w,col,meta]) => (
                <div key={name} style={{ background: "white", border: "1px solid #e8e8e4", borderRadius: "10px", padding: "14px 16px", marginBottom: "8px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                    <span style={{ fontSize: "14px", fontWeight: "600", color: "#0f172a" }}>{name}</span>
                    <span style={{ fontSize: "13px", color: col, fontWeight: "700" }}>{pct}</span>
                  </div>
                  <div style={{ height: "4px", background: "#f1f5f9", borderRadius: "2px", marginBottom: "6px" }}>
                    <div style={{ height: "4px", width: `${w}%`, background: col, borderRadius: "2px" }} />
                  </div>
                  <p style={{ fontSize: "12px", color: "#9ca3af" }}>{meta}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Final CTA — blue tint */}
      <div style={{ background: "#eff6ff", padding: "100px 24px", textAlign: "center", borderBottom: "1px solid #bfdbfe" }}>
        <h2 style={{ fontSize: "clamp(30px,5vw,50px)", fontWeight: "900", letterSpacing: "-1.5px", color: "#0f172a", marginBottom: "18px", lineHeight: "1.1" }}>
          Ready to start<br />leveling up?
        </h2>
        <p style={{ color: "#475569", fontSize: "17px", marginBottom: "36px" }}>
          Join learners building real skills with free, AI-curated YouTube paths.
        </p>
        <SignUpButton mode="modal">
          <button className="btn-blue" style={{ padding: "16px 44px", fontSize: "17px", borderRadius: "10px" }}>Create your free account →</button>
        </SignUpButton>
        <p style={{ marginTop: "16px", fontSize: "13px", color: "#94a3b8" }}>No credit card · No paywalls · Just learning</p>
      </div>

      {/* Footer */}
      <div style={{ background: "white", padding: "24px 40px", borderTop: "1px solid #e8e8e4", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
        <span style={{ fontSize: "16px", fontWeight: "800", color: "#0f172a" }}>Leveling<span style={{ color: "#2563eb" }}>Path</span></span>
        <span style={{ fontSize: "12px", color: "#9ca3af" }}>levelingpath.com · Free forever</span>
      </div>
    </div>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
function Dashboard() {
  const { user } = useUser();
  const [view, setView] = useState("home");
  const [query, setQuery] = useState("");
  const [stage, setStage] = useState("idle");
  const [loadMsg, setLoadMsg] = useState("");
  const [currentPath, setCurrentPath] = useState(null);
  const [visible, setVisible] = useState(false);
  const [errMsg, setErrMsg] = useState("");
  const [savedPaths, setSavedPaths] = useState([]);
  const [watchedMap, setWatchedMap] = useState({});
  const [dataLoaded, setDataLoaded] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [showCompletion, setShowCompletion] = useState(false);
  const [completedPath, setCompletedPath] = useState(null);
  const [showLanding, setShowLanding] = useState(false);
  const prevWatchedRef = useRef({});
  const cycleRef = useRef(null);

  const STEPS = ["Asking AI to plan your path…","Searching YouTube for Foundation videos…","Searching YouTube for Core Skills videos…","Searching YouTube for Advanced videos…","Fetching video details…","Scoring for relevance…","Finalizing your path…"];

  useEffect(() => {
    if (!user?.id) return;
    async function loadData() {
      try {
        const { data: pathRows, error: pathErr } = await supabase.from("paths").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
        if (pathErr) throw pathErr;
        setSavedPaths((pathRows || []).map(row => ({ id: row.id, goal: row.goal, totalTime: row.total_time, videos: row.videos || [], createdAt: new Date(row.created_at).toLocaleDateString() })));
        const { data: watchedRows, error: watchedErr } = await supabase.from("watched_videos").select("*").eq("user_id", user.id);
        if (watchedErr) throw watchedErr;
        const map = {};
        (watchedRows || []).forEach(row => { map[`${row.path_id}_${row.video_id}`] = true; });
        setWatchedMap(map);
      } catch (err) { console.error("Load error:", err.message); }
      finally { setDataLoaded(true); }
    }
    loadData();
  }, [user?.id]);

  useEffect(() => {
    if (!dataLoaded) return;
    for (const path of savedPaths) {
      const { pct } = getProgress(path);
      const prevPct = (() => { const w = path.videos.filter(v => prevWatchedRef.current[`${path.id}_${v.id}`]).length; return Math.round((w / path.videos.length) * 100); })();
      if (pct === 100 && prevPct < 100) {
        setCompletedPath(path);
        setShowCompletion(true);
        // Send completion email
        if (user?.primaryEmailAddress?.emailAddress) {
          fetch('/api/send-email', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              to: user.primaryEmailAddress.emailAddress,
              userName: [user.firstName, user.lastName].filter(Boolean).join(' ') || 'there',
              pathGoal: path.goal,
              videoCount: path.videos.length,
            }),
          }).catch(err => console.error('Email error:', err));
        }
        break;
      }
    }
    prevWatchedRef.current = { ...watchedMap };
  }, [watchedMap]);

  function startCycle() {
    let i = 0; setLoadMsg(STEPS[0]);
    cycleRef.current = setInterval(() => { i = Math.min(i + 1, STEPS.length - 1); setLoadMsg(STEPS[i]); }, 1600);
  }
  function stopCycle() { clearInterval(cycleRef.current); }

  async function insertPath(newPath) {
    const { error } = await supabase.from("paths").insert({ id: newPath.id, user_id: user.id, goal: newPath.goal, total_time: newPath.totalTime, videos: newPath.videos, created_at: new Date().toISOString() });
    if (error) throw new Error("Failed to save path: " + error.message);
  }

  async function deletePath(pathId) {
    setDeletingId(pathId);
    try {
      await supabase.from("watched_videos").delete().eq("user_id", user.id).eq("path_id", String(pathId));
      await supabase.from("paths").delete().eq("id", String(pathId)).eq("user_id", user.id);
      setSavedPaths(prev => prev.filter(p => p.id !== pathId));
      setWatchedMap(prev => { const u = { ...prev }; Object.keys(u).forEach(k => { if (k.startsWith(`${pathId}_`)) delete u[k]; }); return u; });
      if (currentPath?.id === pathId) setView("home");
    } catch (err) { alert("Couldn't delete path. Please try again."); }
    finally { setDeletingId(null); }
  }

  async function toggleWatched(pathId, videoId) {
    const key = `${pathId}_${videoId}`;
    const isWatched = !!watchedMap[key];
    setWatchedMap(prev => ({ ...prev, [key]: !isWatched }));
    if (isWatched) {
      const { error } = await supabase.from("watched_videos").delete().eq("user_id", user.id).eq("path_id", String(pathId)).eq("video_id", videoId);
      if (error) setWatchedMap(prev => ({ ...prev, [key]: true }));
    } else {
      const { error } = await supabase.from("watched_videos").insert({ user_id: user.id, path_id: String(pathId), video_id: videoId });
      if (error) setWatchedMap(prev => ({ ...prev, [key]: false }));
    }
  }

  function getProgress(path) {
    const watched = path.videos.filter(v => watchedMap[`${path.id}_${v.id}`]).length;
    return { watched, total: path.videos.length, pct: Math.round((watched / path.videos.length) * 100) };
  }

  async function planWithClaude(goal) {
    const res = await fetch("/api/claude", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ model: "claude-sonnet-4-5", max_tokens: 1800, messages: [{ role: "user", content: `A user wants to learn: "${goal}"\n\nReturn ONLY valid JSON with exactly 9 videos — 3 per phase:\n{\n  "refinedGoal": "clear 1-sentence outcome",\n  "totalTime": "estimated total watch time",\n  "videos": [\n    { "phase": "Foundation", "youtubeQuery": "specific search query", "reason": "why essential", "relevanceScore": 95 },\n    { "phase": "Foundation", "youtubeQuery": "...", "reason": "...", "relevanceScore": 91 },\n    { "phase": "Foundation", "youtubeQuery": "...", "reason": "...", "relevanceScore": 88 },\n    { "phase": "Core Skills", "youtubeQuery": "...", "reason": "...", "relevanceScore": 94 },\n    { "phase": "Core Skills", "youtubeQuery": "...", "reason": "...", "relevanceScore": 90 },\n    { "phase": "Core Skills", "youtubeQuery": "...", "reason": "...", "relevanceScore": 87 },\n    { "phase": "Advanced", "youtubeQuery": "...", "reason": "...", "relevanceScore": 93 },\n    { "phase": "Advanced", "youtubeQuery": "...", "reason": "...", "relevanceScore": 89 },\n    { "phase": "Advanced", "youtubeQuery": "...", "reason": "...", "relevanceScore": 86 }\n  ]\n}` }] }) });
    const data = await res.json();
    const text = (data.content || []).map(b => b.text || "").join("");
    return JSON.parse(text.replace(/```json|```/g, "").trim());
  }

  async function searchYouTube(q) {
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=1&q=${encodeURIComponent(q)}&relevanceLanguage=en&key=${YT_API_KEY}`;
    const res = await fetch(url);
    const data = await res.json();
    if (!data.items?.length) return null;
    const item = data.items[0];
    const videoId = item.id.videoId;
    return { videoId, title: item.snippet.title, channel: item.snippet.channelTitle, thumbnail: `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg` };
  }

  async function getVideoStats(ids) {
    if (!ids.length) return {};
    const url = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails,statistics&id=${ids.join(",")}&key=${YT_API_KEY}`;
    const res = await fetch(url);
    const data = await res.json();
    const map = {};
    (data.items || []).forEach(item => { map[item.id] = { duration: parseDuration(item.contentDetails?.duration || "PT0S"), views: formatViews(item.statistics?.viewCount || "0") }; });
    return map;
  }

  async function generate(goalOverride) {
    const goal = goalOverride || query;
    if (!goal.trim()) return;
    setShowLanding(false);
    setStage("loading"); setView("loading"); setCurrentPath(null); setVisible(false); setErrMsg(""); startCycle();
    try {
      const plan = await planWithClaude(goal);
      const searches = await Promise.all(plan.videos.map(v => searchYouTube(v.youtubeQuery)));
      const foundIds = searches.map(s => s?.videoId).filter(Boolean);
      const statsMap = await getVideoStats(foundIds);
      const videos = plan.videos.map((v, i) => {
        const yt = searches[i]; const stats = yt ? (statsMap[yt.videoId] || {}) : {};
        const meta = PHASE_META[v.phase] || PHASE_META["Core Skills"];
        return { id: i, phase: v.phase, phaseColor: meta.color, tags: meta.tags, title: yt?.title || v.youtubeQuery, channel: yt?.channel || "YouTube", thumbnail: yt?.thumbnail || "", videoId: yt?.videoId || "", duration: stats.duration || "", views: stats.views || "", relevanceScore: v.relevanceScore, reason: v.reason };
      });
      const newPath = { id: Date.now().toString(), goal: plan.refinedGoal, totalTime: plan.totalTime, videos, createdAt: new Date().toLocaleDateString() };
      stopCycle();
      await insertPath(newPath);
      setSavedPaths(prev => [newPath, ...prev]);
      setCurrentPath(newPath); setStage("done"); setView("path");
      setTimeout(() => setVisible(true), 100);
    } catch (err) { stopCycle(); setErrMsg(err.message || "Something went wrong."); setStage("error"); setView("error"); }
  }

  const totalWatched = Object.values(watchedMap).filter(Boolean).length;
  const completedPaths = savedPaths.filter(p => getProgress(p).pct === 100).length;

  // Show landing page for signed-in users who click Home
  if (showLanding) {
    return (
      <div style={{ minHeight: "100vh", background: "#f8f9fa", fontFamily: "'Inter', -apple-system, sans-serif" }}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');*{box-sizing:border-box;margin:0;padding:0;}.btn-blue{background:#2563eb;color:white;border:none;border-radius:8px;font-weight:700;cursor:pointer;transition:all .15s;font-family:inherit;}.btn-blue:hover{background:#1d4ed8;}.btn-outline{background:white;border:1.5px solid #e2e8f0;border-radius:8px;color:#374151;font-weight:600;cursor:pointer;transition:all .15s;font-family:inherit;}.btn-outline:hover{border-color:#2563eb;color:#2563eb;}.feature-card{background:white;border:1px solid #e8e8e4;border-radius:14px;padding:28px;border-left:4px solid #2563eb;}.step-num{background:#eff6ff;color:#2563eb;width:36px;height:36px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:15px;margin-bottom:16px;}.topic-pill{padding:7px 16px;background:white;border:1px solid #e2e8f0;border-radius:20px;color:#374151;font-size:13px;display:inline-block;margin:4px;font-weight:500;}`}</style>
        <Nav showHomeLink={false} onHomeClick={() => setShowLanding(false)} />
        {/* Reuse landing content with a "Go to Dashboard" button */}
        <div style={{ background: "#0f172a", padding: "80px 24px 70px", textAlign: "center" }}>
          <h1 style={{ fontSize: "clamp(34px,5vw,56px)", fontWeight: "900", lineHeight: "1.05", letterSpacing: "-2px", marginBottom: "20px", color: "white" }}>
            Learn any skill.<br /><span style={{ color: "#60a5fa" }}>Free. Organized. Fast.</span>
          </h1>
          <p style={{ color: "#94a3b8", fontSize: "17px", lineHeight: "1.75", marginBottom: "36px", maxWidth: "520px", margin: "0 auto 36px" }}>
            Type what you want to learn. Our AI builds you a step-by-step YouTube path in seconds.
          </p>
          <button className="btn-blue" onClick={() => setShowLanding(false)} style={{ padding: "14px 36px", fontSize: "16px", borderRadius: "10px" }}>Go to my dashboard →</button>
          <p style={{ fontSize: "13px", color: "#475569", marginTop: "14px" }}>Free forever · No credit card · 100% YouTube content</p>
        </div>
        <div style={{ maxWidth: "820px", margin: "60px auto", padding: "0 24px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: "16px" }}>
            {[
              { icon: "🧠", title: "AI-curated paths", desc: "Every video scored for quality. No filler, just the best content." },
              { icon: "📈", title: "Progress tracking", desc: "Mark videos watched. Your progress saves to the cloud." },
              { icon: "🏆", title: "Completion certificates", desc: "Earn shareable achievement cards when you finish a path." },
              { icon: "∞", title: "Unlimited paths", desc: "Build as many paths as you want. Free forever." },
            ].map(f => (
              <div key={f.title} className="feature-card">
                <div style={{ fontSize: "24px", marginBottom: "12px" }}>{f.icon}</div>
                <p style={{ fontSize: "15px", fontWeight: "700", color: "#0f172a", marginBottom: "6px" }}>{f.title}</p>
                <p style={{ color: "#6b7280", fontSize: "13px", lineHeight: "1.6" }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
        <div style={{ background: "#eff6ff", padding: "60px 24px", textAlign: "center", borderTop: "1px solid #bfdbfe" }}>
          <h2 style={{ fontSize: "32px", fontWeight: "800", color: "#0f172a", marginBottom: "16px" }}>Ready to keep leveling up?</h2>
          <button className="btn-blue" onClick={() => setShowLanding(false)} style={{ padding: "14px 36px", fontSize: "16px", borderRadius: "10px" }}>Back to my dashboard →</button>
        </div>
        <div style={{ background: "white", padding: "20px 40px", borderTop: "1px solid #e8e8e4", display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontSize: "15px", fontWeight: "800", color: "#0f172a" }}>Leveling<span style={{ color: "#2563eb" }}>Path</span></span>
          <span style={{ fontSize: "12px", color: "#9ca3af" }}>levelingpath.com · Free forever</span>
        </div>
      </div>
    );
  }

  if (!dataLoaded) return (
    <div style={{ minHeight: "100vh", background: "#f8f9fa", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Inter, sans-serif" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: "36px", height: "36px", border: "3px solid #e8e8e4", borderTop: "3px solid #2563eb", borderRadius: "50%", margin: "0 auto 16px", animation: "spin 0.8s linear infinite" }} />
        <p style={{ color: "#9ca3af", fontSize: "14px" }}>Loading your paths…</p>
      </div>
    </div>
  );

  if (view === "home") return (
    <div style={{ minHeight: "100vh", background: "#f8f9fa", fontFamily: "'Inter', -apple-system, sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');*{box-sizing:border-box;margin:0;padding:0;}.path-card{transition:border-color .15s,box-shadow .15s;cursor:pointer;}.path-card:hover{border-color:#bfdbfe!important;box-shadow:0 2px 12px rgba(37,99,235,0.07);}.del-btn:hover{background:#fef2f2!important;border-color:#fca5a5!important;color:#dc2626!important;}.chip:hover{background:#eff6ff!important;border-color:#bfdbfe!important;color:#2563eb!important;}`}</style>
      {showCompletion && completedPath && <CompletionModal path={completedPath} user={user} onClose={() => setShowCompletion(false)} />}

      <Nav showHomeLink={true} onHomeClick={() => setShowLanding(true)} />

      <div style={{ maxWidth: "780px", margin: "0 auto", padding: "36px 24px" }}>
        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "12px", marginBottom: "32px" }}>
          {[[savedPaths.length,"Paths created"],[completedPaths,"Completed"],[totalWatched,"Videos watched"]].map(([val,label]) => (
            <div key={label} style={{ background: "white", border: "1px solid #e8e8e4", borderRadius: "12px", padding: "20px", textAlign: "center" }}>
              <p style={{ fontSize: "32px", fontWeight: "800", color: "#0f172a", marginBottom: "4px" }}>{val}</p>
              <p style={{ fontSize: "12px", color: "#9ca3af" }}>{label}</p>
            </div>
          ))}
        </div>

        {/* Build new path */}
        <div style={{ background: "white", border: "1px solid #e8e8e4", borderRadius: "14px", padding: "24px", marginBottom: "28px" }}>
          <p style={{ fontSize: "17px", fontWeight: "700", color: "#0f172a", marginBottom: "4px" }}>Build a new learning path</p>
          <p style={{ fontSize: "14px", color: "#6b7280", marginBottom: "18px" }}>Type any skill and we'll find the best free YouTube videos for you.</p>
          <div style={{ position: "relative", marginBottom: "14px" }}>
            <input value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === "Enter" && generate()}
              placeholder='e.g. "Fix a leaking pipe" or "Learn Python"'
              style={{ width: "100%", padding: "13px 140px 13px 16px", background: "#f8f9fa", border: "1.5px solid #e8e8e4", borderRadius: "10px", color: "#0f172a", fontSize: "15px", outline: "none", fontFamily: "Inter, sans-serif" }} />
            <button onClick={() => generate()} style={{ position: "absolute", right: "8px", top: "50%", transform: "translateY(-50%)", padding: "8px 18px", background: "#2563eb", border: "none", borderRadius: "7px", color: "white", fontWeight: "700", fontSize: "13px", cursor: "pointer", fontFamily: "Inter, sans-serif" }}>Build Path →</button>
          </div>
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            {TOPICS.map(t => (
              <button key={t} className="chip" onClick={() => { setQuery(t); generate(t); }}
                style={{ padding: "5px 12px", background: "white", border: "1px solid #e8e8e4", borderRadius: "20px", color: "#374151", fontSize: "12px", cursor: "pointer", fontFamily: "Inter, sans-serif", transition: "all .15s", fontWeight: "500" }}>{t}</button>
            ))}
          </div>
        </div>

        {/* Saved paths */}
        {savedPaths.length > 0 && (
          <div>
            <p style={{ fontSize: "16px", fontWeight: "700", color: "#0f172a", marginBottom: "14px" }}>Your learning paths</p>
            {savedPaths.map(path => {
              const { watched, total, pct } = getProgress(path);
              const col = pct === 100 ? "#059669" : pct > 0 ? "#2563eb" : "#9ca3af";
              const isDeleting = deletingId === path.id;
              return (
                <div key={path.id} className="path-card" style={{ background: "white", border: "1px solid #e8e8e4", borderRadius: "12px", padding: "18px 20px", marginBottom: "10px", opacity: isDeleting ? 0.5 : 1 }}>
                  <div onClick={() => { if (isDeleting) return; setCurrentPath(path); setView("path"); setVisible(false); setTimeout(() => setVisible(true), 100); }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
                      <div style={{ flex: 1, paddingRight: "12px" }}>
                        <p style={{ fontWeight: "700", fontSize: "15px", color: "#0f172a", marginBottom: "3px" }}>{path.goal}</p>
                        <p style={{ fontSize: "12px", color: "#9ca3af" }}>{total} videos · Created {path.createdAt}</p>
                      </div>
                      <span style={{ fontSize: "13px", color: col, fontWeight: "700", flexShrink: 0 }}>{pct}%</span>
                    </div>
                    <div style={{ height: "4px", background: "#f1f5f9", borderRadius: "2px" }}>
                      <div style={{ height: "4px", width: `${pct}%`, background: col, borderRadius: "2px", transition: "width 0.5s ease" }} />
                    </div>
                    <p style={{ fontSize: "12px", color: "#9ca3af", marginTop: "6px" }}>{watched} of {total} videos watched{pct === 100 ? " · ✓ Completed!" : ""}</p>
                  </div>
                  <div style={{ marginTop: "12px", display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                    <button onClick={e => {
                      e.stopPropagation();
                      const url = `${window.location.origin}/path/${path.id}`;
                      navigator.clipboard.writeText(url);
                      // Show a brief visual feedback
                      e.target.textContent = "✓ Link copied!";
                      e.target.style.color = "#059669";
                      e.target.style.borderColor = "#bbf7d0";
                      setTimeout(() => {
                        e.target.textContent = "🔗 Share";
                        e.target.style.color = "#6b7280";
                        e.target.style.borderColor = "#e8e8e4";
                      }, 2000);
                    }} style={{ padding: "5px 12px", background: "white", border: "1px solid #e8e8e4", borderRadius: "7px", color: "#6b7280", fontSize: "12px", cursor: "pointer", fontFamily: "Inter, sans-serif", transition: "all .15s", fontWeight: "500" }}>
                      🔗 Share
                    </button>
                    <button className="del-btn" disabled={isDeleting} onClick={e => { e.stopPropagation(); if (window.confirm(`Delete "${path.goal}"? This can't be undone.`)) deletePath(path.id); }}
                      style={{ padding: "5px 12px", background: "white", border: "1px solid #e8e8e4", borderRadius: "7px", color: "#6b7280", fontSize: "12px", cursor: isDeleting ? "not-allowed" : "pointer", fontFamily: "Inter, sans-serif", transition: "all .15s", fontWeight: "500" }}>
                      {isDeleting ? "Deleting…" : "🗑 Delete"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {savedPaths.length === 0 && (
          <div style={{ textAlign: "center", padding: "60px 20px" }}>
            <div style={{ width: "56px", height: "56px", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "14px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "24px", margin: "0 auto 16px" }}>◈</div>
            <p style={{ fontSize: "17px", fontWeight: "700", color: "#0f172a", marginBottom: "8px" }}>No paths yet</p>
            <p style={{ fontSize: "14px", color: "#9ca3af" }}>Build your first learning path above to get started!</p>
          </div>
        )}
      </div>
    </div>
  );

  if (view === "loading" || view === "error") return (
    <div style={{ minHeight: "100vh", background: "#f8f9fa", fontFamily: "Inter, sans-serif", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 24px" }}>
      <style>{`@keyframes shimmer{0%{background-position:-400% 0}100%{background-position:400% 0}}@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
      {stage === "loading" ? <>
        <div style={{ width: "52px", height: "52px", borderRadius: "14px", background: "#2563eb", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "24px", color: "white", animation: "pulse 1.6s infinite", marginBottom: "24px" }}>◈</div>
        <p style={{ fontSize: "22px", fontWeight: "700", color: "#0f172a", marginBottom: "10px" }}>Building your path…</p>
        <p style={{ color: "#2563eb", fontSize: "14px", marginBottom: "32px" }}>{loadMsg}</p>
        <div style={{ height: "3px", width: "280px", background: "#e8e8e4", borderRadius: "2px", overflow: "hidden" }}>
          <div style={{ height: "100%", width: "100%", background: "linear-gradient(90deg,transparent 0%,#2563eb 40%,#7c3aed 60%,transparent 100%)", backgroundSize: "400% 100%", animation: "shimmer 1.8s linear infinite" }} />
        </div>
      </> : <>
        <div style={{ fontSize: "36px", marginBottom: "16px" }}>⚠️</div>
        <p style={{ fontSize: "20px", fontWeight: "700", color: "#0f172a", marginBottom: "10px" }}>Something went wrong</p>
        <p style={{ color: "#6b7280", fontSize: "14px", marginBottom: "28px" }}>{errMsg}</p>
        <button onClick={() => { setStage("idle"); setView("home"); }} style={{ padding: "10px 24px", background: "#0f172a", border: "none", borderRadius: "9px", color: "white", fontWeight: "700", cursor: "pointer", fontSize: "14px", fontFamily: "Inter, sans-serif" }}>← Back to dashboard</button>
      </>}
    </div>
  );

  if (view === "path" && currentPath) {
    const phases = [...new Set(currentPath.videos.map(v => v.phase))];
    const { watched, total, pct } = getProgress(currentPath);
    return (
      <div style={{ minHeight: "100vh", background: "#f8f9fa", fontFamily: "Inter, sans-serif" }}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');*{box-sizing:border-box;margin:0;padding:0;}`}</style>
        {showCompletion && completedPath && <CompletionModal path={completedPath} user={user} onClose={() => setShowCompletion(false)} />}
        <Nav showHomeLink={true} onHomeClick={() => { setView("home"); setShowLanding(true); }} />

        <div style={{ maxWidth: "660px", margin: "0 auto", padding: "0 16px 80px" }}>
          <div style={{ padding: "24px 0 16px" }}>
            <div style={{ background: "white", border: "1px solid #e8e8e4", borderRadius: "14px", padding: "22px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                <button onClick={() => setView("home")} style={{ background: "none", border: "none", color: "#6b7280", fontSize: "13px", cursor: "pointer", fontFamily: "Inter, sans-serif", padding: 0 }}>← Dashboard</button>
              </div>
              <p style={{ fontSize: "10px", fontWeight: "700", color: "#2563eb", letterSpacing: "2px", marginBottom: "10px" }}>YOUR LEARNING PATH</p>
              <p style={{ fontWeight: "700", fontSize: "18px", color: "#0f172a", lineHeight: "1.35", marginBottom: "14px" }}>{currentPath.goal}</p>
              <div style={{ display: "flex", gap: "20px", flexWrap: "wrap", marginBottom: "14px" }}>
                {[[`${total} videos`, "▶", "#059669"], [`~${currentPath.totalTime}`, "⏱", "#2563eb"], ["Real YouTube results", "◈", "#7c3aed"]].map(([txt, icon, col]) => (
                  <div key={txt} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span style={{ color: col, fontSize: "12px" }}>{icon}</span>
                    <span style={{ color: "#6b7280", fontSize: "13px" }}>{txt}</span>
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                <span style={{ fontSize: "12px", color: "#9ca3af" }}>{watched} of {total} watched</span>
                <span style={{ fontSize: "12px", color: pct === 100 ? "#059669" : "#2563eb", fontWeight: "700" }}>{pct}%{pct === 100 ? " · Complete! 🎉" : ""}</span>
              </div>
              <div style={{ height: "6px", background: "#f1f5f9", borderRadius: "3px" }}>
                <div style={{ height: "6px", width: `${pct}%`, background: pct === 100 ? "#059669" : "#2563eb", borderRadius: "3px", transition: "width 0.5s ease" }} />
              </div>
              <div style={{ marginTop: "14px" }}>
                <button onClick={() => {
                  const url = `${window.location.origin}/path/${currentPath.id}`;
                  navigator.clipboard.writeText(url);
                  alert("Share link copied! Send it to anyone.");
                }} style={{ padding: "7px 16px", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "7px", color: "#2563eb", fontSize: "13px", fontWeight: "600", cursor: "pointer", fontFamily: "Inter, sans-serif" }}>
                  🔗 Share this path
                </button>
              </div>
            </div>
          </div>

          {phases.map((phaseName, pi) => {
            const meta = PHASE_META[phaseName] || PHASE_META["Core Skills"];
            return (
              <div key={phaseName}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "14px 0 10px" }}>
                  <span style={{ color: meta.color, fontSize: "10px" }}>{meta.icon}</span>
                  <span style={{ fontSize: "10px", fontWeight: "700", letterSpacing: "2px", color: meta.color }}>PHASE {pi + 1} · {phaseName.toUpperCase()}</span>
                  <div style={{ flex: 1, height: "1px", background: "#e8e8e4" }} />
                </div>
                {currentPath.videos.filter(v => v.phase === phaseName).map(video => (
                  <VideoCard key={video.id} video={video} globalIndex={video.id} visible={visible} phaseColor={meta.color}
                    watched={!!watchedMap[`${currentPath.id}_${video.id}`]} onToggle={() => toggleWatched(currentPath.id, video.id)} />
                ))}
              </div>
            );
          })}

          <div style={{ background: "white", border: "1px solid #e8e8e4", borderRadius: "14px", padding: "28px", textAlign: "center", marginTop: "18px" }}>
            <p style={{ fontSize: "17px", fontWeight: "700", color: "#0f172a", marginBottom: "8px" }}>
              {pct === 100 ? "🎉 Path complete! What's next?" : "🎯 Keep going — you've got this!"}
            </p>
            <p style={{ color: "#6b7280", fontSize: "14px", marginBottom: "20px" }}>
              {pct === 100 ? "You've mastered this skill. Ready to learn something new?" : `${total - watched} videos left in this path.`}
            </p>
            <button onClick={() => setView("home")} style={{ padding: "11px 28px", background: "#2563eb", border: "none", borderRadius: "10px", color: "white", fontWeight: "700", fontSize: "14px", cursor: "pointer", fontFamily: "Inter, sans-serif", marginBottom: pct === 100 ? "10px" : "0" }}>
              {pct === 100 ? "Build another path →" : "← Back to dashboard"}
            </button>
            {pct === 100 && (
              <div>
                <button onClick={() => { setCompletedPath(currentPath); setShowCompletion(true); }} style={{ padding: "11px 28px", background: "#fef9c3", border: "1.5px solid #fbbf24", borderRadius: "10px", color: "#92400e", fontWeight: "700", fontSize: "14px", cursor: "pointer", fontFamily: "Inter, sans-serif" }}>
                  🏆 View Achievement Card
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return null;
}

// ── Shared Path View ─────────────────────────────────────────────────────────
function SharedPathView({ pathId }) {
  const { user } = useUser();
  const [path, setPath] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [copied, setCopied] = useState(false);
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    async function loadSharedPath() {
      try {
        const { data, error } = await supabase
          .from("paths")
          .select("*")
          .eq("id", pathId)
          .eq("is_shared", true)
          .single();
        if (error || !data) { setNotFound(true); return; }
        setPath({
          id: data.id,
          goal: data.goal,
          totalTime: data.total_time,
          videos: data.videos || [],
          createdAt: new Date(data.created_at).toLocaleDateString(),
        });
      } catch (e) { setNotFound(true); }
      finally { setLoading(false); }
    }
    loadSharedPath();
  }, [pathId]);

  async function handleAddToMyPaths() {
    if (!user?.id) return;
    setAdding(true);
    try {
      const newId = Date.now().toString();
      const { error } = await supabase.from("paths").insert({
        id: newId,
        user_id: user.id,
        goal: path.goal,
        total_time: path.totalTime,
        videos: path.videos,
        is_shared: true,
        created_at: new Date().toISOString(),
      });
      if (!error) setAdded(true);
    } catch (e) { alert("Something went wrong. Please try again."); }
    finally { setAdding(false); }
  }

  async function handleCopyLink() {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#f8f9fa", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Inter, sans-serif" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: "36px", height: "36px", border: "3px solid #e8e8e4", borderTop: "3px solid #2563eb", borderRadius: "50%", margin: "0 auto 16px", animation: "spin 0.8s linear infinite" }} />
        <p style={{ color: "#9ca3af", fontSize: "14px" }}>Loading path…</p>
      </div>
    </div>
  );

  if (notFound) return (
    <div style={{ minHeight: "100vh", background: "#f8f9fa", fontFamily: "Inter, sans-serif" }}>
      <Nav />
      <div style={{ maxWidth: "500px", margin: "80px auto", padding: "0 24px", textAlign: "center" }}>
        <div style={{ fontSize: "48px", marginBottom: "20px" }}>🔍</div>
        <h2 style={{ fontSize: "24px", fontWeight: "700", color: "#0f172a", marginBottom: "12px" }}>Path not found</h2>
        <p style={{ color: "#6b7280", marginBottom: "28px" }}>This learning path doesn't exist or is no longer shared.</p>
        <a href="/" style={{ display: "inline-block", padding: "12px 28px", background: "#2563eb", color: "white", borderRadius: "8px", fontWeight: "700", textDecoration: "none", fontSize: "14px" }}>Go to LevelingPath →</a>
      </div>
    </div>
  );

  const phases = [...new Set(path.videos.map(v => v.phase))];

  return (
    <div style={{ minHeight: "100vh", background: "#f8f9fa", fontFamily: "Inter, sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');*{box-sizing:border-box;margin:0;padding:0;}`}</style>
      <Nav />

      <div style={{ maxWidth: "660px", margin: "0 auto", padding: "32px 16px 80px" }}>

        {/* Shared path banner */}
        <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "10px", padding: "12px 16px", marginBottom: "20px", display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "16px" }}>🔗</span>
          <p style={{ fontSize: "13px", color: "#1d4ed8", fontWeight: "500", flex: 1 }}>Someone shared this learning path with you!</p>
          <button onClick={handleCopyLink} style={{ padding: "5px 12px", background: copied ? "#059669" : "white", border: "1px solid #bfdbfe", borderRadius: "6px", color: copied ? "white" : "#2563eb", fontSize: "12px", fontWeight: "600", cursor: "pointer", fontFamily: "Inter, sans-serif", transition: "all 0.2s", whiteSpace: "nowrap" }}>
            {copied ? "✓ Copied!" : "Copy link"}
          </button>
        </div>

        {/* Path header */}
        <div style={{ background: "white", border: "1px solid #e8e8e4", borderRadius: "14px", padding: "22px", marginBottom: "16px" }}>
          <p style={{ fontSize: "10px", fontWeight: "700", color: "#2563eb", letterSpacing: "2px", marginBottom: "10px" }}>LEARNING PATH</p>
          <p style={{ fontWeight: "700", fontSize: "18px", color: "#0f172a", lineHeight: "1.35", marginBottom: "14px" }}>{path.goal}</p>
          <div style={{ display: "flex", gap: "20px", flexWrap: "wrap", marginBottom: "14px" }}>
            {[[`${path.videos.length} videos`, "▶", "#059669"], [`~${path.totalTime}`, "⏱", "#2563eb"], ["Real YouTube results", "◈", "#7c3aed"]].map(([txt, icon, col]) => (
              <div key={txt} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ color: col, fontSize: "12px" }}>{icon}</span>
                <span style={{ color: "#6b7280", fontSize: "13px" }}>{txt}</span>
              </div>
            ))}
          </div>
          <div style={{ height: "4px", background: "#f1f5f9", borderRadius: "2px" }} />
        </div>

        {/* Videos */}
        {phases.map((phaseName, pi) => {
          const meta = PHASE_META[phaseName] || PHASE_META["Core Skills"];
          return (
            <div key={phaseName}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "14px 0 10px" }}>
                <span style={{ color: meta.color, fontSize: "10px" }}>{meta.icon}</span>
                <span style={{ fontSize: "10px", fontWeight: "700", letterSpacing: "2px", color: meta.color }}>PHASE {pi + 1} · {phaseName.toUpperCase()}</span>
                <div style={{ flex: 1, height: "1px", background: "#e8e8e4" }} />
              </div>
              {path.videos.filter(v => v.phase === phaseName).map((video, idx) => (
                <div key={video.id} style={{ background: "white", border: "1px solid #e8e8e4", borderRadius: "10px", padding: "12px 14px", marginBottom: "8px", display: "flex", gap: "12px", alignItems: "center" }}>
                  <div style={{ minWidth: "26px", height: "26px", borderRadius: "50%", border: "1.5px solid #d1d5db", display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af", fontWeight: "600", fontSize: "11px", flexShrink: 0 }}>{idx + 1}</div>
                  <div style={{ position: "relative", borderRadius: "6px", overflow: "hidden", flexShrink: 0 }}>
                    {video.thumbnail
                      ? <img src={video.thumbnail} alt="" style={{ width: "88px", height: "50px", objectFit: "cover", display: "block" }} />
                      : <div style={{ width: "88px", height: "50px", background: "#f3f4f6", display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af" }}>▶</div>
                    }
                    {video.duration && <div style={{ position: "absolute", bottom: "2px", right: "3px", background: "rgba(0,0,0,0.75)", color: "white", fontSize: "9px", padding: "1px 4px", borderRadius: "2px" }}>{video.duration}</div>}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: "600", fontSize: "13px", color: "#0f172a", lineHeight: "1.4", marginBottom: "3px", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{video.title}</p>
                    <p style={{ color: "#6b7280", fontSize: "12px" }}>{video.channel}{video.views ? ` · ${video.views} views` : ""}</p>
                  </div>
                  <div style={{ textAlign: "center", flexShrink: 0 }}>
                    <p style={{ fontSize: "15px", fontWeight: "700", color: meta.color }}>{video.relevanceScore}</p>
                    <p style={{ fontSize: "9px", color: "#9ca3af" }}>MATCH</p>
                  </div>
                </div>
              ))}
            </div>
          );
        })}

        {/* CTA */}
        <div style={{ background: "white", border: "1px solid #e8e8e4", borderRadius: "14px", padding: "28px", textAlign: "center", marginTop: "24px" }}>
          {added ? (
            <>
              <div style={{ fontSize: "36px", marginBottom: "12px" }}>✅</div>
              <p style={{ fontSize: "17px", fontWeight: "700", color: "#0f172a", marginBottom: "8px" }}>Added to your paths!</p>
              <p style={{ color: "#6b7280", fontSize: "14px", marginBottom: "20px" }}>Go to your dashboard to start tracking your progress.</p>
              <a href="/" style={{ display: "inline-block", padding: "11px 28px", background: "#2563eb", color: "white", borderRadius: "10px", fontWeight: "700", fontSize: "14px", textDecoration: "none" }}>Go to my dashboard →</a>
            </>
          ) : (
            <>
              <p style={{ fontSize: "17px", fontWeight: "700", color: "#0f172a", marginBottom: "8px" }}>Want to follow this path?</p>
              <p style={{ color: "#6b7280", fontSize: "14px", marginBottom: "20px" }}>
                {user ? "Add it to your account and track your progress as you watch each video." : "Create a free account to save this path and track your progress."}
              </p>
              {user ? (
                <button onClick={handleAddToMyPaths} disabled={adding} style={{ padding: "11px 28px", background: "#2563eb", border: "none", borderRadius: "10px", color: "white", fontWeight: "700", fontSize: "14px", cursor: adding ? "not-allowed" : "pointer", fontFamily: "Inter, sans-serif", opacity: adding ? 0.7 : 1 }}>
                  {adding ? "Adding…" : "➕ Add to my paths"}
                </button>
              ) : (
                <div style={{ display: "flex", gap: "10px", justifyContent: "center", flexWrap: "wrap" }}>
                  <SignUpButton mode="modal">
                    <button style={{ padding: "11px 28px", background: "#2563eb", border: "none", borderRadius: "10px", color: "white", fontWeight: "700", fontSize: "14px", cursor: "pointer", fontFamily: "Inter, sans-serif" }}>Sign up free to save this path</button>
                  </SignUpButton>
                  <SignInButton mode="modal">
                    <button style={{ padding: "11px 20px", background: "white", border: "1.5px solid #e2e8f0", borderRadius: "10px", color: "#374151", fontWeight: "600", fontSize: "14px", cursor: "pointer", fontFamily: "Inter, sans-serif" }}>Sign in</button>
                  </SignInButton>
                </div>
              )}
              <p style={{ marginTop: "16px", fontSize: "13px", color: "#9ca3af" }}>Free forever · No credit card · 100% YouTube content</p>
            </>
          )}
        </div>

        {/* Build your own CTA */}
        <div style={{ textAlign: "center", marginTop: "20px", padding: "20px" }}>
          <p style={{ fontSize: "13px", color: "#9ca3af", marginBottom: "8px" }}>Want to learn something different?</p>
          <a href="/" style={{ fontSize: "14px", color: "#2563eb", fontWeight: "600", textDecoration: "none" }}>Build your own free learning path →</a>
        </div>
      </div>
    </div>
  );
}

// ── Root App ──────────────────────────────────────────────────────────────────
export default function App() {
  // Simple client-side routing for shared paths
  const pathname = window.location.pathname;
  const sharedMatch = pathname.match(/^\/path\/(.+)$/);

  if (sharedMatch) {
    return <SharedPathView pathId={sharedMatch[1]} />;
  }

  return (
    <>
      <SignedOut><LandingPage /></SignedOut>
      <SignedIn><Dashboard /></SignedIn>
    </>
  );
}