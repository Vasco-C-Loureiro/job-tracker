import { LogoBanner } from "./LogoBanner";

const BULLETS = [
  "Free to start, no credit card needed",
  "Works on Indeed, LinkedIn & more",
  "Your data is always private",
  "30-day money-back guarantee",
];

type StatusKey = "interview" | "applied" | "oa" | "saved" | "offer";

const STATUS_STYLES: Record<
  StatusKey,
  { bg: string; color: string; label: string }
> = {
  offer: { bg: "#D1FAE5", color: "#065F46", label: "Offer" },
  interview: { bg: "#EDE9FE", color: "#5B21B6", label: "Interview" },
  applied: { bg: "#FEF3C7", color: "#92400E", label: "Applied" },
  oa: { bg: "#F3E8FF", color: "#6B21A8", label: "OA" },
  saved: { bg: "#F3F4F6", color: "#374151", label: "Saved" },
};

const MOCK_ROWS: {
  company: string;
  role: string;
  status: StatusKey;
  location: string;
  salary: string;
}[] = [
  {
    company: "Google",
    role: "Software Engineer",
    status: "offer",
    location: "London, UK",
    salary: "£85k",
  },
  {
    company: "Notion",
    role: "Frontend Developer",
    status: "saved",
    location: "Remote",
    salary: "£70k",
  },
  {
    company: "Anthropic",
    role: "Full Stack Engineer",
    status: "applied",
    location: "London, UK",
    salary: "£90k",
  },
  {
    company: "Figma",
    role: "React Developer",
    status: "interview",
    location: "Hybrid",
    salary: "£75k",
  },
  {
    company: "Linear",
    role: "Backend Engineer",
    status: "applied",
    location: "Remote",
    salary: "£65k",
  },
];

const dashGridCols = "90px 100px 140px 80px 90px";

