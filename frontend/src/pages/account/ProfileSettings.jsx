import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import PageHero from '../../components/PageHero.jsx'
import SmartImage from '../../components/SmartImage.jsx'
import DashboardShell from '../../components/DashboardShell.jsx'
import useAuth from '../../hooks/useAuth.js'
import useToast from '@/hooks/useToast'
import { userService } from '../../services/userService.js'
import { getDashboardLinksForRole } from '../../utils/dashboardLinks.js'
import { getErrorMessage } from '../../utils/helpers.js'

const DEFAULT_KYC_FORM = {
  business_name: '',
  business_type: '',
  operating_region: '',
  government_id_last4: '',
  tax_id_reference: '',
  contact_address: '',
  document_urls: ''
}

export default function ProfileSettings() {
  const { user, refreshUser } = useAuth()
  const [profileForm, setProfileForm] = useState({
    full_name: '',
    email: '',
    phone_number: '',
    avatar_url: ''
  })
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  })
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [kycForm, setKycForm] = useState(DEFAULT_KYC_FORM)
  const [kycStatus, setKycStatus] = useState('not_started')
  const [kycReviewNotes, setKycReviewNotes] = useState('')
  const [loadingKyc, setLoadingKyc] = useState(false)
  const [savingKyc, setSavingKyc] = useState(false)
  const { addToast } = useToast()
  const isOwner = user?.role === 'equipment_owner'

  useEffect(() => {
    setProfileForm({
      full_name: user?.full_name || '',
      email: user?.email || '',
      phone_number: user?.phone_number || '',
      avatar_url: user?.avatar_url || ''
    })
  }, [user])

  useEffect(() => {
    if (!isOwner) {
      setKycForm(DEFAULT_KYC_FORM)
      setKycStatus('not_started')
      setKycReviewNotes('')
      return
    }

    let ignore = false
    const fetchKyc = async () => {
      setLoadingKyc(true)
      try {
        const data = await userService.getKyc()
        if (ignore) return
        const profile = data?.profile || {}
        setKycForm({
          business_name: profile.business_name || '',
          business_type: profile.business_type || '',
          operating_region: profile.operating_region || '',
          government_id_last4: profile.government_id_last4 || '',
          tax_id_reference: profile.tax_id_reference || '',
          contact_address: profile.contact_address || '',
          document_urls: Array.isArray(profile.document_urls) ? profile.document_urls.join(', ') : ''
        })
        setKycStatus(data?.status || 'not_started')
        setKycReviewNotes(data?.review_notes || '')
      } catch (error) {
        if (!ignore) {
          addToast(getErrorMessage(error, 'Unable to load KYC details right now.'), 'error')
        }
      } finally {
        if (!ignore) setLoadingKyc(false)
      }
    }

    fetchKyc()
    return () => {
      ignore = true
    }
  }, [addToast, isOwner])

  const links = useMemo(() => getDashboardLinksForRole(user?.role), [user?.role])
  const stats = [
    { value: user?.role ? user.role.replace('_', ' ') : 'member', label: 'Current role' },
    { value: user?.approval_status || 'approved', label: 'Approval status' },
    { value: user?.is_verified ? 'Verified' : 'Standard', label: 'Trust level' }
  ]
  const shellTitle = user?.role === 'admin' ? 'Admin Control' : user?.role === 'equipment_owner' ? 'Owner Panel' : 'Farmer Panel'
  const shellSubtitle = user?.role === 'admin' ? 'Account controls' : user?.role === 'equipment_owner' ? 'Business identity' : 'Account controls'
  const initials = String(user?.full_name || 'CG')
    .split(' ')
    .map((part) => part[0] || '')
    .join('')
    .slice(0, 2)
    .toUpperCase()

  const handleProfileSubmit = async (event) => {
    event.preventDefault()
    setSavingProfile(true)

    try {
      await userService.updateMe(profileForm)
      await refreshUser()
      addToast('Profile details updated successfully.', 'success')
    } catch (error) {
      addToast(getErrorMessage(error, 'Unable to update your profile right now.'), 'error')
    } finally {
      setSavingProfile(false)
    }
  }

  const handlePasswordSubmit = async (event) => {
    event.preventDefault()
    setSavingPassword(true)

    try {
      if (!passwordForm.current_password || !passwordForm.new_password) {
        throw new Error('Enter both your current password and a new password.')
      }
      if (passwordForm.new_password !== passwordForm.confirm_password) {
        throw new Error('New password and confirmation do not match.')
      }

      await userService.changePassword({
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password
      })
      setPasswordForm({
        current_password: '',
        new_password: '',
        confirm_password: ''
      })
      addToast('Password updated successfully.', 'success')
    } catch (error) {
      addToast(getErrorMessage(error, error.message || 'Unable to change your password right now.'), 'error')
    } finally {
      setSavingPassword(false)
    }
  }

  const handleKycSubmit = async (event) => {
    event.preventDefault()
    setSavingKyc(true)

    try {
      const saved = await userService.saveKyc({
        business_name: kycForm.business_name,
        business_type: kycForm.business_type,
        operating_region: kycForm.operating_region,
        government_id_last4: kycForm.government_id_last4,
        tax_id_reference: kycForm.tax_id_reference,
        contact_address: kycForm.contact_address,
        document_urls: kycForm.document_urls.split(',').map((item) => item.trim()).filter(Boolean)
      })
      setKycStatus(saved?.status || 'pending')
      setKycReviewNotes(saved?.review_notes || '')
      addToast('KYC details submitted for admin review.', 'success')
    } catch (error) {
      addToast(getErrorMessage(error, 'Unable to submit KYC details right now.'), 'error')
    } finally {
      setSavingKyc(false)
    }
  }

  return (
    <div className="container page-wrap">
      <DashboardShell title={shellTitle} subtitle={shellSubtitle} links={links}>
        <PageHero
          eyebrow="Account Settings"
          title="Keep your profile accurate and secure"
          subtitle="Update the identity details other users see, then refresh your credentials from one workspace."
          className="portal-primary"
          stats={stats}
          aside={
            <div className="profile-settings-hero">
              {profileForm.avatar_url ? (
                <SmartImage
                  src={profileForm.avatar_url}
                  fallbackSrc="/hero.svg"
                  alt={user?.full_name || 'Profile'}
                  className="profile-settings-avatar"
                />
              ) : (
                <div className="profile-settings-avatar profile-settings-avatar-fallback" aria-hidden="true">
                  <span>{initials}</span>
                </div>
              )}
              <div className="hero-floating-card">
                <div className="card-mini-stat">
                  <span>{user?.email || 'your@email.com'}</span>
                  <small>Public account identity</small>
                </div>
              </div>
            </div>
          }
          actions={
            <div className="button-row">
              <Link className="button secondary pill" to={links[0]?.to || '/'}>Back to workspace</Link>
            </div>
          }
        />



        <section className="page-split">
          <div className="page-main form-shell">
            <section className="card form-section">
              <div className="form-section-head">
                <div>
                  <p className="review-section-eyebrow">Profile</p>
                  <h3>Identity details</h3>
                </div>
                <p className="subtitle">These fields shape how bookings and messages identify you.</p>
              </div>

              <form className="form-grid two-col" onSubmit={handleProfileSubmit}>
                <label className="form-stack">
                  <span>Full name</span>
                  <input
                    value={profileForm.full_name}
                    onChange={(event) => setProfileForm((current) => ({ ...current, full_name: event.target.value }))}
                    placeholder="Your full name"
                    required
                  />
                </label>

                <label className="form-stack">
                  <span>Email address</span>
                  <input
                    type="email"
                    value={profileForm.email}
                    onChange={(event) => setProfileForm((current) => ({ ...current, email: event.target.value }))}
                    placeholder="you@example.com"
                    required
                  />
                </label>

                <label className="form-stack">
                  <span>Phone number</span>
                  <input
                    value={profileForm.phone_number}
                    onChange={(event) => setProfileForm((current) => ({ ...current, phone_number: event.target.value }))}
                    placeholder="+1 555 123 4567"
                  />
                </label>

                <label className="form-stack">
                  <span>Avatar URL</span>
                  <input
                    value={profileForm.avatar_url}
                    onChange={(event) => setProfileForm((current) => ({ ...current, avatar_url: event.target.value }))}
                    placeholder="https://..."
                  />
                </label>

                <div className="form-actions-row profile-settings-actions">
                  <button type="submit" className="button gradient pill" disabled={savingProfile}>
                    {savingProfile ? 'Saving profile...' : 'Save profile'}
                  </button>
                </div>
              </form>
            </section>

            <section className="card form-section">
              <div className="form-section-head">
                <div>
                  <p className="review-section-eyebrow">Security</p>
                  <h3>Change password</h3>
                </div>
                <p className="subtitle">Use a strong password with uppercase, lowercase, number, and special character.</p>
              </div>

              <form className="form-grid" onSubmit={handlePasswordSubmit}>
                <label className="form-stack">
                  <span>Current password</span>
                  <input
                    type="password"
                    value={passwordForm.current_password}
                    onChange={(event) => setPasswordForm((current) => ({ ...current, current_password: event.target.value }))}
                    placeholder="Current password"
                    required
                  />
                </label>

                <label className="form-stack">
                  <span>New password</span>
                  <input
                    type="password"
                    value={passwordForm.new_password}
                    onChange={(event) => setPasswordForm((current) => ({ ...current, new_password: event.target.value }))}
                    placeholder="New strong password"
                    required
                  />
                </label>

                <label className="form-stack">
                  <span>Confirm new password</span>
                  <input
                    type="password"
                    value={passwordForm.confirm_password}
                    onChange={(event) => setPasswordForm((current) => ({ ...current, confirm_password: event.target.value }))}
                    placeholder="Repeat new password"
                    required
                  />
                </label>

                <div className="form-actions-row">
                  <button type="submit" className="button secondary pill" disabled={savingPassword}>
                    {savingPassword ? 'Updating password...' : 'Update password'}
                  </button>
                </div>
              </form>
            </section>

            {isOwner && (
              <section className="card form-section">
                <div className="form-section-head">
                  <div>
                    <p className="review-section-eyebrow">Verification</p>
                    <h3>KYC and business details</h3>
                  </div>
                  <p className="subtitle">Submit the business information admins need before owner listings can be fully trusted and approved.</p>
                </div>

                <form className="form-grid two-col" onSubmit={handleKycSubmit}>
                  <label className="form-stack">
                    <span>Business name</span>
                    <input
                      value={kycForm.business_name}
                      onChange={(event) => setKycForm((current) => ({ ...current, business_name: event.target.value }))}
                      placeholder="CropGear Operations LLC"
                      required
                    />
                  </label>

                  <label className="form-stack">
                    <span>Business type</span>
                    <input
                      value={kycForm.business_type}
                      onChange={(event) => setKycForm((current) => ({ ...current, business_type: event.target.value }))}
                      placeholder="Equipment rental business"
                      required
                    />
                  </label>

                  <label className="form-stack">
                    <span>Operating region</span>
                    <input
                      value={kycForm.operating_region}
                      onChange={(event) => setKycForm((current) => ({ ...current, operating_region: event.target.value }))}
                      placeholder="Iowa and Nebraska"
                      required
                    />
                  </label>

                  <label className="form-stack">
                    <span>Government ID last 4</span>
                    <input
                      value={kycForm.government_id_last4}
                      onChange={(event) => setKycForm((current) => ({ ...current, government_id_last4: event.target.value.replace(/\D/g, '').slice(0, 4) }))}
                      placeholder="1234"
                      inputMode="numeric"
                      required
                    />
                  </label>

                  <label className="form-stack">
                    <span>Tax reference</span>
                    <input
                      value={kycForm.tax_id_reference}
                      onChange={(event) => setKycForm((current) => ({ ...current, tax_id_reference: event.target.value }))}
                      placeholder="EIN or tax reference"
                    />
                  </label>

                  <label className="form-stack">
                    <span>Document links</span>
                    <input
                      value={kycForm.document_urls}
                      onChange={(event) => setKycForm((current) => ({ ...current, document_urls: event.target.value }))}
                      placeholder="https://doc-1, https://doc-2"
                    />
                  </label>

                  <label className="form-stack" style={{ gridColumn: '1 / -1' }}>
                    <span>Contact address</span>
                    <textarea
                      value={kycForm.contact_address}
                      onChange={(event) => setKycForm((current) => ({ ...current, contact_address: event.target.value }))}
                      rows={3}
                      placeholder="Business mailing address"
                      required
                    />
                  </label>

                  <div className="form-actions-row">
                    <button type="submit" className="button secondary pill" disabled={savingKyc || loadingKyc}>
                      {savingKyc ? 'Submitting KYC...' : 'Submit KYC Details'}
                    </button>
                  </div>
                </form>
              </section>
            )}
          </div>

          <aside className="page-side">
            <section className="card">
              <h3>Account visibility</h3>
              <ul className="feature-list">
                <li><strong>{user?.full_name || 'User'}</strong><span>Display name across listings, requests, and messages</span></li>
                <li><strong>{user?.email || 'Not set'}</strong><span>Primary login and contact email</span></li>
                <li><strong>{user?.phone_number || 'Optional'}</strong><span>Support and coordination contact</span></li>
              </ul>
            </section>

            <section className="card">
              <h3>Next actions</h3>
              <div className="button-row">
                <Link className="button sm outline" to={links[0]?.to || '/'}>Return to dashboard</Link>
                <Link className="button sm secondary" to="/farmer/equipments">Browse listings</Link>
              </div>
            </section>

            {isOwner && (
              <section className="card">
                <h3>KYC status</h3>
                <div className="panel-list-premium">
                  <div className="insight-stat-row">
                    <div className="stat-info-wrap">
                      <strong>{kycStatus.replace('_', ' ')}</strong>
                      <span>Current verification state</span>
                    </div>
                  </div>
                  {kycReviewNotes ? (
                    <div className="insight-stat-row">
                      <div className="stat-info-wrap">
                        <strong>Admin notes</strong>
                        <span>{kycReviewNotes}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="insight-stat-row">
                      <div className="stat-info-wrap">
                        <strong>No review notes yet</strong>
                        <span>Submit your KYC packet to move this account toward trusted owner status.</span>
                      </div>
                    </div>
                  )}
                </div>
              </section>
            )}
          </aside>
        </section>
      </DashboardShell>
    </div>
  )
}
