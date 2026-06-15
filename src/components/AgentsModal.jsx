import { useState, useEffect, useCallback } from 'react'
import { UserPlus, AlertCircle, CheckCircle2 } from 'lucide-react'
import Modal from './ui/Modal'
import Button from './ui/Button'
import Input from './ui/Input'
import Select from './ui/Select'
import Spinner from './ui/Spinner'
import { listAllAgents, createAgent, setAgentActive } from '../lib/agents'
import styles from './AgentsModal.module.css'

export default function AgentsModal({ open, onClose, onChanged }) {
  const [agents, setAgents] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busyId, setBusyId] = useState(null)

  const [form, setForm] = useState({ fullName: '', email: '', password: '', role: 'rep' })
  const [adding, setAdding] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setAgents(await listAllAgents())
    } catch (err) {
      setError(err.message || 'Failed to load agents')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (open) {
      load()
      setNotice('')
      setForm({ fullName: '', email: '', password: '', role: 'rep' })
    }
  }, [open, load])

  async function handleToggle(agent) {
    setBusyId(agent.id)
    setError('')
    setNotice('')
    try {
      await setAgentActive(agent.id, !agent.is_active)
      setNotice(`${agent.full_name} ${agent.is_active ? 'deactivated' : 'reactivated'}.`)
      await load()
      onChanged?.()
    } catch (err) {
      setError(err.message || 'Update failed')
    } finally {
      setBusyId(null)
    }
  }

  async function handleAdd(e) {
    e.preventDefault()
    setAdding(true)
    setError('')
    setNotice('')
    try {
      await createAgent(form)
      setNotice(`Agent "${form.fullName}" created.`)
      setForm({ fullName: '', email: '', password: '', role: 'rep' })
      await load()
      onChanged?.()
    } catch (err) {
      setError(err.message || 'Could not create agent')
    } finally {
      setAdding(false)
    }
  }

  const setField = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  return (
    <Modal open={open} onClose={onClose} title="Manage Agents" maxWidth={640}
      footer={<Button variant="secondary" onClick={onClose}>Close</Button>}>
      {error && <div className={styles.errorBox}><AlertCircle size={16} /> {error}</div>}
      {notice && <div className={styles.noticeBox}><CheckCircle2 size={16} /> {notice}</div>}

      <form className={styles.addForm} onSubmit={handleAdd}>
        <div className={styles.formTitle}><UserPlus size={16} /> Add new agent</div>
        <div className={styles.formGrid}>
          <Input label="Full name" value={form.fullName} onChange={setField('fullName')} required />
          <Input label="Email" type="email" value={form.email} onChange={setField('email')} required />
          <Input label="Temporary password" type="text" value={form.password}
            onChange={setField('password')} helper="Min 8 characters" required />
          <Select label="Role" value={form.role} onChange={setField('role')}>
            <option value="rep">Sales rep</option>
            <option value="manager">Manager</option>
          </Select>
        </div>
        <Button type="submit" size="sm" loading={adding}>Create agent</Button>
      </form>

      <div className={styles.listTitle}>Current agents</div>
      {loading ? (
        <Spinner size={24} />
      ) : (
        <div className={styles.list}>
          {agents.map((a) => (
            <div key={a.id} className={`${styles.row} ${a.is_active ? '' : styles.inactiveRow}`}>
              <div className={styles.info}>
                <span className={styles.name}>{a.full_name}</span>
                <span className={styles.role}>{a.role}</span>
                {!a.is_active && <span className={styles.inactiveTag}>inactive</span>}
              </div>
              <Button
                size="sm"
                variant={a.is_active ? 'danger' : 'secondary'}
                loading={busyId === a.id}
                onClick={() => handleToggle(a)}
              >
                {a.is_active ? 'Deactivate' : 'Reactivate'}
              </Button>
            </div>
          ))}
        </div>
      )}
    </Modal>
  )
}
