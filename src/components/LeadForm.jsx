import { useState } from 'react'
import Input from './ui/Input'
import Select from './ui/Select'
import Button from './ui/Button'
import styles from './LeadForm.module.css'

const EMPTY_FORM = {
  customer_name: '',
  phone: '',
  phone_secondary: '',
  vehicle_year: '',
  vehicle_make: '',
  vehicle_model: '',
  part_needed: '',
  part_detail: '',
  notes: '',
  follow_up_date: '',
  price_quoted: '',
  mileage: '',
  warranty_info: '',
  status: 'new',
}

export default function LeadForm({ initial, onSubmit, onCancel, loading }) {
  const [form, setForm] = useState(() => {
    if (!initial) return { ...EMPTY_FORM }
    return {
      customer_name: initial.customer_name || '',
      phone: initial.phone || '',
      phone_secondary: initial.phone_secondary || '',
      vehicle_year: initial.vehicle_year ? String(initial.vehicle_year) : '',
      vehicle_make: initial.vehicle_make || '',
      vehicle_model: initial.vehicle_model || '',
      part_needed: initial.part_needed || '',
      part_detail: initial.part_detail || '',
      notes: initial.notes || '',
      follow_up_date: initial.follow_up_date || '',
      price_quoted: initial.price_quoted ? String(initial.price_quoted) : '',
      mileage: initial.mileage || '',
      warranty_info: initial.warranty_info || '',
      status: initial.status || 'new',
    }
  })
  const [errors, setErrors] = useState({})

  function set(field) {
    return (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }))
  }

  function validate() {
    const errs = {}
    if (!form.phone.trim()) errs.phone = 'Phone is required'
    if (form.vehicle_year && (!/^\d{4}$/.test(form.vehicle_year))) {
      errs.vehicle_year = 'Must be 4-digit year'
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!validate()) return

    const payload = {
      customer_name: form.customer_name.trim() || null,
      phone: form.phone.trim(),
      phone_secondary: form.phone_secondary.trim() || null,
      vehicle_year: form.vehicle_year ? parseInt(form.vehicle_year, 10) : null,
      vehicle_make: form.vehicle_make.trim() || null,
      vehicle_model: form.vehicle_model.trim() || null,
      part_needed: form.part_needed.trim() || null,
      part_detail: form.part_detail.trim() || null,
      notes: form.notes.trim() || null,
      follow_up_date: form.follow_up_date || null,
      price_quoted: form.price_quoted ? parseFloat(form.price_quoted) : null,
      mileage: form.mileage.trim() || null,
      warranty_info: form.warranty_info.trim() || null,
      status: form.status,
    }

    onSubmit(payload)
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <Input
        label="Customer Name"
        name="customer_name"
        value={form.customer_name}
        onChange={set('customer_name')}
        placeholder="John Doe"
      />
      <div className={styles.row}>
        <Input
          label="Phone *"
          name="phone"
          value={form.phone}
          onChange={set('phone')}
          error={errors.phone}
          placeholder="15551234567"
        />
        <Input
          label="Secondary Phone"
          name="phone_secondary"
          value={form.phone_secondary}
          onChange={set('phone_secondary')}
        />
      </div>
      <div className={styles.row3}>
        <Input
          label="Vehicle Year"
          name="vehicle_year"
          value={form.vehicle_year}
          onChange={set('vehicle_year')}
          error={errors.vehicle_year}
          placeholder="2015"
        />
        <Input
          label="Make"
          name="vehicle_make"
          value={form.vehicle_make}
          onChange={set('vehicle_make')}
          placeholder="Ford"
        />
        <Input
          label="Model"
          name="vehicle_model"
          value={form.vehicle_model}
          onChange={set('vehicle_model')}
          placeholder="F-150"
        />
      </div>
      <div className={styles.row}>
        <Input
          label="Part Needed"
          name="part_needed"
          value={form.part_needed}
          onChange={set('part_needed')}
          placeholder="Engine"
        />
        <Input
          label="Part Detail"
          name="part_detail"
          value={form.part_detail}
          onChange={set('part_detail')}
          placeholder="5.0L V8"
        />
      </div>
      <div className={styles.row}>
        <Input
          label="Price Quoted"
          name="price_quoted"
          type="number"
          step="0.01"
          value={form.price_quoted}
          onChange={set('price_quoted')}
          placeholder="0.00"
        />
        <Input
          label="Follow-up Date"
          name="follow_up_date"
          type="date"
          value={form.follow_up_date}
          onChange={set('follow_up_date')}
        />
      </div>
      <div className={styles.row}>
        <Input
          label="Mileage"
          name="mileage"
          value={form.mileage}
          onChange={set('mileage')}
        />
        <Input
          label="Warranty Info"
          name="warranty_info"
          value={form.warranty_info}
          onChange={set('warranty_info')}
        />
      </div>
      {initial && (
        <Select
          label="Status"
          name="status"
          value={form.status}
          onChange={set('status')}
        >
          <option value="new">New</option>
          <option value="contacted">Contacted</option>
          <option value="quoted">Quoted</option>
          <option value="negotiating">Negotiating</option>
          <option value="won">Won</option>
          <option value="lost">Lost</option>
          <option value="dead">Dead</option>
        </Select>
      )}
      <Input
        label="Notes"
        name="notes"
        value={form.notes}
        onChange={set('notes')}
        placeholder="Additional notes..."
      />
      <div className={styles.actions}>
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" loading={loading}>
          {initial ? 'Save Changes' : 'Create Lead'}
        </Button>
      </div>
    </form>
  )
}
