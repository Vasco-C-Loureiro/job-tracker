"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";

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

const SLIDER_WIDTH = 480;
const INITIAL_REVEAL = 30;

export function ProblemSection() {
  const [revealX, setRevealX] = useState(INITIAL_REVEAL);
  const isDragging = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  function scrollToHowItWorks(e: React.MouseEvent) {
    e.preventDefault();
    document
      .getElementById("how-it-works")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const handleMouseDown = useCallback(() => {
    isDragging.current = true;
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(SLIDER_WIDTH, e.clientX - rect.left));
      setRevealX(x);
    };

    const handleMouseUp = () => {
      isDragging.current = false;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(SLIDER_WIDTH, e.touches[0].clientX - rect.left));
      setRevealX(x);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("touchmove", handleTouchMove);
    window.addEventListener("touchend", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleMouseUp);
    };
  }, []);

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
          {/* ── LEFT: slider reveal visual ── */}
          <div style={{ flexShrink: 0, position: "sticky", top: "120px" }}>
            {/* Slider reveal container */}
            <div
              ref={containerRef}
              style={{
                position: "relative",
                width: `${SLIDER_WIDTH}px`,
                userSelect: "none",
                cursor: isDragging.current ? "ew-resize" : "default",
                borderRadius: "12px",
                overflow: "hidden",
                boxShadow: "0 4px 24px rgba(0,0,0,0.10)",
              }}
            >
              {/* BASE LAYER — Excel spreadsheet (always full width underneath) */}
              <div style={{ width: `${SLIDER_WIDTH}px` }}>
                <div style={{
                  padding: "6px 12px 6px 28px",
                  background: "#FEF2F2",
                  borderBottom: "1px solid #FECACA",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}>
                  <span style={{ fontSize: "10px", fontWeight: 700, color: "#EF4444",
                    letterSpacing: "0.1em" }}>BEFORE</span>
                  <span style={{ fontSize: "10px", color: "#9CA3AF" }}>Manual spreadsheet</span>
                </div>

                <table style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: "11px",
                  background: "#FFFFFF",
                }}>
                  <thead>
                    <tr style={{ background: "#F3F4F6", height: "30px" }}>
                      {["", "A — Job Title", "B — Company", "C — Status", "D — Notes"].map((h, i) => (
                        <th key={i} style={{
                          padding: "6px 8px",
                          textAlign: "left",
                          fontSize: "10px",
                          fontWeight: 600,
                          color: "#6B7280",
                          borderBottom: "2px solid #E5E7EB",
                          borderRight: "1px solid #E5E7EB",
                          whiteSpace: "nowrap",
                        }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ["1", "Software Eng...", "Google??",    "Applied??",      "forgot to follow up"],
                      ["2", "Frontend Dev",   "Meta",         "REJECTED",       ""],
                      ["3", "React Dev",      "???",           "maybe applied",  "check email!!"],
                      ["4", "Junior Dev",     "Startup co.",  "GHOSTED 😭",     ""],
                      ["5", "Full Stack",     "Amazon",       "Rejected",       "❌❌❌"],
                      ["6", "Engineer",       "",             "??",             "update this!!"],
                      ["7", "Eng role",       "some company", "did I apply?",   ""],
                    ].map(([num, title, company, status, notes], i) => {
                      const isRejected = status.toLowerCase().includes("reject") ||
                        status.toLowerCase().includes("ghost");
                      return (
                        <tr key={i} style={{
                          background: i % 2 === 0 ? "#FFFFFF" : "#F9FAFB",
                          borderBottom: "1px solid #E5E7EB",
                          height: "32px",
                        }}>
                          <td style={{ padding: "5px 8px", color: "#9CA3AF", fontSize: "10px",
                            borderRight: "1px solid #E5E7EB", textAlign: "center" }}>{num}</td>
                          <td style={{ padding: "5px 8px", color: "#374151", fontSize: "11px",
                            borderRight: "1px solid #E5E7EB", maxWidth: "80px",
                            overflow: "hidden", textOverflow: "ellipsis",
                            whiteSpace: "nowrap" }}>{title}</td>
                          <td style={{ padding: "5px 8px", color: "#374151", fontSize: "11px",
                            borderRight: "1px solid #E5E7EB", whiteSpace: "nowrap",
                            overflow: "hidden", textOverflow: "ellipsis",
                            maxWidth: "72px" }}>{company}</td>
                          <td style={{ padding: "5px 8px", fontSize: "11px", fontWeight: 600,
                            color: isRejected ? "#EF4444" : "#374151",
                            borderRight: "1px solid #E5E7EB" }}>{status}</td>
                          <td style={{ padding: "5px 8px", color: "#9CA3AF", fontSize: "10px",
                            fontStyle: "italic", whiteSpace: "nowrap",
                            overflow: "hidden", textOverflow: "ellipsis",
                            maxWidth: "90px" }}>{notes}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* TOP LAYER — Dashboard (clipped to revealX from the left) */}
              <div style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: `${revealX}px`,
                overflow: "hidden",
                height: "100%",
                borderRight: `2px solid #3C896D`,
              }}>
                <div style={{ width: `${SLIDER_WIDTH}px` }}>
                  <div style={{
                    padding: "6px 12px 6px 28px",
                    background: "#F0FDF4",
                    borderBottom: "1px solid #BBF7D0",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}>
                    <span style={{ fontSize: "10px", fontWeight: 700, color: "#3C896D",
                      letterSpacing: "0.1em" }}>AFTER</span>
                    <span style={{ fontSize: "10px", color: "#9CA3AF" }}>Ascend dashboard</span>
                  </div>

                  <table style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: "11px",
                    background: "#FFFFFF",
                  }}>
                    <thead>
                      <tr style={{ background: "#F9FAFB", height: "30px" }}>
                        {["Status", "Company", "Role", "Location"].map((h) => (
                          <th key={h} style={{
                            padding: "6px 10px",
                            textAlign: "left",
                            fontSize: "10px",
                            fontWeight: 600,
                            color: "#9CA3AF",
                            letterSpacing: "0.06em",
                            textTransform: "uppercase",
                            borderBottom: "2px solid #E5E7EB",
                            whiteSpace: "nowrap",
                          }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { status: "Offer 🎉",    bg: "#D1FAE5", color: "#065F46", company: "Stripe",    role: "Software Engineer",  loc: "London" },
                        { status: "Interview",   bg: "#DBEAFE", color: "#1D40AF", company: "Google",    role: "Frontend Engineer",  loc: "Remote" },
                        { status: "Interview",   bg: "#DBEAFE", color: "#1D40AF", company: "Anthropic", role: "Full Stack Dev",     loc: "Remote" },
                        { status: "Applied",     bg: "#FEF3C7", color: "#92400E", company: "Monzo",     role: "React Developer",    loc: "London" },
                        { status: "Applied",     bg: "#FEF3C7", color: "#92400E", company: "Revolut",   role: "Junior Engineer",    loc: "London" },
                        { status: "Saved",       bg: "#F3F4F6", color: "#374151", company: "Linear",    role: "Backend Engineer",   loc: "Remote" },
                        { status: "Saved",       bg: "#F3F4F6", color: "#374151", company: "Figma",     role: "React Developer",    loc: "Hybrid" },
                      ].map((row, i) => (
                        <tr key={i} style={{ borderBottom: "1px solid #F3F4F6", height: "32px" }}>
                          <td style={{ padding: "6px 10px" }}>
                            <span style={{
                              display: "inline-flex", alignItems: "center",
                              padding: "2px 8px", borderRadius: "999px",
                              fontSize: "10px", fontWeight: 600,
                              background: row.bg, color: row.color,
                              whiteSpace: "nowrap",
                            }}>{row.status}</span>
                          </td>
                          <td style={{ padding: "6px 10px", fontWeight: 600, color: "#1A1A1A",
                            fontSize: "11px" }}>{row.company}</td>
                          <td style={{ padding: "6px 10px", color: "#374151",
                            fontSize: "11px" }}>{row.role}</td>
                          <td style={{ padding: "6px 10px", color: "#6B7280",
                            fontSize: "11px" }}>{row.loc}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* DRAG HANDLE — large invisible hit area with visible pill inside */}
              <div
                onMouseDown={handleMouseDown}
                onTouchStart={handleMouseDown}
                style={{
                  position: "absolute",
                  top: 0,
                  left: `${revealX}px`,
                  transform: "translateX(-50%)",
                  width: "56px",
                  height: "100%",
                  cursor: "ew-resize",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  zIndex: 10,
                }}
              >
                {/* Visible pill — 28px wide, centered inside 56px hit zone */}
                <div style={{
                  width: "28px",
                  height: "48px",
                  background: "#3C896D",
                  borderRadius: "999px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.20)",
                  flexShrink: 0,
                  pointerEvents: "none",
                }}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M5 3L2 7L5 11" stroke="white" strokeWidth="1.5"
                      strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M9 3L12 7L9 11" stroke="white" strokeWidth="1.5"
                      strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </div>
            </div>
            {/* End slider reveal container */}
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
