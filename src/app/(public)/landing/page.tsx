import Link from "next/link";

export default function LandingPage() {
  return (
    <main dir="rtl" style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #F8FAFC 0%, #EFF6FF 100%)",
      display: "grid",
      placeItems: "center",
      padding: 24,
      fontFamily: "var(--font-main)",
    }}>
      <section style={{ maxWidth: 820, textAlign: "center" }}>
        <p style={{ color: "var(--accent)", fontWeight: 800, margin: 0 }}>Insurance Operations Platform</p>
        <h1 style={{ color: "var(--text-heading)", fontSize: 46, margin: "12px 0", lineHeight: 1.1 }}>
          מרכז תפעול לסוכן
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: 18, margin: "0 auto 26px", maxWidth: 620 }}>
          מערכת עבודה פנימית, מהירה ומודרנית לסוכני ביטוח ופנסיה בישראל.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          <Link href="/login" style={primary}>כניסה</Link>
          <Link href="/register" style={secondary}>בקשת גישה</Link>
        </div>
      </section>
    </main>
  );
}

const primary: React.CSSProperties = {
  background: "var(--accent)",
  color: "#fff",
  borderRadius: 12,
  padding: "12px 24px",
  textDecoration: "none",
  fontWeight: 800,
};

const secondary: React.CSSProperties = {
  background: "#fff",
  color: "var(--primary)",
  border: "1px solid #DDE7F3",
  borderRadius: 12,
  padding: "12px 24px",
  textDecoration: "none",
  fontWeight: 800,
};
