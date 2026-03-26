import React, { useEffect } from 'react'
import { BrowserRouter, useLocation } from 'react-router-dom'
import AppRoutes from './routes/AppRoutes.jsx'
import Navbar from './components/Navbar.jsx'
import Footer from './components/Footer.jsx'
import MessageFAB from './components/MessageFAB.jsx'
import Breadcrumbs from './components/Breadcrumbs.jsx'
import { AlertTriangle, X } from 'lucide-react'
import AuthProvider from './context/AuthContext.jsx'
import { ThemeProvider } from './context/ThemeContext.jsx'
import { ToastProvider } from './context/ToastContext.jsx'
import { NotificationProvider } from './context/NotificationContext.jsx'

function AppShell() {
  const location = useLocation()
  const path = location.pathname
  const hash = location.hash
  const [apiError, setApiError] = React.useState(null)

  let routeTheme = 'theme-default'
  if (path === '/') routeTheme = 'theme-home'
  else if (path.startsWith('/docs')) routeTheme = 'theme-docs'
  else if (path.startsWith('/farmer')) routeTheme = 'theme-farmer'
  else if (path.startsWith('/owner')) routeTheme = 'theme-owner'
  else if (path.startsWith('/admin')) routeTheme = 'theme-admin'
  else if (path.startsWith('/auth') || path.endsWith('-login')) routeTheme = 'theme-auth'
  else if (path.startsWith('/equipment') || path.startsWith('/search')) routeTheme = 'theme-market'

  useEffect(() => {
    const handleError = (e) => {
      setApiError(e.detail.message)
      // Auto dismiss after 10s if we want, but better to keep it if degraded.
    }
    window.addEventListener('api-error', handleError)
    return () => window.removeEventListener('api-error', handleError)
  }, [])

  useEffect(() => {
    if (!hash) return
    const targetId = hash.replace('#', '')
    const element = document.getElementById(targetId)
    if (!element) return
    const timer = window.setTimeout(() => {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 60)
    return () => window.clearTimeout(timer)
  }, [hash, path])


  return (
    <div id="top" className={`app-shell ${routeTheme}`}>
      {apiError && (
        <div className="global-error-banner" style={{ background: '#ef4444', color: 'white', textAlign: 'center', padding: '10px', fontSize: '14px', zIndex: 9999, position: 'relative' }}>
          <strong><AlertTriangle size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} /> {apiError}</strong>
          <button onClick={() => setApiError(null)} style={{ background: 'none', border: 'none', color: 'white', marginLeft: '15px', cursor: 'pointer', fontWeight: 'bold' }}><X size={16} /></button>
        </div>
      )}
      <Navbar />
      <div className="container">
        <Breadcrumbs />
      </div>
      <main className="app-content">
        <AppRoutes />
      </main>
      <Footer />
      <MessageFAB />
    </div>
  )
}

export default function App() {
  const baseUrl = import.meta.env.BASE_URL || '/'
  const routerBase = baseUrl === '/' ? '/' : baseUrl.replace(/\/$/, '')

  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <NotificationProvider>
            <BrowserRouter basename={routerBase} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
              <AppShell />
            </BrowserRouter>
          </NotificationProvider>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  )
}
