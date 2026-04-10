import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Users, BarChart3, LogOut } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import styles from './Sidebar.module.css'

export default function Sidebar({ open, onClose }) {
  const { profile, signOut } = useAuth()

  const links = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/leads', label: 'Leads', icon: Users },
  ]

  if (profile?.role === 'manager') {
    links.push({ to: '/manager', label: 'Manager', icon: BarChart3 })
  }

  return (
    <>
      {open && <div className={styles.overlay} onClick={onClose} />}
      <aside className={`${styles.sidebar} ${open ? styles.sidebarOpen : ''}`}>
        <div className={styles.logo}>LeadFlow</div>
        <nav className={styles.nav}>
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `${styles.link} ${isActive ? styles.active : ''}`
              }
              onClick={onClose}
            >
              <link.icon size={20} />
              {link.label}
            </NavLink>
          ))}
        </nav>
        <div className={styles.userSection}>
          <div className={styles.userName}>{profile?.full_name}</div>
          <div className={styles.userRole}>{profile?.role}</div>
          <button className={styles.signOutBtn} onClick={signOut}>
            <LogOut size={16} />
            Sign Out
          </button>
        </div>
      </aside>
    </>
  )
}
