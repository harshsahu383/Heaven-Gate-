# Admin Dashboard API Reference

This document describes the API routes currently implemented by the backend and identifies the routes called by the admin dashboard. It replaces the earlier proposed API inventory; a route listed as implemented is not necessarily wired into the current dashboard UI.

## Base URL and conventions

- Local backend base URL: `http://localhost:4000`.
- The admin client can override this with `VITE_API_BASE_URL`.
- JSON request bodies use `Content-Type: application/json`.
- Authenticated requests use `Authorization: Bearer <token>`.
- Login tokens expire after 8 hours. `GET /api/health` and `GET /api/health/db` are public.
- Most routes return `{ "success": true, ... }` or `{ "success": false, "message": "..." }`. Some service-type update errors/responses currently omit `success`; clients should check the HTTP status as well.
- Common errors include `400` (invalid input), `401` (missing/invalid credentials or token), `403` (role not allowed), `404` (record not found), `409` (conflict/state restriction), and `500` (server error). The database health check returns `503` when the database check fails.
- **Dashboard uses** means the current admin frontend calls that route. **Backend only** means the route is implemented but not currently called by the admin frontend.

## Endpoint index

| Method | Endpoint | Purpose | Admin dashboard |
|---|---|---|---|
| `GET` | `/api/health` | API liveness | Uses for connection check |
| `GET` | `/api/health/db` | Database health check | Backend only |
| `POST` | `/api/auth/login` | Sign in and get a token | Uses |
| `GET` | `/api/auth/me` | Get the signed-in account | Uses |
| `POST` | `/api/auth/register/team-member` | Register with an owner-issued code | Backend only (registration client) |
| `GET` | `/api/admin/overview` | Dashboard counts | Uses |
| `GET` | `/api/admin/members` | List and group members | Uses |
| `GET` | `/api/admin/members/:id` | Member profile and summary | Uses |
| `GET` | `/api/admin/members/:id/associates` | Associates linked to a Team Member | Uses |
| `GET` | `/api/admin/members/:id/leads` | Leads submitted by a member | Uses |
| `PATCH` | `/api/admin/members/:id/associate` | Link/unlink an Associate | Backend only |
| `GET` | `/api/admin/leads` | Search/filter lead list | Uses |
| `POST` | `/api/admin/leads` | Register a lead | Backend only |
| `GET` | `/api/admin/leads/:id` | Lead details and status history | Uses |
| `PATCH` | `/api/admin/leads/:id/status` | Update status and complete a lead | Uses |
| `GET` | `/api/admin/service-types` | List service types | Uses |
| `GET` | `/api/admin/service-types/:id` | Get one service type | Backend only |
| `POST` | `/api/admin/service-types` | Create a service type | Uses |
| `PUT` | `/api/admin/service-types/:id` | Edit a service type | Uses |
| `PATCH` | `/api/admin/service-types/:id/status` | Activate/deactivate a service type | Uses |
| `DELETE` | `/api/admin/service-types/:id` | Delete an unused service type | Uses |
| `GET` | `/api/admin/commissions` | List/filter commissions | Uses |
| `GET` | `/api/admin/commissions/:id` | Get commission details | Backend only |
| `PATCH` | `/api/admin/commissions/:id/approve` | Approve a pending commission | Uses |
| `PATCH` | `/api/admin/commissions/:id/reject` | Reject a pending commission | Uses |
| `PATCH` | `/api/admin/commissions/:id/pay` | Mark an approved commission as paid | Uses |
| `POST` | `/api/admin/team-registration-codes` | Create a Team Member registration code | Backend only |

All `/api/admin/*` routes require an active authenticated admin unless a route's access rule below explicitly allows additional roles.

## Health and authentication

### `GET /api/health`

Public API liveness check. Returns `status`, service name, and current timestamp.

### `GET /api/health/db`

Public database health check. Returns database status and the table count when the check succeeds; returns `503` when it fails.

### `POST /api/auth/login` — dashboard uses

Request:

```json
{
  "email": "admin@example.com",
  "password": "your-password"
}
```

Success returns `{ success, message, token, user }`. The dashboard stores the token and sends it as a Bearer token. Invalid credentials or an inactive account return `401`.

### `GET /api/auth/me` — dashboard uses

Requires a Bearer token. Returns the authenticated active account in `user` (`id`, `fullName`, `email`, `role`). The dashboard calls this when restoring/checking the signed-in session.

### `POST /api/auth/register/team-member` — backend only

Public registration endpoint for a Team Member. It requires `full_name`, `email`, `password` (8–72 UTF-8 bytes), and `registrationCode`; `phone` is optional. The registration code must be valid, active, unused, and unexpired. The server assigns the role; the client cannot choose it. Success returns `201` and the new user. Duplicate email returns `409`.

## Dashboard overview and members

### `GET /api/admin/overview` — dashboard uses

Admin-only. Returns `data.totalLeads`, `data.totalMembers`, and `data.totalServices`.

### `GET /api/admin/members` — dashboard uses

Admin-only. Returns members grouped in `data.teamMembers`, `data.independentAssociates`, and `data.otherMembers`. Team Member objects include their linked associates.

### `GET /api/admin/members/:id` — dashboard uses

Admin-only. Returns `data.member` (profile and parent Team Member fields), `data.associateCount`, and `data.leadSummary` (`total`, `completed`, `cancelled`, `inProgress`).

### `GET /api/admin/members/:id/associates` — dashboard uses

Admin-only. Returns the Associate list and count for the specified Team Member. The ID must belong to a Team Member.

### `GET /api/admin/members/:id/leads` — dashboard uses

