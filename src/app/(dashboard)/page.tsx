export default function DashboardPage() {
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
      gap: 16,
    }}>
      <h1 style={{
        gridColumn: "1/-1",
        fontSize: 24, fontWeight: 800,
        color: 'var(--text-heading)',
        fontFamily: 'var(--font-main)',
        margin: '0 0 8px'
      }}>
        מרכז תפעול לסוכן
      </h1>
      <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
        ברוך הבא למערכת
      </p>
      {["מיילים", "תבניות", "דמי ניהול", "הנחות ביטוח"].map((label) => (
        <div key={label} style={{
          background: "var(--bg-card)",
          border: "1px solid #DDE7F3",
          borderRadius: "var(--radius-card)",
          boxShadow: "var(--shadow-card)",
          padding: 20,
        }}>
          <strong style={{ color: "var(--text-heading)" }}>{label}</strong>
          <p style={{ margin: "8px 0 0", color: "var(--text-muted)", fontSize: 13 }}>
            מודול מוכן לעבודה
          </p>
        </div>
      ))}
    </div>
  )
}
