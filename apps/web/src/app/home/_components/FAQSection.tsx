"use client";

import { useState } from "react";
import { Plus, Minus } from "lucide-react";

const FAQS = [
  {
    question: "Is Ascend really free to start?",
    answer:
      "Yes — the Free plan is free forever, no credit card required. You can save up to 25 job applications and use the browser extension with no time limit. Upgrade to Pro or Premium when you need more.",
  },
  {
    question: "How does the 7-day free trial work?",
    answer:
      "When you upgrade to a paid plan, you get 7 days free — no charge until the trial ends. You can cancel any time during the trial and you won't be billed. No credit card is required to start on the Free plan.",
  },
  {
    question: "Can I cancel my subscription at any time?",
    answer:
      "Yes, absolutely. There are no lock-in contracts. You can cancel your subscription at any time from your account settings and you'll retain access until the end of your current billing period.",
  },
  {
    question: "Which job boards does the browser extension support?",
    answer:
      "The extension currently supports Indeed, Greenhouse, and Lever. LinkedIn support is coming soon. On any other site, you can still save jobs manually through the dashboard.",
  },
  {
    question: "Is my data private and secure?",
    answer:
      "Yes. Your job application data is private to your account and is never shared with third parties. We use Supabase (built on PostgreSQL) with row-level security — meaning your data is only ever accessible by you. We don't sell data, run ads, or share anything with recruiters or employers.",
  },
  {
    question: "Do I need to install anything?",
    answer:
      "The dashboard works in any browser — just sign up and go. The browser extension (for one-click job saving) is optional but recommended. It's available for Chrome and takes under a minute to install.",
  },
  {
    question: "What happens to my data if I cancel?",
    answer:
      "Your data stays in your account for 30 days after cancellation, giving you time to export it if you need. After 30 days, your account and data are permanently deleted. We'll send you a reminder before deletion.",
  },
  {
    question: "How is Ascend different from a spreadsheet?",
    answer:
      "A spreadsheet requires you to set everything up manually, copy-paste job details, maintain formulas, and remember to update it. Ascend saves jobs in one click, tracks every stage automatically, shows you your pipeline visually, and keeps all your interview notes and deadlines in one place. It's built specifically for job searching — not adapted from a general-purpose tool.",
  },
];

function FAQItem({
  faq,
  isOpen,
  onToggle,
  isLast,
}: {
  faq: { question: string; answer: string };
  isOpen: boolean;
  onToggle: () => void;
  isLast: boolean;
}) {
  return (
    <div
      style={{
        borderTop: "1px solid #E5E7EB",
        borderBottom: isLast ? "1px solid #E5E7EB" : "none",
      }}
    >
      <button
        onClick={onToggle}
        style={{
          width: "100%",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "20px 0",
          background: "none",
          border: "none",
          cursor: "pointer",
          textAlign: "left",
          gap: "16px",
        }}
      >
        <span style={{ fontSize: "16px", fontWeight: 600, color: "#1A1A1A", lineHeight: 1.4 }}>
          {faq.question}
        </span>
        <span
          style={{ flexShrink: 0, color: "#3C896D", display: "flex", alignItems: "center" }}
        >
          {isOpen ? <Minus size={18} /> : <Plus size={18} />}
        </span>
      </button>

      <div
        style={{
          overflow: "hidden",
          maxHeight: isOpen ? "400px" : "0px",
          transition: "max-height 0.3s ease",
        }}
      >
        <p style={{ fontSize: "15px", lineHeight: 1.7, color: "#6B7280", paddingBottom: "20px" }}>
          {faq.answer}
        </p>
      </div>
    </div>
  );
}

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggle = (i: number) => setOpenIndex(openIndex === i ? null : i);

  return (
    <section
      style={{
        padding: "96px 24px",
        maxWidth: "760px",
        margin: "0 auto",
        fontFamily: "var(--font-geist-sans), Arial, sans-serif",
      }}
    >
      <p
        style={{
          fontSize: "12px",
          fontWeight: 600,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: "#3C896D",
          textAlign: "center",
          marginBottom: "16px",
        }}
      >
        FAQ
      </p>

      <h2
        style={{
          fontSize: "clamp(28px, 3.5vw, 40px)",
          fontWeight: 800,
          lineHeight: 1.15,
          letterSpacing: "-0.02em",
          color: "#1A1A1A",
          textAlign: "center",
          marginBottom: "56px",
        }}
      >
        Everything you need to know
      </h2>

      <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
        {FAQS.map((faq, i) => (
          <FAQItem
            key={i}
            faq={faq}
            isOpen={openIndex === i}
            onToggle={() => toggle(i)}
            isLast={i === FAQS.length - 1}
          />
        ))}
      </div>
    </section>
  );
}
