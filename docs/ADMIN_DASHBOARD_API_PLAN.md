# Admin Dashboard API Plan — Draft 0.1

This is the proposed API contract for the first dashboard backend milestone. It is planning documentation, not a claim that these endpoints are implemented.

## Principles
- Protected routes require authentication and server-side role authorization.
- Owner and calling-team permissions differ; agents see assigned/authorized leads only.
- The client never decides a user's role or commission amount.
- Lead submitter identity is immutable by default after creation.
- Status changes and financial actions must be auditable.
- List endpoints support pagination, search, and filters.
- Errors use a consistent shape: `{ "error": { "code": "...", "message": "..." } }`.
- Sensitive contact details are limited to roles that need them.

## Initial endpoint inventory

### Health and authentication
- `GET /api/health` — public service health check.
- `POST /api/auth/register/associate` — open Associate registration.
- `POST /api/auth/register/team-member` — Team Member registration; requires valid owner-issued authorization code.
- `POST /api/auth/login` — login.
- `POST /api/auth/logout` — invalidate session/refresh token as applicable.
- `GET /api/auth/me` — current account and role.

### Admin and members
- `GET /api/admin/overview` — summary KPIs for authorized admin.
- `GET /api/admin/members` — paginated member directory; filter by role/status.
- `GET /api/admin/members/:id` — permitted member details.
- `PATCH /api/admin/members/:id/status` — activate/suspend with reason and audit record.
- `GET /api/admin/team-member-codes` — list code metadata; never return stored plaintext codes.
- `POST /api/admin/team-member-codes` — create code with expiry and usage limit.
- `POST /api/admin/team-member-codes/:id/revoke` — revoke unused code.

### Leads and calling operations
- `GET /api/leads` — paginated lead list scoped by role/assignment.
- `POST /api/leads` — create lead for authenticated submitter.
- `GET /api/leads/:id` — view authorized lead details.
- `PATCH /api/leads/:id` — edit allowed fields according to policy.
- `POST /api/leads/:id/assign` — assign a calling agent.
- `POST /api/leads/:id/call-logs` — record call outcome and follow-up.
- `POST /api/leads/:id/status` — change status using allowed transition and record history.
- `POST /api/leads/:id/verify-completion` — authorized completion verification.
- `GET /api/leads/:id/history` — status and activity history for authorized users.

### Services, commissions, and payouts
- `GET /api/admin/service-types` — list service categories and fixed commission settings.
- `POST /api/admin/service-types` — create/update service type and fixed commission amount.
- `GET /api/admin/commissions` — filter by status/member/date.
- `POST /api/admin/commissions/:id/approve` — owner-only approval.
- `POST /api/admin/commissions/:id/reject` — owner-only rejection with reason.
- `POST /api/admin/commissions/:id/payouts` — owner-only manual payout record.
- `GET /api/commissions/me` — member's own commission history.
- `GET /api/payouts` — owner-only payout ledger.

### Reports and audit
- `GET /api/admin/reports/leads` — lead summary report.
- `GET /api/admin/reports/commissions` — commission and payout summary.
- `GET /api/admin/audit-logs` — restricted audit trail.

## Initial data entities
`users`, `team_relationships` (only when an explicit Team Member-managed association is intended), `team_member_codes`, `service_types`, `leads`, `lead_status_history`, `call_logs`, `services`, `commissions`, `payouts`, `notifications`, `audit_logs`.

## Decisions still needed from client
1. Exact lead fields for local, intercity, and international services.
2. Duplicate-lead resolution and claim window.
3. Which lead statuses calling agents may set.
4. Evidence required to verify completion.
5. Fixed commission amount for each service type.
6. Cancellation/refund effect on commission eligibility.
7. Whether members can edit/withdraw submitted leads.
8. Whether phone, email, or both are mandatory at registration.
9. Data retention and deletion rules for sensitive family/service details.

## Definition of done for API integration
- Endpoint behavior and validation are documented.
- Role and ownership checks are tested at API level.
- Loading, error, empty, and success states are handled in the admin UI.
- Financial actions are transactional and audit logged.
- Automated tests cover unauthorized access, duplicate commission prevention, and payout permissions.
