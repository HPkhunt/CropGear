import React from 'react'
import AuthPortal from '../../components/AuthPortal.jsx'

const highlights = [
  {
    title: 'Operations visibility',
    description: 'Monitor total users, listings, and booking activity.'
  },
  {
    title: 'Verification controls',
    description: 'Manage owner approvals to protect platform quality.'
  },
  {
    title: 'Reporting workspace',
    description: 'Use built-in reports for revenue and utilization tracking.'
  }
]

export default function AdminLogin() {
  return (
    <AuthPortal
      role="admin"
      eyebrow="Admin Portal"
      title="Access platform administration"
      subtitle="Sign in with admin credentials to manage the entire system."
      image="https://images.unsplash.com/photo-1625246333195-78d9c38ad449?q=80&w=1280&auto=format&fit=crop"
      highlights={highlights}
      accent="dark"
    />
  )
}
