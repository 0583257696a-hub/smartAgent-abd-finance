'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LogOut, Settings, ShieldCheck } from 'lucide-react'
import { modules, type ModuleKey } from '@/lib/modules'

const labelByKey: Partial<Record<ModuleKey, string>> = {
  operational_emails: 'מיילים',
  email_templates: 'תבניות',
  passwords: 'פוליסות',
  supervisors: 'מפקחים',
  employers: 'עסקים',
  clients: 'לקוחות',
  management_fees: 'דמי ניהול',
  insurance_discounts: 'הנחות ביטוח',
  deposit_accounts: 'חשבונות',
  service_centers: 'מוקדי שירות',
  institution_codes: 'קודי מוסד',
  links: 'קישורים',
  agent_numbers: 'מספרי סוכן',
  bank_numbers: 'מספרי בנקים',
  mortgage_release: 'שחרור משכנתא',
}

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside style={{
      position: 'fixed',
      right: 0,
      top: 0,
      width: 'var(--sidebar-width)',
      height: '100vh',
      background: 'var(--bg-sidebar)',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 50,
      overflowY: 'auto',
      borderLeft: '1px solid var(--border-subtle)',
      boxShadow: '-8px 0 30px rgba(16,33,63,0.04)'
    }}>
      <div style={{
        padding: '24px 18px 18px',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        gap: 12
      }}>
        <span style={{
          width: 38,
          height: 38,
          borderRadius: 12,
          display: 'grid',
          placeItems: 'center',
          background: 'var(--accent-light)',
          color: 'var(--accent)',
          border: '1px solid #D6E6FF'
        }}>
          <ShieldCheck size={20} strokeWidth={1.8} />
        </span>
        <div>
          <p style={{
            fontSize: 16,
            fontWeight: 800,
            color: 'var(--text-heading)',
            margin: 0
          }}>
            מרכז תפעול
          </p>
          <p style={{
            fontSize: 12,
            color: 'var(--text-muted)',
            margin: '2px 0 0',
            fontWeight: 600
          }}>
            סוכן ביטוח ופנסיה
          </p>
        </div>
      </div>

      <nav style={{ flex: 1, padding: '14px 10px' }}>
        {modules.map(({ route, key, icon: Icon, label, count }) => {
          const active = pathname === route
          return (
            <Link
              key={route}
              href={route}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 12px',
                borderRadius: 12,
                marginBottom: 4,
                textDecoration: 'none',
                color: active ? 'var(--accent)' : 'var(--text-sidebar)',
                background: active ? 'var(--bg-sidebar-active)' : 'transparent',
                border: active ? '1px solid #D6E6FF' : '1px solid transparent',
                fontSize: 14,
                fontWeight: active ? 800 : 600,
                transition: 'all 150ms ease'
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Icon size={17} strokeWidth={1.7} />
                {labelByKey[key] ?? label}
              </span>
              {count ? (
                <span style={{
                  minWidth: 28,
                  textAlign: 'center',
                  fontSize: 11,
                  background: active ? '#fff' : '#EEF3FA',
                  color: active ? 'var(--accent)' : 'var(--text-muted)',
                  padding: '2px 8px',
                  borderRadius: 20,
                  fontWeight: 800
                }}>
                  {count}
                </span>
              ) : null}
            </Link>
          )
        })}
      </nav>

      <div style={{
        padding: '14px 10px',
        borderTop: '1px solid var(--border-subtle)'
      }}>
        <Link href="/admin" style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '10px 12px',
          borderRadius: 12,
          color: pathname === '/admin' ? 'var(--accent)' : 'var(--text-sidebar)',
          background: pathname === '/admin' ? 'var(--bg-sidebar-active)' : 'transparent',
          textDecoration: 'none',
          fontSize: 14,
          fontWeight: 700
        }}>
          <ShieldCheck size={16} strokeWidth={1.6} />
          פאנל ניהול
        </Link>
        <Link href="/settings" style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '10px 12px',
          borderRadius: 12,
          color: 'var(--text-sidebar)',
          textDecoration: 'none',
          fontSize: 14,
          fontWeight: 700
        }}>
          <Settings size={16} strokeWidth={1.6} />
          הגדרות
        </Link>
        <button type="button" style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '10px 12px',
          borderRadius: 12,
          width: '100%',
          color: 'var(--text-sidebar)',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          fontSize: 14,
          fontFamily: 'var(--font-main)',
          fontWeight: 700
        }}>
          <LogOut size={16} strokeWidth={1.6} />
          התנתקות
        </button>
      </div>
    </aside>
  )
}
