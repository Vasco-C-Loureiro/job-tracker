import { ExtensionDemo } from "./demos/ExtensionDemo";
import { KanbanDemo } from "./demos/KanbanDemo";
import { CalendarDemo } from "./demos/CalendarDemo";
import { OfferDemo } from "./demos/OfferDemo";

const DEMO_BLOCKS: {
  step: string;
  heading: string;
  body: string;
  demo: React.ReactNode;
  direction: "demo-first" | "text-first";
}[] = [
  {
    step: "01 · Save",
    heading: "One click. Job saved.",
    body: "Hit the Ascend button on any job page. Title, company, salary, and description are extracted automatically. No copy-pasting. No switching tabs. Just save and move on.",
    demo: <ExtensionDemo />,
    direction: "demo-first",
  },
  {
    step: "02 · Track",
    heading: "Drag. Drop. Done.",
    body: "Move applications through your pipeline visually. Applied, interviewing, offered — your whole search at a glance. The table view keeps all your data sortable and searchable.",
    demo: <KanbanDemo />,
    direction: "text-first",
  },
  {
    step: "03 · Interview",
    heading: "Never lose track of what's next",
    body: "Schedule interview rounds, set closing date reminders, and see every commitment in one calendar. Add prep notes to each round so you always walk in prepared.",
    demo: <CalendarDemo />,
    direction: "demo-first",
  },
  {
    step: "04 · Offer",
    heading: "The moment it all pays off",
    body: "Mark it as an offer. Compare your options. Ascend tracks the whole journey — from the first save to the signed contract — so you can focus on choosing the right role.",
    demo: <OfferDemo />,
    direction: "text-first",
  },
];


const textBlockStyle: React.CSSProperties = { flex: 1 };

const stepStyle: React.CSSProperties = {
  display: "block",
  fontSize: "12px",
  fontWeight: 600,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: "#3C896D",
  marginBottom: "12px",
};

const headingStyle: React.CSSProperties = {
  fontSize: "clamp(22px, 2.5vw, 30px)",
  fontWeight: 800,
  lineHeight: 1.2,
  color: "#FFFFFF",
  marginBottom: "14px",
  letterSpacing: "-0.02em",
};

const bodyStyle: React.CSSProperties = {
  fontSize: "16px",
  lineHeight: 1.7,
  color: "rgba(255,255,255,0.6)",
  maxWidth: "400px",
};

export function DemoSection() {
  return (
    <section
      id="how-it-works"
      style={{
        background: "#143642",
        padding: "96px 0",
        scrollMarginTop: "80px",
        fontFamily: "var(--font-geist-sans), Arial, sans-serif",
      }}
    >
      <div className="max-w-6xl mx-auto px-6">
        {/* Section header */}
        <span
          style={{
            display: "block",
            textAlign: "center",
            fontSize: "12px",
            fontWeight: 600,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "#3C896D",
            marginBottom: "12px",
          }}
        >
          How it works
        </span>
        <h2
          style={{
            fontSize: "clamp(28px, 3.5vw, 40px)",
            fontWeight: 800,
            lineHeight: 1.15,
            letterSpacing: "-0.02em",
            color: "#FFFFFF",
            textAlign: "center",
            marginBottom: "12px",
          }}
        >
          Save it. Track it. Land it.
        </h2>
        <p
          style={{
            fontSize: "17px",
            color: "rgba(255,255,255,0.55)",
            textAlign: "center",
            marginBottom: "80px",
          }}
        >
          Four steps. One place. Zero spreadsheets.
        </p>

        {/* Demo blocks */}
        {DEMO_BLOCKS.map((block, i) => (
          <div key={block.step}>
            {block.direction === "demo-first" ? (
              <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-16">
                {/* Demo always first on mobile; also first on desktop */}
                <div style={{ flex: 1, width: "100%" }}>{block.demo}</div>
                <div style={textBlockStyle}>
                  <span style={stepStyle}>{block.step}</span>
                  <h3 style={headingStyle}>{block.heading}</h3>
                  <p style={bodyStyle}>{block.body}</p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-16">
                {/* Demo first on mobile (order -1), text first on desktop */}
                <div
                  style={{ flex: 1, width: "100%" }}
                  className="order-first lg:order-last"
                >
                  {block.demo}
                </div>
                <div
                  style={textBlockStyle}
                  className="order-last lg:order-first"
                >
                  <span style={stepStyle}>{block.step}</span>
                  <h3 style={headingStyle}>{block.heading}</h3>
                  <p style={bodyStyle}>{block.body}</p>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
