import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, CheckCheck, UserPlus, RefreshCw, BarChart3 } from 'lucide-react'
import { useNotifications } from '../context/NotificationContext'
import NotificationBadge from './ui/NotificationBadge'
import styles from './NotificationBell.module.css'

const TYPE_ICONS = {
  lead_assigned: UserPlus,
  status_change: RefreshCw,
  follow_up_reminder: Bell,
  daily_summary: BarChart3,
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export default function NotificationBell() {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications()
  const [open, setOpen] = useState(false)
  const dropdownRef = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (!open) return

    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  function handleNotificationClick(notification) {
    if (!notification.is_read) {
      markAsRead(notification.id)
    }
    if (notification.lead_id) {
      navigate(`/leads/${notification.lead_id}`)
      setOpen(false)
    }
  }

  return (
    <div className={styles.wrapper} ref={dropdownRef}>
      <button
        className={styles.bellBtn}
        onClick={() => setOpen((prev) => !prev)}
        aria-label="Notifications"
      >
        <NotificationBadge count={unreadCount}>
          <Bell size={20} />
        </NotificationBadge>
      </button>

      {open && (
        <div className={styles.dropdown}>
          <div className={styles.dropdownHeader}>
            <span className={styles.dropdownTitle}>Notifications</span>
            {unreadCount > 0 && (
              <button
                className={styles.markAllBtn}
                onClick={() => markAllAsRead()}
              >
                <CheckCheck size={14} /> Mark all read
              </button>
            )}
          </div>

          <div className={styles.list}>
            {notifications.length === 0 ? (
              <div className={styles.empty}>No notifications</div>
            ) : (
              notifications.map((n) => {
                const Icon = TYPE_ICONS[n.type] || Bell
                return (
                  <button
                    key={n.id}
                    className={`${styles.item} ${!n.is_read ? styles.unread : ''}`}
                    onClick={() => handleNotificationClick(n)}
                  >
                    <div className={styles.itemIcon}>
                      <Icon size={16} />
                    </div>
                    <div className={styles.itemContent}>
                      <span className={styles.itemTitle}>{n.title}</span>
                      <span className={styles.itemMessage}>{n.message}</span>
                      <span className={styles.itemTime}>{timeAgo(n.created_at)}</span>
                    </div>
                    {!n.is_read && (
                      <div className={styles.unreadDot} />
                    )}
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
