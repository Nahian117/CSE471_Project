import { useState, useRef, forwardRef, useImperativeHandle, useEffect } from 'react'
import Register from './pages/Register'
import Login from './pages/Login'
import Marketplace from './pages/Marketplace'
import TrustScoreBadge from './components/TrustScoreBadge'
import StudentVerification from './components/StudentVerification'
import RoleHome from './components/RoleHome'
import AdminDashboard from './components/AdminDashboard'
import NotificationBell from './components/NotificationBell'
import { initFCM, listenForegroundMessages } from './firebase'

/* ─────────────────────────────────────────────────────────────────
   MarketplaceWithRef
   Thin wrapper so the NotificationBell in the header can push filter
   navigation down into Marketplace without prop drilling.
───────────────────────────────────────────────────────────────── */
const MarketplaceWithRef = forwardRef(function MarketplaceWithRef({ user }, ref) {
  const [externalFilter, setExternalFilter] = useState(null)

  useImperativeHandle(ref, () => ({
    applyFilter(filters) {
      // Adding a timestamp forces the useEffect in Marketplace to fire
      // even if the same filter object is applied twice in a row.
      setExternalFilter({ ...filters, _ts: Date.now() })
    }
  }), [])

  return <Marketplace user={user} externalFilter={externalFilter} />
})

/* ─────────────────────────────────────────────────────────────────
   App
───────────────────────────────────────────────────────────────── */
function App() {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user')
    return saved ? JSON.parse(saved) : null
  })
  const [page, setPage] = useState('login')
  const marketplaceRef  = useRef(null)

  const handleLogin = (userData) => setUser(userData)

  // Initialise FCM whenever a user logs in
  useEffect(() => {
    if (!user) return;
    const token = localStorage.getItem('token');
    if (token) {
      initFCM(token).catch(() => {});
      listenForegroundMessages();
    }
  }, [user])

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
    setPage('login')
  }

  if (!user) {
    return page === 'login'
      ? <Login onSwitch={() => setPage('register')} onLogin={handleLogin} />
      : <Register onSwitch={() => setPage('login')} onLogin={handleLogin} />
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0f0f0f',
      fontFamily: "'Segoe UI', sans-serif",
      padding: '40px 20px'
    }}>
      <div style={{ maxWidth: '480px', margin: '0 auto' }}>

        {/* ── Header ── */}
        <div style={{
          background: '#1a1a1a',
          borderRadius: '16px',
          padding: '16px 20px',
          marginBottom: '16px',
          border: '1px solid #2a2a2a',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '10px'
        }}>
          {/* Avatar + name */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
            <div style={{
              width: '44px', height: '44px', borderRadius: '50%',
              background: '#2a1f5e', display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: '17px', fontWeight: 700,
              color: '#AFA9EC', border: '2px solid #534AB7', flexShrink: 0
            }}>
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '7px', flexWrap: 'wrap' }}>
                <h2 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#fff' }}>
                  {user.name}
                </h2>
                {user.isStudentVerified && (
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: '3px',
                    padding: '3px 8px', borderRadius: '999px',
                    background: '#134e26', color: '#9ee3b5',
                    fontSize: '10px', fontWeight: 700, border: '1px solid #0f3d1d'
                  }}>
                    ✓ Verified
                  </span>
                )}
              </div>
              <p style={{
                margin: '1px 0 0', fontSize: '11px', color: '#555',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
              }}>
                {user.email}
              </p>
            </div>
          </div>

          {/* Right controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            {user.role === 'student' && (
              <NotificationBell
                onApplyFilter={(filters) => marketplaceRef.current?.applyFilter(filters)}
              />
            )}
            <button
              onClick={handleLogout}
              style={{
                background: 'transparent', border: '1px solid #2a2a2a',
                borderRadius: '8px', color: '#666', padding: '6px 12px',
                cursor: 'pointer', fontSize: '12px'
              }}
            >
              Logout
            </button>
          </div>
        </div>

        {/* ── Role badge ── */}
        <div style={{ marginBottom: '16px' }}>
          <span style={{
            fontSize: '11px', padding: '3px 12px', borderRadius: '20px', fontWeight: 700,
            background: '#16143a', color: '#AFA9EC', border: '1px solid #534AB7'
          }}>
            {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
            {user.studentType ? ` · ${user.studentType}` : ''}
          </span>
        </div>

        <RoleHome user={user} />

        {user.role === 'student' && (
          <StudentVerification
            user={user}
            onUpdateUser={(updatedUser) => {
              localStorage.setItem('user', JSON.stringify(updatedUser))
              setUser(updatedUser)
            }}
          />
        )}

        {user.role === 'student' && (
          <div style={{ marginTop: '16px' }}>
            <TrustScoreBadge userId={user.id} />
          </div>
        )}

        {user.role === 'student' && (
          <div style={{ marginTop: '24px' }}>
            <MarketplaceWithRef ref={marketplaceRef} user={user} />
          </div>
        )}

        {user.role === 'admin' && (
          <div style={{ marginTop: '16px' }}>
            <AdminDashboard />
          </div>
        )}

      </div>
    </div>
  )
}

export default App