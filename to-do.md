# CropGear — Project To-Do & Implementation Roadmap

> **Last updated:** 2026-03-26  
> Legend: ✅ Done | 🔧 Partially Done | ❌ Not Implemented | 🆕 New Feature Suggestion

---

## 1. Authentication & User Management

| # | Item | Status | Details |
|---|------|--------|---------|
| 1.1 | Email/password login | ✅ | Supports email and phone login |
| 1.2 | User registration (farmer / owner) | ✅ | With OTP email verification |
| 1.3 | Admin login | ✅ | Separate admin login page |
| 1.4 | Password reset (email link + token) | ✅ | Token-based with SMTP email |
| 1.5 | JWT access tokens | ✅ | HS256, 30min expiry |
| 1.6 | Session management (cache-based) | ✅ | In-memory cache sessions |
| 1.7 | Logout & token invalidation | ✅ | Clears cache token & session |
| 1.8 | **Refresh token rotation** | ❌ | Config exists (`REFRESH_TOKEN_EXPIRE_DAYS`) but no refresh endpoint or logic implemented |
| 1.9 | **User profile editing** | ✅ | `PUT /users/me` endpoint added — users can update name, phone, bio, location |
| 1.10 | **Profile picture / avatar upload** | ❌ | User model has no avatar field; no upload flow |
| 1.11 | **Change password (while logged in)** | ✅ | `POST /users/me/change-password` endpoint added |
| 1.12 | **Account deactivation / deletion** | ❌ | No self-service account delete |
| 1.13 | **Social login (Google / Facebook)** | 🆕 | Not present — could improve onboarding |
| 1.14 | **Two-factor authentication (2FA)** | 🆕 | No 2FA support |

---

## 2. Equipment Management

| # | Item | Status | Details |
|---|------|--------|---------|
| 2.1 | Create equipment listing | ✅ | Owner/admin can add with image (media asset) |
| 2.2 | List / browse equipment | ✅ | Public browse with pagination, sort, filters |
| 2.3 | Equipment detail page | ✅ | Frontend `EquipmentDetails.jsx` |
| 2.4 | Delete equipment | ✅ | Owner or admin |
| 2.5 | Equipment image upload (presigned S3) | ✅ | Via media service + direct upload fallback |
| 2.6 | Equipment categories | ✅ | Categories aligned: `tractor|harvester|seeder|tillage|irrigation|crop_care` in both enum and API |
| 2.7 | **Edit / update equipment** | ✅ | `PUT /equipment/{id}` endpoint added — owner can update name, rate, description, category, location, availability |
| 2.8 | **Equipment availability calendar** | ❌ | No date-range availability check; `is_available` is a simple boolean toggle |
| 2.9 | **Multiple images per equipment** | 🔧 | Model has `images: List[dict]` but create endpoint only supports single `image_url` / `image_asset_id` |
| 2.10 | **Equipment condition tracking** | 🔧 | Advanced search filters by `condition` but no field is set during creation |
| 2.11 | **Equipment specs as structured data** | 🔧 | `specs` is a list of strings — no structured schema (HP, weight, year, fuel type, etc.) |
| 2.12 | **Hourly rate support** | ❌ | Model has `hourly_rate` field but create/browse only uses `daily_rate` |
| 2.13 | **Equipment status workflow** | 🆕 | No maintenance / under-repair / retired statuses |

---

## 3. Booking System

