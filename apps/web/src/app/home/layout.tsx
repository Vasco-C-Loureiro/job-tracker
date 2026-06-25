export default function HomeLayout({ children }: { children: React.ReactNode }) {
  return (
    <div data-theme="light" style={{ background: "#ffffff" }}>
      {children}
    </div>
  );
}
