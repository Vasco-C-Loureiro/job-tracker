const COMPANIES = [
  { name: "Google",        domain: "google.com" },
  { name: "Microsoft",     domain: "microsoft.com" },
  { name: "Amazon",        domain: "amazon.com" },
  { name: "Meta",          domain: "meta.com" },
  { name: "Spotify",       domain: "spotify.com" },
  { name: "Netflix",       domain: "netflix.com" },
  { name: "Adobe",         domain: "adobe.com" },
  { name: "Apple",         domain: "apple.com" },
  { name: "Goldman Sachs", domain: "goldmansachs.com" },
  { name: "JPMorgan",      domain: "jpmorgan.com" },
  { name: "Deloitte",      domain: "deloitte.com" },
  { name: "BBC",           domain: "bbc.co.uk" },
];

const LOOP = [...COMPANIES, ...COMPANIES];

export function LogoBanner() {
  return (
    <section style={{ marginTop: "48px", marginBottom: "48px", width: "100%", fontFamily: "var(--font-geist-sans), Arial, sans-serif" }}>
      <p
        style={{
          textAlign: "center",
          marginBottom: "24px",
          fontSize: "13px",
          color: "#9CA3AF",
          fontWeight: 500,
          letterSpacing: "0.04em",
        }}
      >
        Join job seekers who landed roles at
      </p>
      <div style={{ overflow: "hidden", width: "100%" }}>
        <div
          style={{
            display: "flex",
            width: "max-content",
            animation: "slide-left 30s linear infinite",
            willChange: "transform",
          }}
        >
          {LOOP.map(({ name, domain }, i) => (
            <div
              key={`${name}-${i}`}
              className="logo-banner-item"
              style={{ padding: "0 28px", display: "flex", alignItems: "center" }}
              aria-hidden={i >= COMPANIES.length ? true : undefined}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`https://logo.clearbit.com/${domain}`}
                alt={name}
                height={28}
                style={{
                  height: "28px",
                  width: "auto",
                  opacity: 0.7,
                  filter: "grayscale(20%)",
                  objectFit: "contain",
                  display: "block",
                }}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
