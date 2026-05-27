'use client'
import { useState } from 'react'
import Link from 'next/link'
import { signUp } from '@/lib/auth'

export default function RegisterPage() {
  const [form, setForm] = useState({
    full_name: '', email: '', password: '',
    agency_name: '', phone: '', notes: ''
  })
  const [error, setError]     = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await signUp(form)
      setSuccess(true)
    } catch {
      setError('שגיאה בהרשמה. נסה שוב')
    }
    setLoading(false)
  }

  const card: React.CSSProperties = {
    background: '#fff', borderRadius: 20,
    padding: '40px', width: '100%', maxWidth: 440,
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
  }

  const input: React.CSSProperties = {
    width: '100%', padding: '11px 14px',
    borderRadius: 10, border: '1px solid #CBD5E1',
    fontSize: 14, fontFamily: 'var(--font-main)',
    background: '#F8FAFC', color: 'var(--text-body)',
    outline: 'none', direction: 'rtl'
  }

  if (success) return (
    <div style={{ ...card, textAlign: 'center' }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
      <p style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-heading)', margin: '0 0 8px' }}>
        הבקשה נשלחה בהצלחה
      </p>
      <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: '0 0 24px' }}>
        בקשתך ממתינה לאישור מנהל המערכת.
        תקבל הודעה כשהגישה תאושר.
      </p>
      <Link href="/login" style={{
        display: 'inline-block', background: 'var(--accent)',
        color: '#fff', padding: '10px 24px', borderRadius: 10,
        textDecoration: 'none', fontSize: 14, fontWeight: 600
      }}>חזור לכניסה</Link>
    </div>
  )

  return (
    <div style={card}>
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <p style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-heading)', margin: '0 0 6px' }}>
          בקשת גישה למערכת
        </p>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
          הבקשה תועבר לאישור מנהל
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {[
          { key: 'full_name',    label: 'שם מלא',      type: 'text',     placeholder: 'ישראל ישראלי' },
          { key: 'email',        label: 'אימייל',       type: 'email',    placeholder: 'your@email.com' },
          { key: 'password',     label: 'סיסמה',        type: 'password', placeholder: '••••••••' },
          { key: 'agency_name',  label: 'שם סוכנות',    type: 'text',     placeholder: 'סוכנות ביטוח בע"מ' },
          { key: 'phone',        label: 'טלפון',        type: 'tel',      placeholder: '050-0000000' },
        ].map(({ key, label, type, placeholder }) => (
          <div key={key}>
            <label style={{ fontSize: 13, color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>
              {label}
            </label>
            <input type={type} placeholder={placeholder}
              value={form[key as keyof typeof form]}
              onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
              style={input} required={key !== 'notes'} />
          </div>
        ))}

        <div>
          <label style={{ fontSize: 13, color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>
            הערות (אופציונלי)
          </label>
          <textarea
            placeholder="מידע נוסף..."
            value={form.notes}
            onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
            rows={3}
            style={{ ...input, resize: 'vertical' }} />
        </div>

        {error && (
          <div style={{
            background: 'var(--status-blocked-bg)',
            color: 'var(--status-blocked)',
            padding: '10px 14px', borderRadius: 10, fontSize: 13
          }}>{error}</div>
        )}

        <button type="submit" disabled={loading} style={{
          background: loading ? '#93C5FD' : 'var(--accent)',
          color: '#fff', border: 'none', padding: '12px',
          borderRadius: 10, fontSize: 14, fontWeight: 600,
          fontFamily: 'var(--font-main)', cursor: loading ? 'not-allowed' : 'pointer',
          marginTop: 4
        }}>
          {loading ? 'שולח...' : 'שלח בקשה'}
        </button>
      </form>

      <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-muted)', marginTop: 16 }}>
        יש לך חשבון?{' '}
        <Link href="/login" style={{ color: 'var(--accent)', textDecoration: 'none' }}>
          כניסה
        </Link>
      </p>
    </div>
  )
}