| # | Item | Status | Details |
|---|------|--------|---------|
| 3.1 | Create booking (farmer) | ✅ | With date validation and cost calc (10% admin cut) |
| 3.2 | List bookings (role-based) | ✅ | Farmer sees own, owner sees own, admin sees all |
| 3.3 | Approve / reject booking (owner) | ✅ | With email + WebSocket notification |
| 3.4 | Booking requests queue | ✅ | Owner and admin views |
| 3.5 | **Cancel booking** | ✅ | `POST /bookings/{id}/cancel` endpoint added with role-based authorization |
| 3.6 | **Complete booking** | ✅ | `POST /bookings/{id}/complete` endpoint added — owner/admin can transition confirmed→completed |
| 3.7 | **Booking date conflict detection** | ✅ | Overlap check added in `create_booking` + `GET /bookings/check-availability` API |
| 3.8 | **Booking modification** | ❌ | No endpoint to change dates or extend rental period |
| 3.9 | **Booking dispute flow** | ❌ | Model has `DISPUTED` status but no dispute endpoint or UI |
| 3.10 | **Booking history with date filters** | 🔧 | List endpoint returns all bookings; no date-range filtering |
| 3.11 | **Automatic booking expiry** | 🆕 | Pending bookings never expire — should auto-reject after X days |

---

## 4. Payment System

| # | Item | Status | Details |
|---|------|--------|---------|
| 4.1 | Stripe payment intent creation | ✅ | Backend fully implemented |
| 4.2 | Stripe payment confirmation | ✅ | With booking status update |
| 4.3 | Stripe webhook handler | ✅ | Handles `succeeded`, `failed`, `refunded` |
| 4.4 | Payment history endpoint | ✅ | For farmers |
| 4.5 | Payment receipt email | ✅ | Triggered on confirm + webhook |
| 4.6 | **Frontend payment UI** | ❌ | `paymentService.js` only has `createIntent` (wrong URL `/payments/intent` vs `/payments/create-intent`); no Stripe Elements or checkout page |
| 4.7 | **Payment page / checkout flow** | ❌ | No frontend payment/checkout component exists |
| 4.8 | **Refund endpoint** | ❌ | Webhook handles refund events but no admin API to initiate refund |
| 4.9 | **Owner payout tracking** | ❌ | `owner_payout` is stored on booking but no payout dashboard or withdrawal flow |
| 4.10 | **PayPal integration** | ❌ | `paypalrestsdk` is in requirements.txt but zero code uses it |
| 4.11 | **Invoice generation** | 🆕 | No PDF invoice or receipt download |

---

## 5. Reviews & Ratings

| # | Item | Status | Details |
|---|------|--------|---------|
| 5.1 | Submit equipment review | ✅ | With photo uploads, duplicate prevention |
| 5.2 | Submit user review (owner→farmer) | ✅ | Bidirectional reviews |
| 5.3 | Review response (owner reply) | ✅ | |
| 5.4 | Review flagging | ✅ | Users can flag inappropriate reviews |
| 5.5 | Review dispute flow | ✅ | Backend dispute open/resolve |
| 5.6 | Admin moderation queue | ✅ | Approve/reject/hide/restore |
| 5.7 | Owner review analytics | ✅ | Per-equipment performance |
| 5.8 | Auto-recalculate ratings | ✅ | Equipment + user rating recalc |
| 5.9 | **Frontend reviews UI** | ❌ | No dedicated reviews page/component in frontend; `EquipmentDetails.jsx` may show reviews but no "write review" UI or review listing page |
| 5.10 | **Review moderation admin page** | ❌ | Backend has full moderation API but no admin frontend for it |

---

## 6. Messaging & Chat

| # | Item | Status | Details |
|---|------|--------|---------|
| 6.1 | Real-time WebSocket chat | ✅ | Full chat endpoint with WS |
| 6.2 | Conversation management | ✅ | Create, list, paginate |
| 6.3 | Message sending/receiving | ✅ | Text + attachments |
| 6.4 | Typing indicators | ✅ | In-memory tracking |
| 6.5 | Unread count | ✅ | Per-conversation and total |
| 6.6 | Message search | ✅ | Search within conversation |
| 6.7 | Message edit/delete | ✅ | 15-min edit window |
| 6.8 | Emoji reactions | ✅ | Backend support |
| 6.9 | Archive/mute conversation | ✅ | Backend support |
| 6.10 | Chat UI (frontend) | ✅ | `Chat.jsx`, `ChatList.jsx`, `Messages.jsx`, `MessageFAB.jsx` |
| 6.11 | **File/image sharing in chat** | 🔧 | Backend supports `attachment_url` but no frontend upload UI in chat |
| 6.12 | **Read receipts display** | 🔧 | Backend marks `seen` but no visual indicator in UI |
| 6.13 | **Push notifications** | 🆕 | No browser push notification support |

