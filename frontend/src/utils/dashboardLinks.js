export const farmerDashboardLinks = [
  { to: '/farmer/dashboard', label: 'Dashboard' },
  { to: '/farmer/equipments', label: 'Browse Equipment' },
  { to: '/farmer/bookings', label: 'My Bookings' },
  { to: '/farmer/messages', label: 'Messages' },
  { to: '/farmer/payments', label: 'Payment History' },
  { to: '/account/profile', label: 'Profile Settings' },
  { to: '/', label: 'Home' }
]

export const ownerDashboardLinks = [
  { to: '/owner/dashboard', label: 'Dashboard' },
  { to: '/owner/add-equipment', label: 'Add Equipment' },
  { to: '/owner/equipment', label: 'My Listings' },
  { to: '/owner/requests', label: 'Rental Requests' },
  { to: '/owner/messages', label: 'Messages' },
  { to: '/account/profile', label: 'Profile Settings' },
  { to: '/', label: 'Home' }
]

export const adminDashboardLinks = [
  { to: '/admin/dashboard', label: 'Dashboard' },
  { to: '/admin/verify-owners', label: 'User Approvals' },
  { to: '/admin/bookings', label: 'Bookings' },
  { to: '/admin/equipment', label: 'Equipment Control' },
  { to: '/admin/messages', label: 'Messages' },
  { to: '/admin/testimonials', label: 'Testimonials' },
  { to: '/account/profile', label: 'Profile Settings' },
  { to: '/', label: 'Home' }
]

export function getDashboardLinksForRole(role) {
  if (role === 'equipment_owner') return ownerDashboardLinks
  if (role === 'admin') return adminDashboardLinks
  return farmerDashboardLinks
}
