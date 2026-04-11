import React from 'react'
import { Routes, Route } from 'react-router-dom'
import Home from '../pages/Home.jsx'
import Landing from '../pages/Landing.jsx'
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
import PaymentCheckout from '../pages/farmer/PaymentCheckout.jsx'
import PaymentHistory from '../pages/farmer/PaymentHistory.jsx'
import OwnerDashboard from '../pages/owner/OwnerDashboard.jsx'
import AddEquipment from '../pages/owner/AddEquipment.jsx'
import MyEquipment from '../pages/owner/MyEquipment.jsx'
import BookingRequests from '../pages/owner/BookingRequests.jsx'
import AdminDashboard from '../pages/admin/AdminDashboard.jsx'
import VerifyOwners from '../pages/admin/VerifyOwners.jsx'
import AdminEquipment from '../pages/admin/AdminEquipment.jsx'
import TestimonialsAdmin from '../pages/admin/TestimonialsAdmin.jsx'
import EquipmentCompare from '../pages/equipment/EquipmentCompare.jsx'
import EquipmentDetails from '../pages/equipment/EquipmentDetails.jsx'
import SearchResults from '../pages/equipment/SearchResults.jsx'
import Messages from '../pages/chat/Messages.jsx'
import BookingOperations from '../pages/bookings/BookingOperations.jsx'
import ProfileSettings from '../pages/account/ProfileSettings.jsx'
import NotFound from '../pages/NotFound.jsx'
import PrivateRoute from '../components/PrivateRoute.jsx'
import RoleRoute from '../components/RoleRoute.jsx'
import GuestRoute from '../components/GuestRoute.jsx'

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/landing" element={<Landing />} />
      <Route path="/docs" element={<Docs />} />

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
        <Route path="/account/profile" element={<ProfileSettings />} />
        <Route path="/farmer/equipments" element={<BrowseEquipment />} />
        <Route path="/farmer/equipment/:id" element={<EquipmentDetails />} />
        <Route path="/farmer/bookings" element={<MyBookings />} />
        <Route path="/farmer/bookings/:id/operations" element={<BookingOperations />} />
        <Route path="/farmer/messages" element={<Messages />} />
        <Route path="/farmer/bookings/:id/pay" element={<PaymentCheckout />} />
        <Route path="/farmer/payments" element={<PaymentHistory />} />
      </Route>

      <Route path="/browse-equipment" element={<BrowseEquipment />} />

      <Route path="/farmer/dashboard" element={<FarmerDashboard />} />

      <Route element={<PrivateRoute />}>
        <Route element={<RoleRoute roles={['equipment_owner']} />}>
          <Route path="/owner/dashboard" element={<OwnerDashboard />} />
          <Route path="/owner/add-equipment" element={<AddEquipment />} />
          <Route path="/owner/equipment" element={<MyEquipment />} />
          <Route path="/owner/requests" element={<BookingRequests />} />
          <Route path="/owner/requests/:id/operations" element={<BookingOperations />} />
          <Route path="/owner/messages" element={<Messages />} />
        </Route>
      </Route>

      <Route element={<PrivateRoute />}>
        <Route element={<RoleRoute roles={['admin']} />}>
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/verify-owners" element={<VerifyOwners />} />
          <Route path="/admin/messages" element={<Messages />} />
          <Route path="/admin/bookings" element={<BookingRequests />} />
          <Route path="/admin/bookings/:id/operations" element={<BookingOperations />} />
          <Route path="/admin/equipment" element={<AdminEquipment />} />
          <Route path="/admin/testimonials" element={<TestimonialsAdmin />} />
        </Route>
      </Route>

      <Route path="/equipment/:id" element={<EquipmentDetails />} />
      <Route path="/compare" element={<EquipmentCompare />} />
      <Route path="/search" element={<SearchResults />} />

      <Route path="*" element={<NotFound />} />
    </Routes >
  )
}
