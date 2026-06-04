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
  "Foundation":  { color: "#4ade80", icon: "◎", tags: ["Beginner", "Essential"] },
  "Core Skills": { color: "#38bdf8", icon: "◉", tags: ["Intermediate", "Hands-On"] },
  "Advanced":    { color: "#f59e0b", icon: "●",  tags: ["Advanced", "Pro Tips"] },
};

// ── Helpers ───────────────────────────────────────────────────────────────────
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

// ── ScoreRing ─────────────────────────────────────────────────────────────────
function ScoreRing({ score }) {
  const r = 18, circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const color = score >= 90 ? "#4ade80" : score >= 75 ? "#38bdf8" : "#f59e0b";
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" style={{ flexShrink: 0 }}>
      <circle cx="24" cy="24" r={r} fill="none" stroke="#1a2540" strokeWidth="3.5" />
      <circle cx="24" cy="24" r={r} fill="none" stroke={color} strokeWidth="3.5"
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
        transform="rotate(-90 24 24)" style={{ transition: "stroke-dashoffset 1.2s ease" }} />
      <text x="24" y="29" textAnchor="middle" fill="white" fontSize="11" fontWeight="800"
        fontFamily="'Space Mono', monospace">{score}</text>
    </svg>
  );
}

// ── VideoCard ─────────────────────────────────────────────────────────────────
function VideoCard({ video, globalIndex, visible, phaseColor, watched, onToggle }) {
  const [open, setOpen] = useState(false);
  const [imgErr, setImgErr] = useState(false);
  return (
    <div onClick={() => setOpen(v => !v)} style={{
      opacity: visible ? 1 : 0,
      transform: visible ? "translateY(0)" : "translateY(22px)",
      transition: `opacity 0.45s ease ${globalIndex * 0.09}s, transform 0.45s ease ${globalIndex * 0.09}s`,
      background: "#06101f",
      border: `1px solid ${open ? phaseColor + "66" : watched ? phaseColor + "44" : "#111c30"}`,
      borderRadius: "14px", marginBottom: "10px", cursor: "pointer", overflow: "hidden",
    }}>
      <div style={{ display: "flex", gap: "12px", padding: "13px", alignItems: "center" }}>
        <div onClick={e => { e.stopPropagation(); onToggle(); }} style={{
          minWidth: "28px", height: "28px", borderRadius: "50%",
          border: `2px solid ${watched ? phaseColor : "#253550"}`,
          background: watched ? phaseColor + "22" : "transparent",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: watched ? phaseColor : "#253550", fontWeight: "800", fontSize: "12px",
          fontFamily: "'Space Mono', monospace", flexShrink: 0, transition: "all 0.2s",
        }}>{watched ? "✓" : globalIndex + 1}</div>
        <div style={{ position: "relative", borderRadius: "8px", overflow: "hidden", flexShrink: 0 }}>
          {!imgErr && video.thumbnail
            ? <img src={video.thumbnail} alt="" onError={() => setImgErr(true)}
                style={{ width: "96px", height: "54px", objectFit: "cover", display: "block", opacity: watched ? 0.6 : 1 }} />
            : <div style={{ width: "96px", height: "54px", background: "#111c30", display: "flex", alignItems: "center", justifyContent: "center", color: "#475569", fontSize: "22px" }}>▶</div>
          }
          {video.duration && (
            <div style={{ position: "absolute", bottom: "3px", right: "3px", background: "rgba(0,0,0,0.85)", color: "white", fontSize: "10px", padding: "1px 5px", borderRadius: "3px", fontFamily: "'Space Mono', monospace" }}>{video.duration}</div>
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: watched ? "#64748b" : "white", fontWeight: "700", fontSize: "13.5px", lineHeight: "1.35", marginBottom: "4px", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", textDecoration: watched ? "line-through" : "none" }}>{video.title}</div>
          <div style={{ color: "#3d5068", fontSize: "12px" }}>{video.channel}{video.views && video.views !== "0" ? ` · ${video.views} views` : ""}</div>
          <div style={{ display: "flex", gap: "5px", marginTop: "5px", flexWrap: "wrap" }}>
            {video.tags.map(t => <span key={t} style={{ fontSize: "10px", padding: "1px 7px", borderRadius: "20px", background: "#0d1829", color: "#4a6080", fontWeight: "600" }}>{t}</span>)}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "2px", flexShrink: 0 }}>
          <ScoreRing score={video.relevanceScore} />
          <span style={{ fontSize: "8px", color: "#253550", letterSpacing: "0.5px", fontFamily: "'Space Mono', monospace" }}>MATCH</span>
        </div>
      </div>
      {open && (
        <div style={{ padding: "0 13px 13px", borderTop: "1px solid #111c30", paddingTop: "12px" }}>
          <div style={{ background: "#080f1e", borderLeft: `3px solid ${phaseColor}`, borderRadius: "8px", padding: "10px 12px", fontSize: "13px", color: "#7a90a8", lineHeight: "1.7", marginBottom: "12px" }}>
            <span style={{ color: phaseColor, fontSize: "10px", fontWeight: "700", letterSpacing: "1px", fontFamily: "'Space Mono', monospace" }}>AI ANALYSIS · </span>
            {video.reason}
          </div>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            {video.videoId && (
              <a href={`https://youtube.com/watch?v=${video.videoId}`} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "9px 18px", background: "linear-gradient(135deg, #dc2626, #b91c1c)", borderRadius: "8px", color: "white", fontSize: "13px", fontWeight: "700", textDecoration: "none" }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="white"><path d="M10 16.5l6-4.5-6-4.5v9zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/></svg>
                Watch on YouTube
              </a>
            )}
            <button onClick={e => { e.stopPropagation(); onToggle(); }} style={{ padding: "9px 18px", background: watched ? "#1e293b" : "#0f2027", border: `1px solid ${watched ? phaseColor : "#253550"}`, borderRadius: "8px", color: watched ? phaseColor : "#475569", fontSize: "13px", fontWeight: "700", cursor: "pointer" }}>
              {watched ? "✓ Watched" : "Mark as watched"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Completion Modal ──────────────────────────────────────────────────────────
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
      // Dynamically load html2canvas
      const script = document.createElement("script");
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";
      script.onload = async () => {
        const canvas = await window.html2canvas(cardRef.current, {
          scale: 3,
          backgroundColor: null,
          useCORS: true,
        });
        const link = document.createElement("a");
        link.download = `levelingpath-${path.goal.replace(/\s+/g, "-").toLowerCase()}.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
        setDownloading(false);
      };
      document.head.appendChild(script);
    } catch (e) {
      console.error(e);
      setDownloading(false);
    }
  }

  async function handleCopyLink() {
    const text = `🏆 I just completed "${path.goal}" on LevelingPath!\n\nFree AI-curated YouTube learning paths → levelingpath.com`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (e) {
      console.error(e);
    }
  }

  // Trap clicks outside card to close
  function handleBackdropClick(e) {
    if (e.target === e.currentTarget) onClose();
  }

  return (
    <div onClick={handleBackdropClick} style={{
      position: "fixed", inset: 0, zIndex: 1000,
      background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "24px", animation: "fadeIn 0.25s ease",
    }}>
      <style>{`
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes slideUp{from{opacity:0;transform:translateY(32px)}to{opacity:1;transform:translateY(0)}}
        @keyframes shimmerGold{0%{background-position:-200% 0}100%{background-position:200% 0}}
      `}</style>

      <div style={{ animation: "slideUp 0.35s cubic-bezier(0.34,1.56,0.64,1)", width: "100%", maxWidth: "480px" }}>
        {/* The shareable card — this is what gets screenshot */}
        <div ref={cardRef} style={{
          background: "white", borderRadius: "20px", padding: "40px 36px 32px",
          boxShadow: "0 32px 80px rgba(0,0,0,0.4)",
          fontFamily: "'DM Sans', sans-serif",
          position: "relative", overflow: "hidden",
        }}>
          {/* Decorative top bar */}
          <div style={{
            position: "absolute", top: 0, left: 0, right: 0, height: "5px",
            background: "linear-gradient(90deg, #0ea5e9, #6366f1, #a78bfa)",
          }} />

          {/* Medal */}
          <div style={{ textAlign: "center", marginBottom: "20px" }}>
            <div style={{
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              width: "72px", height: "72px", borderRadius: "50%",
              background: "linear-gradient(135deg, #fbbf24, #f59e0b)",
              boxShadow: "0 8px 24px rgba(251,191,36,0.4)",
              fontSize: "36px",
            }}>🏆</div>
          </div>

          {/* Headline */}
          <div style={{ textAlign: "center", marginBottom: "6px" }}>
            <div style={{
              fontSize: "11px", fontWeight: "700", letterSpacing: "2.5px",
              color: "#6366f1", fontFamily: "'Space Mono', monospace", marginBottom: "10px",
            }}>SKILL COMPLETED</div>
            <div style={{
              fontFamily: "'Syne', sans-serif", fontWeight: "900",
              fontSize: "22px", color: "#0a0f1e", lineHeight: "1.25",
              marginBottom: "8px",
            }}>{path.goal}</div>
            <div style={{ fontSize: "14px", color: "#64748b" }}>
              Completed by <strong style={{ color: "#0a0f1e" }}>{fullName}</strong>
            </div>
          </div>

          {/* Divider */}
          <div style={{ height: "1px", background: "#f1f5f9", margin: "20px 0" }} />

          {/* Stats row */}
          <div style={{ display: "flex", justifyContent: "center", gap: "32px", marginBottom: "20px" }}>
            {[
              [videoCount, "Videos watched"],
              [completedDate, "Completed"],
            ].map(([val, label]) => (
              <div key={label} style={{ textAlign: "center" }}>
                <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: "900", fontSize: "15px", color: "#0a0f1e" }}>{val}</div>
                <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "2px" }}>{label}</div>
              </div>
            ))}
          </div>

          {/* Branding */}
          <div style={{ textAlign: "center" }}>
            <div style={{
              display: "inline-block", padding: "6px 14px",
              background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "20px",
              fontSize: "12px", color: "#64748b", fontFamily: "'Space Mono', monospace",
            }}>
              levelingpath.com
            </div>
          </div>
        </div>

        {/* Action buttons — outside the card so they don't appear in the screenshot */}
        <div style={{ display: "flex", gap: "10px", marginTop: "16px" }}>
          <button onClick={handleDownload} disabled={downloading} style={{
            flex: 1, padding: "13px", borderRadius: "12px",
            background: "linear-gradient(135deg, #0ea5e9, #6366f1)",
            border: "none", color: "white", fontWeight: "700", fontSize: "14px",
            cursor: downloading ? "not-allowed" : "pointer", opacity: downloading ? 0.7 : 1,
            fontFamily: "'DM Sans', sans-serif",
          }}>
            {downloading ? "Saving…" : "⬇ Download PNG"}
          </button>
          <button onClick={handleCopyLink} style={{
            flex: 1, padding: "13px", borderRadius: "12px",
            background: copied ? "#16a34a" : "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.15)",
            color: "white", fontWeight: "700", fontSize: "14px",
            cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
            transition: "background 0.2s",
          }}>
            {copied ? "✓ Copied!" : "🔗 Copy share text"}
          </button>
        </div>

        {/* Close */}
        <div style={{ textAlign: "center", marginTop: "12px" }}>
          <button onClick={onClose} style={{
            background: "none", border: "none", color: "rgba(255,255,255,0.4)",
            fontSize: "13px", cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
          }}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Landing Page ──────────────────────────────────────────────────────────────
function LandingPage() {
  const steps = [
    { num: "01", title: "Create your free account", desc: "Sign up in seconds. No credit card, no catch. Your account saves all your paths and tracks your progress forever." },
    { num: "02", title: "Tell us what to learn", desc: "Type any skill — coding, cooking, guitar, plumbing. Our AI searches YouTube and scores videos for relevance and quality." },
    { num: "03", title: "Follow your path", desc: "Watch curated videos in order. Mark them complete as you go. Come back anytime — your progress is always saved." },
  ];
  const features = [
    { icon: "🧠", title: "AI-curated paths", desc: "Every video is scored for relevance and quality. No filler content, no rabbit holes." },
    { icon: "📈", title: "Progress tracking", desc: "Mark videos as watched. See how far you've come on every learning path." },
    { icon: "🏆", title: "Skills dashboard", desc: "See every skill you're learning and every skill you've mastered — all in one place." },
    { icon: "▶️", title: "100% free content", desc: "All videos are free on YouTube. We just organize them so you don't have to." },
    { icon: "📱", title: "Learn anywhere", desc: "Works on any device. Pick up exactly where you left off, every time." },
    { icon: "∞", title: "Unlimited paths", desc: "Build as many learning paths as you want. No limits, no upsells." },
  ];
  const topics = ["Fix a leaking pipe","Break into tech sales","Learn Python","Start a business","Master public speaking","Learn guitar","Build a personal brand","Get fit without a gym","Learn to cook","Real estate investing","Learn Spanish","Graphic design","Video editing","Digital marketing","Investing basics","Home renovation"];

  return (
    <div style={{ minHeight: "100vh", background: "#030a17", fontFamily: "'DM Sans', sans-serif", color: "white" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Space+Mono:wght@400;700&family=Syne:wght@700;800;900&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        .lp-btn-primary{background:linear-gradient(135deg,#0ea5e9,#6366f1);border:none;border-radius:10px;color:white;font-weight:700;cursor:pointer;transition:opacity .15s,transform .15s;font-family:'DM Sans',sans-serif;}
        .lp-btn-primary:hover{opacity:0.88;transform:translateY(-1px)}
        .lp-btn-outline{background:transparent;border:1px solid #1e293b;border-radius:10px;color:#94a3b8;cursor:pointer;transition:all .15s;font-family:'DM Sans',sans-serif;}
        .lp-btn-outline:hover{border-color:#38bdf8;color:white;}
        .topic-chip{padding:7px 14px;background:#06101f;border:1px solid #111c30;border-radius:20px;color:#3d5068;font-size:12px;display:inline-block;margin:4px;}
      `}</style>

      {/* Nav */}
      <nav style={{ padding: "16px 32px", borderBottom: "1px solid #0a1525", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 50, background: "rgba(3,10,23,0.95)", backdropFilter: "blur(14px)" }}>
        <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: "900", fontSize: "20px", letterSpacing: "-0.5px" }}>
          leveling<span style={{ color: "#38bdf8" }}>path</span>
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <SignInButton mode="modal">
            <button className="lp-btn-outline" style={{ padding: "8px 18px", fontSize: "14px" }}>Sign in</button>
          </SignInButton>
          <SignUpButton mode="modal">
            <button className="lp-btn-primary" style={{ padding: "8px 18px", fontSize: "14px" }}>Get started free</button>
          </SignUpButton>
        </div>
      </nav>

      {/* Hero */}
      <div style={{ textAlign: "center", padding: "80px 24px 60px", maxWidth: "700px", margin: "0 auto" }}>
        <div style={{ display: "inline-block", fontSize: "12px", padding: "5px 14px", borderRadius: "20px", background: "#0f172a", border: "1px solid #1e293b", color: "#38bdf8", marginBottom: "24px", fontFamily: "'Space Mono',monospace" }}>
          ◈ POWERED BY YOUTUBE + AI
        </div>
        <h1 style={{ fontFamily: "'Syne',sans-serif", fontWeight: "900", fontSize: "clamp(36px,7vw,60px)", lineHeight: "1.07", letterSpacing: "-2px", marginBottom: "20px" }}>
          <span style={{ color: "white" }}>Level up any skill</span><br />
          <span style={{ color: "#38bdf8" }}>with a free learning path</span>
        </h1>
        <p style={{ color: "#4a6080", fontSize: "17px", lineHeight: "1.75", marginBottom: "36px" }}>
          Tell us what you want to learn. Our AI searches YouTube, scores thousands of videos for quality and relevance, and builds you a step-by-step path — in seconds. No paywalls, no fluff, no wasted time.
        </p>
        <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap", marginBottom: "12px" }}>
          <SignUpButton mode="modal">
            <button className="lp-btn-primary" style={{ padding: "14px 32px", fontSize: "16px" }}>Build my free learning path →</button>
          </SignUpButton>
          <SignInButton mode="modal">
            <button className="lp-btn-outline" style={{ padding: "14px 28px", fontSize: "16px" }}>Sign in</button>
          </SignInButton>
        </div>
        <p style={{ fontSize: "13px", color: "#253550" }}>Free forever · No credit card required · 100% free YouTube content</p>
      </div>

      {/* Topics */}
      <div style={{ padding: "40px 24px", borderTop: "1px solid #0a1525", textAlign: "center" }}>
        <p style={{ fontSize: "11px", color: "#253550", letterSpacing: "2px", fontFamily: "'Space Mono',monospace", marginBottom: "12px" }}>LEARN ANYTHING</p>
        <p style={{ fontFamily: "'Syne',sans-serif", fontWeight: "800", fontSize: "22px", marginBottom: "20px" }}>From any skill, in any field</p>
        <div style={{ maxWidth: "700px", margin: "0 auto" }}>
          {topics.map(t => <span key={t} className="topic-chip">{t}</span>)}
        </div>
      </div>

      {/* How it works */}
      <div style={{ padding: "60px 24px", borderTop: "1px solid #0a1525", maxWidth: "900px", margin: "0 auto" }}>
        <p style={{ fontSize: "11px", color: "#253550", letterSpacing: "2px", fontFamily: "'Space Mono',monospace", marginBottom: "12px" }}>HOW IT WORKS</p>
        <p style={{ fontFamily: "'Syne',sans-serif", fontWeight: "800", fontSize: "28px", marginBottom: "8px" }}>Three steps to start leveling up</p>
        <p style={{ color: "#4a6080", fontSize: "15px", marginBottom: "40px" }}>No more spending hours searching YouTube. We do the curation so you can focus on learning.</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: "16px" }}>
          {steps.map(s => (
            <div key={s.num} style={{ background: "#06101f", border: "1px solid #111c30", borderRadius: "16px", padding: "24px" }}>
              <div style={{ fontFamily: "'Space Mono',monospace", fontSize: "11px", color: "#38bdf8", marginBottom: "12px" }}>STEP {s.num}</div>
              <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: "800", fontSize: "17px", marginBottom: "10px" }}>{s.title}</div>
              <div style={{ color: "#4a6080", fontSize: "14px", lineHeight: "1.6" }}>{s.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Features */}
      <div style={{ padding: "60px 24px", borderTop: "1px solid #0a1525", background: "#020810" }}>
        <div style={{ maxWidth: "900px", margin: "0 auto" }}>
          <p style={{ fontSize: "11px", color: "#253550", letterSpacing: "2px", fontFamily: "'Space Mono',monospace", marginBottom: "12px" }}>FEATURES</p>
          <p style={{ fontFamily: "'Syne',sans-serif", fontWeight: "800", fontSize: "28px", marginBottom: "40px" }}>Everything you need to learn anything</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: "16px" }}>
            {features.map(f => (
              <div key={f.title} style={{ background: "#06101f", border: "1px solid #111c30", borderRadius: "16px", padding: "24px" }}>
                <div style={{ fontSize: "28px", marginBottom: "12px" }}>{f.icon}</div>
                <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: "800", fontSize: "16px", marginBottom: "8px" }}>{f.title}</div>
                <div style={{ color: "#4a6080", fontSize: "13px", lineHeight: "1.6" }}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Dashboard preview */}
      <div style={{ padding: "60px 24px", borderTop: "1px solid #0a1525", maxWidth: "900px", margin: "0 auto" }}>
        <p style={{ fontSize: "11px", color: "#253550", letterSpacing: "2px", fontFamily: "'Space Mono',monospace", marginBottom: "12px" }}>YOUR DASHBOARD</p>
        <p style={{ fontFamily: "'Syne',sans-serif", fontWeight: "800", fontSize: "28px", marginBottom: "8px" }}>Track every skill, every step</p>
        <p style={{ color: "#4a6080", fontSize: "15px", marginBottom: "32px" }}>Your personal learning hub. See what you're working on, what you've completed, and what to tackle next.</p>
        <div style={{ background: "#06101f", border: "1px solid #111c30", borderRadius: "16px", padding: "24px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "12px", marginBottom: "20px" }}>
            {[["Paths started","4"],["Skills learned","2"],["Videos watched","18"]].map(([label,val]) => (
              <div key={label} style={{ background: "#0a1828", borderRadius: "10px", padding: "16px", textAlign: "center" }}>
                <div style={{ fontSize: "11px", color: "#253550", marginBottom: "6px" }}>{label}</div>
                <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: "900", fontSize: "28px", color: "#38bdf8" }}>{val}</div>
              </div>
            ))}
          </div>
          {[["Learn Python programming","67%",67,"#38bdf8","4 of 6 videos · In progress"],["Break into tech sales","100%",100,"#4ade80","6 of 6 videos · Completed ✓"],["Master public speaking","17%",17,"#f59e0b","1 of 6 videos · Just started"]].map(([name,pct,w,col,meta]) => (
            <div key={name} style={{ background: "#0a1828", borderRadius: "10px", padding: "14px 16px", marginBottom: "10px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                <span style={{ fontSize: "14px", fontWeight: "700" }}>{name}</span>
                <span style={{ fontSize: "13px", color: col }}>{pct}</span>
              </div>
              <div style={{ height: "4px", background: "#1e293b", borderRadius: "2px", marginBottom: "6px" }}>
                <div style={{ height: "4px", width: `${w}%`, background: col, borderRadius: "2px" }} />
              </div>
              <div style={{ fontSize: "11px", color: "#253550" }}>{meta}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Final CTA */}
      <div style={{ padding: "80px 24px", borderTop: "1px solid #0a1525", textAlign: "center" }}>
        <p style={{ fontFamily: "'Syne',sans-serif", fontWeight: "900", fontSize: "clamp(28px,5vw,42px)", marginBottom: "16px", letterSpacing: "-1px" }}>
          Ready to start leveling up?
        </p>
        <p style={{ color: "#4a6080", fontSize: "16px", marginBottom: "32px" }}>Join learners building real skills with free, AI-curated YouTube paths.</p>
        <SignUpButton mode="modal">
          <button className="lp-btn-primary" style={{ padding: "16px 40px", fontSize: "17px" }}>Create your free account →</button>
        </SignUpButton>
        <p style={{ marginTop: "14px", fontSize: "13px", color: "#253550" }}>No credit card · No paywalls · Just learning</p>
      </div>

      {/* Footer */}
      <div style={{ padding: "24px 32px", borderTop: "1px solid #0a1525", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
        <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: "900", fontSize: "16px" }}>leveling<span style={{ color: "#38bdf8" }}>path</span></div>
        <div style={{ fontSize: "12px", color: "#253550" }}>levelingpath.com · Free forever</div>
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
  const [deletingId, setDeletingId] = useState(null); // tracks which path is being deleted
  const [showCompletion, setShowCompletion] = useState(false);
  const [completedPath, setCompletedPath] = useState(null);
  const prevWatchedRef = useRef({});
  const cycleRef = useRef(null);

  const STEPS = [
    "Asking AI to plan your path…",
    "Searching YouTube for Foundation videos…",
    "Searching YouTube for Core Skills videos…",
    "Searching YouTube for Advanced videos…",
    "Fetching video stats…",
    "Scoring for relevance…",
    "Sequencing your path…",
  ];

  // ── Load all data from Supabase on mount ───────────────────────────────────
  useEffect(() => {
    if (!user?.id) return;
    async function loadData() {
      try {
        // Load this user's paths, newest first
        const { data: pathRows, error: pathErr } = await supabase
          .from("paths")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (pathErr) throw pathErr;

        // Each path row has: id, user_id, goal, total_time, videos (jsonb), created_at
        const paths = (pathRows || []).map(row => ({
          id: row.id,
          goal: row.goal,
          totalTime: row.total_time,
          videos: row.videos || [],
          createdAt: new Date(row.created_at).toLocaleDateString(),
        }));
        setSavedPaths(paths);

        // Load this user's watched videos
        const { data: watchedRows, error: watchedErr } = await supabase
          .from("watched_videos")
          .select("*")
          .eq("user_id", user.id);

        if (watchedErr) throw watchedErr;

        // Build a lookup map: "pathId_videoId" => true
        const map = {};
        (watchedRows || []).forEach(row => {
          map[`${row.path_id}_${row.video_id}`] = true;
        });
        setWatchedMap(map);
      } catch (err) {
        console.error("Supabase load error:", err.message);
      } finally {
        setDataLoaded(true);
      }
    }
    loadData();
  }, [user?.id]);

  // ── Detect when a path just hits 100% and show the modal ─────────────────
  useEffect(() => {
    if (!dataLoaded) return;
    for (const path of savedPaths) {
      const { pct } = getProgress(path);
      const prevPct = (() => {
        const watched = path.videos.filter(v => prevWatchedRef.current[`${path.id}_${v.id}`]).length;
        return Math.round((watched / path.videos.length) * 100);
      })();
      if (pct === 100 && prevPct < 100) {
        setCompletedPath(path);
        setShowCompletion(true);
        break;
      }
    }
    prevWatchedRef.current = { ...watchedMap };
  }, [watchedMap]);

  function startCycle() {
    let i = 0;
    setLoadMsg(STEPS[0]);
    cycleRef.current = setInterval(() => {
      i = Math.min(i + 1, STEPS.length - 1);
      setLoadMsg(STEPS[i]);
    }, 1600);
  }
  function stopCycle() { clearInterval(cycleRef.current); }

  // ── Insert a new path into Supabase ───────────────────────────────────────
  async function insertPath(newPath) {
    const { error } = await supabase.from("paths").insert({
      id: newPath.id,           // text — we use Date.now().toString()
      user_id: user.id,
      goal: newPath.goal,
      total_time: newPath.totalTime,
      videos: newPath.videos,   // stored as jsonb
      created_at: new Date().toISOString(),
    });
    if (error) throw new Error("Failed to save path: " + error.message);
  }

  // ── Delete a path and its watched videos from Supabase ────────────────────
  async function deletePath(pathId) {
    setDeletingId(pathId);
    try {
      // Delete watched_videos for this path first
      const { error: watchedErr } = await supabase
        .from("watched_videos")
        .delete()
        .eq("user_id", user.id)
        .eq("path_id", String(pathId));
      if (watchedErr) throw watchedErr;

      // Delete the path itself
      const { error: pathErr } = await supabase
        .from("paths")
        .delete()
        .eq("id", String(pathId))
        .eq("user_id", user.id);
      if (pathErr) throw pathErr;

      // Update local state — remove path and its watched entries from the map
      setSavedPaths(prev => prev.filter(p => p.id !== pathId));
      setWatchedMap(prev => {
        const updated = { ...prev };
        Object.keys(updated).forEach(key => {
          if (key.startsWith(`${pathId}_`)) delete updated[key];
        });
        return updated;
      });

      // If we're viewing this path, go back to home
      if (currentPath?.id === pathId) setView("home");
    } catch (err) {
      console.error("Delete error:", err.message);
      alert("Couldn't delete path. Please try again.");
    } finally {
      setDeletingId(null);
    }
  }

  // ── Toggle a video watched/unwatched ──────────────────────────────────────
  async function toggleWatched(pathId, videoId) {
    const key = `${pathId}_${videoId}`;
    const isWatched = !!watchedMap[key];

    // Optimistic update — flip immediately in the UI
    setWatchedMap(prev => ({ ...prev, [key]: !isWatched }));

    if (isWatched) {
      // Remove from watched_videos
      const { error } = await supabase
        .from("watched_videos")
        .delete()
        .eq("user_id", user.id)
        .eq("path_id", String(pathId))
        .eq("video_id", videoId);
      if (error) {
        console.error("Unwatch error:", error.message);
        setWatchedMap(prev => ({ ...prev, [key]: true })); // roll back
      }
    } else {
      // Insert into watched_videos
      const { error } = await supabase
        .from("watched_videos")
        .insert({
          user_id: user.id,
          path_id: String(pathId),
          video_id: videoId,
        });
      if (error) {
        console.error("Watch error:", error.message);
        setWatchedMap(prev => ({ ...prev, [key]: false })); // roll back
      }
    }
  }

  function getProgress(path) {
    const watched = path.videos.filter(v => watchedMap[`${path.id}_${v.id}`]).length;
    return { watched, total: path.videos.length, pct: Math.round((watched / path.videos.length) * 100) };
  }

  async function planWithClaude(goal) {
    const res = await fetch("/api/claude", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-5",
        max_tokens: 1200,
        messages: [{ role: "user", content: `A user wants to learn: "${goal}"\n\nReturn ONLY valid JSON:\n{\n  "refinedGoal": "clear 1-sentence outcome",\n  "totalTime": "estimated watch time",\n  "videos": [\n    { "phase": "Foundation", "youtubeQuery": "specific search query", "reason": "why essential", "relevanceScore": 95 },\n    { "phase": "Foundation", "youtubeQuery": "...", "reason": "...", "relevanceScore": 91 },\n    { "phase": "Core Skills", "youtubeQuery": "...", "reason": "...", "relevanceScore": 94 },\n    { "phase": "Core Skills", "youtubeQuery": "...", "reason": "...", "relevanceScore": 88 },\n    { "phase": "Advanced", "youtubeQuery": "...", "reason": "...", "relevanceScore": 92 },\n    { "phase": "Advanced", "youtubeQuery": "...", "reason": "...", "relevanceScore": 89 }\n  ]\n}` }]
      })
    });
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
    return {
      videoId,
      title: item.snippet.title,
      channel: item.snippet.channelTitle,
      thumbnail: `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
    };
  }

  async function getVideoStats(ids) {
    if (!ids.length) return {};
    const url = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails,statistics&id=${ids.join(",")}&key=${YT_API_KEY}`;
    const res = await fetch(url);
    const data = await res.json();
    const map = {};
    (data.items || []).forEach(item => {
      map[item.id] = {
        duration: parseDuration(item.contentDetails?.duration || "PT0S"),
        views: formatViews(item.statistics?.viewCount || "0"),
      };
    });
    return map;
  }

  async function generate(goalOverride) {
    const goal = goalOverride || query;
    if (!goal.trim()) return;
    setStage("loading");
    setView("loading");
    setCurrentPath(null);
    setVisible(false);
    setErrMsg("");
    startCycle();
    try {
      const plan = await planWithClaude(goal);
      const searches = await Promise.all(plan.videos.map(v => searchYouTube(v.youtubeQuery)));
      const foundIds = searches.map(s => s?.videoId).filter(Boolean);
      const statsMap = await getVideoStats(foundIds);
      const videos = plan.videos.map((v, i) => {
        const yt = searches[i];
        const stats = yt ? (statsMap[yt.videoId] || {}) : {};
        const meta = PHASE_META[v.phase] || PHASE_META["Core Skills"];
        return {
          id: i,
          phase: v.phase, phaseColor: meta.color, tags: meta.tags,
          title: yt?.title || v.youtubeQuery, channel: yt?.channel || "YouTube",
          thumbnail: yt?.thumbnail || "", videoId: yt?.videoId || "",
          duration: stats.duration || "", views: stats.views || "",
          relevanceScore: v.relevanceScore, reason: v.reason,
        };
      });
      const newPath = {
        id: Date.now().toString(), // text id to match Supabase column type
        goal: plan.refinedGoal,
        totalTime: plan.totalTime,
        videos,
        createdAt: new Date().toLocaleDateString(),
      };
      stopCycle();

      // Save to Supabase
      await insertPath(newPath);

      // Update local state
      setSavedPaths(prev => [newPath, ...prev]);
      setCurrentPath(newPath);
      setStage("done");
      setView("path");
      setTimeout(() => setVisible(true), 100);
    } catch (err) {
      stopCycle();
      setErrMsg(err.message || "Something went wrong.");
      setStage("error");
      setView("error");
    }
  }

  const totalWatched = Object.values(watchedMap).filter(Boolean).length;
  const completedPaths = savedPaths.filter(p => getProgress(p).pct === 100).length;

  // ── Loading skeleton while Supabase fetches ────────────────────────────────
  if (!dataLoaded) return (
    <div style={{ minHeight: "100vh", background: "#030a17", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <style>{`@keyframes blink{0%,100%{opacity:1}50%{opacity:0.2}}`}</style>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: "32px", animation: "blink 1.4s infinite", marginBottom: "16px" }}>◈</div>
        <div style={{ color: "#253550", fontSize: "13px", fontFamily: "'Space Mono',monospace" }}>Loading your paths…</div>
      </div>
    </div>
  );

  // ── Home view ──────────────────────────────────────────────────────────────
  if (view === "home") return (
    <div style={{ minHeight: "100vh", background: "#030a17", fontFamily: "'DM Sans',sans-serif", color: "white" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Space+Mono:wght@400;700&family=Syne:wght@700;800;900&display=swap');*{box-sizing:border-box;margin:0;padding:0;}.go-btn:hover{opacity:0.88;transform:translateY(-1px)}.chip:hover{background:#0d1829!important;border-color:#253550!important;color:#7a90a8!important}.path-card:hover{border-color:#1e3a5f!important}.delete-btn:hover{background:#2d1b1b!important;border-color:#ef4444!important;color:#ef4444!important}`}</style>
      {showCompletion && completedPath && (
        <CompletionModal path={completedPath} user={user} onClose={() => setShowCompletion(false)} />
      )}
      <nav style={{ padding: "15px 24px", borderBottom: "1px solid #0a1525", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 50, background: "rgba(3,10,23,0.93)", backdropFilter: "blur(14px)" }}>
        <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: "900", fontSize: "17px", letterSpacing: "-0.5px" }}>leveling<span style={{ color: "#38bdf8" }}>path</span></div>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <span style={{ fontSize: "13px", color: "#475569" }}>Hey, {user?.firstName || "there"} 👋</span>
          <UserButton afterSignOutUrl="/" />
        </div>
      </nav>
      <div style={{ maxWidth: "800px", margin: "0 auto", padding: "32px 20px" }}>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "12px", marginBottom: "32px" }}>
          {[[savedPaths.length,"Paths created"],[completedPaths,"Completed"],[totalWatched,"Videos watched"]].map(([val,label]) => (
            <div key={label} style={{ background: "#06101f", border: "1px solid #111c30", borderRadius: "14px", padding: "20px", textAlign: "center" }}>
              <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: "900", fontSize: "32px", color: "#38bdf8" }}>{val}</div>
              <div style={{ fontSize: "12px", color: "#253550", marginTop: "4px" }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Generate new path */}
        <div style={{ background: "#06101f", border: "1px solid #111c30", borderRadius: "16px", padding: "24px", marginBottom: "28px" }}>
          <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: "800", fontSize: "18px", marginBottom: "6px" }}>Build a new learning path</div>
          <div style={{ color: "#4a6080", fontSize: "14px", marginBottom: "18px" }}>Type any skill you want to learn and we'll find the best free YouTube videos for you.</div>
          <div style={{ position: "relative", marginBottom: "14px" }}>
            <input value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === "Enter" && generate()}
              placeholder='e.g. "Fix a leaking pipe" or "Learn Python"'
              style={{ width: "100%", padding: "14px 140px 14px 16px", background: "#0a1828", border: "1px solid #111c30", borderRadius: "10px", color: "white", fontSize: "15px", outline: "none", fontFamily: "'DM Sans',sans-serif" }} />
            <button className="go-btn" onClick={() => generate()} style={{ position: "absolute", right: "8px", top: "50%", transform: "translateY(-50%)", padding: "8px 18px", background: "linear-gradient(135deg,#0ea5e9,#6366f1)", border: "none", borderRadius: "8px", color: "white", fontWeight: "700", fontSize: "13px", cursor: "pointer", transition: "opacity .15s,transform .15s" }}>Build Path →</button>
          </div>
          <div style={{ display: "flex", gap: "7px", flexWrap: "wrap" }}>
            {TOPICS.map(t => <button key={t} className="chip" onClick={() => { setQuery(t); generate(t); }} style={{ padding: "6px 12px", background: "#0a1828", border: "1px solid #111c30", borderRadius: "20px", color: "#3d5068", fontSize: "12px", cursor: "pointer", transition: "all .18s", fontFamily: "'DM Sans',sans-serif" }}>{t}</button>)}
          </div>
        </div>

        {/* Saved paths */}
        {savedPaths.length > 0 && (
          <div>
            <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: "800", fontSize: "18px", marginBottom: "16px" }}>Your learning paths</div>
            {savedPaths.map(path => {
              const { watched, total, pct } = getProgress(path);
              const col = pct === 100 ? "#4ade80" : pct > 0 ? "#38bdf8" : "#475569";
              const isDeleting = deletingId === path.id;
              return (
                <div key={path.id} className="path-card"
                  style={{ background: "#06101f", border: "1px solid #111c30", borderRadius: "14px", padding: "18px 20px", marginBottom: "10px", transition: "border-color .2s", opacity: isDeleting ? 0.5 : 1 }}>
                  {/* Clickable area — opens the path */}
                  <div onClick={() => { if (isDeleting) return; setCurrentPath(path); setView("path"); setVisible(false); setTimeout(() => setVisible(true), 100); }}
                    style={{ cursor: "pointer" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
                      <div style={{ flex: 1, minWidth: 0, paddingRight: "12px" }}>
                        <div style={{ fontWeight: "700", fontSize: "15px", marginBottom: "3px" }}>{path.goal}</div>
                        <div style={{ fontSize: "12px", color: "#253550" }}>{total} videos · Created {path.createdAt}</div>
                      </div>
                      <span style={{ fontSize: "13px", color: col, fontWeight: "700", fontFamily: "'Space Mono',monospace", flexShrink: 0 }}>{pct}%</span>
                    </div>
                    <div style={{ height: "4px", background: "#1e293b", borderRadius: "2px" }}>
                      <div style={{ height: "4px", width: `${pct}%`, background: col, borderRadius: "2px", transition: "width 0.5s ease" }} />
                    </div>
                    <div style={{ fontSize: "11px", color: "#253550", marginTop: "6px" }}>{watched} of {total} videos watched{pct === 100 ? " · ✓ Completed!" : ""}</div>
                  </div>

                  {/* Delete button */}
                  <div style={{ marginTop: "12px", display: "flex", justifyContent: "flex-end" }}>
                    <button
                      className="delete-btn"
                      disabled={isDeleting}
                      onClick={e => {
                        e.stopPropagation();
                        if (window.confirm(`Delete "${path.goal}"? This can't be undone.`)) {
                          deletePath(path.id);
                        }
                      }}
                      style={{
                        padding: "5px 14px", background: "#0d1829", border: "1px solid #1e293b",
                        borderRadius: "7px", color: "#475569", fontSize: "12px", cursor: isDeleting ? "not-allowed" : "pointer",
                        fontFamily: "'DM Sans',sans-serif", transition: "all .18s",
                      }}>
                      {isDeleting ? "Deleting…" : "🗑 Delete"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {savedPaths.length === 0 && (
          <div style={{ textAlign: "center", padding: "40px 20px", color: "#253550" }}>
            <div style={{ fontSize: "40px", marginBottom: "12px" }}>◈</div>
            <div style={{ fontFamily: "'Syne',sans-serif", fontSize: "18px", fontWeight: "800", marginBottom: "8px", color: "#475569" }}>No paths yet</div>
            <div style={{ fontSize: "14px" }}>Build your first learning path above to get started!</div>
          </div>
        )}
      </div>
    </div>
  );

  // ── Loading / Error ────────────────────────────────────────────────────────
  if (view === "loading" || view === "error") return (
    <div style={{ minHeight: "100vh", background: "#030a17", fontFamily: "'DM Sans',sans-serif", color: "white", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 24px" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Syne:wght@800;900&family=Space+Mono:wght@400&display=swap');@keyframes shimmer{0%{background-position:-400% 0}100%{background-position:400% 0}}@keyframes blink{0%,100%{opacity:1}50%{opacity:0.2}}`}</style>
      {stage === "loading" ? <>
        <div style={{ width: "58px", height: "58px", borderRadius: "15px", background: "linear-gradient(135deg,#0ea5e9,#6366f1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "26px", animation: "blink 1.6s infinite", marginBottom: "24px" }}>◈</div>
        <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: "900", fontSize: "22px", marginBottom: "10px" }}>Building your path…</div>
        <div style={{ color: "#38bdf8", fontSize: "13px", fontFamily: "'Space Mono',monospace", marginBottom: "28px" }}>{loadMsg}</div>
        <div style={{ height: "3px", width: "300px", background: "#0d1829", borderRadius: "2px", overflow: "hidden" }}>
          <div style={{ height: "100%", width: "100%", background: "linear-gradient(90deg,#030a17 0%,#38bdf8 40%,#6366f1 60%,#030a17 100%)", backgroundSize: "400% 100%", animation: "shimmer 1.8s linear infinite" }} />
        </div>
      </> : <>
        <div style={{ fontSize: "38px", marginBottom: "16px" }}>⚠️</div>
        <div style={{ fontFamily: "'Syne',sans-serif", fontSize: "20px", fontWeight: "900", marginBottom: "10px" }}>Something went wrong</div>
        <div style={{ color: "#475569", fontSize: "14px", marginBottom: "24px" }}>{errMsg}</div>
        <button onClick={() => { setStage("idle"); setView("home"); }} style={{ padding: "10px 24px", background: "#06101f", border: "1px solid #111c30", borderRadius: "9px", color: "white", cursor: "pointer", fontSize: "14px" }}>← Back to dashboard</button>
      </>}
    </div>
  );

  // ── Path view ──────────────────────────────────────────────────────────────
  if (view === "path" && currentPath) {
    const phases = [...new Set(currentPath.videos.map(v => v.phase))];
    const { watched, total, pct } = getProgress(currentPath);
    return (
      <div style={{ minHeight: "100vh", background: "#030a17", fontFamily: "'DM Sans',sans-serif", color: "white" }}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=Space+Mono:wght@400;700&family=Syne:wght@800;900&display=swap');*{box-sizing:border-box;margin:0;padding:0;}`}</style>
        {showCompletion && completedPath && (
          <CompletionModal path={completedPath} user={user} onClose={() => setShowCompletion(false)} />
        )}
        <nav style={{ padding: "15px 24px", borderBottom: "1px solid #0a1525", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 50, background: "rgba(3,10,23,0.93)", backdropFilter: "blur(14px)" }}>
          <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: "900", fontSize: "17px" }}>leveling<span style={{ color: "#38bdf8" }}>path</span></div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <button onClick={() => setView("home")} style={{ background: "none", border: "none", color: "#475569", fontSize: "13px", cursor: "pointer", fontFamily: "'Space Mono',monospace" }}>← Dashboard</button>
            <UserButton afterSignOutUrl="/" />
          </div>
        </nav>
        <div style={{ maxWidth: "680px", margin: "0 auto", padding: "0 16px 80px" }}>
          <div style={{ padding: "22px 0 16px" }}>
            <div style={{ background: "linear-gradient(135deg,#06101f,#0a1828)", border: "1px solid #111c30", borderRadius: "16px", padding: "22px" }}>
              <div style={{ fontSize: "10px", color: "#38bdf8", fontWeight: "700", letterSpacing: "2px", marginBottom: "10px", fontFamily: "'Space Mono',monospace" }}>YOUR LEARNING PATH</div>
              <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: "800", fontSize: "18px", lineHeight: "1.35", marginBottom: "14px" }}>{currentPath.goal}</div>
              <div style={{ display: "flex", gap: "20px", flexWrap: "wrap", marginBottom: "14px" }}>
                {[[`${total} videos`,"▶","#4ade80"],[`~${currentPath.totalTime}`,"⏱","#38bdf8"],["Real YouTube results","◈","#a78bfa"]].map(([txt,icon,col]) => (
                  <div key={txt} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span style={{ color: col, fontSize: "12px" }}>{icon}</span>
                    <span style={{ color: "#3d5068", fontSize: "12.5px" }}>{txt}</span>
                  </div>
                ))}
              </div>
              <div style={{ marginBottom: "6px", display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: "12px", color: "#475569" }}>{watched} of {total} watched</span>
                <span style={{ fontSize: "12px", color: pct === 100 ? "#4ade80" : "#38bdf8", fontWeight: "700" }}>{pct}%{pct === 100 ? " · Complete! 🎉" : ""}</span>
              </div>
              <div style={{ height: "6px", background: "#1e293b", borderRadius: "3px" }}>
                <div style={{ height: "6px", width: `${pct}%`, background: pct === 100 ? "#4ade80" : "linear-gradient(90deg,#38bdf8,#6366f1)", borderRadius: "3px", transition: "width 0.5s ease" }} />
              </div>
            </div>
          </div>
          {phases.map((phaseName, pi) => {
            const meta = PHASE_META[phaseName] || PHASE_META["Core Skills"];
            const phaseVideos = currentPath.videos.filter(v => v.phase === phaseName);
            return (
              <div key={phaseName}>
                <div style={{ display: "flex", alignItems: "center", gap: "9px", padding: "14px 0 10px" }}>
                  <span style={{ color: meta.color, fontSize: "10px" }}>{meta.icon}</span>
                  <span style={{ fontSize: "10px", fontWeight: "700", letterSpacing: "2px", color: meta.color, fontFamily: "'Space Mono',monospace" }}>PHASE {pi+1} · {phaseName.toUpperCase()}</span>
                  <div style={{ flex: 1, height: "1px", background: "#0d1829" }} />
                </div>
                {phaseVideos.map(video => (
                  <VideoCard key={video.id} video={video} globalIndex={video.id} visible={visible} phaseColor={meta.color}
                    watched={!!watchedMap[`${currentPath.id}_${video.id}`]}
                    onToggle={() => toggleWatched(currentPath.id, video.id)} />
                ))}
              </div>
            );
          })}
          <div style={{ background: "#06101f", border: "1px solid #111c30", borderRadius: "14px", padding: "26px", textAlign: "center", marginTop: "18px" }}>
            <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: "800", fontSize: "17px", marginBottom: "6px" }}>
              {pct === 100 ? "🎉 Path complete! What's next?" : "🎯 Keep going — you've got this!"}
            </div>
            <div style={{ color: "#3d5068", fontSize: "13px", marginBottom: "20px" }}>
              {pct === 100 ? "You've mastered this skill. Ready to learn something new?" : `${total - watched} videos left in this path.`}
            </div>
            <button onClick={() => setView("home")} style={{ padding: "11px 26px", background: "linear-gradient(135deg,#0ea5e9,#6366f1)", border: "none", borderRadius: "10px", color: "white", fontWeight: "700", fontSize: "14px", cursor: "pointer" }}>
              {pct === 100 ? "Build another path →" : "← Back to dashboard"}
            </button>
            {pct === 100 && (
              <button onClick={() => { setCompletedPath(currentPath); setShowCompletion(true); }} style={{ marginTop: "10px", padding: "11px 26px", background: "linear-gradient(135deg,#fbbf24,#f59e0b)", border: "none", borderRadius: "10px", color: "white", fontWeight: "700", fontSize: "14px", cursor: "pointer" }}>
                🏆 View Achievement Card
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return null;
}

// ── Root App ──────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <>
      <SignedOut><LandingPage /></SignedOut>
      <SignedIn><Dashboard /></SignedIn>
    </>
  );
}