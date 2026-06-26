"use client";

import { useState, useEffect } from "react";

interface NavbarProps {
  isLoggedIn: boolean;
}

const NAV_LINKS = [
  { label: "Features",     id: "features"     },
  { label: "How it Works", id: "how-it-works" },
  { label: "Reviews",      id: "reviews"      },
  { label: "Pricing",      id: "pricing"      },
];

export function Navbar({ isLoggedIn }: NavbarProps) {
  const [scrolled, setScrolled]           = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen]       = useState(false);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY >= 50);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const ids = ["features", "problem", "how-it-works", "reviews", "pricing"];
    const observers: IntersectionObserver[] = [];

    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setActiveSection(id);
          }
        },
        { threshold: 0.4 },
      );
      obs.observe(el);
      observers.push(obs);
    });

    return () => observers.forEach((obs) => obs.disconnect());
  }, []);

  function scrollToSection(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    setMobileOpen(false);
  }

  const headerStyle: React.CSSProperties = {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 50,
    height: "64px",
    fontFamily: "var(--font-geist-sans), Arial, sans-serif",
    backgroundColor: scrolled ? "rgba(255,255,255,0.95)" : "transparent",
    backdropFilter: scrolled ? "blur(8px)" : "none",
    borderBottom: scrolled ? "1px solid rgba(0,0,0,0.08)" : "1px solid transparent",
    transition: "background-color 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease",
  };

  const primaryBtnStyle: React.CSSProperties = {
    backgroundColor: "#3C896D",
    color: "#FFFFFF",
    fontSize: "14px",
    fontWeight: 600,
    padding: "8px 18px",
    borderRadius: "8px",
    border: "none",
    cursor: "pointer",
    textDecoration: "none",
    display: "inline-block",
    transition: "background-color 0.2s ease",
  };

  return (
    <>
      <header data-theme="light" style={headerStyle}>
        <div className="max-w-6xl mx-auto px-4 md:px-6 flex items-center justify-between h-16">

          {/* Logo */}
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="flex items-center gap-2.5 cursor-pointer bg-transparent border-none p-0"
            aria-label="Scroll to top"
          >
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
              <polyline
                points="6 18 14 10 22 18"
                stroke="#3C896D"
                strokeOpacity="0.35"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <polyline
                points="6 14 14 6 22 14"
                stroke="#3C896D"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span style={{ fontWeight: 700, fontSize: "18px", color: "#1A1A1A", letterSpacing: "-0.02em" }}>
              Ascend
            </span>
          </button>

          {/* Centre nav — desktop only */}
          <nav className="hidden md:flex items-center gap-6" aria-label="Page sections">
            {NAV_LINKS.map(({ label, id }) => {
              const isActive = activeSection === id;
              return (
                <a
                  key={id}
                  href={`#${id}`}
                  onClick={(e) => { e.preventDefault(); scrollToSection(id); }}
                  style={{
                    fontSize: "14px",
                    color: isActive ? "#3C896D" : "#6B7280",
                    fontWeight: isActive ? 600 : 400,
                    textDecoration: "none",
                    transition: "color 0.2s ease",
                  }}
                  onMouseEnter={(e) => { if (!isActive) (e.currentTarget as HTMLAnchorElement).style.color = "#1A1A1A"; }}
                  onMouseLeave={(e) => { if (!isActive) (e.currentTarget as HTMLAnchorElement).style.color = "#6B7280"; }}
                >
                  {label}
                </a>
              );
            })}
          </nav>

          {/* Right CTAs */}
          <div className="flex items-center gap-3">
            {isLoggedIn ? (
              <a href="/dashboard" style={primaryBtnStyle}
                onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.backgroundColor = "#2d6b55"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.backgroundColor = "#3C896D"; }}
              >
                Go to Dashboard
              </a>
            ) : (
              <>
                <a
                  href="/login"
                  className="hidden md:inline"
                  style={{ fontSize: "14px", color: "#6B7280", textDecoration: "none", cursor: "pointer", transition: "color 0.2s ease" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "#1A1A1A"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "#6B7280"; }}
                >
                  Log in
                </a>
                <a
                  href="/signup"
                  style={primaryBtnStyle}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.backgroundColor = "#2d6b55"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.backgroundColor = "#3C896D"; }}
                >
                  Get Started
                </a>
              </>
            )}

            {/* Hamburger — mobile only */}
            <button
              className="md:hidden flex items-center justify-center"
              onClick={() => setMobileOpen((prev) => !prev)}
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              style={{ background: "none", border: "none", cursor: "pointer", padding: "4px" }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                {mobileOpen ? (
                  <>
                    <line x1="4" y1="4" x2="20" y2="20" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" />
                    <line x1="20" y1="4" x2="4" y2="20" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" />
                  </>
                ) : (
                  <>
                    <line x1="3" y1="7"  x2="21" y2="7"  stroke="#6B7280" strokeWidth="2" strokeLinecap="round" />
                    <line x1="3" y1="12" x2="21" y2="12" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" />
                    <line x1="3" y1="17" x2="21" y2="17" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" />
                  </>
                )}
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile dropdown */}
      <div
        style={{
          position: "fixed",
          top: "64px",
          left: 0,
          right: 0,
          backgroundColor: "#FFFFFF",
          borderBottom: "1px solid #E5E7EB",
          padding: "16px 24px",
          zIndex: 49,
          opacity: mobileOpen ? 1 : 0,
          transform: mobileOpen ? "translateY(0)" : "translateY(-8px)",
          pointerEvents: mobileOpen ? "auto" : "none",
          transition: "opacity 0.2s ease, transform 0.2s ease",
        }}
        aria-hidden={!mobileOpen}
      >
        {NAV_LINKS.map(({ label, id }, i) => (
          <a
            key={id}
            href={`#${id}`}
            onClick={(e) => { e.preventDefault(); scrollToSection(id); }}
            style={{
              display: "block",
              padding: "14px 0",
              borderBottom: i < NAV_LINKS.length - 1 ? "1px solid #F3F4F6" : "none",
              fontSize: "15px",
              color: "#1A1A1A",
              textDecoration: "none",
            }}
          >
            {label}
          </a>
        ))}
        <div style={{ marginTop: "16px", display: "flex", flexDirection: "column", gap: "8px" }}>
          {isLoggedIn ? (
            <a href="/dashboard" style={{ ...primaryBtnStyle, textAlign: "center" }}>
              Go to Dashboard
            </a>
          ) : (
            <>
              <a href="/login" style={{ ...primaryBtnStyle, textAlign: "center" }}>
                Log in
              </a>
              <a href="/signup" style={{ ...primaryBtnStyle, textAlign: "center" }}>
                Get Started
              </a>
            </>
          )}
        </div>
      </div>
    </>
  );
}
