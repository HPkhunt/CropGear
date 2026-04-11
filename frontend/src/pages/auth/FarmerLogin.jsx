import React from 'react'
import AuthPortal from '../../components/AuthPortal.jsx'

const highlights = [
  {
    title: 'Field-ready search',
    description: 'Find nearby machines by cost, category, and availability.'
  },
  {
    title: 'Booking visibility',
    description: 'Track booking lifecycle from request to completion.'
  },
  {
    title: 'Reliable records',
    description: 'Track your rentals with transparent status and amount data.'
  }
]

export default function FarmerLogin() {
  return (
    <AuthPortal
      role="farmer"
      eyebrow="Farmer Portal"
      title="Access your farmer workspace"
      subtitle="Sign in to explore equipment and manage bookings."
      image="https://images.unsplash.com/photo-1560493676-04071c5f467b?q=80&w=1280&auto=format&fit=crop"
      highlights={highlights}
      accent="primary"
    />
  )
}
