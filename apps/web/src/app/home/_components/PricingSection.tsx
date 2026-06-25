type PricingFeature = {
  text: string;
  enabled: boolean;
};

type PricingTier = {
  name: string;
  price: string;
  period: string;
  tagline: string;
  features: PricingFeature[];
  ctaLabel: string;
  ctaHref: string;
  highlighted: boolean;
  ctaStyle: "outline" | "brand" | "dark";
};

const TIERS: PricingTier[] = [
  {
    name: "Free",
    price: "£0",
    period: "/ forever",
    tagline: "Everything you need to get started.",
    features: [
      { text: "Up to 25 saved applications",  enabled: true  },
      { text: "Browser extension (Chrome)",    enabled: true  },
      { text: "Kanban board",                  enabled: true  },
      { text: "Basic interview tracking",      enabled: true  },
      { text: "Table view & search",           enabled: true  },
      { text: "Calendar view",                 enabled: false },
      { text: "CSV import / export",           enabled: false },
      { text: "Duplicate detection",           enabled: false },
      { text: "AI insights",                   enabled: false },
    ],
    ctaLabel: "Get Started Free",
    ctaHref: "/signup",
    highlighted: false,
    ctaStyle: "outline",
  },
  {
    name: "Pro",
    price: "£4.99",
    period: "/ month",
    tagline: "For serious job seekers who want the full picture.",
    features: [
      { text: "Up to 250 saved applications", enabled: true  },
      { text: "Everything in Free",           enabled: true  },
      { text: "Calendar view",                enabled: true  },
      { text: "Full interview scheduling",    enabled: true  },
      { text: "CSV import / export",          enabled: true  },
      { text: "Duplicate detection",          enabled: true  },
      { text: "AI job insights",              enabled: false },
      { text: "Ghost job detection",          enabled: false },
      { text: "Priority support",             enabled: false },
    ],
    ctaLabel: "Start Pro Free",
    ctaHref: "/signup",
    highlighted: true,
    ctaStyle: "brand",
  },
  {
    name: "Premium",
    price: "£9.99",
    period: "/ month",
    tagline: "Everything Ascend has to offer, no limits.",
    features: [
      { text: "Unlimited saved applications",   enabled: true },
      { text: "Everything in Pro",              enabled: true },
      { text: "AI job insights",                enabled: true },
      { text: "Ghost job detection",            enabled: true },
      { text: "Priority support (24/7)",        enabled: true },
      { text: "Early access to new features",   enabled: true },
    ],
    ctaLabel: "Go Premium",
    ctaHref: "/signup",
    highlighted: false,
    ctaStyle: "dark",
  },
];

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, marginTop: "1px" }} aria-hidden="true">
      <circle cx="8" cy="8" r="8" fill="#3C896D" />
      <polyline points="4.5,8 7,10.5 11.5,5.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, marginTop: "1px" }} aria-hidden="true">
      <circle cx="8" cy="8" r="8" fill="#F3F4F6" />
      <line x1="5.5" y1="5.5" x2="10.5" y2="10.5" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="10.5" y1="5.5" x2="5.5" y2="10.5" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function PricingCard({ tier }: { tier: PricingTier }) {
  const cardStyle: React.CSSProperties = tier.highlighted
    ? {
        background: "#F0F9F6",
        border: "2px solid #3C896D",
        borderRadius: "20px",
        padding: "32px 28px",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        boxShadow: "0 8px 32px rgba(60,137,109,0.15)",
      }
    : {
        background: "#FFFFFF",
        border: "1px solid #E5E7EB",
        borderRadius: "20px",
        padding: "32px 28px",
        display: "flex",
        flexDirection: "column",
      };

  const dividerStyle: React.CSSProperties = {
    borderTop: tier.highlighted ? "1px solid rgba(60,137,109,0.2)" : "1px solid #F3F4F6",
    marginBottom: "24px",
  };

  const nameColor = tier.highlighted ? "#3C896D" : "#6B7280";

  const ctaBtnStyle: React.CSSProperties =
    tier.ctaStyle === "brand"
      ? {
          display: "block", width: "100%", textAlign: "center",
          padding: "13px 0", borderRadius: "10px", border: "none",
          background: "#3C896D", color: "#FFFFFF",
          fontSize: "15px", fontWeight: 600,
          textDecoration: "none", cursor: "pointer",
          transition: "background 0.2s ease", boxSizing: "border-box",
        }
      : tier.ctaStyle === "dark"
      ? {
          display: "block", width: "100%", textAlign: "center",
          padding: "12px 0", borderRadius: "10px", border: "none",
          background: "#143642", color: "#FFFFFF",
          fontSize: "15px", fontWeight: 600,
          textDecoration: "none", cursor: "pointer",
          transition: "background 0.2s ease", boxSizing: "border-box",
        }
      : {
          display: "block", width: "100%", textAlign: "center",
          padding: "12px 0", borderRadius: "10px",
          border: "1.5px solid #E5E7EB", background: "#FFFFFF",
          color: "#374151", fontSize: "15px", fontWeight: 600,
          textDecoration: "none", cursor: "pointer",
          transition: "background 0.2s ease", boxSizing: "border-box",
        };

  return (
    <div style={cardStyle}>
      {/* Most Popular badge */}
      {tier.highlighted && (
        <span style={{
          position: "absolute",
          top: "-13px",
          left: "50%",
          transform: "translateX(-50%)",
          background: "#3C896D",
          color: "#FFFFFF",
          fontSize: "11px",
          fontWeight: 700,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          padding: "4px 14px",
          borderRadius: "999px",
          whiteSpace: "nowrap",
        }}>
          Most Popular
        </span>
      )}

      {/* Tier name */}
      <span style={{
        fontSize: "13px", fontWeight: 700, textTransform: "uppercase",
        letterSpacing: "0.08em", color: nameColor, marginBottom: "8px",
        display: "block",
      }}>
        {tier.name}
      </span>

      {/* Price */}
      <div style={{ display: "flex", alignItems: "flex-end", gap: "4px", lineHeight: 1 }}>
        <span style={{ fontSize: "42px", fontWeight: 900, color: "#1A1A1A", letterSpacing: "-0.04em", lineHeight: 1 }}>
          {tier.price}
        </span>
        <span style={{ fontSize: "14px", color: "#9CA3AF", fontWeight: 400, paddingBottom: "6px" }}>
          {tier.period}
        </span>
      </div>

      {/* Tagline */}
      <p style={{ fontSize: "14px", color: "#6B7280", marginTop: "8px", marginBottom: "24px" }}>
        {tier.tagline}
      </p>

      {/* Divider */}
      <div style={dividerStyle} />

      {/* Feature list */}
      <ul style={{ flex: 1, listStyle: "none", padding: 0, margin: 0 }}>
        {tier.features.map((f) => (
          <li key={f.text} style={{ display: "flex", gap: "10px", alignItems: "flex-start", marginBottom: "10px" }}>
            {f.enabled ? <CheckIcon /> : <XIcon />}
            <span style={{ fontSize: "14px", color: f.enabled ? "#374151" : "#9CA3AF" }}>
              {f.text}
            </span>
          </li>
        ))}
      </ul>

      {/* CTA */}
      <a href={tier.ctaHref} style={{ ...ctaBtnStyle, marginTop: "auto" }}>
        {tier.ctaLabel}
      </a>
    </div>
  );
}

export function PricingSection() {
  return (
    <section
      id="pricing"
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
          Pricing
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
          Simple, transparent pricing.
        </h2>
        <p style={{ fontSize: "17px", color: "#6B7280", textAlign: "center", marginBottom: "56px" }}>
          Start free. Upgrade when you&apos;re ready.
        </p>

        {/* Three tier cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-4xl mx-auto items-start">
          {TIERS.map((tier) => (
            <PricingCard key={tier.name} tier={tier} />
          ))}
        </div>

        {/* Fine print */}
        <p style={{ fontSize: "13px", color: "#9CA3AF", textAlign: "center", marginTop: "32px" }}>
          All paid plans include a 14-day free trial. No credit card required to start.
        </p>

      </div>
    </section>
  );
}
