"use client";

const numberStyle: React.CSSProperties = {
  fontSize: "48px",
  fontWeight: 900,
  lineHeight: 1,
  fontVariantNumeric: "tabular-nums",
  letterSpacing: "-0.04em",
  flexShrink: 0,
  width: "64px",
};

const headingStyle: React.CSSProperties = {
  fontSize: "20px",
  fontWeight: 700,
  color: "#1A1A1A",
  marginBottom: "10px",
  lineHeight: 1.3,
};

const bodyStyle: React.CSSProperties = {
  fontSize: "15px",
  lineHeight: 1.7,
  color: "#6B7280",
};

const BEATS = [
  {
    num: "01",
    numColor: "#E5E7EB",
    heading: "Your job search is a mess.",
    body: "Applications scattered across browser tabs, spreadsheets, and sticky notes. You've lost track of who you applied to, when you heard back, and what happened next. Sound familiar?",
    cta: null,
  },
  {
    num: "02",
    numColor: "#E5E7EB",
    heading: "And it's costing you real opportunities.",
    body: "You forgot to follow up. You applied to the same company twice. You missed a deadline because it was buried in a tab. Meanwhile, other candidates showed up to interviews prepared — because they had a system.",
    cta: null,
  },
  {
    num: "03",
    numColor: "#3C896D",
    heading: "Ascend gives you that system.",
    body: "One click saves any job listing. Every application tracked through every stage. Interviews scheduled, deadlines visible, offers celebrated. From saved to signed — in one place.",
    cta: true,
  },
];

export function ProblemSection() {
  function scrollToHowItWorks(e: React.MouseEvent) {
    e.preventDefault();
    document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <section
      id="problem"
      style={{ background: "#F9FAFB", padding: "96px 0", scrollMarginTop: "80px" }}
    >
      <div className="max-w-6xl mx-auto px-6">

        {/* Section header */}
        <span style={{
          display: "block",
          textAlign: "center",
          fontSize: "12px",
          fontWeight: 600,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: "#3C896D",
          marginBottom: "12px",
        }}>
          The Problem
        </span>
        <h2 style={{
          fontSize: "clamp(28px, 3.5vw, 40px)",
          fontWeight: 800,
          lineHeight: 1.15,
          letterSpacing: "-0.02em",
          color: "#1A1A1A",
          textAlign: "center",
          maxWidth: "560px",
          margin: "0 auto 64px auto",
        }}>
          Your job search deserves better than a spreadsheet.
        </h2>

        {/* Three beats */}
        <div style={{ maxWidth: "720px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "48px" }}>
          {BEATS.map((beat, i) => (
            <div key={beat.num}>
              {/* Divider before beat 2 and 3 */}
              {i > 0 && (
                <div style={{ borderTop: "1px solid #E5E7EB", marginBottom: "48px" }} />
              )}

              <div className="flex flex-col md:flex-row items-start gap-4 md:gap-8">
                {/* Number */}
                <span style={{ ...numberStyle, color: beat.numColor }}>
                  {beat.num}
                </span>

                {/* Text */}
                <div>
                  <h3 style={headingStyle}>{beat.heading}</h3>
                  <p style={bodyStyle}>{beat.body}</p>
                  {beat.cta && (
                    <a
                      href="#how-it-works"
                      onClick={scrollToHowItWorks}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                        marginTop: "16px",
                        fontSize: "14px",
                        fontWeight: 600,
                        color: "#3C896D",
                        textDecoration: "none",
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLAnchorElement).style.textDecoration = "underline";
                        (e.currentTarget as HTMLAnchorElement).style.color = "#2d6b55";
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLAnchorElement).style.textDecoration = "none";
                        (e.currentTarget as HTMLAnchorElement).style.color = "#3C896D";
                      }}
                    >
                      See how it works →
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
