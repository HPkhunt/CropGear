# API Reference

## Base URL

```
http://127.0.0.1:8000/api/v1
```

## Authentication

All protected endpoints require a JWT Bearer token:
```
Authorization: Bearer <token>
```

---

## Auth Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/auth/login` | Login with email/password | No |
| POST | `/auth/register` | Create new account | No |
| POST | `/auth/verify-otp` | Verify email OTP | No |
| POST | `/auth/forgot-password` | Request password reset | No |
| POST | `/auth/reset-password` | Reset with token | No |
| POST | `/auth/logout` | Invalidate session | Yes |

## User Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/users/me` | Get current user profile | Yes |
| GET | `/users/{id}` | Get user by ID | Yes |
| GET | `/users/` | List all users | Admin |

## Equipment Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/equipment/list` | List all equipment | No |
| GET | `/equipment/{id}` | Get equipment details | No |
| POST | `/equipment/browse` | Browse with filters | No |
| POST | `/equipment/advanced-search` | Advanced search | No |
| POST | `/equipment/location-search` | Search by location | No |
| POST | `/equipment/upload-image` | Upload equipment image | Owner |
| DELETE | `/equipment/{id}` | Delete equipment | Owner |

## Booking Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/bookings/` | List my bookings | Yes |
| POST | `/bookings/` | Create a booking | Farmer |
| GET | `/bookings/{id}` | Get booking details | Yes |
| POST | `/bookings/{id}/approve` | Approve booking | Owner |
| POST | `/bookings/{id}/reject` | Reject booking | Owner |

## Payment Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/payments/create-intent` | Create Stripe payment intent | Yes |
| POST | `/payments/confirm` | Confirm payment | Yes |
| GET | `/payments/history` | Get payment history | Yes |
| POST | `/payments/webhook` | Stripe webhook | No |

## Review Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/reviews/submit` | Submit a review | Yes |
| POST | `/reviews/respond` | Owner responds to review | Owner |
| POST | `/reviews/flag` | Flag a review | Yes |
| GET | `/reviews/moderation` | Moderation queue | Admin |

## Chat Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/chat/conversations` | Create conversation | Yes |
| GET | `/chat/conversations` | List conversations | Yes |
| GET | `/chat/conversations/{id}/messages` | Message history | Yes |
| POST | `/chat/messages` | Send a message | Yes |
| GET | `/chat/unread` | Unread count | Yes |
| WS | `/chat/conversations/{id}/ws` | Real-time WebSocket | Token |

## Admin Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/admin/dashboard` | Dashboard statistics | Admin |
| POST | `/admin/verify-owner` | Verify equipment owner | Admin |
| POST | `/admin/approve-user` | Approve/reject user | Admin |
| POST | `/admin/equipment-visibility` | Toggle equipment visibility | Admin |
