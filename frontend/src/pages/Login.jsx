import { useState } from 'react'
import axios from 'axios'

function Login({ onSwitch, onLogin }) {
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await axios.post('http://localhost:5000/api/auth/login', form)
      localStorage.setItem('token', res.data.token)
      localStorage.setItem('user', JSON.stringify(res.data.user))
      onLogin(res.data.user)
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed')
    }
    setLoading(false)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0f0f0f', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Segoe UI', sans-serif" }}>
      <div style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '16px', padding: '36px', width: '100%', maxWidth: '400px' }}>

        <h2 style={{ color: '#fff', margin: '0 0 4px', fontSize: '22px', fontWeight: 700 }}>Welcome back</h2>
        <p style={{ color: '#555', fontSize: '13px', margin: '0 0 24px' }}>BRACU Second-Hand Marketplace</p>
        <p style={{ color: '#AFA9EC', fontSize: '12px', margin: '0 0 16px' }}>
          Admin login: <strong>admin@g.bracu.ac.bd</strong> / <strong>Admin@123</strong>
        </p>

        {error && (
          <div style={{ background: '#1a0a0a', border: '1px solid #A32D2D', borderRadius: '8px', padding: '10px 14px', color: '#F09595', fontSize: '13px', marginBottom: '16px' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', color: '#888', fontSize: '12px', marginBottom: '6px', fontWeight: 600 }}>BRACU Email</label>
            <input
              name="email" value={form.email} onChange={handleChange}
              placeholder="yourname@g.bracu.ac.bd" required type="email"
              pattern="^[^\s@]+@g\.bracu\.ac\.bd$"
              title="Please use a @g.bracu.ac.bd email"
              style={{ width: '100%', padding: '10px 14px', background: '#111', border: '1px solid #2a2a2a', borderRadius: '8px', color: '#fff', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', color: '#888', fontSize: '12px', marginBottom: '6px', fontWeight: 600 }}>Password</label>
            <input
              name="password" value={form.password} onChange={handleChange}
              placeholder="Your password" required type="password"
              style={{ width: '100%', padding: '10px 14px', background: '#111', border: '1px solid #2a2a2a', borderRadius: '8px', color: '#fff', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>

          <button type="submit" disabled={loading}
            style={{ width: '100%', padding: '12px', background: '#534AB7', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p style={{ color: '#555', fontSize: '13px', textAlign: 'center', marginTop: '20px' }}>
          Don't have an account?{' '}
          <span onClick={onSwitch} style={{ color: '#AFA9EC', cursor: 'pointer', fontWeight: 600 }}>Register</span>
        </p>
      </div>
    </div>
  )
}

export default Login