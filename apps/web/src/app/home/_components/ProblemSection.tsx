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
    heading: "And you're wasting hours keeping it that way.",
    body: "Copying job titles into spreadsheets. Updating formulas. Colour-coding rows. You're spending real time on admin that should take seconds — time that could be spent preparing, applying, and interviewing.",
    cta: null,
  },
  {
    num: "03",
    numColor: "#E5E7EB",
    heading: "And it's costing you real opportunities.",
    body: "You forgot to follow up. You applied to the same company twice. You missed a deadline because it was buried in a tab. Meanwhile, other candidates showed up to interviews prepared — because they had a system.",
    cta: null,
  },
  {
    num: "04",
    numColor: "#3C896D",
    heading: "Ascend gives you that system.",
    body: "One click saves any job listing. Every application tracked through every stage. Interviews scheduled, deadlines visible, offers celebrated. From saved to signed — in one place.",
    cta: true,
  },
];

const BEFORE_ROWS: [string, string, string, string, string][] = [
  ["Software Eng...", "Google??", "Applied", "❌", "forgot date"],
  ["Frontend Dev", "Meta", "REJECTED", "❌❌", ""],
  ["React Dev", "???", "maybe applied", "", "check email"],
  ["Junior Dev", "Startup co.", "GHOSTED 😭", "", ""],
  ["Full Stack", "Amazon", "Rejected", "❌❌❌", ""],
  ["Engineer", "", "??", "", "update this!!"],
];

const AFTER_ROWS = [
  {
    status: "Offer 🎉",
    statusBg: "#D1FAE5",
    statusColor: "#065F46",
    company: "Stripe",
    role: "Software Engineer",
    location: "London",
  },
  {
    status: "Interview",
    statusBg: "#DBEAFE",
    statusColor: "#1D40AF",
    company: "Google",
    role: "Frontend Engineer",
    location: "Remote",
  },
  {
    status: "Interview",
    statusBg: "#DBEAFE",
    statusColor: "#1D40AF",
    company: "Anthropic",
    role: "Full Stack Dev",
    location: "Remote",
  },
  {
    status: "Applied",
    statusBg: "#FEF3C7",
    statusColor: "#92400E",
    company: "Monzo",
    role: "React Developer",
    location: "London",
  },
  {
    status: "Applied",
    statusBg: "#FEF3C7",
    statusColor: "#92400E",
    company: "Revolut",
    role: "Junior Engineer",
    location: "London",
  },
];

const cellStyle: React.CSSProperties = {
  border: "1px solid #D1D5DB",
  padding: "2px 3px",
  fontSize: "10px",
  color: "#374151",
  whiteSpace: "nowrap",
  overflow: "hidden",
  maxWidth: "48px",
  textOverflow: "ellipsis",
};

const thStyle: React.CSSProperties = {
  ...cellStyle,
  background: "#F3F4F6",
  fontWeight: 600,
  color: "#6B7280",
  textAlign: "center",
};

function isRedCell(text: string) {
  return text.includes("REJECT") || text.includes("Reject") || text.includes("GHOST");
}

