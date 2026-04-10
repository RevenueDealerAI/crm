import { useState } from 'react'
import { Menu } from 'lucide-react'
import Sidebar from './Sidebar'
import NotificationBell from '../NotificationBell'
import styles from './Layout.module.css'

export default function Layout({ title, children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className={styles.layout}>
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className={styles.main}>
        <header className={styles.topbar}>
          <div className={styles.topbarLeft}>
            <button
              className={styles.menuBtn}
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={20} />
            </button>
            {title && <h1 className={styles.pageTitle}>{title}</h1>}
          </div>
          <div className={styles.topbarRight}>
            <NotificationBell />
          </div>
        </header>
        <main className={styles.content}>{children}</main>
      </div>
    </div>
  )
}
