# Backend API

Minimal Express API foundation with security headers, JSON parsing, CORS configuration, and a health endpoint.

```bash
cp .env.example .env
npm install
npm run dev
```

Test: `GET http://localhost:4000/api/health`

MySQL is selected for the project but is not connected yet. Next backend milestone: connection pool, schema/migrations, authentication, and server-side role authorization. Do not deploy this starter as a production API.