export function HeroSection() {
  return (
    <section
      data-theme="light"
      style={{
        minHeight: "90vh",
        paddingTop: "96px",
        paddingBottom: "64px",
        background: "#FFFFFF",
        fontFamily: "var(--font-geist-sans), Arial, sans-serif",
      }}
    >
      <div className="max-w-6xl mx-auto px-6">
        {/* Two-column grid */}
        <div className="grid grid-cols-1 lg:grid-cols-[55fr_45fr] gap-10 lg:gap-12 items-center">
          {/* ── LEFT COLUMN ── */}
          <div>
            {/* Review pill */}
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                border: "1px solid #3C896D",
                borderRadius: "999px",
                padding: "6px 14px",
                fontSize: "12px",
                fontWeight: 500,
                color: "#3C896D",
                marginBottom: "12px",
              }}
            >
              <span style={{ color: "#F59E0B" }}>★</span>
              Rated 4.9/5.0 by 500+ job seekers
            </div>

            {/* Headline */}
            <h1
              style={{
                fontSize: "clamp(36px, 4.2vw, 54px)",
                fontWeight: 800,
                lineHeight: 1.05,
                letterSpacing: "-0.03em",
                color: "#1A1A1A",
                marginBottom: "24px",
                display: "block",
              }}
            >
              <span style={{ whiteSpace: "nowrap" }}>Stop losing track</span>
              <br />
              <span
                style={{
                  whiteSpace: "nowrap",
                  textDecoration: "underline",
                  textDecorationColor: "#3C896D",
                  textDecorationThickness: "3px",
                  textUnderlineOffset: "6px",
                }}
              >
                Start landing offers
              </span>
            </h1>

            {/* Sub-headline */}
            <p
              style={{
                fontSize: "18px",
                lineHeight: 1.65,
                color: "#6B7280",
                maxWidth: "460px",
                marginBottom: "32px",
              }}
            >
              Tired of applying into the void? One click saves any job. Ascend
              handles the rest — tracking every stage, every follow-up, and
              every interview until you land the offer.
            </p>

            {/* CTA card */}
            <div
              style={{
                background: "#FFFFFF",
                border: "1px solid #E5E7EB",
                borderRadius: "16px",
                padding: "20px 24px",
                boxShadow: "0 4px 24px rgba(0,0,0,0.07)",
                display: "flex",
                flexDirection: "column",
                gap: "16px",
              }}
            >
              {/* CTA button */}
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

              {/* FUD bullets — 2×2 grid */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "6px 12px",
                  marginTop: "4px",
                  marginBottom: "4px",
                }}
              >
                {BULLETS.map((text) => (
                  <div
                    key={text}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <circle
                        cx="7"
                        cy="7"
                        r="7"
                        fill="#3C896D"
                        opacity="0.15"
                      />
                      <polyline
                        points="3.5,7 6,9.5 10.5,4.5"
                        stroke="#3C896D"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <span style={{ fontSize: "12px", color: "#6B7280" }}>
                      {text}
                    </span>
                  </div>
                ))}
              </div>

              {/* Login link */}
              <p
                style={{
                  fontSize: "13px",
                  color: "#9CA3AF",
                  textAlign: "center",
                }}
              >
                Already have an account?{" "}
                <a href="/login" className="landing-login-link">
                  Log in
                </a>
              </p>
            </div>
          </div>

          {/* ── RIGHT COLUMN ── */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "flex-start",
              position: "relative",
              paddingTop: "138px",
            }}
          >
            {/* Curved arrow + label pointing to Save Job button */}
            <div
              style={{
                position: "absolute",
                top: "-32px",
                right: "90px",
                zIndex: 2,
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <span
                style={{
                  fontSize: "11px",
                  color: "#3C896D",
                  fontWeight: 600,
                  fontStyle: "italic",
                }}
              >
                Save any job with one click
              </span>
              <svg width="32" height="24" viewBox="0 0 32 24" fill="none" aria-hidden="true">
                <path
                  d="M2 4 C8 4, 20 4, 28 20"
                  stroke="#3C896D"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  fill="none"
                />
                <polyline
                  points="23,22 28,20 26,15"
                  stroke="#3C896D"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
              </svg>
            </div>

            {/* Dashboard + popup positioning wrapper */}
            <div
              style={{
                position: "relative",
                width: "fit-content",
                marginLeft: "40px",
              }}
            >
              {/* Extension popup — peeks behind dashboard top-right corner */}
              <div
                style={{
                  position: "absolute",
                  top: "-158px",
                  right: "-80px",
                  width: "200px",
                  padding: "16px",
                  background: "#FFFFFF",
                  borderRadius: "16px",
                  boxShadow: "0 8px 32px rgba(0,0,0,0.16)",
                  border: "1px solid #E5E7EB",
                  zIndex: 0,
                }}
              >
                {/* Header: logo + app name */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    marginBottom: "12px",
                  }}
                >
                  <div
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "50%",
                      background: "#3C896D",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 28 28"
                      fill="none"
                      aria-hidden="true"
                    >
                      <polyline
                        points="6 18 14 10 22 18"
                        stroke="rgba(255,255,255,0.5)"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <polyline
                        points="6 14 14 6 22 14"
                        stroke="#FFFFFF"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "0px",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "13px",
                        fontWeight: 700,
                        color: "#1A1A1A",
                      }}
                    >
                      Ascend Extension
                    </span>
                    <svg
                      width="100%"
                      height="6"
                      viewBox="0 0 120 6"
                      preserveAspectRatio="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M0 3 Q4 0 8 3 Q12 6 16 3 Q20 0 24 3 Q28 6 32 3 Q36 0 40 3 Q44 6 48 3 Q52 0 56 3 Q60 6 64 3 Q68 0 72 3 Q76 6 80 3 Q84 0 88 3 Q92 6 96 3 Q100 0 104 3 Q108 6 112 3 Q116 0 120 3"
                        stroke="#3C896D"
                        strokeWidth="1"
                        fill="none"
                        strokeLinecap="round"
                      />
                    </svg>
                  </div>
                </div>

                {/* Job info */}
                <div
                  style={{
                    marginBottom: "12px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "4px",
                  }}
                >
                  <span
                    style={{
                      fontSize: "12px",
                      fontWeight: 600,
                      color: "#1A1A1A",
                    }}
                  >
                    Stripe
                  </span>
                  <span
                    style={{
                      fontSize: "11px",
                      color: "#6B7280",
                      paddingLeft: "10px",
                    }}
                  >
                    Software Engineer
                  </span>
                  <span
                    style={{
                      fontSize: "11px",
                      color: "#3C896D",
                      fontWeight: 500,
                      paddingLeft: "10px",
                    }}
                  >
                    £85,000 / year
                  </span>
                </div>

                {/* Save button */}
                <div
                  style={{
                    background: "#3C896D",
                    color: "#FFFFFF",
                    fontSize: "12px",
                    fontWeight: 600,
                    padding: "8px 0",
                    borderRadius: "8px",
                    textAlign: "center",
                    cursor: "pointer",
                  }}
                >
                  Save Job ✓
                </div>
              </div>

              {/* Dashboard mockup */}
              <div
                style={{
                  position: "relative",
                  zIndex: 1,
                  borderRadius: "16px",
                  overflow: "hidden",
                  border: "1px solid #E5E7EB",
                  boxShadow: "0 20px 60px rgba(0,0,0,0.12)",
                }}
                className="lg:[transform:perspective(1200px)_rotateX(4deg)] lg:[transform-origin:top_center]"
              >
                {/* Table header */}
                <div
                  style={{
                    background: "#F9FAFB",
                    borderBottom: "1px solid #E5E7EB",
                    padding: "12px 6px 12px 14px",
                    display: "grid",
                    gridTemplateColumns: dashGridCols,
                    gap: "8px",
                  }}
                >
                  {["Status", "Company", "Role", "Salary", "Location"].map(
                    (h, i, arr) => (
                      <span
                        key={h}
                        style={{
                          fontSize: "11px",
                          fontWeight: 600,
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                          color: "#9CA3AF",
                          ...(i === 0 && { paddingLeft: "18px" }),
                          ...(i === arr.length - 1 && { paddingRight: "6px" }),
                        }}
                      >
                        {h}
                      </span>
                    ),
                  )}
                </div>

                {/* Table rows */}
                {MOCK_ROWS.map((row, i) => {
                  const st = STATUS_STYLES[row.status];
                  return (
                    <div
                      key={i}
                      style={{
                        display: "grid",
                        gridTemplateColumns: dashGridCols,
                        gap: "8px",
                        padding: "12px 6px 12px 14px",
                        borderBottom:
                          i < MOCK_ROWS.length - 1
                            ? "1px solid #F3F4F6"
                            : "none",
                        background: "#FFFFFF",
                        alignItems: "center",
                        opacity: i === 4 ? 0.4 : 1,
                      }}
                    >
                      <div style={{ paddingLeft: "18px" }}>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            padding: "3px 8px",
                            borderRadius: "999px",
                            fontSize: "10px",
                            fontWeight: 600,
                            textTransform: "capitalize",
                            background: st.bg,
                            color: st.color,
                            width: "fit-content",
                          }}
                        >
                          {st.label}
                        </span>
                      </div>
                      <span
                        style={{
                          fontWeight: 600,
                          color: "#1A1A1A",
                          fontSize: "14px",
                        }}
                      >
                        {row.company}
                      </span>
                      <span style={{ color: "#374151", fontSize: "14px" }}>
                        {row.role}
                      </span>
                      <span style={{ color: "#6B7280", fontSize: "14px" }}>
                        {row.salary}
                      </span>
                      <span
                        style={{
                          color: "#6B7280",
                          fontSize: "14px",
                          paddingRight: "6px",
                        }}
                      >
                        {row.location}
                      </span>
                    </div>
                  );
                })}

                {/* Gradient fade overlay */}
                <div
                  style={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: "45%",
                    background:
                      "linear-gradient(to bottom, transparent 0%, white 100%)",
                    pointerEvents: "none",
                    zIndex: 10,
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Logo banner — negative margin pulls it closer to the hero */}
        <div style={{ marginTop: "-20px" }}>
          <LogoBanner />
        </div>
      </div>
    </section>
  );
}
