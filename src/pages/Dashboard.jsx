import { useAuth } from '../context/AuthContext'

export default function Dashboard() {
  const { profile } = useAuth()

  return (
    <div>
      <h2>Dashboard</h2>
      <p>Welcome, {profile?.full_name || 'User'}. Role: {profile?.role || 'loading...'}</p>
    </div>
  )
}
