import { useEffect, useState } from 'react'
import axios from 'axios'

function TrustScoreBadge({ userId }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    axios.get(`http://localhost:5000/api/trust-score/${userId}`)
      .then(res => { setData(res.data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [userId])

  if (loading) return (
    <div style={{ background: '#1a1a1a', borderRadius: '16px', padding: '32px', textAlign: 'center', color: '#444', border: '1px solid #2a2a2a' }}>
      Loading score...
    </div>
  )

  if (!data) return (
    <div style={{ background: '#1a1a1a', borderRadius: '16px', padding: '32px', textAlign: 'center', color: '#444', border: '1px solid #2a2a2a' }}>
      No score yet
    </div>
  )

  const score = data.score
  const bd = data.breakdown

  const tier = score >= 90 ? { label: 'Elite',         color: '#5DCAA5', bg: '#0a1f16', border: '#1D9E75', ring: '#1D9E75' }
             : score >= 75 ? { label: 'Trusted',        color: '#85B7EB', bg: '#0a1628', border: '#185FA5', ring: '#378ADD' }
             : score >= 40 ? { label: 'Building Trust', color: '#FAC775', bg: '#1a1205', border: '#854F0B', ring: '#EF9F27' }
             :                { label: 'New User',       color: '#F09595', bg: '#1a0a0a', border: '#A32D2D', ring: '#E24B4A' }

  const bars = [
    { label: 'Transactions', value: bd?.txScore || 0,      max: 40, color: '#378ADD', bg: '#0a1628' },
    { label: 'Reviews',      value: bd?.reviewScore || 0,  max: 35, color: '#1D9E75', bg: '#0a1f16' },
    { label: 'Disputes',     value: bd?.disputeScore || 0, max: 15, color: '#7F77DD', bg: '#16143a' },
    { label: 'Account age',  value: bd?.ageScore || 0,     max: 10, color: '#EF9F27', bg: '#1a1205' },
  ]

  const badges = []
  if (data.completedTransactions >= 1)  badges.push({ label: `${data.completedTransactions} Sales`,  bg: '#0a1628', color: '#85B7EB', border: '#185FA5' })
  if (data.completedTransactions >= 10) badges.push({ label: 'Power Seller',  bg: '#0a1f16', color: '#5DCAA5', border: '#1D9E75' })
  if (data.disputesLost === 0)          badges.push({ label: 'Zero Disputes', bg: '#16143a', color: '#AFA9EC', border: '#534AB7' })
  if (data.totalReviews >= 5)           badges.push({ label: 'Well Reviewed', bg: '#1a1205', color: '#FAC775', border: '#854F0B' })

  const next = score >= 90 ? null
             : score >= 75 ? { label: 'Elite',          need: 90 - score }
             : score >= 40 ? { label: 'Trusted',         need: 75 - score }
             :                { label: 'Building Trust',  need: 40 - score }

  const r = 42
  const circ = 2 * Math.PI * r
  const dash = circ - (score / 100) * circ

  return (
    <div style={{
      background: '#1a1a1a',
      borderRadius: '16px',
      border: '1px solid #2a2a2a',
      overflow: 'hidden',
      fontFamily: "'Segoe UI', sans-serif"
    }}>

      {/* Top circle section */}
      <div style={{
        background: tier.bg,
        padding: '28px 24px',
        textAlign: 'center',
        borderBottom: `1px solid ${tier.border}44`
      }}>
        <svg width="120" height="120" viewBox="0 0 110 110" style={{ display: 'block', margin: '0 auto 14px' }}>
          <circle cx="55" cy="55" r={r} fill="none" stroke="#2a2a2a" strokeWidth="8"/>
          <circle cx="55" cy="55" r={r} fill="none" stroke={tier.ring} strokeWidth="8"
            strokeDasharray={circ}
            strokeDashoffset={dash}
            strokeLinecap="round"
            transform="rotate(-90 55 55)"
          />
          <text x="55" y="50" textAnchor="middle" fontSize="22" fontWeight="700" fill={tier.color}>{score}</text>
          <text x="55" y="66" textAnchor="middle" fontSize="11" fill={tier.color} opacity="0.6">/ 100</text>
        </svg>
        <div style={{
          display: 'inline-block', padding: '5px 18px',
          borderRadius: '20px',
          background: '#00000033',
          color: tier.color, fontWeight: 700, fontSize: '13px',
          border: `1.5px solid ${tier.border}`,
          letterSpacing: '.03em'
        }}>
          {tier.label}
        </div>
      </div>

      {/* Breakdown bars */}
      <div style={{ padding: '20px 24px', borderBottom: '1px solid #222' }}>
        <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: '#444', margin: '0 0 16px' }}>Score breakdown</p>
        {bars.map((bar, i) => (
          <div key={i} style={{ marginBottom: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', marginBottom: '6px' }}>
              <span style={{ color: '#aaa', fontWeight: 500 }}>{bar.label}</span>
              <span style={{ color: bar.color, fontWeight: 700 }}>{bar.value}<span style={{ color: '#444', fontWeight: 400 }}>/{bar.max}</span></span>
            </div>
            <div style={{ height: '6px', background: '#252525', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: '3px',
                background: bar.color,
                width: `${(bar.value / bar.max) * 100}%`,
                boxShadow: `0 0 8px ${bar.color}66`
              }} />
            </div>
          </div>
        ))}
      </div>

      {/* Badges */}
      {badges.length > 0 && (
        <div style={{ padding: '16px 24px', borderBottom: '1px solid #222' }}>
          <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: '#444', margin: '0 0 10px' }}>Achievements</p>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {badges.map((b, i) => (
              <span key={i} style={{
                fontSize: '11.5px', padding: '4px 12px',
                borderRadius: '20px', fontWeight: 600,
                background: b.bg, color: b.color,
                border: `1px solid ${b.border}`
              }}>{b.label}</span>
            ))}
          </div>
        </div>
      )}

      {/* Tip */}
      {next && (
        <div style={{ padding: '16px 24px' }}>
          <div style={{
            background: '#111',
            borderRadius: '10px',
            padding: '12px 16px',
            fontSize: '12.5px',
            color: '#666',
            lineHeight: 1.7,
            borderLeft: `3px solid ${tier.ring}`
          }}>
            <strong style={{ color: '#aaa' }}>Next goal:</strong> <strong style={{ color: tier.ring }}>{next.need} more points</strong> to reach <strong style={{ color: tier.color }}>{next.label}</strong>. Complete more transactions and collect reviews.
          </div>
        </div>
      )}

    </div>
  )
}

export default TrustScoreBadge 