---

## 7. Admin Panel

| # | Item | Status | Details |
|---|------|--------|---------|
| 7.1 | Admin dashboard with stats | ✅ | Users, equipment, bookings, revenue |
| 7.2 | User approval queue | ✅ | Approve/reject with email notification |
| 7.3 | Owner verification | ✅ | Status toggle |
| 7.4 | Equipment visibility control | ✅ | Show/hide from farmer marketplace |
| 7.5 | Reports & analytics | ✅ | Revenue, utilization, daily bookings chart |
| 7.6 | Newsletter subscriber management | ✅ | List, delete subscribers |
| 7.7 | Testimonials management | ✅ | CRUD operations |
| 7.8 | **Admin user management (edit/delete users)** | ❌ | Admin can approve/reject but cannot edit user details or delete accounts |
| 7.9 | **Admin booking management** | ❌ | Admin can view bookings in reports but cannot cancel/override/reassign bookings |
| 7.10 | **Audit log / activity log** | 🆕 | No admin action logging |
| 7.11 | **Bulk email / broadcast to users** | 🆕 | Newsletter exists but no general broadcast to registered users |
| 7.12 | **Content management (FAQ, Terms, etc.)** | 🆕 | All content is hardcoded; no CMS capability |
| 7.13 | **Review moderation UI** | ❌ | Backend moderation API exists but no admin page for it |

---

## 8. Search & Discovery

| # | Item | Status | Details |
|---|------|--------|---------|
| 8.1 | Basic text search | ✅ | Name + description regex |
| 8.2 | Category filter | ✅ | |
| 8.3 | Price range filter | ✅ | |
| 8.4 | Sort options | ✅ | Newest, rating, price asc/desc, name |
| 8.5 | Pagination | ✅ | |
| 8.6 | Advanced search (POST) | ✅ | Multi-filter: condition, rating, features |
| 8.7 | Search suggestions/autocomplete | ✅ | |
| 8.8 | Equipment comparison | ✅ | Compare 2-5 items side-by-side |
| 8.9 | Search history (save/view) | ✅ | Per-user search log |
| 8.10 | Location-based search | 🔧 | Backend ready (requires `GOOGLE_MAPS_API_KEY` + 2dsphere index); no frontend location picker |
| 8.11 | **Elasticsearch integration** | ❌ | `elasticsearch` in requirements + `ELASTICSEARCH_URL` config but zero search code uses it — all search is MongoDB regex |
| 8.12 | **Frontend comparison UI** | ❌ | Backend compare endpoint exists but no comparison page in frontend |
| 8.13 | **Saved searches / alerts** | 🆕 | History is saved but no "alert me when matching equipment is added" |

---

## 9. Email & Notification System

| # | Item | Status | Details |
|---|------|--------|---------|
| 9.1 | SMTP email service | ✅ | Full `EmailService` with templates |
| 9.2 | Registration confirmation email | ✅ | |
| 9.3 | Booking request/confirmation/rejection emails | ✅ | |
| 9.4 | Payment receipt email | ✅ | |
| 9.5 | Password reset email | ✅ | |
| 9.6 | Owner verification email | ✅ | |
| 9.7 | Newsletter welcome email | ✅ | |
| 9.8 | WebSocket notifications | 🔧 | `NotificationManager` broadcasts to ALL clients — no user-specific filtering |
| 9.9 | **In-app notification center** | ❌ | `NotificationContext.jsx` exists but no notification bell/dropdown UI, no persistent notification storage |
| 9.10 | **SMS notifications** | ❌ | `twilio` is in requirements.txt but zero code uses it |
| 9.11 | **Email template customization** | 🆕 | Jinja2 is available; templates are inline HTML strings — could be externalized |

