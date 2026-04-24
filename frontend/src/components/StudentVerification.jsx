import { useEffect, useState } from 'react'
import axios from 'axios'

function StudentVerification({ user, onUpdateUser }) {
  const [studentId, setStudentId] = useState(user.studentId || '')
  const [file, setFile] = useState(null)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState(user.studentVerificationStatus || 'none')

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
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!studentId.trim() || !file) {
      setMessage('Student ID number and file are required.')
      return
    }

    setLoading(true)
    setMessage('')

    const reader = new FileReader()
    reader.onloadend = async () => {
      try {
        const token = localStorage.getItem('token')
        const res = await axios.post(
          'http://localhost:5000/api/auth/student-id-upload',
          {
            studentId: studentId.trim(),
            studentIdImage: reader.result
          },
          { headers: { Authorization: `Bearer ${token}` } }
        )

        onUpdateUser(res.data.user)
        setStatus(res.data.user.studentVerificationStatus)
        setMessage('Student ID uploaded. Admin approval is pending.')
      } catch (err) {
        setMessage(err.response?.data?.message || 'Upload failed')
      } finally {
        setLoading(false)
      }
    }

    reader.readAsDataURL(file)
  }

  if (user.isStudentVerified && !needsRenewal) {
    return (
      <div style={{ background: '#16143a', borderRadius: '16px', border: '1px solid #2a2a2a', padding: '20px', marginTop: '16px' }}>
        <h3 style={{ margin: '0 0 10px', color: '#fff' }}>Verified Student</h3>
        <p style={{ color: '#AFA9EC', margin: 0 }}>Your student ID has been approved by admin.</p>
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
      <h3 style={{ margin: '0 0 10px', color: '#fff' }}>Student ID Verification</h3>
      <p style={{ color: '#888', margin: '0 0 16px' }}>
        Upload your student ID for admin approval to receive the Verified Student badge.
      </p>

      {status === 'pending' && (
        <div style={{ color: '#AFA9EC', marginBottom: '16px' }}>
          Your student ID is pending admin approval.
        </div>
      )}

      {(status === 'renewal-required' || isExpired) && (
        <div style={{ color: '#FAC775', marginBottom: '16px', fontSize: '13px' }}>
          {status === 'renewal-required'
            ? 'Your student verification needs renewal before you can keep the badge.'
            : `Your verification expired on ${expiryDate?.toLocaleDateString()}. Please renew.`}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '14px' }}>
          <label style={{ display: 'block', color: '#888', fontSize: '12px', marginBottom: '6px', fontWeight: 600 }}>Student ID Number</label>
          <input
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            placeholder="Enter ID number"
            required
            style={{ width: '100%', padding: '10px 14px', background: '#111', border: '1px solid #2a2a2a', borderRadius: '8px', color: '#fff', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
          />
        </div>

        <div style={{ marginBottom: '18px' }}>
          <label style={{ display: 'block', color: '#888', fontSize: '12px', marginBottom: '6px', fontWeight: 600 }}>Upload Student ID Image</label>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            style={{ width: '100%', color: '#fff' }}
          />
        </div>

        <button type="submit" disabled={loading}
          style={{ width: '100%', padding: '12px', background: '#534AB7', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}>
          {loading ? 'Uploading...' : 'Upload Student ID'}
        </button>
      </form>

      {message && (
        <div style={{ marginTop: '16px', color: '#AFA9EC', fontSize: '13px' }}>
          {message}
        </div>
      )}
    </div>
  )
}

export default StudentVerification