export function ProblemSection() {
  function scrollToHowItWorks(e: React.MouseEvent) {
    e.preventDefault();
    document
      .getElementById("how-it-works")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <section
      id="problem"
      style={{ background: "#F9FAFB", padding: "96px 0", scrollMarginTop: "80px", fontFamily: "var(--font-geist-sans), Arial, sans-serif" }}
    >
      <div className="max-w-6xl mx-auto px-6">
        {/* Section header */}
        <span
          style={{
            display: "block",
            textAlign: "center",
            fontSize: "12px",
            fontWeight: 600,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "#3C896D",
            marginBottom: "12px",
          }}
        >
          The Problem
        </span>
        <h2
          style={{
            fontSize: "clamp(28px, 3.5vw, 40px)",
            fontWeight: 800,
            lineHeight: 1.15,
            letterSpacing: "-0.02em",
            color: "#1A1A1A",
            textAlign: "center",
            maxWidth: "560px",
            margin: "0 auto 64px auto",
          }}
        >
          Your job search deserves better than a messy spreadsheet
        </h2>

        {/* Two-column layout */}
        <div
          style={{
            display: "flex",
            gap: "64px",
            alignItems: "flex-start",
            maxWidth: "1100px",
            margin: "0 auto",
          }}
        >
          {/* ── LEFT: before/after visual ── */}
          <div style={{ flexShrink: 0, position: "sticky", top: "120px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                marginTop: "32px",
              }}
            >
              {/* BEFORE panel */}
              <div style={{ width: "160px" }}>
                <div
                  style={{
                    fontSize: "10px",
                    color: "#EF4444",
                    fontWeight: 700,
                    letterSpacing: "0.1em",
                    marginBottom: "6px",
                  }}
                >
                  BEFORE
                </div>
                <div
                  style={{
                    background: "#FFFFFF",
                    border: "2px solid #E5E7EB",
                    borderRadius: "8px",
                    padding: "12px",
                    overflowX: "hidden",
                  }}
                >
                  <table style={{ borderCollapse: "collapse", width: "100%" }}>
                    <thead>
                      <tr>
                        {["A", "B", "C", "D", "E"].map((h) => (
                          <th key={h} style={thStyle}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {BEFORE_ROWS.map((row, ri) => (
                        <tr key={ri}>
                          {row.map((cell, ci) => (
                            <td
                              key={ci}
                              style={{
                                ...cellStyle,
                                color: isRedCell(cell) ? "#EF4444" : "#374151",
                              }}
                            >
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Arrow */}
              <span style={{ color: "#9CA3AF", fontSize: "20px", flexShrink: 0 }}>
                →
              </span>

              {/* AFTER panel */}
              <div style={{ width: "160px" }}>
                <div
                  style={{
                    fontSize: "10px",
                    color: "#3C896D",
                    fontWeight: 700,
                    letterSpacing: "0.1em",
                    marginBottom: "6px",
                  }}
                >
                  AFTER
                </div>
                <div
                  style={{
                    background: "#FFFFFF",
                    border: "2px solid #3C896D",
                    borderRadius: "8px",
                    padding: "12px",
                  }}
                >
                  <table style={{ borderCollapse: "collapse", width: "100%" }}>
                    <thead>
                      <tr>
                        {["Status", "Company", "Role", "Location"].map((h) => (
                          <th
                            key={h}
                            style={{
                              fontSize: "10px",
                              fontWeight: 600,
                              color: "#6B7280",
                              padding: "2px 4px",
                              textAlign: "left",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {AFTER_ROWS.map((row, ri) => (
                        <tr key={ri}>
                          <td style={{ padding: "3px 4px" }}>
                            <span
                              style={{
                                display: "inline-block",
                                background: row.statusBg,
                                color: row.statusColor,
                                fontSize: "9px",
                                fontWeight: 600,
                                padding: "1px 5px",
                                borderRadius: "999px",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {row.status}
                            </span>
                          </td>
                          <td
                            style={{
                              fontSize: "10px",
                              color: "#1A1A1A",
                              padding: "3px 4px",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {row.company}
                          </td>
                          <td
                            style={{
                              fontSize: "10px",
                              color: "#374151",
                              padding: "3px 4px",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {row.role}
                          </td>
                          <td
                            style={{
                              fontSize: "10px",
                              color: "#6B7280",
                              padding: "3px 4px",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {row.location}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          {/* ── RIGHT: beats list ── */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "48px" }}>
            {BEATS.map((beat, i) => (
              <div key={beat.num}>
                {i > 0 && (
                  <div style={{ borderTop: "1px solid #E5E7EB", marginBottom: "48px" }} />
                )}
                <div className="flex flex-col md:flex-row items-start gap-4 md:gap-8">
                  <span style={{ ...numberStyle, color: beat.numColor }}>{beat.num}</span>
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
                          (e.currentTarget as HTMLAnchorElement).style.textDecoration =
                            "underline";
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
      </div>
    </section>
  );
}