---

## 10. Frontend UX & Pages

| # | Item | Status | Details |
|---|------|--------|---------|
| 10.1 | Homepage | ✅ | Premium redesign with glassmorphism and animations |
| 10.2 | Login / Register pages | ✅ | Role-specific login pages |
| 10.3 | Farmer dashboard | ✅ | Stats, bookings, featured equipment |
| 10.4 | Owner dashboard | ✅ | Listings, requests, rate snapshot |
| 10.5 | Admin dashboard | ✅ | Full governance suite |
| 10.6 | Browse equipment | ✅ | Grid with filters, sort, search |
| 10.7 | Equipment detail page | ✅ | |
| 10.8 | My bookings (farmer) | ✅ | |
| 10.9 | My equipment (owner) | ✅ | |
| 10.10 | Booking requests (owner) | ✅ | |
| 10.11 | Search results page | ✅ | |
| 10.12 | Messages / chat page | ✅ | |
| 10.13 | 404 page | ✅ | |
| 10.14 | Dark mode toggle | ✅ | `ThemeContext.jsx` |
| 10.15 | Toast notifications | ✅ | `ToastContext.jsx` |
| 10.16 | **User profile page** | ❌ | No `/profile` or `/settings` page — users have no way to view/edit their profile |
| 10.17 | **Checkout / payment page** | ❌ | No payment UI at all |
| 10.18 | **Review submission UI** | ❌ | No "write a review" form in frontend |
| 10.19 | **Equipment edit page** | ❌ | Owner cannot edit equipment (no backend endpoint either) |
| 10.20 | **Equipment comparison page** | ❌ | Backend API exists but no frontend page |
| 10.21 | **Favorites / wishlist page** | 🔧 | `FavoriteButton` + localStorage favorites exist but no dedicated `/favorites` page |
| 10.22 | **Responsive / mobile optimization** | 🔧 | Some responsive CSS exists but untested; no PWA support |
| 10.23 | **Loading skeletons consistency** | 🔧 | `PageSkeleton.jsx` + `Loader.jsx` exist but many pages show blank during load |
| 10.24 | **Breadcrumb navigation** | 🆕 | No breadcrumbs on inner pages |
| 10.25 | **Accessibility (a11y) audit** | 🆕 | No ARIA labels, keyboard nav, or screen reader support |

---

## 11. Infrastructure & DevOps

| # | Item | Status | Details |
|---|------|--------|---------|
| 11.1 | Docker Compose (MongoDB) | ✅ | Only MongoDB service |
| 11.2 | Demo seed data | ✅ | Mock users, equipment, bookings |
| 11.3 | Environment config (.env) | ✅ | Comprehensive settings |
| 11.4 | Rate limiting middleware | ✅ | Configurable via env |
| 11.5 | Security headers middleware | ✅ | |
| 11.6 | Request context middleware | ✅ | Request ID tracking |
| 11.7 | Error handling middleware | ✅ | Global exception handler |
| 11.8 | **Docker Compose — full stack** | ❌ | Only MongoDB in docker-compose; no backend/frontend services |
| 11.9 | **CI/CD pipeline** | ❌ | No GitHub Actions / pipeline config |
| 11.10 | **Production Dockerfile** | ❌ | No Dockerfile for backend or frontend |
| 11.11 | **Database indexes** | ❌ | No index creation script; geospatial 2dsphere index needed for location search |
| 11.12 | **Database migrations** | ❌ | No migration strategy; schema changes are manual |
| 11.13 | **Logging to file/service** | 🔧 | Logging configured but only to stdout; no file or external service |
| 11.14 | **Health check improvements** | 🔧 | Basic check exists; could add uptime, response time, DB latency |
| 11.15 | **SSL / HTTPS config** | 🆕 | No TLS setup documentation or config |
| 11.16 | **Backup strategy** | 🆕 | No database backup scripts or documentation |

