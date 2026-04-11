import React from 'react'
import AuthPortal from '../../components/AuthPortal.jsx'

const highlights = [
  {
    title: 'Inventory controls',
    description: 'Manage all machine listings and pricing in one place.'
  },
  {
    title: 'Request workflow',
    description: 'Approve or reject farmer requests with instant status updates.'
  },
  {
    title: 'Performance insight',
    description: 'Track listing quality and booking conversion trends.'
  }
]

export default function OwnerLogin() {
  return (
    <AuthPortal
      role="equipment_owner"
      eyebrow="Owner Portal"
      title="Access your equipment owner workspace"
      subtitle="Sign in to manage inventory and booking requests."
      image="https://images.unsplash.com/photo-1500382017468-9049fed747ef?q=80&w=1280&auto=format&fit=crop"
      highlights={highlights}
      accent="secondary"
    />
  )
}
