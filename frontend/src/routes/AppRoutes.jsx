import React from 'react'
import { Routes, Route } from 'react-router-dom'
import Home from '../pages/Home.jsx'
import Login from '../pages/auth/Login.jsx'
import Register from '../pages/auth/Register.jsx'
import ForgotPassword from '../pages/auth/ForgotPassword.jsx'
import ResetPassword from '../pages/auth/ResetPassword.jsx'
import FarmerLogin from '../pages/auth/FarmerLogin.jsx'
import OwnerLogin from '../pages/auth/OwnerLogin.jsx'
import AdminLogin from '../pages/auth/AdminLogin.jsx'
import Docs from '../pages/Docs.jsx'
import FarmerDashboard from '../pages/farmer/FarmerDashboard.jsx'
import BrowseEquipment from '../pages/farmer/BrowseEquipment.jsx'
import MyBookings from '../pages/farmer/MyBookings.jsx'
import OwnerDashboard from '../pages/owner/OwnerDashboard.jsx'
import AddEquipment from '../pages/owner/AddEquipment.jsx'
import EditEquipment from '../pages/owner/EditEquipment.jsx'
import MyEquipment from '../pages/owner/MyEquipment.jsx'
import BookingRequests from '../pages/owner/BookingRequests.jsx'
import AdminDashboard from '../pages/admin/AdminDashboard.jsx'
import VerifyOwners from '../pages/admin/VerifyOwners.jsx'
import Reports from '../pages/admin/Reports.jsx'
import AdminEquipment from '../pages/admin/AdminEquipment.jsx'
import ReviewModeration from '../pages/admin/ReviewModeration.jsx'
import Newsletters from '../pages/admin/Newsletters.jsx'
import TestimonialsAdmin from '../pages/admin/TestimonialsAdmin.jsx'
import EquipmentDetails from '../pages/equipment/EquipmentDetails.jsx'
import SearchResults from '../pages/equipment/SearchResults.jsx'
import StyleGuide from '../pages/StyleGuide.jsx'
import Favorites from '../pages/Favorites.jsx'
import WriteReview from '../pages/WriteReview.jsx'
import Profile from '../pages/Profile.jsx'
import Checkout from '../pages/Checkout.jsx'
import PaymentHistory from '../pages/PaymentHistory.jsx'
import Compare from '../pages/Compare.jsx'
import { About, TermsPolicy, FAQ } from '../pages/StaticPages.jsx'
import NotFound from '../pages/NotFound.jsx'
import Messages from '../pages/Messages.jsx'
import PrivateRoute from '../components/PrivateRoute.jsx'
import RoleRoute from '../components/RoleRoute.jsx'
import GuestRoute from '../components/GuestRoute.jsx'

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/docs" element={<Docs />} />
      <Route path="/style-guide" element={<StyleGuide />} />
      <Route path="/about" element={<About />} />
      <Route path="/terms" element={<TermsPolicy />} />
      <Route path="/privacy" element={<TermsPolicy />} />
      <Route path="/faq" element={<FAQ />} />
      <Route path="/help" element={<FAQ />} />

      <Route element={<GuestRoute />}>
        <Route path="/auth/login" element={<Login />} />
        <Route path="/auth/register" element={<Register />} />
        <Route path="/auth/forgot-password" element={<ForgotPassword />} />
        <Route path="/auth/reset-password" element={<ResetPassword />} />

        <Route path="/farmer-login" element={<FarmerLogin />} />
        <Route path="/owner-login" element={<OwnerLogin />} />
        <Route path="/admin-login" element={<AdminLogin />} />

        {/* Logical Aliases */}
        <Route path="/auth/farmer/login" element={<FarmerLogin />} />
        <Route path="/auth/owner/login" element={<OwnerLogin />} />
        <Route path="/auth/admin/login" element={<AdminLogin />} />
        <Route path="/login" element={<Login />} />
      </Route>

      <Route element={<PrivateRoute />}>
        <Route path="/farmer/dashboard" element={<FarmerDashboard />} />
        <Route path="/farmer/equipments" element={<BrowseEquipment />} />
        <Route path="/farmer/equipment/:id" element={<EquipmentDetails />} />
        <Route path="/farmer/bookings" element={<MyBookings />} />
        <Route path="/farmer/payments" element={<PaymentHistory />} />
        <Route path="/favorites" element={<Favorites />} />
        <Route path="/review/:bookingId" element={<WriteReview />} />
        <Route path="/checkout/:bookingId" element={<Checkout />} />
        <Route path="/messages" element={<Messages />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/settings" element={<Profile />} />
      </Route>

      <Route path="/browse-equipment" element={<BrowseEquipment />} />
      <Route path="/compare" element={<Compare />} />

      <Route element={<PrivateRoute />}>
        <Route element={<RoleRoute roles={['equipment_owner']} />}>
          <Route path="/owner/dashboard" element={<OwnerDashboard />} />
          <Route path="/owner/add-equipment" element={<AddEquipment />} />
          <Route path="/owner/equipment/:id/edit" element={<EditEquipment />} />
          <Route path="/owner/equipment" element={<MyEquipment />} />
          <Route path="/owner/requests" element={<BookingRequests />} />
        </Route>
      </Route>

      <Route element={<PrivateRoute />}>
        <Route element={<RoleRoute roles={['admin']} />}>
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/verify-owners" element={<VerifyOwners />} />
          <Route path="/admin/reports" element={<Reports />} />
          <Route path="/admin/equipment" element={<AdminEquipment />} />
          <Route path="/admin/reviews" element={<ReviewModeration />} />
          <Route path="/admin/newsletters" element={<Newsletters />} />
          <Route path="/admin/testimonials" element={<TestimonialsAdmin />} />
          <Route path="/admin/add-equipment" element={<AddEquipment />} />
        </Route>
      </Route>

      <Route path="/equipment/:id" element={<EquipmentDetails />} />
      <Route path="/search" element={<SearchResults />} />

      <Route path="*" element={<NotFound />} />
    </Routes >
  )
}
