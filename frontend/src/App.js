import { useState } from 'react'
import Register from './pages/Register'
import Login from './pages/Login'
import TrustScoreBadge from './components/TrustScoreBadge'
import StudentVerification from './components/StudentVerification'
import RoleHome from './components/RoleHome'
import AdminDashboard from './components/AdminDashboard'

function App() {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user')
    return saved ? JSON.parse(saved) : null
  })
  const [page, setPage] = useState('login')

  const handleLogin = (userData) => setUser(userData)

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
    <div style={{ minHeight: '100vh', background: '#0f0f0f', fontFamily: "'Segoe UI', sans-serif", padding: '40px 20px' }}>
      <div style={{ maxWidth: '480px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ background: '#1a1a1a', borderRadius: '16px', padding: '20px 24px', marginBottom: '16px', border: '1px solid #2a2a2a', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#2a1f5e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 700, color: '#AFA9EC', border: '2px solid #534AB7' }}>
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#fff' }}>{user.name}</h2>
                {user.isStudentVerified && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: '999px', background: '#134e26', color: '#9ee3b5', fontSize: '11px', fontWeight: 700, border: '1px solid #0f3d1d' }}>
                    ✓ Verified
                  </span>
                )}
              </div>
              <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#555' }}>{user.email}</p>
            </div>
          </div>
          <button onClick={handleLogout} style={{ background: 'transparent', border: '1px solid #2a2a2a', borderRadius: '8px', color: '#666', padding: '6px 14px', cursor: 'pointer', fontSize: '12px' }}>
            Logout
          </button>
        </div>

        {/* Role badge */}
        <div style={{ marginBottom: '16px' }}>
          <span style={{ fontSize: '11px', padding: '3px 12px', borderRadius: '20px', fontWeight: 700, background: '#16143a', color: '#AFA9EC', border: '1px solid #534AB7' }}>
            {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
          </span>
        </div>

        <RoleHome user={user} />

        {user.role === 'student' && (
          <StudentVerification user={user} onUpdateUser={(updatedUser) => {
            localStorage.setItem('user', JSON.stringify(updatedUser))
            setUser(updatedUser)
          }} />
        )}

        {user.role === 'student' && (
          <div style={{ marginTop: '16px' }}>
            <TrustScoreBadge userId={user.id} />
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