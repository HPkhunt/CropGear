# Role-Based Login Portals

## Overview
Three specialized login portals have been created for different user roles with module-specific branding, design, and validation.

## Portals Created

### 1. 🚜 Farmer Login Portal
**Route:** `/farmer-login`
- **File:** [src/pages/auth/FarmerLogin.jsx](src/pages/auth/FarmerLogin.jsx)
- **Theme:** Green gradient (#10b981 to #059669)
- **Features:**
  - Two-column layout with benefits on left
  - Email/password login form
  - Role validation (checks `user.role === 'farmer'`)
  - Benefits highlighted: Wide Selection, Affordable Rates, Trusted Community, Easy Booking
  - Links to farmer registration and other portals
- **Benefits:**
  - Browse a wide selection of quality equipment
  - Affordable rental rates from verified owners
  - Trusted farmer community
  - Easy booking process

### 2. 🏢 Equipment Owner Login Portal
**Route:** `/owner-login`
- **File:** [src/pages/auth/OwnerLogin.jsx](src/pages/auth/OwnerLogin.jsx)
- **Theme:** Blue gradient (#3b82f6 to #1d4ed8)
- **Features:**
  - Two-column layout with business benefits on left
  - Email/password login form
  - Role validation (checks `user.role === 'equipment_owner'`)
  - Benefits highlighted: Monetize Assets, Easy Management, Secure Payments, Build Reputation
  - Links to owner registration and other portals
- **Benefits:**
  - Monetize unused equipment assets
  - Manage all equipment from one dashboard
  - Receive payments safely and on time
  - Build reputation with verified farmers

### 3. ⚙️ Admin Login Portal
**Route:** `/admin-login`
- **File:** [src/pages/auth/AdminLogin.jsx](src/pages/auth/AdminLogin.jsx)
- **Theme:** Dark gray gradient (#1f2937 to #111827)
- **Features:**
  - Two-column layout with admin capabilities on left
  - Email/password login form
  - Role validation (checks `user.role === 'admin'`)
  - Features highlighted: Complete Control, Advanced Analytics, User Management, Security First
  - Links to support and other portals
- **Capabilities:**
  - Complete platform control and administration
  - Real-time insights and analytics
  - Monitor and manage all user accounts
  - Advanced security controls and audit logs

## Updated Components

### Login Page (Generic Entry Point)
**File:** [src/pages/auth/Login.jsx](src/pages/auth/Login.jsx)
- Generic login form (works for all roles)
- **New:** Quick access cards to all three role portals
- Routes users to appropriate dashboard after login
- Interactive hover effects on role portal cards

### AppRoutes
**File:** [src/routes/AppRoutes.jsx](src/routes/AppRoutes.jsx)
**Changes:**
- Imported all three login components
- Added routes:
  - `/farmer-login` → FarmerLogin
  - `/owner-login` → OwnerLogin
  - `/admin-login` → AdminLogin

### Navbar
**File:** [src/components/Navbar.jsx](src/components/Navbar.jsx)
**Changes:**
- Added quick access emoji links to all three portals
- Links visible only when user is NOT authenticated
- Shows 🚜 for Farmer, 🏢 for Owner, ⚙️ for Admin

## Role Validation

Each portal validates the user's role upon login:

```javascript
// Example validation from FarmerLogin.jsx
if (res?.user?.role !== 'farmer') {
  setError('This login is for equipment owners only...')
  return
}
```

**Error Message:** "This login is for [role] only. Please use the correct login portal."

## User Flow

### For New Farmers
1. Visit `/farmer-login`
2. See farmer benefits and features
3. Click "Register your equipment" if no account
4. Login with credentials
5. Automatically routed to `/farmer/dashboard`

### For New Equipment Owners
1. Visit `/owner-login`
2. See owner business benefits
3. Click "Register your equipment" if no account
4. Login with credentials
5. Automatically routed to `/owner/dashboard`

### For Admins
1. Visit `/admin-login`
2. Review admin capabilities
3. Login with admin credentials
4. Automatically routed to `/admin/dashboard`

### From Generic Login Page
1. Visit `/auth/login`
2. See three role portal cards
3. Click on desired role portal
4. Complete role-specific login

## Navigation Quick Links

**Navbar (when not logged in):**
- 🚜 → `/farmer-login`
- 🏢 → `/owner-login`
- ⚙️ → `/admin-login`

**Login Page:**
- Three large interactive cards showing each portal
- Hover effects with smooth animations
- Direct links to role portals

## Directory Structure

```
web/
  src/
    pages/
      auth/
        Login.jsx (updated)
        Register.jsx (existing)
        FarmerLogin.jsx (new)
        OwnerLogin.jsx (new)
        AdminLogin.jsx (new)
    routes/
      AppRoutes.jsx (updated)
    components/
      Navbar.jsx (updated)
```

## Design Consistency

All three portals use:
- **Same Layout Pattern:** Hero section + two-column form
- **Same Form Fields:** Email, Password, Submit Button
- **Same Error Handling:** Red error alerts with emoji icons
- **Same Typography:** Consistent font sizes and weights
- **Same Spacing:** Aligned margins and padding
- **Same Animations:** Hover effects and transitions
- **Same Accessibility:** Focus states with colored borders

## Color Scheme

| Role | Primary Color | Hex |
|------|--------------|-----|
| Farmer | Green | #10b981 |
| Owner | Blue | #3b82f6 |
| Admin | Dark Gray | #1f2937 |

## Testing the Portals

### Test Data Structure
Each user should have:
```javascript
{
  email: "user@example.com",
  password: "password123",
  role: "farmer" | "equipment_owner" | "admin",
  full_name: "User Name"
}
```

### Test Cases
1. ✅ Visit `/farmer-login` → See farmer portal
2. ✅ Visit `/owner-login` → See owner portal
3. ✅ Visit `/admin-login` → See admin portal
4. ✅ Visit `/auth/login` → See all three portals as cards
5. ✅ Click role portal links in navbar (when not logged in)
6. ✅ Login with correct role → Redirect to dashboard
7. ✅ Login with wrong role → Show error message

## Mobile Responsiveness

All portals are fully responsive:
- **Hero section:** Stacks vertically on mobile
- **Form layout:** Single column on screens < 768px
- **Benefits grid:** Responsive grid layout
- **Buttons:** Full width on mobile
- **Text:** Scales appropriately for all screen sizes

## Error Messages

| Scenario | Message |
|----------|---------|
| Wrong email/password | "Invalid email or password" |
| Farmer login with owner account | "This login is for equipment owners only. Please use the correct login portal." |
| Owner login with farmer account | "This login is for equipment owners only. Please use the correct login portal." |
| Admin login with regular account | "This login is for administrators only. Unauthorized access attempt." |

## Future Enhancements

- [ ] Add "Remember Me" checkbox
- [ ] Add password reset link
- [ ] Add social login options per role
- [ ] Add two-factor authentication
- [ ] Add role-specific branding to dashboard
- [ ] Add role-specific notifications
