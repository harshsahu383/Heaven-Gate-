# Initial Product Requirements

## Roles
- Owner/Admin: full administration, authorization-code issuance, lead oversight, commission approval, payout recording.
- Calling Agent: access assigned/authorized leads, log calls, update permitted operational statuses; no payout authority by default.
- Team Member: must register using an owner-issued authorization code; may submit personal leads and manage associates if enabled.
- Associate Member: open registration; independent by default; may submit personal leads; cannot create a team or add members.

## Core rules
- Commission is a fixed amount per eligible completed service.
- Commission belongs to the eligible original lead submitter, not their team relationship.
- Owner manually approves commissions and records payouts.
- Completion must be verified by authorized staff.
- Prevent duplicate commission records for one eligible service.
- Keep an audit history for status and financial changes.
- Apply role-based access on the server, not only in the UI.

## MVP modules
1. Registration, login, and role selection
2. Owner-issued Team Member authorization codes
3. Member profiles and Team Member/Associate management
4. Lead submission and duplicate review
5. Calling queue, call logs, follow-up dates, and status history
6. Service completion verification
7. Fixed commission rules, approval, and payout ledger
8. Notifications and basic reports

## Open decisions before production
- Actual fixed commission amounts by service type
- Contact verification method and account recovery policy
- Exact lead fields for local and international services
- Duplicate lead resolution and ownership disputes
- Cancellation/refund treatment after commission approval
- Privacy, retention, and deletion policy
- Hosting, backups, maintenance, and app publishing ownership
