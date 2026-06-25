import { LogoBanner } from "./LogoBanner";

const BULLETS = [
  "Free to start — no credit card required",
  "Works on Indeed, LinkedIn, Greenhouse & more",
  "24/7 support · Your data is always private",
];

type StatusKey = "interview" | "applied" | "oa" | "saved";

const STATUS_STYLES: Record<StatusKey, { bg: string; color: string; label: string }> = {
  interview: { bg: "#DBEAFE", color: "#1D4ED8", label: "Interview" },
  applied:   { bg: "#FEF3C7", color: "#92400E", label: "Applied"   },
  oa:        { bg: "#F3E8FF", color: "#6B21A8", label: "OA"        },
  saved:     { bg: "#F3F4F6", color: "#374151", label: "Saved"     },
};

const MOCK_ROWS: {
  company: string;
  role: string;
  status: StatusKey;
  location: string;
  salary: string;
}[] = [
  { company: "Stripe",    role: "Software Engineer",   status: "interview", location: "London, UK", salary: "£65k – £85k"  },
  { company: "Monzo",     role: "Frontend Developer",  status: "applied",   location: "Remote",     salary: "£55k – £70k"  },
  { company: "Anthropic", role: "Full Stack Engineer",  status: "oa",        location: "London, UK", salary: "£80k – £110k" },
  { company: "Revolut",   role: "React Developer",     status: "saved",     location: "Hybrid",     salary: "£60k – £75k"  },
  { company: "DeepMind",  role: "Backend Engineer",    status: "interview", location: "London, UK", salary: "£90k – £120k" },
];

