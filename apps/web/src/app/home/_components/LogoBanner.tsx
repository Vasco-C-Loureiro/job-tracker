"use client";

export function LogoBanner() {
  const COMPANIES = [
    { name: "Microsoft",     file: "microsoft.svg" },
    { name: "Amazon",        file: "amazon.svg" },
    { name: "Netflix",       file: "netflix.svg" },
    { name: "Airbnb",        file: "airbnb.svg" },
    { name: "IBM",           file: "ibm.svg" },
    { name: "Deloitte",      file: "deloitte.svg" },
    { name: "Goldman Sachs", file: "goldman-sachs.svg" },
    { name: "HSBC",          file: "hsbc.svg" },
    { name: "PwC",           file: "pwc.svg" },
    { name: "Siemens",       file: "siemens.svg" },
    { name: "Unilever",      file: "unilever.svg" },
    { name: "Adidas",        file: "adidas.svg" },
  ];

  const LOOP = [...COMPANIES, ...COMPANIES];

  return (
    <section
      style={{
        marginTop: "48px",
        marginBottom: "48px",
        width: "100%",
        fontFamily: "var(--font-geist-sans), Arial, sans-serif",
      }}
    >
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

      {/* Single left-scrolling row */}
      <div style={{ overflow: "hidden", width: "100%" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            width: "max-content",
            animation: "slide-left 30s linear infinite",
            willChange: "transform",
          }}
        >
          {LOOP.map(({ name, file }, i) => (
            <div
              key={`${name}-${i}`}
              style={{
                padding: "0 36px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
              aria-hidden={i >= COMPANIES.length ? true : undefined}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/logos/${file}`}
                alt={name}
                style={{
                  height: "28px",
                  width: "auto",
                  maxWidth: "120px",
                  objectFit: "contain",
                  opacity: 0.65,
                  filter: "grayscale(15%)",
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
