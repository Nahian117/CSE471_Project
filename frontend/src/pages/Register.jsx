import { useState } from 'react'
import axios from 'axios'

function Register({ onSwitch, onLogin }) {
  const [form, setForm] = useState({ name: '', email: '', password: '', studentType: 'buyer' })
  const [otp, setOtp] = useState('')
  const [generatedOtp, setGeneratedOtp] = useState('') // OTP from backend for dev testing
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState('register') // 'register' or 'verify'

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
    setError('')
  }

  const handleOtpChange = (e) => {
    setOtp(e.target.value)
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await axios.post('http://localhost:5000/api/auth/register', form)
      if (res.data.otp) setGeneratedOtp(res.data.otp) // Show OTP for dev/testing
      setStep('verify')
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed')
    }
    setLoading(false)
  }

  const handleVerify = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await axios.post('http://localhost:5000/api/auth/verify-otp', { email: form.email, otp })
      localStorage.setItem('token', res.data.token)
      localStorage.setItem('user', JSON.stringify(res.data.user))
      onLogin(res.data.user)
    } catch (err) {
      setError(err.response?.data?.message || 'OTP verification failed')
    }
    setLoading(false)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0f0f0f', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Segoe UI', sans-serif" }}>
      <div style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '16px', padding: '36px', width: '100%', maxWidth: '400px' }}>
        
        <h2 style={{ color: '#fff', margin: '0 0 4px', fontSize: '22px', fontWeight: 700 }}>
          {step === 'register' ? 'Create account' : 'Verify Email'}
        </h2>
        <p style={{ color: '#555', fontSize: '13px', margin: '0 0 24px' }}>
          {step === 'register' ? 'BRACU Second-Hand Marketplace' : `Enter the 4-digit OTP sent to ${form.email}`}
        </p>

        {/* Dev OTP hint box — shows OTP from backend response */}
        {step === 'verify' && generatedOtp && (
          <div style={{ background: '#0a1a0a', border: '1px solid #16a34a', borderRadius: '10px', padding: '12px 16px', marginBottom: '16px', textAlign: 'center' }}>
            <div style={{ color: '#888', fontSize: '11px', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '1px' }}>Your OTP (Dev Mode)</div>
            <div style={{ color: '#4ade80', fontSize: '28px', fontWeight: 900, letterSpacing: '8px' }}>{generatedOtp}</div>
          </div>
        )}

        {error && (
          <div style={{ background: '#1a0a0a', border: '1px solid #A32D2D', borderRadius: '8px', padding: '10px 14px', color: '#F09595', fontSize: '13px', marginBottom: '16px' }}>
            {error}
          </div>
        )}

        {step === 'register' ? (
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', color: '#888', fontSize: '12px', marginBottom: '6px', fontWeight: 600 }}>Full Name</label>
              <input
                name="name" value={form.name} onChange={handleChange}
                placeholder="Your full name" required
                style={{ width: '100%', padding: '10px 14px', background: '#111', border: '1px solid #2a2a2a', borderRadius: '8px', color: '#fff', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>

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

            <div style={{ marginBottom: '14px' }}>
              <p style={{ color: '#888', fontSize: '12px', marginBottom: '8px', fontWeight: 600 }}>I am a</p>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginRight: '14px', color: '#ccc', fontSize: '13px' }}>
                <input type="radio" name="studentType" value="buyer" checked={form.studentType === 'buyer'} onChange={handleChange} />
                Buyer
              </label>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#ccc', fontSize: '13px' }}>
                <input type="radio" name="studentType" value="seller" checked={form.studentType === 'seller'} onChange={handleChange} />
                Seller
              </label>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', color: '#888', fontSize: '12px', marginBottom: '6px', fontWeight: 600 }}>Password</label>
              <input
                name="password" value={form.password} onChange={handleChange}
                placeholder="Min 6 characters" required type="password"
                style={{ width: '100%', padding: '10px 14px', background: '#111', border: '1px solid #2a2a2a', borderRadius: '8px', color: '#fff', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>

            <button type="submit" disabled={loading}
              style={{ width: '100%', padding: '12px', background: '#534AB7', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}>
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerify}>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', color: '#888', fontSize: '12px', marginBottom: '6px', fontWeight: 600 }}>OTP</label>
              <input
                value={otp} onChange={handleOtpChange}
                placeholder="Enter 4-digit OTP" required
                style={{ width: '100%', padding: '10px 14px', background: '#111', border: '1px solid #2a2a2a', borderRadius: '8px', color: '#fff', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>

            <button type="submit" disabled={loading}
              style={{ width: '100%', padding: '12px', background: '#534AB7', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}>
              {loading ? 'Verifying...' : 'Verify OTP'}
            </button>
          </form>
        )}

        <p style={{ color: '#555', fontSize: '13px', textAlign: 'center', marginTop: '20px' }}>
          {step === 'register' ? (
            <>
              Already have an account?{' '}
              <span onClick={onSwitch} style={{ color: '#AFA9EC', cursor: 'pointer', fontWeight: 600 }}>Sign in</span>
            </>
          ) : (
            <>
              Didn't receive OTP?{' '}
              <span onClick={() => setStep('register')} style={{ color: '#AFA9EC', cursor: 'pointer', fontWeight: 600 }}>Resend</span>
            </>
          )}
        </p>
      </div>
    </div>
  )
}

export default Register