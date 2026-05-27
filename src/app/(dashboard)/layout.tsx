import Sidebar from '@/components/layout/Sidebar'
import Header from '@/components/layout/Header'

export default function DashboardLayout({
  children
}: { children: React.ReactNode }) {
  return (
    <div dir="rtl" style={{
      background: 'var(--bg-shell)',
      minHeight: '100vh'
    }}>
      <Sidebar />
      <main style={{
        marginRight: 'var(--sidebar-width)',
        padding: '24px',
        minHeight: '100vh'
      }}>
        <Header />
        {children}
      </main>
    </div>
  )
}