function Checkmark() {
  return (
    <div style={{
      width: "20px", height: "20px", borderRadius: "50%",
      background: "#3C896D", flexShrink: 0,
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
        <polyline
          points="2,6 5,9 10,3"
          stroke="white" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

const gridCols = "2fr 2fr 1fr 1fr 1fr";

export function HeroSection() {
  return (
    <section
      data-theme="light"
      style={{
        minHeight: "90vh",
        paddingTop: "96px",
        paddingBottom: "64px",
        background: "#FFFFFF",
      }}
    >
      <div className="max-w-6xl mx-auto px-6">

        {/* Two-column grid */}
        <div className="grid grid-cols-1 lg:grid-cols-[55fr_45fr] gap-10 lg:gap-12 items-center">

          {/* ── LEFT COLUMN ── */}
          <div>
            {/* Eyebrow */}
            <span style={{
              display: "block",
              fontSize: "12px",
              fontWeight: 600,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "#3C896D",
              marginBottom: "20px",
            }}>
              Job application tracking, reimagined
            </span>

            {/* Headline */}
            <h1 style={{
              fontSize: "clamp(40px, 5vw, 60px)",
              fontWeight: 800,
              lineHeight: 1.05,
              letterSpacing: "-0.03em",
              color: "#1A1A1A",
              marginBottom: "24px",
              display: "block",
            }}>
              <span>Stop losing track.</span>
              <br />
              <span style={{
                textDecoration: "underline",
                textDecorationColor: "#3C896D",
                textDecorationThickness: "3px",
                textUnderlineOffset: "6px",
              }}>
                Start landing offers.
              </span>
            </h1>

            {/* Sub-headline */}
            <p style={{
              fontSize: "18px",
              lineHeight: 1.65,
              color: "#6B7280",
              maxWidth: "460px",
              marginBottom: "32px",
            }}>
              Ascend gives you one place to save, track, and manage every job
              application — so you can focus on getting hired, not chasing
              spreadsheets.
            </p>

            {/* Social proof */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ color: "#F59E0B", fontSize: "16px" }}>★★★★★</span>
              <span style={{ fontSize: "14px", color: "#6B7280" }}>
                5.0 · Loved by 500+ job seekers
              </span>
            </div>
          </div>

          {/* ── RIGHT COLUMN ── */}
          <div style={{
            background: "#FFFFFF",
            border: "1px solid #E5E7EB",
            borderRadius: "16px",
            padding: "32px",
            boxShadow: "0 4px 24px rgba(0,0,0,0.07)",
            display: "flex",
            flexDirection: "column",
            gap: "24px",
          }}>
            {/* Bullets */}
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {BULLETS.map((text) => (
                <div key={text} style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                  <Checkmark />
                  <span style={{ fontSize: "14px", color: "#374151", lineHeight: 1.5 }}>{text}</span>
                </div>
              ))}
            </div>

            {/* Divider */}
            <div style={{ borderTop: "1px solid #F3F4F6" }} />

            {/* CTA */}
            <div>
              <p style={{ fontSize: "18px", fontWeight: 700, color: "#1A1A1A", marginBottom: "16px" }}>
                Start tracking for free
              </p>
              <a
                href="/signup"
                className="landing-cta-btn"
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "center",
                  color: "#FFFFFF",
                  fontSize: "15px",
                  fontWeight: 600,
                  padding: "14px 0",
                  borderRadius: "10px",
                  textDecoration: "none",
                  border: "none",
                  cursor: "pointer",
                  boxSizing: "border-box",
                }}
              >
                Get Started Free →
              </a>
              <p style={{ fontSize: "13px", color: "#9CA3AF", textAlign: "center", marginTop: "12px" }}>
                Already have an account?{" "}
                <a href="/login" className="landing-login-link">
                  Log in
                </a>
              </p>
            </div>
          </div>
        </div>

        {/* Logo banner */}
        <LogoBanner />

        {/* Dashboard mock */}
        <div
          style={{
            marginTop: "64px",
            position: "relative",
            borderRadius: "16px",
            overflow: "hidden",
            border: "1px solid #E5E7EB",
            boxShadow: "0 20px 60px rgba(0,0,0,0.12)",
          }}
          className="lg:[transform:perspective(1200px)_rotateX(4deg)] lg:[transform-origin:top_center]"
        >
          {/* Table header */}
          <div style={{
            background: "#F9FAFB",
            borderBottom: "1px solid #E5E7EB",
            padding: "12px 20px",
            display: "grid",
            gridTemplateColumns: gridCols,
            gap: "16px",
          }}>
            {["Company", "Role", "Status", "Location", "Salary"].map((h) => (
              <span key={h} style={{
                fontSize: "11px", fontWeight: 600,
                textTransform: "uppercase", letterSpacing: "0.06em",
                color: "#9CA3AF",
              }}>
                {h}
              </span>
            ))}
          </div>

          {/* Table rows */}
          {MOCK_ROWS.map((row, i) => {
            const st = STATUS_STYLES[row.status];
            return (
              <div key={i} style={{
                display: "grid",
                gridTemplateColumns: gridCols,
                gap: "16px",
                padding: "14px 20px",
                borderBottom: i < MOCK_ROWS.length - 1 ? "1px solid #F3F4F6" : "none",
                background: "#FFFFFF",
                alignItems: "center",
              }}>
                <span style={{ fontWeight: 600, color: "#1A1A1A", fontSize: "14px" }}>{row.company}</span>
                <span style={{ color: "#374151", fontSize: "14px" }}>{row.role}</span>
                <span style={{
                  display: "inline-flex", alignItems: "center",
                  padding: "3px 10px", borderRadius: "999px",
                  fontSize: "11px", fontWeight: 600,
                  textTransform: "capitalize",
                  background: st.bg, color: st.color,
                  width: "fit-content",
                }}>
                  {st.label}
                </span>
                <span style={{ color: "#6B7280", fontSize: "13px" }}>{row.location}</span>
                <span style={{ color: "#6B7280", fontSize: "13px" }}>{row.salary}</span>
              </div>
            );
          })}

          {/* Gradient fade overlay */}
          <div style={{
            position: "absolute",
            bottom: 0, left: 0, right: 0,
            height: "45%",
            background: "linear-gradient(to bottom, transparent 0%, white 100%)",
            pointerEvents: "none",
            zIndex: 10,
          }} />
        </div>

      </div>
    </section>
  );
}
