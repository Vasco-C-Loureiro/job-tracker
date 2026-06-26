export function Footer() {
  return (
    <footer style={{ background: "#143642", padding: "64px 0 0 0", fontFamily: "var(--font-geist-sans), Arial, sans-serif" }}>
      <div className="max-w-6xl mx-auto px-6">

        {/* Three-column grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 lg:gap-12 pb-14">

          {/* LEFT — Brand */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <svg width="24" height="24" viewBox="0 0 28 28" fill="none" aria-hidden="true">
                <polyline
                  points="6 18 14 10 22 18"
                  stroke="rgba(255,255,255,0.35)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <polyline
                  points="6 14 14 6 22 14"
                  stroke="white"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span style={{ fontSize: "18px", fontWeight: 700, color: "#FFFFFF", letterSpacing: "-0.02em" }}>
                Ascend
              </span>
            </div>
            <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.5)", lineHeight: 1.6, marginTop: "16px" }}>
              Your job search, organised.
            </p>
            <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.35)", marginTop: "20px" }}>
              © 2026 Ascend. All rights reserved.
            </p>
          </div>

          {/* CENTRE — Links */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "40px" }}>
            {/* Product */}
            <div>
              <p style={{
                fontSize: "11px", fontWeight: 700, textTransform: "uppercase",
                letterSpacing: "0.1em", color: "rgba(255,255,255,0.4)", marginBottom: "16px",
              }}>
                Product
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <a href="#features"    className="footer-link">Features</a>
                <a href="#how-it-works" className="footer-link">How it Works</a>
                <a href="#pricing"     className="footer-link">Pricing</a>
                <a href="#reviews"     className="footer-link">Reviews</a>
              </div>
            </div>

            {/* Company */}
            <div>
              <p style={{
                fontSize: "11px", fontWeight: 700, textTransform: "uppercase",
                letterSpacing: "0.1em", color: "rgba(255,255,255,0.4)", marginBottom: "16px",
              }}>
                Company
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <a href="/privacy" className="footer-link">Privacy Policy</a>
                <a href="/terms"   className="footer-link">Terms of Service</a>
                <a href="https://github.com/Vasco-C-Loureiro/job-tracker" target="_blank" rel="noopener noreferrer" className="footer-link">
                  GitHub
                </a>
                <a href="mailto:hello@ascendpro.app" className="footer-link">Contact</a>
              </div>
            </div>
          </div>

          {/* RIGHT — CTA card */}
          <div style={{
            background: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: "16px",
            padding: "28px",
          }}>
            <h3 style={{ fontSize: "18px", fontWeight: 700, color: "#FFFFFF", lineHeight: 1.3, marginBottom: "8px" }}>
              Ready to get organised?
            </h3>
            <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.55)", lineHeight: 1.6, marginBottom: "20px" }}>
              Join thousands of job seekers using Ascend to land their next role.
            </p>
            <a
              href="/signup"
              className="landing-cta-btn"
              style={{
                display: "block",
                width: "100%",
                textAlign: "center",
                color: "#FFFFFF",
                fontSize: "14px",
                fontWeight: 600,
                padding: "12px 0",
                borderRadius: "10px",
                textDecoration: "none",
                border: "none",
                boxSizing: "border-box",
              }}
            >
              Get Started Free →
            </a>
          </div>
        </div>

        {/* Bottom bar */}
        <div
          className="flex flex-col sm:flex-row items-center justify-between gap-3"
          style={{ borderTop: "1px solid rgba(255,255,255,0.1)", padding: "20px 0" }}
        >
          <span style={{ fontSize: "13px", color: "rgba(255,255,255,0.4)" }}>
            Made with ☕ by Vasco
          </span>

          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <a
              href="https://github.com/Vasco-C-Loureiro"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="GitHub"
              className="footer-social"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
              </svg>
            </a>
            <a
              href="https://www.linkedin.com/in/vasco-c-loureiro"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="LinkedIn"
              className="footer-social"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
              </svg>
            </a>
          </div>
        </div>

      </div>
    </footer>
  );
}