---

## 12. Testing & Quality

| # | Item | Status | Details |
|---|------|--------|---------|
| 12.1 | Pytest setup | ✅ | Dependencies installed |
| 12.2 | **Backend unit tests** | ❌ | No test files found; zero test coverage |
| 12.3 | **Backend integration tests** | ❌ | No API endpoint tests |
| 12.4 | **Frontend tests** | ❌ | No React testing library / Jest tests |
| 12.5 | **E2E tests** | ❌ | No Cypress / Playwright tests |
| 12.6 | **API documentation** | 🔧 | FastAPI auto-docs at `/docs` but no custom API documentation |
| 12.7 | **Code linting enforcement** | 🔧 | Black, flake8, isort, mypy in requirements but no pre-commit hooks or CI lint step |

---

## 13. Background Jobs & Scheduled Tasks

| # | Item | Status | Details |
|---|------|--------|---------|
| 13.1 | Celery setup | 🔧 | `celery_app.py` exists with basic config but `CELERY_BROKER_URL` is empty — not functional |
| 13.2 | Media processing tasks | 🔧 | `media_tasks.py` has image processing code but depends on Celery which is unconfigured |
| 13.3 | **Booking reminder emails** | 🆕 | No scheduled job to remind about upcoming bookings |
| 13.4 | **Auto-expire old pending bookings** | 🆕 | No cleanup job |
| 13.5 | **Report generation (scheduled)** | 🆕 | Reports are on-demand only |

---

## 14. Unused Dependencies (Clean Up)

These packages are in `requirements.txt` but have **zero usage** in the codebase:

| Package | Purpose | Status |
|---------|---------|--------|
| `paypalrestsdk` | PayPal payments | ❌ Not used |
| `twilio` | SMS notifications | ❌ Not used |
| `elasticsearch` | Full-text search | ❌ Not used |
| `slowapi` | Rate limiting | ❌ Not used (custom middleware instead) |
| `celery` | Background jobs | 🔧 Configured but not functional |

---

## 15. High-Priority Action Items (Recommended Next Steps)

### 🔴 Critical (Core functionality gaps)
1. ~~**Add equipment edit/update endpoint**~~ ✅ Done — `PUT /equipment/{id}` + frontend wired
2. ~~**Add booking cancel endpoint**~~ ✅ Done — `POST /bookings/{id}/cancel` + BookingCard wired
3. ~~**Add booking completion endpoint**~~ ✅ Done — `POST /bookings/{id}/complete` + BookingCard wired
4. ~~**Fix booking date conflict detection**~~ ✅ Done — overlap check in create + `/check-availability` API
5. **Build payment/checkout UI** — backend is ready but frontend has no payment flow
6. ~~**Fix payment service URL mismatch**~~ ✅ Done — frontend already uses correct `/payments/create-intent`

### 🟡 Important (User experience gaps)
7. ~~**Add user profile page + edit endpoint**~~ ✅ Done — `PUT /users/me` + `POST /users/me/change-password`
8. **Build review submission UI** — backend review system is complete but no frontend form
9. **Add review moderation admin page** — moderation API is unused without UI
10. ~~**Fix equipment category mismatch**~~ ✅ Done — enum aligned to `tractor|harvester|seeder|tillage|irrigation|crop_care`
11. **Target WebSocket notifications** — currently broadcasts to all clients instead of intended user
12. **Add favorites/wishlist page** — favorite button works but no page to see all saved items

### 🟢 Nice to Have (Feature additions)
13. Build equipment comparison page (backend ready)
14. Add notification center / bell icon with history
15. Implement location-based search frontend (map picker)
16. Add structured equipment specs (HP, weight, year, etc.)
17. Add breadcrumb navigation on inner pages
18. Set up unit tests for critical backend endpoints
19. Create full-stack Docker Compose for deployment
20. Add database index creation script

