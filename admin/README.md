# Admin web panel

React + Vite admin dashboard for the owner and calling team.

## Run locally
```bash
npm install
npm run dev
```

## Dashboard pages in this milestone
- Overview
- Leads (search and status filter UI; no live records yet)
- Members (search and role filter UI; no live records yet)
- Service types
- Commissions & payouts
- Settings and Help & notes

The Overview page checks `GET /api/health` on `http://localhost:4000` by default. Set `VITE_API_BASE_URL` in an `.env` file to change the API base URL.

## Current scope boundary
This is an interactive dashboard shell. Search/filter controls currently operate on the empty-state UI; authentication, protected API data, writes, database persistence, and financial actions are not implemented yet. Do not use it as a production admin panel until server-side authentication and authorization are implemented and tested.
