import { useParams } from 'react-router-dom'

export default function LeadDetail() {
  const { id } = useParams()

  return (
    <div>
      <h2>Lead Detail</h2>
      <p>Lead ID: {id}</p>
    </div>
  )
}