---

## 16. UI Implementation Roadmap

### 16.1 Missing Pages (Need to Build from Scratch)

| # | Page | Route | Priority | Backend Ready? | Implementation Notes |
|---|------|-------|----------|----------------|---------------------|
| 16.1.1 | **User Profile / Settings** | `/profile` or `/settings` | ✅ Done | ❌ No edit endpoint | UI Built. Requires new `PUT /users/me` backend endpoint |
| 16.1.2 | **Payment Checkout Page** | `/checkout/:bookingId` | ✅ Done | ✅ Stripe backend | UI mock created and confirms simulated payment |
| 16.1.3 | **Payment History Page** | `/farmer/payments` or `/payments` | ✅ Done | ✅ `GET /payments/history` exists | UI Built |
| 16.1.4 | **Write Review Page** | `/review/:bookingId` | ✅ Done | ✅ Full review API | UI Built, triggers from completed `BookingCard` |
| 16.1.5 | **Equipment Reviews Page** | `/equipment/:id/reviews` | ✅ Done | ✅ `GET /reviews/equipment/:id` | Already in EqDetails. |
| 16.1.6 | **Equipment Comparison Page** | `/compare` | ✅ Done | ✅ `POST /equipment/compare` | UI Built |
| 16.1.7 | **Favorites / Wishlist Page** | `/favorites` | ✅ Done | 🔧 localStorage only | UI Built |
| 16.1.8 | **Equipment Edit Page** | `/owner/equipment/:id/edit` | ✅ Done | ❌ No update endpoint | UI Built, simulates backend |
| 16.1.9 | **Review Moderation Admin Page** | `/admin/reviews` | ✅ Done | ✅ Full moderation API | UI Built |
| 16.1.10 | **About / Contact Page** | `/about` | ✅ Done | N/A | UI Built |
| 16.1.11 | **Terms & Privacy Page** | `/terms`, `/privacy` | ✅ Done | N/A | UI Built |
| 16.1.12 | **FAQ / Help Center Page** | `/help` or `/faq` | ✅ Done | N/A | UI Built |

### 16.2 Missing Components (Reusable UI Elements)

| # | Component | Used By | Priority | Implementation Notes |
|---|-----------|---------|----------|---------------------|
| 16.2.1 | **StarRatingInput** | Review form | 🔴 High | Interactive 1-5 star selector with hover preview, half-star support optional |
| 16.2.2 | **StarRatingDisplay** | Equipment detail, review cards | 🔴 High | Read-only star display with numeric value, used in cards and detail pages |
| 16.2.3 | **NotificationBell** | Navbar | 🟡 Medium | Bell icon with unread badge count. `NotificationContext.jsx` has state + WS connection but **zero UI** renders it — notifications only show as toasts. Needs dropdown panel with notification list, clear all, mark read |
| 16.2.4 | **StripeCheckoutForm** | Checkout page | 🔴 High | Stripe Elements `CardElement`, payment form with error handling. Requires `@stripe/react-stripe-js` + `@stripe/stripe-js` packages |
| 16.2.5 | **ReviewCard** | Reviews page, equipment detail | 🟡 Medium | Rating stars, reviewer name, date, comment, photos carousel, owner response section |
| 16.2.6 | **RatingBreakdown** | Equipment detail, reviews page | 🟡 Medium | Horizontal bar chart showing 1-5 star distribution (like Amazon) |
| 16.2.7 | **ImageGallery / Lightbox** | Equipment detail | 🟡 Medium | Click-to-expand thumbnails. Currently uses static `SmartImage` grid with no modal zoom |
| 16.2.8 | **DateRangePicker** | Booking form, availability | 🟡 Medium | Calendar-style picker replacing plain `<input type="date">`, with blocked-out dates for availability |
| 16.2.9 | **FileDropZone** | Equipment add/edit, review photo upload | 🟡 Medium | Drag-and-drop file upload with preview, progress bar. Current image upload is URL-only or AI-generated |
| 16.2.10 | **Breadcrumbs** | All inner pages | 🟢 Low | `Home > Farmer > Bookings` style navigation trail |
| 16.2.11 | **ConfirmDialog** | Delete actions, cancel booking | 🟡 Medium | Reusable confirmation modal. `Modal.jsx` exists but only used for logout; delete/cancel actions have no confirmation |
| 16.2.12 | **EmptyState (enhanced)** | Multiple pages | 🟢 Low | Current `EmptyState.jsx` is minimal (12 lines). Needs illustrations, suggested actions |
| 16.2.13 | **Pagination** | Browse, bookings, reviews, admin tables | 🟡 Medium | `BrowseEquipment.jsx` has pagination but other list pages (bookings, admin equipment, reviews) don't — they dump everything |
| 16.2.14 | **UserAvatar** | Navbar, chat, review cards | 🟢 Low | Profile picture circle with initials fallback. Currently only shows text "Profile" in navbar |
| 16.2.15 | **StatusTimeline** | Booking detail | 🟢 Low | Visual timeline: Created → Pending → Approved → Paid → Active → Completed |

