import { ExternalLink } from "lucide-react";

type Review = {
  title: string;
  body: string;
  name: string;
  role: string;
  avatarKey: string;
};

const REVIEWS_LEFT: Review[] = [
  {
    title: "Finally deleted my tracking spreadsheet.",
    body: "I'd been maintaining a monster spreadsheet with 15 columns for three months. Found Ascend, spent 10 minutes importing everything, and haven't opened Excel since. The one-click extension alone is worth it.",
    name: "James Thornton",
    role: "Software Engineer · Landed at Monzo",
    avatarKey: "james-thornton",
  },
  {
    title: "The calendar view changed everything.",
    body: "I had four interview loops running in parallel. Keeping track of rounds, prep notes, and deadlines across four companies was a nightmare until I started using Ascend. The calendar view shows exactly what's coming and when.",
    name: "Priya Mehta",
    role: "Product Manager · Landed at Revolut",
    avatarKey: "priya-mehta",
  },
  {
    title: "Saved me from applying to the same company twice.",
    body: "Three weeks into my search I almost sent an application to a company I'd already heard back from. Ascend flagged the duplicate before I embarrassed myself. Small thing, massive relief.",
    name: "Sophie Andersen",
    role: "Data Analyst · Landed at Deloitte",
    avatarKey: "sophie-andersen",
  },
  {
    title: "Shows off well in interviews too.",
    body: "When interviewers asked about my job search process I genuinely said I'd built a system around Ascend. One of them asked me to show them the kanban board on my laptop. It made me look a lot more organised than I felt.",
    name: "Marcus Webb",
    role: "UX Designer · Landed at Airbnb",
    avatarKey: "marcus-webb",
  },
];

const REVIEWS_RIGHT: Review[] = [
  {
    title: "Extension + dashboard is a genuinely great combo.",
    body: "I save jobs while I'm browsing Indeed in the morning, then spend five minutes updating statuses in the dashboard before bed. It's become part of my daily routine and my response tracking has got way more accurate.",
    name: "Aisha Okonkwo",
    role: "Frontend Developer · Landed at Stripe",
    avatarKey: "aisha-okonkwo",
  },
  {
    title: "Helped me stay sane during a long search.",
    body: "Six months of applications is brutal. Having everything in one place — notes, status, salary ranges — meant I could step away and come back without losing context. I could not have done it with a spreadsheet.",
    name: "Luca Ferretti",
    role: "Backend Engineer · Landed at JPMorgan",
    avatarKey: "luca-ferretti",
  },
  {
    title: "I track ghosting rates now. That alone is priceless.",
    body: "Sounds bleak, but seeing that 40% of my applications had gone silent after 3 weeks made me prioritise roles with faster-moving processes. Ascend made that pattern visible. That insight changed my strategy.",
    name: "Hannah Fischer",
    role: "Marketing Analyst · Landed at KPMG",
    avatarKey: "hannah-fischer",
  },
  {
    title: "Clean, fast, and actually pleasant to use.",
    body: "Most productivity tools feel like work to use. Ascend doesn't. Opening the dashboard each morning doesn't feel like a chore — the kanban board makes it almost satisfying to drag things forward. Offered at Goldman in 10 weeks.",
    name: "Tomás Rueda",
    role: "Quantitative Analyst · Landed at Goldman Sachs",
    avatarKey: "tomas-rueda",
  },
];

function ReviewCard({ review }: { review: Review }) {
  return (
    <div style={{
      background: "#FFFFFF",
      border: "1px solid #E5E7EB",
      borderRadius: "16px",
      padding: "24px",
      boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
      display: "flex",
      flexDirection: "column",
    }}>
      {/* Stars + external link icon */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
        <span style={{ color: "#F59E0B", fontSize: "14px" }}>★★★★★</span>
        <ExternalLink size={13} color="#D1D5DB" aria-hidden="true" />
      </div>

      {/* Title */}
      <p style={{ fontSize: "15px", fontWeight: 700, color: "#1A1A1A", lineHeight: 1.3, marginBottom: "8px" }}>
        {review.title}
      </p>

      {/* Body */}
      <p style={{ fontSize: "14px", lineHeight: 1.65, color: "#6B7280", marginBottom: "16px" }}>
        {review.body}
      </p>

      {/* Divider */}
      <div style={{ borderTop: "1px solid #F3F4F6", marginBottom: "16px" }} />

      {/* Avatar + name + role */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`https://i.pravatar.cc/40?u=${review.avatarKey}`}
          alt={review.name}
          width={36}
          height={36}
          loading="lazy"
          style={{ borderRadius: "50%", flexShrink: 0 }}
        />
        <div>
          <span style={{ fontSize: "13px", fontWeight: 600, color: "#1A1A1A", display: "block" }}>
            {review.name}
          </span>
          <span style={{ fontSize: "12px", color: "#9CA3AF", display: "block" }}>
            {review.role}
          </span>
        </div>
      </div>
    </div>
  );
}

export function ReviewsSection() {
  return (
    <section
      id="reviews"
      style={{ background: "#F9FAFB", padding: "96px 0", scrollMarginTop: "80px" }}
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
          Reviews
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
          Job seekers love Ascend.
        </h2>
        <p style={{ fontSize: "17px", color: "#6B7280", textAlign: "center", marginBottom: "56px" }}>
          Don&apos;t take our word for it.
        </p>

        {/* Two-column staggered grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">

          {/* Left column */}
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            {REVIEWS_LEFT.map((review) => (
              <ReviewCard key={review.name} review={review} />
            ))}
          </div>

          {/* Right column — offset down on md+ */}
          <div className="md:mt-10" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            {REVIEWS_RIGHT.map((review) => (
              <ReviewCard key={review.name} review={review} />
            ))}
          </div>

        </div>

      </div>
    </section>
  );
}
