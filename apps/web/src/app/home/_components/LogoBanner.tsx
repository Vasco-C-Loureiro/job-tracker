"use client";

import React from "react";

export function LogoBanner() {
  const COMPANIES: { name: string; file: string; height?: string; style?: React.CSSProperties }[] = [
    { name: "Microsoft",     file: "microsoft.svg" },
    { name: "Amazon",        file: "amazon.svg",                              style: { marginTop: "10px" } },
    { name: "Netflix",       file: "netflix.svg" },
    { name: "Airbnb",        file: "airbnb.svg",       height: "44px" },
    { name: "IBM",           file: "ibm.svg" },
    { name: "Deloitte",      file: "deloitte.svg" },
    { name: "Goldman Sachs", file: "goldman-sachs.svg", height: "36px" },
    { name: "HSBC",          file: "hsbc.svg" },
    { name: "PwC",           file: "pwc.svg",           height: "36px" },
    { name: "Siemens",       file: "siemens.svg",       height: "200px" },
    { name: "Unilever",      file: "unilever.svg",      height: "44px" },
    { name: "Adidas",        file: "adidas.svg",        height: "36px" },
  ];

  const LOOP = [...COMPANIES, ...COMPANIES];

  return (
    <section
      style={{
        marginTop: "32px",
        marginBottom: "32px",
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
            height: "56px",
            overflow: "visible",
          }}
        >
          {LOOP.map(({ name, file, height, style }, i) => (
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
                  height: height ?? "28px",
                  width: "auto",
                  maxWidth: "120px",
                  objectFit: "contain",
                  opacity: 0.65,
                  filter: "grayscale(15%)",
                  display: "block",
                  verticalAlign: "middle",
                  ...style,
                }}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
