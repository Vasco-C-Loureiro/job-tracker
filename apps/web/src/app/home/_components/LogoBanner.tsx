const ROW1 = [
  "Google", "Apple", "Microsoft", "Amazon", "Meta",
  "Netflix", "Spotify", "Airbnb", "Stripe", "Shopify",
];

const ROW2 = [
  "Goldman Sachs", "McKinsey", "Deloitte", "JPMorgan", "KPMG",
  "IBM", "Salesforce", "Adobe", "Tesla", "Samsung",
];

const badgeStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  padding: "7px 16px",
  borderRadius: "999px",
  border: "1px solid #E5E7EB",
  background: "#FFFFFF",
  whiteSpace: "nowrap",
  flexShrink: 0,
  fontSize: "13px",
  fontWeight: 500,
  color: "#6B7280",
};

function BadgeRow({
  companies,
  direction,
}: {
  companies: string[];
  direction: "left" | "right";
}) {
  const animStyle: React.CSSProperties = {
    display: "flex",
    gap: "12px",
    width: "max-content",
    animation: `${direction === "left" ? "slide-left" : "slide-right"} 28s linear infinite`,
    willChange: "transform",
  };

  return (
    <div style={{ overflow: "hidden", width: "100%", marginBottom: "12px" }}>
      <div style={animStyle}>
        {companies.map((name) => (
          <span key={name} style={badgeStyle}>{name}</span>
        ))}
        {/* Second copy for seamless loop */}
        {companies.map((name) => (
          <span key={`${name}-dup`} style={badgeStyle} aria-hidden="true">{name}</span>
        ))}
      </div>
    </div>
  );
}

export function LogoBanner() {
  return (
    <section style={{ marginTop: "56px", marginBottom: 0, width: "100%" }}>
      <p style={{
        textAlign: "center",
        marginBottom: "24px",
        fontSize: "13px",
        color: "#9CA3AF",
        fontWeight: 500,
        letterSpacing: "0.04em",
      }}>
        Trusted by job seekers who landed roles at
      </p>
      <BadgeRow companies={ROW1} direction="left" />
      <BadgeRow companies={ROW2} direction="right" />
    </section>
  );
}
