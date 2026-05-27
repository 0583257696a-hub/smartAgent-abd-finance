'use client'
import { useState } from 'react'
import Link from 'next/link'
import { signIn, getProfile } from '@/lib/auth'

export default function LoginPage() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await signIn(email, password)
      const profile = await getProfile()
      if (!profile) throw new Error('פרופיל לא נמצא')
      if (profile.status === 'pending') {
        setError('הבקשה שלך ממתינה לאישור מנהל המערכת')
        setLoading(false)
        return
      }
      if (profile.status === 'blocked') {
        setError('הגישה שלך חסומה. צור קשר עם המנהל')
        setLoading(false)
        return
      }
      window.location.assign('/')
    } catch {
      setError('אימייל או סיסמה שגויים')
    }
    setLoading(false)
  }

  const card: React.CSSProperties = {
    background: '#fff', borderRadius: 20,
    padding: '40px', width: '100%', maxWidth: 400,
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
  }

  const input: React.CSSProperties = {
    width: '100%', padding: '11px 14px',
    borderRadius: 10, border: '1px solid #CBD5E1',
    fontSize: 14, fontFamily: 'var(--font-main)',
    background: '#F8FAFC', color: 'var(--text-body)',
    outline: 'none', direction: 'rtl'
  }

  return (
    <div style={card}>
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <p style={{
          fontSize: 22, fontWeight: 700,
          color: 'var(--text-heading)', margin: '0 0 6px'
        }}>כניסה למערכת</p>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
          מרכז תפעול לסוכן ביטוח ופנסיה
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <label style={{ fontSize: 13, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
            אימייל
          </label>
          <input type="email" value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="your@email.com" style={input} required />
        </div>

        <div>
          <label style={{ fontSize: 13, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
            סיסמה
          </label>
          <input type="password" value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••" style={input} required />
        </div>

        {error && (
          <div style={{
            background: 'var(--status-blocked-bg)',
            color: 'var(--status-blocked)',
            padding: '10px 14px', borderRadius: 10,
            fontSize: 13, textAlign: 'center'
          }}>{error}</div>
        )}

        <button type="submit" disabled={loading} style={{
          background: loading ? '#93C5FD' : 'var(--accent)',
          color: '#fff', border: 'none', padding: '12px',
          borderRadius: 10, fontSize: 14, fontWeight: 600,
          fontFamily: 'var(--font-main)', cursor: loading ? 'not-allowed' : 'pointer'
        }}>
          {loading ? 'מתחבר...' : 'כניסה'}
        </button>
      </form>

      <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-muted)', marginTop: 20 }}>
        אין לך חשבון?{' '}
        <Link href="/register" style={{ color: 'var(--accent)', textDecoration: 'none' }}>
          בקש גישה
        </Link>
      </p>
    </div>
  )
}
