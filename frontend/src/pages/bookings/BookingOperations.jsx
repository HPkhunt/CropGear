import React, { useEffect, useMemo, useState } from 'react'
import { Clock3, MapPinned, Radar, Wrench } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import DashboardShell from '../../components/DashboardShell.jsx'
import PageHero from '../../components/PageHero.jsx'
import PageSkeleton from '../../components/PageSkeleton.jsx'
import useAuth from '../../hooks/useAuth.js'
import useToast from '@/hooks/useToast'
import { bookingService } from '../../services/bookingService.js'
import { getDashboardLinksForRole } from '../../utils/dashboardLinks.js'
import { formatCurrency, getErrorMessage } from '../../utils/helpers.js'
import {
  formatBookingStatusLabel,
  getBookingStatusClass,
  normalizeBookingStatus
} from '../../utils/bookings.js'

const DEFAULT_TRACKING_FORM = {
  label: '',
  status: 'en_route',
  latitude: '',
  longitude: '',
  etaLabel: '',
  note: ''
}

const DEFAULT_TICKET_FORM = {
  title: '',
  issueType: 'mechanical',
  priority: 'medium',
  description: ''
}

const TRACKING_STATUS_OPTIONS = [
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'en_route', label: 'En route' },
  { value: 'arrived', label: 'Arrived' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' }
]

const TICKET_TYPE_OPTIONS = [
  { value: 'delivery', label: 'Delivery' },
  { value: 'mechanical', label: 'Mechanical' },
  { value: 'operator', label: 'Operator' },
  { value: 'payment', label: 'Payment' },
  { value: 'safety', label: 'Safety' },
  { value: 'other', label: 'Other' }
]

const TICKET_PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' }
]

function formatDateTime(value) {
  if (!value) return 'TBD'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return String(value)
  return parsed.toLocaleString()
}

function formatCoordinate(value) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return '--'
  return numeric.toFixed(4)
}

function getShellLinks(role) {
  return getDashboardLinksForRole(role)
}

function getShellTitle(role) {
  if (role === 'equipment_owner') return 'Owner Panel'
  if (role === 'admin') return 'Admin Control'
  return 'Farmer Panel'
}

function getShellSubtitle(role) {
  if (role === 'equipment_owner') return 'Field operations'
  if (role === 'admin') return 'Booking operations'
  return 'Rental operations'
}

function getHeroClass(role) {
  if (role === 'equipment_owner') return 'portal-secondary'
  if (role === 'admin') return 'portal-admin'
  return 'portal-primary'
}

function getBookingListPath(role) {
  if (role === 'equipment_owner') return '/owner/requests'
  if (role === 'admin') return '/admin/bookings'
  return '/farmer/bookings'
}

function getTrackingTone(status) {
  if (status === 'completed') return 'status-success'
  if (status === 'active' || status === 'arrived') return 'status-info'
  return 'status-pending'
}

function getTicketTone(status) {
  if (status === 'resolved') return 'status-success'
  if (status === 'in_progress') return 'status-info'
  return 'status-pending'
}

function getPriorityTone(priority) {
  if (priority === 'critical') return 'status-error'
  if (priority === 'high') return 'status-pending'
  return 'status-info'
}

function buildMapPoints(updates = []) {
  const validUpdates = updates.filter((update) => (
    Number.isFinite(Number(update?.latitude)) && Number.isFinite(Number(update?.longitude))
  ))

  if (!validUpdates.length) return []
  if (validUpdates.length === 1) {
    return [{ ...validUpdates[0], left: '50%', top: '50%' }]
  }

  const latitudes = validUpdates.map((update) => Number(update.latitude))
  const longitudes = validUpdates.map((update) => Number(update.longitude))
  const minLat = Math.min(...latitudes)
  const maxLat = Math.max(...latitudes)
  const minLng = Math.min(...longitudes)
  const maxLng = Math.max(...longitudes)
  const latRange = maxLat - minLat || 0.02
  const lngRange = maxLng - minLng || 0.02

  return validUpdates.map((update) => ({
    ...update,
    left: `${12 + ((Number(update.longitude) - minLng) / lngRange) * 76}%`,
    top: `${12 + (1 - ((Number(update.latitude) - minLat) / latRange)) * 76}%`
  }))
}

