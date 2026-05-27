'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Settings, LogOut } from 'lucide-react'
import { modules } from '@/lib/modules'

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside style={{
      position: 'fixed', right: 0, top: 0,
      width: 'var(--sidebar-width)', height: '100vh',
      background: 'var(--bg-sidebar)',
      display: 'flex', flexDirection: 'column',
      zIndex: 50, overflowY: 'auto'
    }}>
      {/* Logo */}
      <div style={{
        padding: '20px 16px',
        borderBottom: '1px solid rgba(255,255,255,0.06)'
      }}>
        <p style={{
          fontSize: 16, fontWeight: 700,
          color: '#fff', margin: 0
        }}>מרכז תפעול</p>
        <p style={{
          fontSize: 12, color: 'var(--text-sidebar)',
          margin: '2px 0 0'
        }}>סוכן ביטוח ופנסיה</p>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '12px 8px' }}>
        {modules.map(({ route, icon: Icon, label, count }) => {
          const active = pathname === route
          return (
            <Link key={route} href={route} style={{
              display: 'flex', alignItems: 'center',
              justifyContent: 'space-between',
              padding: '9px 12px', borderRadius: 10,
              marginBottom: 2, textDecoration: 'none',
              color: active ? '#fff' : 'var(--text-sidebar)',
              background: active
                ? 'var(--bg-sidebar-active)' : 'transparent',
              borderRight: active
                ? '3px solid var(--accent)' : '3px solid transparent',
              fontSize: 13.5, fontWeight: active ? 600 : 400,
              transition: 'all 150ms ease'
            }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Icon size={16} strokeWidth={1.5} />
                {label}
              </span>
              {count && (
                <span style={{
                  fontSize: 11, background: 'rgba(255,255,255,0.1)',
                  color: 'var(--text-sidebar)', padding: '1px 7px',
                  borderRadius: 20, fontWeight: 500
                }}>{count}</span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Bottom */}
      <div style={{
        padding: '12px 8px',
        borderTop: '1px solid rgba(255,255,255,0.06)'
      }}>
        <Link href="/settings" style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '9px 12px', borderRadius: 10,
          color: 'var(--text-sidebar)', textDecoration: 'none',
          fontSize: 13.5
        }}>
          <Settings size={16} strokeWidth={1.5} />
          הגדרות
        </Link>
        <button onClick={() => {}} style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '9px 12px', borderRadius: 10, width: '100%',
          color: 'var(--text-sidebar)', background: 'transparent',
          border: 'none', cursor: 'pointer', fontSize: 13.5,
          fontFamily: 'var(--font-main)'
        }}>
          <LogOut size={16} strokeWidth={1.5} />
          התנתקות
        </button>
      </div>
    </aside>
  )
}
