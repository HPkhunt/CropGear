import React, { useMemo, useState, useEffect } from 'react'
import { BarChart3, ChartLine, TrendingUp } from 'lucide-react'
import { Link } from 'react-router-dom'
import PageHero from '../../components/PageHero.jsx'
import { adminService } from '../../services/adminService.js'
import DashboardShell from '../../components/DashboardShell.jsx'
import SmartImage from '../../components/SmartImage.jsx'
import { adminDashboardLinks } from '../../utils/dashboardLinks.js'

function exportReportCsv(report, period) {
  const rows = [
    ['Metric', 'Value'],
    ['Period', period],
    ['Revenue', report.revenue],
    ['Utilization', report.utilization],
    ['AverageRating', report.average_rating],
    ...report.daily_bookings.map((value, index) => [`Day_${index + 1}`, value])
  ]

  const csv = rows.map((row) => row.map((col) => `"${String(col)}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `cropgear-report-${period}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export default function Reports() {
  const [period, setPeriod] = useState('30d')
  const [loading, setLoading] = useState(false)
  const [report, setReport] = useState({
    revenue: 0,
    utilization: 0,
    average_rating: 0,
    daily_bookings: []
  })

  useEffect(() => {
    const fetchReport = async () => {
      setLoading(true)
      try {
        const data = await adminService.reports(period)
        setReport(data)
      } finally {
        setLoading(false)
      }
    }
    fetchReport()
  }, [period])

  const normalizedDaily = useMemo(() => {
    const source = report.daily_bookings || []
    const maxValue = Math.max(...source, 1)
    return source.map((value) => Math.max(8, Math.round((Number(value || 0) / maxValue) * 100)))
  }, [report.daily_bookings])
  const totalBookings = useMemo(
    () => (report.daily_bookings || []).reduce((sum, value) => sum + Number(value || 0), 0),
    [report.daily_bookings]
  )
  const avgBookings = useMemo(() => {
    const days = report.daily_bookings?.length || 0
    if (!days) return 0
    return Math.round(totalBookings / days)
  }, [report.daily_bookings, totalBookings])
  const peakBookings = useMemo(() => {
    const source = report.daily_bookings || []
    if (!source.length) return 0
    return Math.max(...source.map((value) => Number(value || 0)))
  }, [report.daily_bookings])
  const stats = [
    { value: `$${Number(report.revenue || 0).toLocaleString()}`, label: `Revenue (${period})` },
    { value: `${Number(report.utilization || 0)}%`, label: 'Utilization' },
    { value: Number(report.average_rating || 0), label: 'Average rating' }
  ]
  if (loading) return (
    <div className="container page-wrap">
      <section className="skeleton-wrap card">
        <div className="skeleton-line lg" />
        <div className="skeleton-line md" />
      </section>
      <section className="skeleton-grid table">
        {Array.from({ length: 4 }).map((_, idx) => (
          <article key={idx} className="card skeleton-card">
            <div className="skeleton-line md" />
            <div className="skeleton-line sm" />
            <div className="skeleton-line sm" />
          </article>
        ))}
      </section>
    </div>
  )

  return (
    <div className="container page-wrap">
      <DashboardShell title="Admin Control" subtitle="Reporting suite" links={adminDashboardLinks}>
        <PageHero
          eyebrow="Reports"
          title="Commercial and operations analytics"
          subtitle="Switch period views and export CSV for finance or ops review."
          className="portal-admin"
          stats={stats}
          aside={
            <SmartImage
              src="https://images.unsplash.com/photo-1625246333195-78d9c38ad449?q=80&w=1280&auto=format&fit=crop"
              fallbackSrc="/hero.svg"
              alt="Reporting analytics"
              className="page-hero-media"
            />
          }
          actions={
            <select value={period} onChange={(e) => setPeriod(e.target.value)} className="report-period">
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
            </select>
          }
        />

        <section className="page-split">
          <div className="page-main">
            <section className="card">
              <h3>Daily booking trend</h3>
              <div className="chart-bars">
                {normalizedDaily.map((height, index) => (
                  <div key={index} style={{ height: `${height}%` }} />
                ))}
              </div>
              <div className="button-row">
                <Link to="/admin/dashboard" className="button sm outline pill hover-lift">Back to Dashboard</Link>
              </div>
            </section>
          </div>

          <aside className="page-side">
            <section className="card">
              <h3>Report Insights</h3>
              <div className="panel-list-premium">
                <div className="insight-stat-row">
                  <div className="stat-icon-wrap">
                    <BarChart3 size={18} strokeWidth={2.1} aria-hidden="true" />
                  </div>
                  <div className="stat-info-wrap">
                    <strong>{totalBookings}</strong>
                    <span>Total bookings</span>
                  </div>
                </div>
                <div className="insight-stat-row">
                  <div className="stat-icon-wrap">
                    <ChartLine size={18} strokeWidth={2.1} aria-hidden="true" />
                  </div>
                  <div className="stat-info-wrap">
                    <strong>{avgBookings}</strong>
                    <span>Average per day</span>
                  </div>
                </div>
                <div className="insight-stat-row">
                  <div className="stat-icon-wrap">
                    <TrendingUp size={18} strokeWidth={2.1} aria-hidden="true" />
                  </div>
                  <div className="stat-info-wrap">
                    <strong>{peakBookings}</strong>
                    <span>Peak day volume</span>
                  </div>
                </div>
              </div>
              <p className="panel-note">Use export snapshots for finance or compliance reviews.</p>
            </section>

            <section className="card">
              <h3>Export Notes</h3>
              <ul className="feature-list">
                <li><span>CSV includes daily booking totals and KPI values.</span></li>
                <li><span>Switch time windows to compare seasonality.</span></li>
                <li><span>Store exports in secured admin storage.</span></li>
              </ul>
              <div className="button-row">
                <button className="button sm accent pill hover-lift" onClick={() => exportReportCsv(report, period)}>Export CSV</button>
              </div>
            </section>
          </aside>
        </section>
      </DashboardShell>
    </div>
  )
}
