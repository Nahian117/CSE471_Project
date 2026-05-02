import { useEffect, useState } from 'react'
import axios from 'axios'

function AdminDashboard() {
  const [users, setUsers] = useState([])
  const [pending, setPending] = useState([])
  const [disputes, setDisputes] = useState([])
  const [reports, setReports] = useState([])
  const [analytics, setAnalytics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  const token = localStorage.getItem('token')
  const headers = { headers: { Authorization: `Bearer ${token}` } }

  const fetchData = async () => {
    setLoading(true)
    try {
      const [usersRes, pendingRes, disputesRes, analyticsRes, reportsRes] = await Promise.all([
        axios.get('http://localhost:5000/api/auth/admin/users', headers),
        axios.get('http://localhost:5000/api/auth/admin/pending-student-verifications', headers),
        axios.get('http://localhost:5000/api/disputes', headers),
        axios.get('http://localhost:5000/api/auth/admin/analytics', headers),
        axios.get('http://localhost:5000/api/reports', headers)
      ])
      setUsers(usersRes.data)
      setPending(pendingRes.data)
      setDisputes(disputesRes.data)
      setAnalytics(analyticsRes.data)
      setReports(reportsRes.data)
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

  const resolveDispute = async (disputeId, decision, notes) => {
    try {
      await axios.put(`http://localhost:5000/api/disputes/${disputeId}/resolve`, { decision, notes }, headers)
      setMessage('Dispute resolved.')
      fetchData()
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed to resolve dispute')
    }
  }

  const reviewReport = async (reportId, status, notes) => {
    try {
      await axios.put(`http://localhost:5000/api/reports/${reportId}/review`, { status, adminNotes: notes }, headers)
      setMessage(`Report marked as ${status}.`)
      fetchData()
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed to review report')
    }
  }

  const toggleSuspension = async (userId) => {
    try {
      await axios.post(`http://localhost:5000/api/auth/admin/users/${userId}/suspend`, {}, headers)
      setMessage('User suspension toggled.')
      fetchData()
    } catch (err) {
      setMessage(err.response?.data?.message || 'Toggle suspension failed')
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

      {analytics && (
        <div style={{ marginBottom: '24px', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{ background: '#111', padding: '16px', borderRadius: '12px', flex: '1', minWidth: '150px', border: '1px solid #2a2a2a' }}>
            <div style={{ color: '#888', fontSize: '13px' }}>Total Users</div>
            <div style={{ color: '#fff', fontSize: '24px', fontWeight: 'bold' }}>{analytics.totalUsers}</div>
          </div>
          <div style={{ background: '#111', padding: '16px', borderRadius: '12px', flex: '1', minWidth: '150px', border: '1px solid #2a2a2a' }}>
            <div style={{ color: '#888', fontSize: '13px' }}>Active Listings</div>
            <div style={{ color: '#fff', fontSize: '24px', fontWeight: 'bold' }}>{analytics.activeListings}</div>
          </div>
          <div style={{ background: '#111', padding: '16px', borderRadius: '12px', flex: '1', minWidth: '150px', border: '1px solid #2a2a2a' }}>
            <div style={{ color: '#888', fontSize: '13px' }}>Total Transactions</div>
            <div style={{ color: '#fff', fontSize: '24px', fontWeight: 'bold' }}>{analytics.totalTransactions}</div>
          </div>
          <div style={{ background: '#111', padding: '16px', borderRadius: '12px', flex: '1', minWidth: '150px', border: '1px solid #2a2a2a' }}>
            <div style={{ color: '#888', fontSize: '13px' }}>Fraud Reports</div>
            <div style={{ color: '#ef4444', fontSize: '24px', fontWeight: 'bold' }}>{analytics.totalFraudReports}</div>
          </div>
        </div>
      )}

      {analytics && analytics.universityWiseActivity && (
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ color: '#fff', margin: '0 0 12px', fontSize: '15px' }}>University-Wise Activity (Listings)</h3>
          <div style={{ background: '#111', padding: '16px', borderRadius: '12px', border: '1px solid #2a2a2a', display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
            {analytics.universityWiseActivity.map((uni, index) => (
              <div key={index} style={{ background: '#1a1a2a', padding: '10px 14px', borderRadius: '8px', minWidth: '120px' }}>
                <div style={{ color: '#888', fontSize: '12px' }}>{uni._id || 'Unknown'}</div>
                <div style={{ color: '#5DCAA5', fontSize: '18px', fontWeight: 'bold' }}>{uni.count}</div>
              </div>
            ))}
          </div>
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

                {/* OCR Result */}
                {user.ocrVerificationStatus && user.ocrVerificationStatus !== 'not_processed' && (
                  <div style={{ marginTop: '8px' }}>
                    <span style={{
                      padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 700,
                      background: user.ocrVerificationStatus === 'auto_verified' ? '#16a34a'
                        : user.ocrVerificationStatus === 'auto_failed' ? '#dc2626' : '#d97706',
                      color: '#fff'
                    }}>
                      {user.ocrVerificationStatus === 'auto_verified' && '✅ OCR Auto-Verified'}
                      {user.ocrVerificationStatus === 'auto_failed' && '❌ OCR Mismatch'}
                      {user.ocrVerificationStatus === 'pending_manual' && '⚠️ OCR Partial Match'}
                    </span>
                    {user.ocrConfidence > 0 && (
                      <span style={{ color: '#888', fontSize: '11px', marginLeft: '8px' }}>
                        Confidence: {user.ocrConfidence}%
                      </span>
                    )}
                  </div>
                )}

                {/* OCR Extracted Text */}
                {user.ocrExtractedText && (
                  <details style={{ marginTop: '6px' }}>
                    <summary style={{ color: '#AFA9EC', fontSize: '12px', cursor: 'pointer' }}>View OCR Extracted Text</summary>
                    <pre style={{ background: '#0a0a1a', color: '#ccc', fontSize: '11px', padding: '8px', borderRadius: '6px', marginTop: '4px', maxHeight: '120px', overflowY: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                      {user.ocrExtractedText}
                    </pre>
                  </details>
                )}

                {user.studentIdImage && (
                  <div style={{ marginTop: '8px' }}>
                    <img src={user.studentIdImage} alt="ID" style={{ height: '60px', borderRadius: '4px', cursor: 'pointer', border: '1px solid #444' }} onClick={() => window.open(user.studentIdImage, '_blank')} />
                  </div>
                )}
              </div>
              <button onClick={() => approveStudent(user._id)} style={{ background: '#5DCAA5', color: '#000', border: 'none', borderRadius: '8px', padding: '10px 14px', cursor: 'pointer' }}>
                Approve
              </button>
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginBottom: '24px' }}>
        <h3 style={{ color: '#fff', margin: '0 0 12px', fontSize: '15px' }}>Open Disputes</h3>
        {disputes.filter(d => d.status === 'open').length === 0 ? (
          <p style={{ color: '#888' }}>No open disputes.</p>
        ) : disputes.filter(d => d.status === 'open').map((dispute) => (
          <div key={dispute._id} style={{ background: '#111', padding: '14px', borderRadius: '12px', marginBottom: '12px', border: '1px solid #eab308' }}>
            <div style={{ color: '#fff', fontWeight: 700 }}>Dispute #{dispute._id}</div>
            <div style={{ color: '#888', fontSize: '13px' }}>Product: {dispute.transaction?.product?.title}</div>
            <div style={{ color: '#888', fontSize: '13px' }}>Reason: {dispute.reason}</div>
            {dispute.evidence && dispute.evidence.length > 0 && (
              <div style={{ marginTop: '10px' }}>
                <div style={{ color: '#aaa', fontSize: '12px', marginBottom: '4px' }}>Evidence:</div>
                <div style={{ display: 'flex', gap: '8px', overflowX: 'auto' }}>
                  {dispute.evidence.map((src, i) => (
                    <img key={i} src={src} alt="evidence" style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '4px', border: '1px solid #444', cursor: 'pointer' }} onClick={() => window.open(src, '_blank')} />
                  ))}
                </div>
              </div>
            )}
            <div style={{ marginTop: '10px', display: 'flex', gap: '8px' }}>
              <button onClick={() => {
                const notes = prompt("Enter notes for resolving in favor of buyer:");
                if (notes !== null) resolveDispute(dispute._id, 'favor_buyer', notes);
              }} style={{ background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '8px', padding: '8px 12px', cursor: 'pointer' }}>
                Favor Buyer
              </button>
              <button onClick={() => {
                const notes = prompt("Enter notes for resolving in favor of seller:");
                if (notes !== null) resolveDispute(dispute._id, 'favor_seller', notes);
              }} style={{ background: '#8b5cf6', color: '#fff', border: 'none', borderRadius: '8px', padding: '8px 12px', cursor: 'pointer' }}>
                Favor Seller
              </button>
              <button onClick={() => {
                const notes = prompt("Enter notes for rejecting dispute:");
                if (notes !== null) resolveDispute(dispute._id, 'rejected', notes);
              }} style={{ background: '#ef4444', color: '#fff', border: 'none', borderRadius: '8px', padding: '8px 12px', cursor: 'pointer' }}>
                Reject
              </button>
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginBottom: '24px' }}>
        <h3 style={{ color: '#fff', margin: '0 0 12px', fontSize: '15px' }}>User Reports</h3>
        {reports.filter(r => r.status === 'pending').length === 0 ? (
          <p style={{ color: '#888' }}>No pending reports.</p>
        ) : reports.filter(r => r.status === 'pending').map((report) => (
          <div key={report._id} style={{ background: '#111', padding: '14px', borderRadius: '12px', marginBottom: '12px', border: '1px solid #ef4444' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <div style={{ color: '#fff', fontWeight: 700 }}>Report against: {report.itemType}</div>
                <div style={{ color: '#888', fontSize: '13px' }}>Reason: {report.reason}</div>
                <div style={{ color: '#888', fontSize: '13px' }}>
                  Reported Item: {report.itemId?.title || report.itemId?.name || report.itemId?._id || 'Deleted'}
                </div>
                <div style={{ color: '#555', fontSize: '11px', marginTop: '4px' }}>
                  Reported by: {report.reporter?.name}
                </div>
              </div>
            </div>
            <div style={{ marginTop: '10px', display: 'flex', gap: '8px' }}>
              <button onClick={() => {
                const notes = prompt("Enter notes for reviewing this report:");
                if (notes !== null) reviewReport(report._id, 'reviewed', notes);
              }} style={{ background: '#ef4444', color: '#fff', border: 'none', borderRadius: '8px', padding: '8px 12px', cursor: 'pointer' }}>
                Mark Reviewed
              </button>
              <button onClick={() => {
                reviewReport(report._id, 'dismissed', 'Dismissed by admin');
              }} style={{ background: 'transparent', color: '#888', border: '1px solid #444', borderRadius: '8px', padding: '8px 12px', cursor: 'pointer' }}>
                Dismiss
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
                {user.role !== 'admin' && (
                  <button onClick={() => toggleSuspension(user.id)} style={{ background: user.isSuspended ? '#22c55e' : '#ef4444', color: '#fff', border: 'none', borderRadius: '8px', padding: '8px 12px', cursor: 'pointer' }}>
                    {user.isSuspended ? 'Unsuspend' : 'Suspend'}
                  </button>
                )}
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