export default function BookingOperations() {
  const { id } = useParams()
  const { user } = useAuth()
  const role = user?.role || 'farmer'
  const isOwnerLike = role === 'equipment_owner' || role === 'admin'
  const [booking, setBooking] = useState(null)
  const [tracking, setTracking] = useState({ updates: [], current_update: null })
  const [serviceTickets, setServiceTickets] = useState([])
  const [trackingForm, setTrackingForm] = useState(DEFAULT_TRACKING_FORM)
  const [ticketForm, setTicketForm] = useState(DEFAULT_TICKET_FORM)
  const [ticketNotes, setTicketNotes] = useState({})
  const [selectedTrackingId, setSelectedTrackingId] = useState('')
  const [loading, setLoading] = useState(true)
  const [trackingSaving, setTrackingSaving] = useState(false)
  const [ticketSaving, setTicketSaving] = useState(false)
  const [ticketUpdatingId, setTicketUpdatingId] = useState('')
  const [, setActionError] = useState('')
  const { addToast } = useToast()

  const shellLinks = useMemo(() => getShellLinks(role), [role])
  const shellTitle = getShellTitle(role)
  const shellSubtitle = getShellSubtitle(role)
  const heroClass = getHeroClass(role)
  const bookingListPath = getBookingListPath(role)

  useEffect(() => {
    let ignore = false

    const loadData = async () => {
      setLoading(true)
      setActionError('')

      const [bookingResult, trackingResult, ticketsResult] = await Promise.allSettled([
        bookingService.get(id),
        bookingService.getTracking(id),
        bookingService.getServiceTickets(id)
      ])

      if (ignore) return

      setBooking(bookingResult.status === 'fulfilled' ? bookingResult.value || null : null)
      setTracking(
        trackingResult.status === 'fulfilled'
          ? {
              updates: Array.isArray(trackingResult.value?.updates) ? trackingResult.value.updates : [],
              current_update: trackingResult.value?.current_update || null
            }
          : { updates: [], current_update: null }
      )
      setServiceTickets(
        ticketsResult.status === 'fulfilled' && Array.isArray(ticketsResult.value?.tickets)
          ? ticketsResult.value.tickets
          : []
      )

      const failures = [bookingResult, trackingResult, ticketsResult].filter((result) => result.status === 'rejected')
      if (failures.length) {
        setActionError(getErrorMessage(failures[0].reason, 'Unable to load booking operations right now.'))
      }

      setLoading(false)
    }

    loadData()
    return () => {
      ignore = true
    }
  }, [id])

  const updates = useMemo(() => (Array.isArray(tracking?.updates) ? tracking.updates : []), [tracking?.updates])
  const currentUpdate = tracking?.current_update || null
  const defaultSelectedTrackingId = currentUpdate?.id || updates[updates.length - 1]?.id || ''

  useEffect(() => {
    if (!defaultSelectedTrackingId) {
      setSelectedTrackingId('')
      return
    }

    setSelectedTrackingId((value) => (
      value && updates.some((update) => update.id === value) ? value : defaultSelectedTrackingId
    ))
  }, [defaultSelectedTrackingId, updates])

  const bookingStatus = normalizeBookingStatus(booking?.booking_status)
  const selectedTrackingUpdate = useMemo(
    () => updates.find((update) => update.id === selectedTrackingId) || currentUpdate || updates[updates.length - 1] || null,
    [currentUpdate, selectedTrackingId, updates]
  )
  const mapPoints = useMemo(() => buildMapPoints(updates), [updates])
  const sortedTickets = useMemo(
    () => [...serviceTickets].sort((left, right) => new Date(right?.created_at || 0).getTime() - new Date(left?.created_at || 0).getTime()),
    [serviceTickets]
  )
  const openTicketCount = useMemo(
    () => sortedTickets.filter((ticket) => ticket.status !== 'resolved').length,
    [sortedTickets]
  )
  const stats = [
    { value: formatBookingStatusLabel(bookingStatus), label: 'Booking status' },
    { value: formatCurrency(booking?.total_amount || 0), label: 'Booking total' },
    { value: updates.length, label: 'Tracking updates' },
    { value: openTicketCount, label: 'Open service tickets' }
  ]
  const trackingDisabled = ['cancelled', 'rejected'].includes(bookingStatus)
  const ticketsDisabled = ['pending', 'rejected'].includes(bookingStatus)

  const applyTrackingState = (payload) => {
    const nextUpdates = Array.isArray(payload?.updates) ? payload.updates : []
    const nextCurrentUpdate = payload?.current_update || nextUpdates[nextUpdates.length - 1] || null
    setTracking({ updates: nextUpdates, current_update: nextCurrentUpdate })
    if (nextCurrentUpdate?.id) {
      setSelectedTrackingId(nextCurrentUpdate.id)
    }
  }

  const handleTrackingSubmit = async (event) => {
    event.preventDefault()
    setTrackingSaving(true)

    try {
      const response = await bookingService.addTrackingUpdate(id, trackingForm)
      applyTrackingState(response?.tracking)
      setTrackingForm({
        ...DEFAULT_TRACKING_FORM,
        latitude: trackingForm.latitude,
        longitude: trackingForm.longitude
      })
      addToast('Tracking update published for this booking.', 'success')
    } catch (error) {
      addToast(getErrorMessage(error, 'Unable to save the tracking update.'), 'error')
    } finally {
      setTrackingSaving(false)
    }
  }

  const handleTicketSubmit = async (event) => {
    event.preventDefault()
    setTicketSaving(true)

    try {
      const response = await bookingService.createServiceTicket(id, ticketForm)
      setServiceTickets(Array.isArray(response?.tickets) ? response.tickets : serviceTickets)
      setTicketForm(DEFAULT_TICKET_FORM)
      addToast('Service ticket created successfully.', 'success')
    } catch (error) {
      addToast(getErrorMessage(error, 'Unable to create the service ticket.'), 'error')
    } finally {
      setTicketSaving(false)
    }
  }

  const handleTicketStatusChange = async (ticketId, status) => {
    setTicketUpdatingId(ticketId)

    try {
      const response = await bookingService.updateServiceTicketStatus(id, ticketId, {
        status,
        note: ticketNotes[ticketId] || ''
      })
      setServiceTickets(Array.isArray(response?.tickets) ? response.tickets : serviceTickets)
      setTicketNotes((current) => ({ ...current, [ticketId]: '' }))
      addToast(`Service ticket moved to ${status.replace(/_/g, ' ')}.`, 'success')
    } catch (error) {
      addToast(getErrorMessage(error, 'Unable to update the service ticket.'), 'error')
    } finally {
      setTicketUpdatingId('')
    }
  }

  if (loading) return <PageSkeleton variant="dashboard" />

  return (
    <div className="container page-wrap">
      <DashboardShell title={shellTitle} subtitle={shellSubtitle} links={shellLinks}>
        <PageHero
          eyebrow="Booking Operations"
          title={booking?.equipment_name ? `${booking.equipment_name} operations` : 'Booking operations'}
          subtitle="Track delivery progress, watch the latest field position, and keep service issues attached to the booking instead of scattered across messages."
          className={heroClass}
          stats={stats}
          aside={(
            <div className="page-hero-card booking-ops-hero-card">
              <span className={`status-badge ${getBookingStatusClass(bookingStatus)}`}>
                {formatBookingStatusLabel(bookingStatus)}
              </span>
              <strong>{currentUpdate?.label || 'No live tracking posted yet'}</strong>
              <p className="subtitle booking-ops-hero-note">
                {currentUpdate?.note || 'The first owner update will place this booking on the live operations map.'}
              </p>
              <div className="booking-ops-hero-meta">
                <span>
                  <Clock3 size={14} strokeWidth={2.1} aria-hidden="true" />
                  {currentUpdate ? formatDateTime(currentUpdate.recorded_at) : 'Waiting for first update'}
                </span>
                <span>
                  <MapPinned size={14} strokeWidth={2.1} aria-hidden="true" />
                  {currentUpdate ? `${formatCoordinate(currentUpdate.latitude)}, ${formatCoordinate(currentUpdate.longitude)}` : 'Coordinates pending'}
                </span>
              </div>
            </div>
          )}
          actions={(
            <div className="button-row">
              <Link className="button outline pill" to={bookingListPath}>
                {role === 'farmer' ? 'Back to my bookings' : 'Back to booking queue'}
              </Link>
            </div>
          )}
        />



        <section className="page-split">
          <div className="page-main">
            <section className="card booking-ops-map-shell">
              <div className="review-section-head">
                <div>
                  <p className="review-section-eyebrow">Live Tracking Map</p>
                  <h3>Latest route and field position</h3>
                </div>
                {currentUpdate && (
                  <span className={`status-badge ${getTrackingTone(currentUpdate.status)}`}>
                    {String(currentUpdate.status || 'scheduled').replace(/_/g, ' ')}
                  </span>
                )}
              </div>

              {mapPoints.length ? (
                <div className="tracking-map-layout">
                  <div className="tracking-map-board" role="img" aria-label="Booking tracking map">
                    <div className="tracking-map-grid" />
                    {mapPoints.map((point, index) => (
                      <button
                        key={point.id}
                        type="button"
                        className={`tracking-pin ${selectedTrackingUpdate?.id === point.id ? 'is-active' : ''} ${currentUpdate?.id === point.id ? 'is-current' : ''}`}
                        style={{ left: point.left, top: point.top }}
                        onClick={() => setSelectedTrackingId(point.id)}
                        aria-label={`Tracking update ${index + 1}: ${point.label}`}
                      >
                        <span>{index + 1}</span>
                      </button>
                    ))}
                  </div>

                  <div className="tracking-map-detail">
                    <div className="booking-ops-summary-card">
                      <span className="dashboard-role-pill">Selected update</span>
                      <h4>{selectedTrackingUpdate?.label || 'No tracking selected'}</h4>
                      <p className="subtitle">
                        {selectedTrackingUpdate?.note || 'Pick a map point or timeline update to inspect its details.'}
                      </p>
                      <ul className="feature-list">
                        <li><strong>{selectedTrackingUpdate?.eta_label || 'No ETA set'}</strong><span>ETA</span></li>
                        <li><strong>{selectedTrackingUpdate ? `${formatCoordinate(selectedTrackingUpdate.latitude)}, ${formatCoordinate(selectedTrackingUpdate.longitude)}` : '--'}</strong><span>Coordinates</span></li>
                        <li><strong>{selectedTrackingUpdate ? formatDateTime(selectedTrackingUpdate.recorded_at) : 'Waiting'}</strong><span>Recorded at</span></li>
                      </ul>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="subtitle">
                  Tracking starts once the owner posts the first movement update for this booking.
                </p>
              )}

              {updates.length ? (
                <div className="tracking-timeline">
                  {updates.map((update) => (
                    <button
                      key={update.id}
                      type="button"
                      className={`tracking-timeline-item ${selectedTrackingUpdate?.id === update.id ? 'is-active' : ''}`}
                      onClick={() => setSelectedTrackingId(update.id)}
                    >
                      <div className="tracking-timeline-marker" />
                      <div className="tracking-timeline-copy">
                        <div className="tracking-timeline-head">
                          <strong>{update.label}</strong>
                          <span className={`status-badge ${getTrackingTone(update.status)}`}>
                            {String(update.status || 'scheduled').replace(/_/g, ' ')}
                          </span>
                        </div>
                        <p className="subtitle">{update.note || 'No note attached to this update.'}</p>
                        <small>{formatDateTime(update.recorded_at)} | {formatCoordinate(update.latitude)}, {formatCoordinate(update.longitude)}</small>
                      </div>
                    </button>
                  ))}
                </div>
              ) : null}
            </section>

            {isOwnerLike && (
              <section className="card booking-ops-form-shell">
                <div className="review-section-head">
                  <div>
                    <p className="review-section-eyebrow">Owner Tracking Controls</p>
                    <h3>Publish the next movement update</h3>
                  </div>
                  <span className="subtitle">{trackingDisabled ? 'Tracking disabled' : 'Owner and admin only'}</span>
                </div>

                {trackingDisabled ? (
                  <p className="subtitle">Tracking cannot be updated after a booking is cancelled or rejected.</p>
                ) : (
                  <form className="form-stack" onSubmit={handleTrackingSubmit}>
                    <div className="form-grid two-col">
                      <label>
                        Update Label
                        <input
                          value={trackingForm.label}
                          onChange={(event) => setTrackingForm((current) => ({ ...current, label: event.target.value }))}
                          placeholder="Driver left the yard"
                          required
                        />
                      </label>
                      <label>
                        Status
                        <select
                          value={trackingForm.status}
                          onChange={(event) => setTrackingForm((current) => ({ ...current, status: event.target.value }))}
                        >
                          {TRACKING_STATUS_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Latitude
                        <input
                          value={trackingForm.latitude}
                          onChange={(event) => setTrackingForm((current) => ({ ...current, latitude: event.target.value }))}
                          type="number"
                          step="0.0001"
                          placeholder="41.5908"
                          required
                        />
                      </label>
                      <label>
                        Longitude
                        <input
                          value={trackingForm.longitude}
                          onChange={(event) => setTrackingForm((current) => ({ ...current, longitude: event.target.value }))}
                          type="number"
                          step="0.0001"
                          placeholder="-93.6208"
                          required
                        />
                      </label>
                      <label>
                        ETA Label
                        <input
                          value={trackingForm.etaLabel}
                          onChange={(event) => setTrackingForm((current) => ({ ...current, etaLabel: event.target.value }))}
                          placeholder="30 min"
                        />
                      </label>
                      <label>
                        Note
                        <input
                          value={trackingForm.note}
                          onChange={(event) => setTrackingForm((current) => ({ ...current, note: event.target.value }))}
                          placeholder="Loading is complete and the driver is heading to the field."
                        />
                      </label>
                    </div>
                    <div className="button-row">
                      <button className="button secondary pill" type="submit" disabled={trackingSaving}>
                        {trackingSaving ? 'Publishing...' : 'Publish tracking update'}
                      </button>
                    </div>
                  </form>
                )}
              </section>
            )}

            <section className="card booking-ticket-shell">
              <div className="review-section-head">
                <div>
                  <p className="review-section-eyebrow">Field Service Tickets</p>
                  <h3>Attach operational issues directly to the rental</h3>
                </div>
                <span className="subtitle">{openTicketCount} open ticket{openTicketCount === 1 ? '' : 's'}</span>
              </div>
              {sortedTickets.length ? (
                <div className="booking-ticket-list">
                  {sortedTickets.map((ticket) => (
                    <article key={ticket.id} className="booking-ticket-card">
                      <div className="booking-ticket-head">
                        <div>
                          <h4>{ticket.title}</h4>
                          <p className="subtitle">
                            {ticket.issue_type} | {ticket.created_by_name || 'User'} | {formatDateTime(ticket.created_at)}
                          </p>
                        </div>
                        <div className="chip-row">
                          <span className={`status-badge ${getTicketTone(ticket.status)}`}>{String(ticket.status || 'open').replace(/_/g, ' ')}</span>
                          <span className={`status-badge ${getPriorityTone(ticket.priority)}`}>{ticket.priority}</span>
                        </div>
                      </div>

                      <p className="subtitle">{ticket.description}</p>

                      {ticket.resolution_note ? (
                        <div className="booking-ticket-resolution">
                          <strong>Resolution</strong>
                          <span>{ticket.resolution_note}</span>
                        </div>
                      ) : null}

                      {Array.isArray(ticket.activity) && ticket.activity.length ? (
                        <div className="booking-ticket-activity">
                          {ticket.activity.map((activity) => (
                            <div key={activity.id} className="booking-ticket-activity-item">
                              <div className="booking-ticket-activity-icon">
                                <Clock3 size={15} strokeWidth={2.1} aria-hidden="true" />
                              </div>
                              <div>
                                <strong>{String(activity.action || 'created').replace(/_/g, ' ')}</strong>
                                <p className="subtitle">{activity.note || 'No note provided.'}</p>
                                <small>{activity.created_by_name || 'User'} | {formatDateTime(activity.created_at)}</small>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : null}

                      {isOwnerLike && (
                        <div className="booking-ticket-owner-controls">
                          <label>
                            Owner note
                            <textarea
                              rows={3}
                              value={ticketNotes[ticket.id] || ''}
                              onChange={(event) => setTicketNotes((current) => ({ ...current, [ticket.id]: event.target.value }))}
                              placeholder="Add the latest service note or resolution details."
                            />
                          </label>
                          <div className="button-row">
                            <button
                              type="button"
                              className="button sm outline"
                              disabled={ticketUpdatingId === ticket.id}
                              onClick={() => handleTicketStatusChange(ticket.id, 'open')}
                            >
                              {ticketUpdatingId === ticket.id && ticket.status !== 'open' ? 'Saving...' : 'Mark open'}
                            </button>
                            <button
                              type="button"
                              className="button sm secondary"
                              disabled={ticketUpdatingId === ticket.id}
                              onClick={() => handleTicketStatusChange(ticket.id, 'in_progress')}
                            >
                              {ticketUpdatingId === ticket.id && ticket.status !== 'in_progress' ? 'Saving...' : 'Mark in progress'}
                            </button>
                            <button
                              type="button"
                              className="button sm soil"
                              disabled={ticketUpdatingId === ticket.id}
                              onClick={() => handleTicketStatusChange(ticket.id, 'resolved')}
                            >
                              {ticketUpdatingId === ticket.id && ticket.status !== 'resolved' ? 'Saving...' : 'Resolve'}
                            </button>
                          </div>
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              ) : (
                <p className="subtitle">No service tickets have been created for this booking yet.</p>
              )}

              {ticketsDisabled ? (
                <p className="subtitle">Service tickets open after a booking has been confirmed.</p>
              ) : (
                <form className="form-stack booking-ticket-form" onSubmit={handleTicketSubmit}>
                  <div className="form-grid two-col">
                    <label>
                      Ticket Title
                      <input
                        value={ticketForm.title}
                        onChange={(event) => setTicketForm((current) => ({ ...current, title: event.target.value }))}
                        placeholder="Hydraulic warning light"
                        required
                      />
                    </label>
                    <label>
                      Issue Type
                      <select
                        value={ticketForm.issueType}
                        onChange={(event) => setTicketForm((current) => ({ ...current, issueType: event.target.value }))}
                      >
                        {TICKET_TYPE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Priority
                      <select
                        value={ticketForm.priority}
                        onChange={(event) => setTicketForm((current) => ({ ...current, priority: event.target.value }))}
                      >
                        {TICKET_PRIORITY_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Description
                      <textarea
                        rows={4}
                        value={ticketForm.description}
                        onChange={(event) => setTicketForm((current) => ({ ...current, description: event.target.value }))}
                        placeholder="Describe the issue, impact, and what help is needed on site."
                        required
                      />
                    </label>
                  </div>
                  <div className="button-row">
                    <button className="button secondary pill" type="submit" disabled={ticketSaving}>
                      {ticketSaving ? 'Creating...' : 'Create service ticket'}
                    </button>
                  </div>
                </form>
              )}
            </section>
          </div>

          <aside className="page-side">
            <section className="card">
              <h3>Tracking Summary</h3>
              <div className="panel-list-premium">
                <div className="insight-stat-row">
                  <div className="stat-icon-wrap">
                    <Radar size={18} strokeWidth={2.1} aria-hidden="true" />
                  </div>
                  <div className="stat-info-wrap">
                    <strong>{updates.length}</strong>
                    <span>Tracking updates posted</span>
                  </div>
                </div>
                <div className="insight-stat-row">
                  <div className="stat-icon-wrap">
                    <MapPinned size={18} strokeWidth={2.1} aria-hidden="true" />
                  </div>
                  <div className="stat-info-wrap">
                    <strong>{currentUpdate?.eta_label || '--'}</strong>
                    <span>Latest ETA label</span>
                  </div>
                </div>
                <div className="insight-stat-row">
                  <div className="stat-icon-wrap">
                    <Clock3 size={18} strokeWidth={2.1} aria-hidden="true" />
                  </div>
                  <div className="stat-info-wrap">
                    <strong>{currentUpdate ? formatDateTime(currentUpdate.recorded_at) : 'Waiting'}</strong>
                    <span>Last update time</span>
                  </div>
                </div>
              </div>
            </section>

            <section className="card">
              <h3>Service Summary</h3>
              <div className="panel-list-premium">
                <div className="insight-stat-row">
                  <div className="stat-icon-wrap">
                    <Wrench size={18} strokeWidth={2.1} aria-hidden="true" />
                  </div>
                  <div className="stat-info-wrap">
                    <strong>{sortedTickets.length}</strong>
                    <span>Total service tickets</span>
                  </div>
                </div>
                <div className="insight-stat-row">
                  <div className="stat-info-wrap">
                    <strong>{openTicketCount}</strong>
                    <span>Open or active issues</span>
                  </div>
                </div>
                <div className="insight-stat-row">
                  <div className="stat-info-wrap">
                    <strong>{sortedTickets.filter((ticket) => ticket.status === 'resolved').length}</strong>
                    <span>Resolved tickets</span>
                  </div>
                </div>
              </div>
            </section>

            <section className="card">
              <h3>Quick Actions</h3>
              <ul className="feature-list">
                <li><span>Use live tracking to keep delivery and field handoff aligned.</span></li>
                <li><span>Open service tickets when the machine, operator, or delivery plan needs attention.</span></li>
                <li><span>Keep the resolution note on the ticket so follow-up does not disappear into chat.</span></li>
              </ul>
              <div className="button-row">
                <Link className="button sm secondary pill" to={bookingListPath}>Back to queue</Link>
              </div>
            </section>
          </aside>
        </section>
      </DashboardShell>
    </div>
  )
}
