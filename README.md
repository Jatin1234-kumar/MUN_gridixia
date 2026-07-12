# MUN Gridixia

MUN Gridixia is a full-stack conference and delegation management platform for a Model United Nations workflow. The app is split into a React frontend and an Express/MongoDB backend, with support for authentication, event and delegate management, committee workflows, payments, certificates, notifications, and operational monitoring.

## Tech Stack

- Frontend: React, TypeScript, Vite, Tailwind CSS, React Router, TanStack Query
- Backend: Node.js, Express, TypeScript, Mongoose, BullMQ, Redis
- Services: Razorpay, Cloudinary, Resend, Sentry
- Tooling: npm workspaces, ESLint, Prettier, Jest

## Project Structure

- `frontend/` - Vite SPA for the user-facing dashboard and public pages
- `backend/` - Express API, MongoDB models, background workers, and business logic
- `docker-compose.yml` - local Redis service for queues and workers

## Features

- Authentication and session handling
- Delegate, committee, and event management
- Dashboard analytics and monitoring views
- Payments and webhook handling
- Certificate generation and QR utilities
- Email delivery and queue-based background jobs
- Role-based middleware and validation

## Prerequisites

- Node.js 18+ recommended
- npm 9+
- MongoDB instance
- Redis instance
- Optional integrations depending on the features you use:
  - Razorpay
  - Cloudinary
  - Resend
  - Sentry

## Setup

Install dependencies from the repo root:

```bash
npm install
```

If you want the local Redis container, start it with:

```bash
docker compose up -d redis
```

## Environment Variables

Create a backend `.env` file with the following values:

```env
NODE_ENV=development
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_ACCESS_SECRET=your_access_secret_with_at_least_32_chars
JWT_REFRESH_SECRET=your_refresh_secret_with_at_least_32_chars
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_SECRET=your_razorpay_secret
RAZORPAY_WEBHOOK_SECRET=your_razorpay_webhook_secret
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
REDIS_URL=your_redis_connection_string
RESEND_API_KEY=your_resend_api_key
EMAIL_FROM=no-reply@example.com
CORS_ORIGINS=http://localhost:5173
SENTRY_DSN=
SUPER_ADMIN_EMAIL=
SUPER_ADMIN_PASSWORD=
SUPER_ADMIN_FIRST_NAME=
SUPER_ADMIN_LAST_NAME=
```

For the frontend, optionally set:

```env
VITE_API_BASE_URL=http://localhost:5000/api
```

## Development

Run both apps together from the repo root:

```bash
npm run dev
```

Or run them separately:

```bash
npm run dev --workspace=backend
npm run dev --workspace=frontend
```

## Build

Build both workspaces:

```bash
npm run build
```

## Lint

Run linting across all workspaces:

```bash
npm run lint
```

## Testing

Backend tests run with Jest:

```bash
npm run test --workspace=backend
```

## Notes

- The backend validates its environment variables at startup, so missing or invalid values will stop the server immediately.
- The frontend uses a shared API client with automatic token refresh and CSRF header support.
- Redis is used for queue-backed workers such as email, certificates, QR generation, and other background jobs.

## License

No license file is currently included in this repository.
