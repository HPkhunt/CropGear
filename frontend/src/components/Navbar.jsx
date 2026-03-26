import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import Modal from './Modal.jsx'
import NotificationBell from './NotificationBell.jsx'
import UserAvatar from './UserAvatar.jsx'
import { Sun, Moon, LogOut, Search } from 'lucide-react'
import useAuth from '../hooks/useAuth.js'
import { useTheme } from '../context/ThemeContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import logo from '../assets/logo.svg'

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const { addToast } = useToast()
  const location = useLocation()
  const navigate = useNavigate()
  const [isOpen, setIsOpen] = useState(false)
  const [q, setQ] = useState('')
  const [logoBroken, setLogoBroken] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const profileRef = useRef(null)
  const isHome = location.pathname === '/'
  const isAuthPage = location.pathname.includes('/auth') || location.pathname.includes('-login')

  const navLinks = useMemo(() => {
    const links = [{ to: '/', label: 'Home', isHome: true }]

    if (user?.role === 'farmer') {
      links.push({ to: '/farmer/equipments', label: 'Browse Equipment' })
    } else if (!isAuthenticated) {
      links.push({ to: '/browse-equipment', label: 'Browse Equipment' })
    }

    if (user?.role === 'farmer') {
      links.push({ to: '/farmer/bookings', label: 'My Bookings' })
    }
    if (user?.role === 'equipment_owner') {
      links.push({ to: '/browse-equipment', label: 'Browse Equipment' })
      links.push({ to: '/owner/dashboard', label: 'Owner Dashboard' })
      links.push({ to: '/owner/add-equipment', label: 'Add Equipment' })
      links.push({ to: '/owner/requests', label: 'Requests' })
    }
    if (user?.role === 'admin') {
      links.push({ to: '/admin/dashboard', label: 'Dashboard' })
      links.push({ to: '/admin/equipment', label: 'Equipment' })
      links.push({ to: '/admin/reports', label: 'Reports' })
    }

    return links
  }, [isAuthenticated, user?.role])

  const isActiveLink = (link) => {
    if (link.isHome) return location.pathname === '/' && !location.hash
    if (link.hash) return location.pathname === '/' && location.hash === link.hash
    return location.pathname === link.to
  }

  const onSearch = (event) => {
    event.preventDefault()
    const term = q.trim()
    if (!term) return
    navigate(`/search?q=${encodeURIComponent(term)}`)
    setIsOpen(false)
  }

  const handleLogoutClick = () => {
    setProfileOpen(false)
    setShowLogoutConfirm(true)
  }

  const onLogout = () => {
    setShowLogoutConfirm(false)
    setIsOpen(false)
    logout()
    addToast('You have been successfully logged out.', 'info')
    navigate('/auth/login')
  }

  useEffect(() => {
    const onClickOutside = (event) => {
      if (!profileRef.current) return
      if (!profileRef.current.contains(event.target)) {
        setProfileOpen(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  const dashboardPath = user?.role === 'admin'
    ? '/admin/dashboard'
    : user?.role === 'equipment_owner'
      ? '/owner/dashboard'
      : '/farmer/dashboard'

  return (
    <nav className="nav">
      <div className="container nav-inner nav-premium">
        <Link to="/" className="brand" onClick={() => setIsOpen(false)}>
          {logoBroken ? (
            <span className="brand-badge" aria-hidden="true">CG</span>
          ) : (
            <img src={logo} alt="CropGear" width={36} height={36} onError={() => setLogoBroken(true)} />
          )}
          <span>CropGear</span>
        </Link>

        {!isHome && (
          <form className="nav-search" onSubmit={onSearch}>
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search tractors, harvesters, seeders..."
            />
            <button type="submit" className="button sm accent"><Search size={16} /></button>
          </form>
        )}

        <button className="nav-toggle" onClick={() => setIsOpen((v) => !v)} type="button" aria-label="Toggle navigation">
          <span />
          <span />
          <span />
        </button>

        <div className={`nav-links ${isOpen ? 'open' : ''}`}>
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              onClick={() => setIsOpen(false)}
              className={isActiveLink(link) ? 'active' : ''}
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className={`nav-actions ${isOpen ? 'open' : ''}`}>
          <button
            type="button"
            onClick={toggleTheme}
            className="button sm outline pill theme-toggle-btn"
            aria-label="Toggle Theme"
            style={{ padding: '6px 10px', fontSize: '1rem', marginRight: '4px' }}
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          {isAuthenticated ? (
            <>
              <NotificationBell />
              <div className="profile-wrap" ref={profileRef}>
                <button
                  type="button"
                  className="profile-trigger-avatar"
                  onClick={() => setProfileOpen((v) => !v)}
                  aria-haspopup="menu"
                  aria-expanded={profileOpen}
                >
                  <UserAvatar name={user?.full_name} size={32} />
                </button>
                {profileOpen && (
                  <div className="profile-menu" role="menu">
                    <div className="profile-menu-header">
                      <UserAvatar name={user?.full_name} size={40} />
                      <div>
                        <p className="profile-name">{user?.full_name || 'User'}</p>
                        <p className="profile-role">{(user?.role || 'member').replace('_', ' ')}</p>
                      </div>
                    </div>
                    <div className="profile-menu-links">
                      <Link to={dashboardPath} onClick={() => { setProfileOpen(false); setIsOpen(false) }}>Dashboard</Link>
                      <Link to="/farmer/bookings" onClick={() => { setProfileOpen(false); setIsOpen(false) }}>My Bookings</Link>
                      <Link to="/messages" onClick={() => { setProfileOpen(false); setIsOpen(false) }}>Messages</Link>
                    </div>
                    <div className="profile-menu-footer">
                      <button type="button" onClick={handleLogoutClick}>Logout</button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : !isAuthPage && (
            <>
              <Link to="/auth/login" className="button pill sm gradient" onClick={() => setIsOpen(false)}>Login</Link>
              <Link to="/auth/register" className="button pill sm accent" onClick={() => setIsOpen(false)}>Register</Link>
            </>
          )}
        </div>
      </div>
      <Modal
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        title="Confirm Logout"
        size="sm"
        footer={(
          <>
            <button className="button outline pill sm" onClick={() => setShowLogoutConfirm(false)}>Cancel</button>
            <button className="button accent pill sm" onClick={onLogout}>Logout</button>
          </>
        )}
      >
        <div className="logout-confirm-content">
          <div className="logout-icon-wrapper">
            <LogOut size={28} />
          </div>
          <h4 className="logout-confirm-title">Are you sure?</h4>
          <p className="logout-confirm-text">You will need to login again to access your account.</p>
        </div>
      </Modal>
    </nav>
  )
}
