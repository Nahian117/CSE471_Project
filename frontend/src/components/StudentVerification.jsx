import { useEffect, useState } from 'react'
import axios from 'axios'

const OCR_STATUS_UI = {
  auto_verified: { color: '#16a34a', icon: '✅', label: 'Auto-Verified by OCR' },
  auto_failed:   { color: '#dc2626', icon: '❌', label: 'OCR Mismatch — Sent for Manual Review' },
  pending_manual:{ color: '#d97706', icon: '⚠️', label: 'Partial Match — Admin Will Review' },
}

function StudentVerification({ user, onUpdateUser }) {
  const [studentId, setStudentId] = useState(user.studentId || '')
  const [file, setFile] = useState(null)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState(user.studentVerificationStatus || 'none')
  const [ocrResult, setOcrResult] = useState(null) // { ocrStatus, ocrConfidence }

  const expiryDate = user.studentVerificationExpiry ? new Date(user.studentVerificationExpiry) : null
  const isExpired = expiryDate ? expiryDate < new Date() : false
  const needsRenewal = status === 'renewal-required' || isExpired

  useEffect(() => {
    setStatus(user.studentVerificationStatus || 'none')
    setStudentId(user.studentId || '')
  }, [user.studentVerificationStatus, user.studentId])

  const handleFileChange = (e) => {
    setFile(e.target.files[0] || null)
    setMessage('')
    setOcrResult(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!studentId.trim() || !file) {
      setMessage('Student ID number and file are required.')
      return
    }

    setLoading(true)
    setMessage('')
    setOcrResult(null)

    const submitData = new FormData()
    submitData.append('studentId', studentId.trim())
    submitData.append('studentIdImage', file)

    try {
      const token = localStorage.getItem('token')
      const res = await axios.post(
        'http://localhost:5000/api/auth/student-id-upload',
        submitData,
        { headers: { Authorization: `Bearer ${token}` } }
      )

      onUpdateUser(res.data.user)
      setStatus(res.data.user.studentVerificationStatus)
      setMessage(res.data.message)

      if (res.data.ocrStatus) {
        setOcrResult({ ocrStatus: res.data.ocrStatus, ocrConfidence: res.data.ocrConfidence })
      }
    } catch (err) {
      console.error('Upload error:', err.response?.data || err.message);
      setMessage(err.response?.data?.message || err.message || 'Upload failed. Check the browser console for details.')
    } finally {
      setLoading(false)
    }
  }

  if (user.isStudentVerified && !needsRenewal) {
    return (
      <div style={{ background: '#16143a', borderRadius: '16px', border: '1px solid #2a2a2a', padding: '20px', marginTop: '16px' }}>
        <h3 style={{ margin: '0 0 10px', color: '#fff' }}>✅ Verified Student</h3>
        <p style={{ color: '#AFA9EC', margin: 0 }}>Your student ID has been verified.</p>
        {expiryDate && (
          <p style={{ color: '#888', margin: '12px 0 0', fontSize: '13px' }}>
            Badge expires on {expiryDate.toLocaleDateString()}.
          </p>
        )}
      </div>
    )
  }

  return (
    <div style={{ background: '#16143a', borderRadius: '16px', border: '1px solid #2a2a2a', padding: '20px', marginTop: '16px' }}>
      <h3 style={{ margin: '0 0 10px', color: '#fff' }}>🎓 Student ID Verification</h3>
      <p style={{ color: '#888', margin: '0 0 16px', fontSize: '13px' }}>
        Upload your student ID. Our AI will attempt to auto-verify it instantly using OCR.
        If it cannot be confirmed automatically, an admin will review it.
      </p>

      {status === 'pending' && !ocrResult && (
        <div style={{ color: '#AFA9EC', marginBottom: '16px', fontSize: '13px', background: '#111', padding: '10px 14px', borderRadius: '8px' }}>
          ⏳ Your student ID is pending review.
        </div>
      )}

      {(status === 'renewal-required' || isExpired) && (
        <div style={{ color: '#FAC775', marginBottom: '16px', fontSize: '13px', background: '#1a1000', padding: '10px 14px', borderRadius: '8px' }}>
          {status === 'renewal-required'
            ? '🔄 Your student verification needs renewal.'
            : `⌛ Your verification expired on ${expiryDate?.toLocaleDateString()}. Please renew.`}
        </div>
      )}

      {/* OCR Result Banner */}
      {ocrResult && OCR_STATUS_UI[ocrResult.ocrStatus] && (
        <div style={{
          marginBottom: '16px', padding: '12px 16px', borderRadius: '10px',
          background: OCR_STATUS_UI[ocrResult.ocrStatus].color + '22',
          border: `1px solid ${OCR_STATUS_UI[ocrResult.ocrStatus].color}`,
          display: 'flex', alignItems: 'center', gap: '10px'
        }}>
          <span style={{ fontSize: '20px' }}>{OCR_STATUS_UI[ocrResult.ocrStatus].icon}</span>
          <div>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: '13px' }}>
              {OCR_STATUS_UI[ocrResult.ocrStatus].label}
            </div>
            {ocrResult.ocrConfidence > 0 && (
              <div style={{ color: '#aaa', fontSize: '12px', marginTop: '2px' }}>
                Confidence: {ocrResult.ocrConfidence}%
                <div style={{ marginTop: '6px', height: '6px', background: '#333', borderRadius: '3px', width: '160px' }}>
                  <div style={{
                    height: '100%', borderRadius: '3px',
                    width: `${ocrResult.ocrConfidence}%`,
                    background: OCR_STATUS_UI[ocrResult.ocrStatus].color,
                    transition: 'width 0.5s ease'
                  }} />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '14px' }}>
          <label style={{ display: 'block', color: '#888', fontSize: '12px', marginBottom: '6px', fontWeight: 600 }}>
            Student ID Number
          </label>
          <input
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            placeholder="Enter your student ID (e.g. 22101234)"
            required
            style={{ width: '100%', padding: '10px 14px', background: '#111', border: '1px solid #2a2a2a', borderRadius: '8px', color: '#fff', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
          />
        </div>

        <div style={{ marginBottom: '18px' }}>
          <label style={{ display: 'block', color: '#888', fontSize: '12px', marginBottom: '6px', fontWeight: 600 }}>
            Upload Student ID Image
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            style={{ width: '100%', color: '#fff' }}
          />
          <p style={{ color: '#555', fontSize: '11px', margin: '6px 0 0' }}>
            Make sure the image clearly shows your name and student ID number.
          </p>
        </div>

        <button type="submit" disabled={loading}
          style={{ width: '100%', padding: '12px', background: loading ? '#333' : '#534AB7', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '14px', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', transition: 'background 0.2s' }}>
          {loading ? '🔍 Uploading & Running OCR...' : '🚀 Upload & Verify'}
        </button>
      </form>

      {message && !ocrResult && (
        <div style={{ marginTop: '16px', color: '#AFA9EC', fontSize: '13px', background: '#111', padding: '10px 14px', borderRadius: '8px' }}>
          {message}
        </div>
      )}
    </div>
  )
}

export default StudentVerification