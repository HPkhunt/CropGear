import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import PageHero from '../components/PageHero.jsx'
import useAuth from '../hooks/useAuth.js'
import { useToast } from '../context/ToastContext.jsx'
import { Save, User, Lock, Mail, Upload } from 'lucide-react'

export default function Profile() {
  const { user, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const { addToast } = useToast()

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [saving, setSaving] = useState(false)
  
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login')
    } else if (user) {
      setFormData(prev => ({
        ...prev,
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || ''
      }))
    }
  }, [user, isAuthenticated, navigate])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleProfileSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      // NOTE: Profile update endpoint is not implemented on backend yet (Todo 1.9)
      // await userService.updateProfile({ name: formData.name, phone: formData.phone })
      
      // Simulating network delay
      await new Promise(resolve => setTimeout(resolve, 800))
      
      addToast('Profile update endpoint coming soon (Backend Todo 1.9)', 'info')
    } catch (err) {
      addToast('Failed to update profile', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handlePasswordSubmit = async (e) => {
    e.preventDefault()
    if (formData.newPassword !== formData.confirmPassword) {
      addToast('New passwords do not match', 'error')
      return
    }
    
    setSaving(true)
    try {
      // NOTE: Password change endpoint is not implemented on backend yet (Todo 1.11)
      await new Promise(resolve => setTimeout(resolve, 800))
      addToast('Password change endpoint coming soon (Backend Todo 1.11)', 'info')
    } catch (err) {
      addToast('Failed to change password', 'error')
    } finally {
      setSaving(false)
    }
  }

  if (!user) return null

  return (
    <div className="container page-wrap">
      <PageHero
        eyebrow="Account Settings"
        title="Your Profile"
        subtitle="Manage your personal information and account security."
        className="portal-primary"
      />

      <section className="page-split" style={{ marginTop: '2rem' }}>
        <div className="page-main">
          <div className="card" style={{ marginBottom: '2rem' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.5rem' }}>
              <User size={20} /> Personal Information
            </h3>
            
            <form onSubmit={handleProfileSubmit}>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Full Name</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="review-input"
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)' }}
                />
              </div>
              
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Email Address</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  disabled
                  className="review-input"
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--muted-bg, #f3f4f6)', color: 'var(--muted)' }}
                />
                <small style={{ color: 'var(--muted)', display: 'block', marginTop: '4px' }}>Email cannot be changed.</small>
              </div>
              
              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Phone Number</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="review-input"
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)' }}
                />
              </div>
              
              <button type="submit" className="button primary pill" disabled={saving}>
                {saving ? 'Saving...' : <><Save size={16} /> Save Changes</>}
              </button>
            </form>
          </div>

          <div className="card">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.5rem' }}>
              <Lock size={20} /> Change Password
            </h3>
            
            <form onSubmit={handlePasswordSubmit}>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Current Password</label>
                <input
                  type="password"
                  name="currentPassword"
                  value={formData.currentPassword}
                  onChange={handleChange}
                  required
                  className="review-input"
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)' }}
                />
              </div>
              
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>New Password</label>
                <input
                  type="password"
                  name="newPassword"
                  value={formData.newPassword}
                  onChange={handleChange}
                  required
                  className="review-input"
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)' }}
                />
              </div>
              
              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Confirm New Password</label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  className="review-input"
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)' }}
                />
              </div>
              
              <button type="submit" className="button outline pill" disabled={saving}>
                {saving ? 'Updating...' : <><Lock size={16} /> Update Password</>}
              </button>
            </form>
          </div>
        </div>

        <aside className="page-side">
          <div className="card" style={{ textAlign: 'center' }}>
            <div style={{
              width: '100px', height: '100px', borderRadius: '50%', backgroundColor: 'var(--primary)', color: 'white',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem', fontWeight: 'bold',
              margin: '0 auto 1.5rem'
            }}>
              {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <h3>{user.name}</h3>
            <p className="subtitle" style={{ textTransform: 'capitalize' }}>{user.role?.replace('_', ' ')}</p>
            
            <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)', textAlign: 'left' }}>
              <p style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.5rem', color: 'var(--muted)' }}>
                <Mail size={16} /> {user.email}
              </p>
              <p style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--muted)' }}>
                <User size={16} /> Member since {new Date().getFullYear()}
              </p>
            </div>
          </div>
        </aside>
      </section>
    </div>
  )
}
