import React, { useEffect } from 'react'
import { BrowserRouter, useLocation } from 'react-router-dom'
import { TriangleAlert, X } from 'lucide-react'
import AppRoutes from './routes/AppRoutes.jsx'
import Navbar from './components/Navbar.jsx'
import Footer from './components/Footer.jsx'
import FloatingChatButton from './components/FloatingChatButton.jsx'
import { Toaster } from '@/components/ui/sonner'
import AuthProvider from './context/AuthContext.jsx'
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
        <div className="relative z-[9999] border-b border-red-500/70 bg-red-600 text-white">
          <div className="container flex items-center justify-between gap-3 py-3 text-sm">
            <strong className="inline-flex items-center gap-2 font-semibold">
              <TriangleAlert size={16} strokeWidth={2.2} aria-hidden="true" />
              <span>{apiError}</span>
            </strong>
            <button
              onClick={() => setApiError(null)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/25 bg-white/10 text-white transition hover:bg-white/20"
              aria-label="Dismiss API error"
            >
              <X size={16} strokeWidth={2.5} />
            </button>
          </div>
        </div>
      )}
      <Navbar />
      <main className="app-content">
        <AppRoutes />
      </main>
      <Footer />
      <FloatingChatButton />
    </div>
  )
}

export default function App() {
  const baseUrl = import.meta.env.BASE_URL || '/'
  const routerBase = baseUrl === '/' ? '/' : baseUrl.replace(/\/$/, '')

  return (
    <AuthProvider>
      <NotificationProvider>
        <BrowserRouter basename={routerBase} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <AppShell />
          <Toaster />
        </BrowserRouter>
      </NotificationProvider>
    </AuthProvider>
  )
}