Admin-only. Returns the member and the leads submitted directly by that member, including status, service amount, and service name.

### `PATCH /api/admin/members/:id/associate` — backend only

Admin-only. Link an Associate to an active Team Member or remove the relationship.

Request to link:

```json
{ "parent_member_id": 12 }
```

Request to unlink:

```json
{ "parent_member_id": null }
```

`:id` is the Associate ID. The parent must be an active Team Member. Returns the updated Associate and parent IDs.

## Leads

### `GET /api/admin/leads` — dashboard uses

Admin-only. Returns up to 100 leads, newest first. Optional query parameters:

- `status`: one of `new`, `under_review`, `contacted`, `follow_up`, `service_confirmed`, `completed`, `cancelled`; omit or use `all` for every status.
- `search`: matches lead code, customer name, phone, email, or hospital/location.

The dashboard currently loads this list and applies its search/status filters in the client.

### `POST /api/admin/leads` — backend only

Requires an authenticated `admin`, `team_member`, or `associate`. Creates a lead; the submitter is taken from the token, not from the request body. Required fields: `customer_name`, `customer_phone`, and `service_type_id` for an active service. Optional fields: `customer_email`, `hospital_or_location`, `pickup_location`, `destination`, `scheduled_at`, `notes`, and `service_amount`.

`service_amount`, when supplied, must be a finite positive amount with at most two decimal places and no greater than `99999999.99`. It is saved with the lead so completion can use it. New leads start with status `new`. Success returns `201` and the new lead ID, status, and saved amount.

### `GET /api/admin/leads/:id` — dashboard uses

Requires an admin or the assigned calling agent. Returns `data.lead` (including `service_amount`) and `data.statusHistory`.

### `PATCH /api/admin/leads/:id/status` — dashboard uses

Requires an admin or the assigned calling agent to update a lead. Only an admin can set status to `completed`. The dashboard sends:

```json
{
  "status": "completed",
  "notes": "Service completed",
  "service_amount": 12500
}
```

`notes` is optional. For completion, `service_amount` must be positive, valid to two decimal places, and no greater than `99999999.99`. If omitted or `null`, the API uses the amount stored on the lead. The dashboard's completion form pre-fills the stored amount where available and sends the value entered by the admin.

Completing a lead stores the final amount, updates the status, records status history, and creates a pending commission for the lead submitter in one transaction. A duplicate commission or invalid status transition returns a conflict/error rather than creating a second commission.

## Service types

All service-type routes require an admin Bearer token.

### `GET /api/admin/service-types` — dashboard uses

Returns the service types. Optional query parameters: `search` (name match) and `status` (`active`, `inactive`, or `all`).

### `GET /api/admin/service-types/:id` — backend only

Returns one service type in `data`.

### `POST /api/admin/service-types` — dashboard uses

Creates a service type.

```json
{
  "name": "Local transport",
  "description": "Optional description",
  "commission_percentage": 5
}
```

`name` is required (maximum 150 characters); `description` may be text or `null`; `commission_percentage` must be from 0 to 100 with up to two decimal places. Success returns `201` and the created service in `data`.

### `PUT /api/admin/service-types/:id` — dashboard uses

Updates the service type using the same `name`, `description`, and `commission_percentage` fields as creation. The dashboard submits all three fields. Duplicate names return `409`; a missing service returns `404`.

### `PATCH /api/admin/service-types/:id/status` — dashboard uses

Sets whether a service type is active:

```json
{ "is_active": 1 }
```

`is_active` accepts `0`, `1`, `true`, or `false`. Returns the updated service in `data`.

### `DELETE /api/admin/service-types/:id` — dashboard uses

Deletes a service type only when it is not linked to existing leads/records. The currently authenticated admin's password is required:

```json
{ "password": "your-password" }
```

Returns `409` if the service is in use; deactivate it instead.

## Commissions

All commission routes require an admin Bearer token.

### `GET /api/admin/commissions` — dashboard uses

Returns up to 100 commissions, newest first. Optional query parameters:

- `status`: `pending`, `approved`, `paid`, `rejected`, or `all`.
- `member_id`: filter by the eligible member's ID.
- `search`: match lead code, customer name, or eligible member name.

### `GET /api/admin/commissions/:id` — backend only

Returns one commission with related lead, service, eligible member, approver, and payer details in `data`.

### `PATCH /api/admin/commissions/:id/approve` — dashboard uses

Approves a pending commission. No request body is required. Only `pending` commissions can be approved; success returns the new status and approving admin.

### `PATCH /api/admin/commissions/:id/reject` — dashboard uses

Rejects a pending commission. Requires a non-empty `rejection_reason` (maximum 5000 characters):

```json
{ "rejection_reason": "Reason for rejection" }
```

### `PATCH /api/admin/commissions/:id/pay` — dashboard uses

Marks an approved commission as paid. No request body is required. Only `approved` commissions can be marked paid.

## Team Member registration codes

### `POST /api/admin/team-registration-codes` — backend only

Admin-only. Generates a one-time registration code. Optional request body:

```json
{ "expiresInHours": 72 }
```

`expiresInHours` must be an integer from 1 to 720; the default is 72. The plain-text code is returned only in the creation response. The database stores its hash.

## Implemented but not currently provided by the dashboard

The backend currently has no admin UI call for linking/unlinking Associates or generating Team Member registration codes. The admin UI also does not call the single-service or single-commission detail endpoints. Lead creation is available as an API, but it is not called by the current admin dashboard frontend. The associate self-registration endpoint, commission reports, audit-log endpoints, payout ledger, and separate lead assignment/call-log endpoints from the earlier draft are not implemented in the current backend.
