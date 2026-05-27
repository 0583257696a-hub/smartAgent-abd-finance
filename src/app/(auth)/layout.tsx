export default function AuthLayout({
  children
}: { children: React.ReactNode }) {
  return (
    <div dir="rtl" style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0F1929 0%, #1B3A6B 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'var(--font-main)', padding: '24px'
    }}>
      {children}
    </div>
  )
}
