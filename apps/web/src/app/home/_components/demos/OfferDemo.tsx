const placeholderStyle: React.CSSProperties = {
  width: "100%",
  background: "rgba(255,255,255,0.08)",
  border: "1px solid rgba(255,255,255,0.15)",
  borderRadius: "16px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexDirection: "column",
  gap: "8px",
};

export function OfferDemo() {
  return (
    <div style={{ ...placeholderStyle, height: "300px" }} className="lg:!h-[340px]">
      <span style={{ fontSize: "13px", color: "rgba(255,255,255,0.4)", fontWeight: 500, letterSpacing: "0.04em", textAlign: "center" }}>
        Offer Celebration Demo
      </span>
      <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.25)", textAlign: "center" }}>
        Animated in Unit 28
      </span>
    </div>
  );
}
