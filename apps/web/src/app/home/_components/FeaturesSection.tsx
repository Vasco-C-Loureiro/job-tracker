import { Zap, LayoutGrid, Calendar, BarChart2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const FEATURES: { icon: LucideIcon; heading: string; body: string }[] = [
  {
    icon: Zap,
    heading: "Save any job in one click",
    body: "Our browser extension extracts job title, company, salary, and description automatically from Indeed, LinkedIn, Greenhouse, and more. No copy-pasting. No switching tabs.",
  },
  {
    icon: LayoutGrid,
    heading: "Track every stage",
    body: "From Saved to Offer — see exactly where every application stands. Move cards through your pipeline with a visual board, or use the sortable table view if you prefer lists.",
  },
  {
    icon: Calendar,
    heading: "Never miss an interview",
    body: "Schedule rounds, set closing date reminders, and see every upcoming commitment in a calendar built specifically for job seekers. Prep notes live right next to each round.",
  },
  {
    icon: BarChart2,
    heading: "Know your numbers",
    body: "Response rates, time-to-offer, application volume by week — understand what's working and where to double down. Data-driven job searching is a real edge.",
  },
];

export function FeaturesSection() {
  return (
    <section
      id="features"
      style={{ background: "#FFFFFF", padding: "96px 0", scrollMarginTop: "80px" }}
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
          Features
        </span>
        <h2 style={{
          fontSize: "clamp(28px, 3.5vw, 40px)",
          fontWeight: 800,
          lineHeight: 1.15,
          letterSpacing: "-0.02em",
          color: "#1A1A1A",
          textAlign: "center",
          marginBottom: "8px",
        }}>
          Everything you need. Nothing you don&apos;t.
        </h2>
        <p style={{
          fontSize: "17px",
          color: "#6B7280",
          textAlign: "center",
          marginBottom: "56px",
        }}>
          Built for job seekers who mean business.
        </p>

        {/* 2×2 card grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {FEATURES.map(({ icon: Icon, heading, body }) => (
            <div
              key={heading}
              style={{
                background: "#FFFFFF",
                border: "1px solid #E5E7EB",
                borderRadius: "16px",
                padding: "32px",
                boxShadow: "0 1px 4px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)",
                display: "flex",
                flexDirection: "column",
                gap: "16px",
              }}
            >
              <div style={{
                width: "48px",
                height: "48px",
                borderRadius: "12px",
                background: "rgba(60,137,109,0.1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}>
                <Icon size={22} color="#3C896D" />
              </div>
              <h3 style={{ fontSize: "18px", fontWeight: 700, color: "#1A1A1A", lineHeight: 1.3, margin: 0 }}>
                {heading}
              </h3>
              <p style={{ fontSize: "15px", lineHeight: 1.65, color: "#6B7280", margin: 0 }}>
                {body}
              </p>
            </div>
          ))}
        </div>

        {/* Bottom CTA strip */}
        <p style={{ fontSize: "16px", color: "#6B7280", textAlign: "center", marginTop: "48px" }}>
          Ready to get organised?{" "}
          <a
            href="/signup"
            className="landing-login-link"
            style={{ fontWeight: 600 }}
          >
            Start for free →
          </a>
        </p>

      </div>
    </section>
  );
}
