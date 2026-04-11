import React from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import useAuth from '../hooks/useAuth.js'

export default function GuestRoute() {
    const { isAuthenticated, user } = useAuth()

    if (isAuthenticated) {
        const dashboardPath = user?.role === 'admin'
            ? '/admin/dashboard'
            : user?.role === 'equipment_owner'
                ? '/owner/dashboard'
                : '/farmer/dashboard'
        return <Navigate to={dashboardPath} replace />
    }

    return <Outlet />
}
