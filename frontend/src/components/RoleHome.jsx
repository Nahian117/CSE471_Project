import { useEffect, useState } from 'react'
import axios from 'axios'

function RoleHome({ user }) {
  const [homeData, setHomeData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchHome = async () => {
      try {
        const token = localStorage.getItem('token')

        const res = await axios.get(
          `${process.env.REACT_APP_API_URL}/api/auth/home`,
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        )

        setHomeData(res.data.home)
      } catch (err) {
        setError(
          err.response?.data?.message ||
            'Unable to load home page content'
        )
      } finally {
        setLoading(false)
      }
    }

    fetchHome()
  }, [user])

  if (loading) {
    return (
      <div
        style={{
          background: '#16143a',
          borderRadius: '16px',
          border: '1px solid #2a2a2a',
          padding: '20px',
          marginTop: '16px',
          color: '#888'
        }}
      >
        Loading your dashboard...
      </div>
    )
  }

  if (error) {
    return (
      <div
        style={{
          background: '#16143a',
          borderRadius: '16px',
          border: '1px solid #2a2a2a',
          padding: '20px',
          marginTop: '16px',
          color: '#F09595'
        }}
      >
        {error}
      </div>
    )
  }

  return (
    <div
      style={{
        background: '#16143a',
        borderRadius: '16px',
        border: '1px solid '#2a2a2a',
        padding: '20px',
        marginTop: '16px'
      }}
    >
      <h2
        style={{
          margin: '0 0 8px',
          color: '#fff'
        }}
      >
        {homeData.title}
      </h2>

      <p
        style={{
          margin: 0,
          color: '#AFA9EC'
        }}
      >
        {homeData.message}
      </p>
    </div>
  )
}

export default RoleHome