### 16.3 Existing Page Enhancements

| # | Page | Current State | What's Missing |
|---|------|--------------|----------------|
| 16.3.1 | **EquipmentDetails.jsx** | Shows details, booking form, gallery | ❌ No reviews section, ❌ No availability calendar, ❌ Gallery images are hardcoded stock photos per category (not actual equipment photos), ❌ No "similar equipment" recommendations |
| 16.3.2 | **BookingCard.jsx** | Shows status, dates, amount, pay button | ❌ Pay button calls wrong API URL and has no real Stripe flow (just shows a toast), ❌ No cancel button, ❌ No "write review" link for completed bookings, ❌ No booking detail expansion |
| 16.3.3 | **MyBookings.jsx** | Lists all bookings as cards | ❌ No status filter tabs (All / Pending / Confirmed / Completed), ❌ No date range filter, ❌ No pagination (dumps all bookings) |
| 16.3.4 | **BookingRequests.jsx** (owner) | Lists pending requests with approve/reject | ❌ No distinction between new/old requests, ❌ No calendar view of upcoming bookings |
| 16.3.5 | **BrowseEquipment.jsx** | Search, filters, sort, pagination | ❌ No map view option for location-based browse, ❌ No "compare" checkbox on cards, ❌ No saved search alerts |
| 16.3.6 | **Navbar.jsx** | Logo, links, search, profile dropdown | ❌ No notification bell/badge, ❌ Profile dropdown has no "My Profile" link (only dashboard + logout), ❌ Mobile hamburger menu has no search bar |
| 16.3.7 | **AdminDashboard.jsx** | Stats, user approval, equipment visibility | ❌ No revenue chart visualization (data available from `/admin/reports` but shown as numbers only), ❌ No recent activity feed |
| 16.3.8 | **Messages.jsx** | Full chat interface | ❌ No image/file send button in chat, ❌ No read receipts indicator, ❌ No emoji picker (backend supports reactions), ❌ No message search UI |
| 16.3.9 | **AddEquipment.jsx** | Form with templates + AI image | ❌ No multi-image upload, ❌ No direct file upload (only URL or AI-generated), ❌ No location picker (just text input) |
| 16.3.10 | **Footer.jsx** | Newsletter, links, contact | ❌ Social links point to generic `.com` (not actual accounts), ❌ Privacy Policy link goes nowhere |

### 16.4 Design System & Styling Improvements

