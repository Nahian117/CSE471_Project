import { useEffect, useState } from 'react'
import axios from 'axios'

function AdminDashboard() {
  const [users, setUsers] = useState([])
  const [pending, setPending] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  const token = localStorage.getItem('token')
  const headers = { headers: { Authorization: `Bearer ${token}` } }

  const fetchData = async () => {
    setLoading(true)
    try {
      const [usersRes, pendingRes] = await Promise.all([
        axios.get('http://localhost:5000/api/auth/admin/users', headers),
        axios.get('http://localhost:5000/api/auth/admin/pending-student-verifications', headers)
      ])
      setUsers(usersRes.data)
      setPending(pendingRes.data)
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed to load admin data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const updateRole = async (userId, role) => {
    try {
      await axios.post(`http://localhost:5000/api/auth/admin/users/${userId}/role`, { role }, headers)
      setMessage('User role updated.')
      fetchData()
    } catch (err) {
      setMessage(err.response?.data?.message || 'Role update failed')
    }
  }

  const approveStudent = async (userId) => {
    try {
      await axios.post(`http://localhost:5000/api/auth/admin/approve-student/${userId}`, {}, headers)
      setMessage('Student verification approved.')
      fetchData()
    } catch (err) {
      setMessage(err.response?.data?.message || 'Approval failed')
    }
  }

  if (loading) {
    return (
      <div style={{ background: '#16143a', borderRadius: '16px', border: '1px solid #2a2a2a', padding: '20px', marginTop: '16px', color: '#888' }}>
        Loading admin dashboard...
      </div>
    )
  }

  return (
    <div style={{ background: '#16143a', borderRadius: '16px', border: '1px solid #2a2a2a', padding: '20px', marginTop: '16px' }}>
      <h2 style={{ marginTop: 0, color: '#fff' }}>Admin Dashboard</h2>
      <p style={{ color: '#AFA9EC', margin: '6px 0 18px' }}>Manage user roles and approve pending student verifications.</p>

      {message && (
        <div style={{ background: '#111', padding: '12px', borderRadius: '10px', color: '#AFA9EC', marginBottom: '18px' }}>
          {message}
        </div>
      )}

      <div style={{ marginBottom: '24px' }}>
        <h3 style={{ color: '#fff', margin: '0 0 12px', fontSize: '15px' }}>Pending Student Approvals</h3>
        {pending.length === 0 ? (
          <p style={{ color: '#888' }}>No pending verification requests.</p>
        ) : pending.map((user) => (
          <div key={user._id} style={{ background: '#111', padding: '14px', borderRadius: '12px', marginBottom: '12px', border: '1px solid #2a2a2a' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ color: '#fff', fontWeight: 700 }}>{user.name}</div>
                <div style={{ color: '#888', fontSize: '13px' }}>{user.email}</div>
                <div style={{ color: '#aaa', fontSize: '12px' }}>Student ID: {user.studentId || 'N/A'}</div>
              </div>
              <button onClick={() => approveStudent(user._id)} style={{ background: '#5DCAA5', color: '#000', border: 'none', borderRadius: '8px', padding: '10px 14px', cursor: 'pointer' }}>
                Approve
              </button>
            </div>
          </div>
        ))}
      </div>

      <div>
        <h3 style={{ color: '#fff', margin: '0 0 12px', fontSize: '15px' }}>All Users</h3>
        {users.length === 0 ? (
          <p style={{ color: '#888' }}>No users found.</p>
        ) : users.map((user) => (
          <div key={user.id} style={{ background: '#111', padding: '14px', borderRadius: '12px', marginBottom: '12px', border: '1px solid #2a2a2a' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <div style={{ color: '#fff', fontWeight: 700 }}>{user.name}</div>
                <div style={{ color: '#888', fontSize: '13px' }}>{user.email}</div>
                <div style={{ color: '#aaa', fontSize: '12px' }}>Role: {user.role} · Type: {user.studentType}</div>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                <select value={user.role} onChange={(e) => updateRole(user.id, e.target.value)} style={{ padding: '8px 10px', borderRadius: '8px', background: '#111', color: '#fff', border: '1px solid #2a2a2a' }}>
                  <option value="student">Student</option>
                  <option value="moderator">Moderator</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default AdminDashboard