| # | Item | Current State | Recommendation |
|---|------|--------------|----------------|
| 16.4.1 | **Icon system** | Using emoji (⏳, ✅, ❌, 💰, 👤, 📍, etc.) throughout UI | Migrate to proper icon library (Lucide, Heroicons, or react-icons) for consistency and scalability |
| 16.4.2 | **Color palette consistency** | `index.css` (75KB) + `premium-updates.css` (18KB) with overlapping styles | Consolidate into CSS custom properties; remove duplication between the two CSS files |
| 16.4.3 | **Loading states** | `Loader.jsx` (spinner), `PageSkeleton.jsx` (simple skeleton) | Add content-specific skeletons (card skeleton, table skeleton, form skeleton) with shimmer animation |
| 16.4.4 | **Error states** | Global error banner in App.jsx; individual pages use `error-banner` class | Add dedicated error illustrations, retry buttons, and contextual error messages per page |
| 16.4.5 | **Animation library** | CSS transitions on `.hover-lift`, basic keyframes | Add micro-interactions: button press feedback, page transitions, card entrance animations, skeleton shimmer |
| 16.4.6 | **Typography scale** | Mix of inline styles and CSS classes | Standardize heading sizes, body text, captions into defined CSS utility classes |
| 16.4.7 | **Form validation UX** | Forms show errors only after submit (backend 400 response) | Add inline field validation: required indicators, character counts, real-time format checks |
| 16.4.8 | **Data visualization** | Admin reports show raw numbers; daily bookings are just a number array | Add chart library (Chart.js or Recharts) for: revenue line chart, booking bar chart, rating distribution, user growth |

### 16.5 Mobile & Responsive Design

| # | Item | Current State | What's Needed |
|---|------|--------------|---------------|
| 16.5.1 | **Mobile navigation** | Hamburger toggle exists; `.nav-links.open` shows/hides | Test and fix: search bar not in mobile menu, profile dropdown may overflow, touch targets may be too small |
| 16.5.2 | **Dashboard mobile layout** | `DashboardShell` sidebar + main content | Sidebar should collapse to bottom tabs or hamburger drawer on mobile |
| 16.5.3 | **Equipment cards mobile** | `feature-grid` CSS grid layout | Cards may stack with inconsistent spacing; needs testing with various screen sizes |
| 16.5.4 | **Form layouts mobile** | `.form-grid.two-col` used for Add Equipment | Two-column forms should stack to single column on mobile |
| 16.5.5 | **Chat mobile experience** | Chat + ChatList as separate sections | On mobile, should be full-screen with back navigation between conversation list and chat view |
| 16.5.6 | **Tables responsiveness** | `<table>` elements in dashboards and booking lists | Tables overflow horizontally on mobile; needs horizontal scroll wrapper or card-based layout for small screens |
| 16.5.7 | **PWA support** | None | Add `manifest.json`, service worker, offline fallback page, install prompt for mobile app-like experience |

### 16.6 Accessibility (a11y) Requirements

| # | Item | Current State | What's Needed |
|---|------|--------------|---------------|
| 16.6.1 | **ARIA labels** | Minimal — only logout modal has `role="menu"` and `aria-haspopup` | Add `aria-label` to all icon buttons, navigation landmarks, form fields, status badges |
| 16.6.2 | **Keyboard navigation** | Not tested | Ensure all interactive elements are focusable, modals trap focus, dropdown menus are keyboard-navigable |
| 16.6.3 | **Focus indicators** | Browser defaults | Add visible custom focus rings that match the design system |
| 16.6.4 | **Screen reader support** | No `sr-only` text, no live regions | Add visually hidden text for icon-only buttons, announce toast notifications with `aria-live` |
| 16.6.5 | **Color contrast** | Glassmorphism styles may have low contrast on light backgrounds | Audit all text against WCAG AA standards (4.5:1 ratio); fix muted text especially |
| 16.6.6 | **Alt text** | `SmartImage` has alt props; some are generic ("Field planning", "Admin analytics") | Make alt text descriptive and unique per context |
| 16.6.7 | **Skip navigation link** | Not present | Add "Skip to main content" link at top of page for keyboard users |

---

*This document should be updated as features are completed or new requirements emerge.*
