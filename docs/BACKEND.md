# Backend Documentation

This document describes the backend implementation of **MUN Gridixia**.
The backend is built with **Node.js**, **Express.js**, **TypeScript**,
**MongoDB (Mongoose)**, **BullMQ**, and **Redis**.

---

# 1. Folder Structure

    backend/src/
    ├── app.ts
    ├── server.ts
    ├── config/
    ├── controllers/
    ├── features/
    │   ├── auth/
    │   └── payments/
    ├── middleware/
    ├── models/
    ├── queues/
    ├── repositories/
    ├── routes/
    ├── services/
    ├── workers/
    ├── validators/
    ├── utils/
    └── types/

## Purpose

---

Directory Responsibility

---

`config/` Application configuration, database,
environment variables and third-party
integrations

`controllers/` HTTP request handlers

`features/` Feature-based modules including
Authentication and Payments

`middleware/` Authentication, validation, error handling
and request processing

`models/` MongoDB/Mongoose models

`repositories/` Database access layer

`routes/` Express route definitions

`services/` Business logic

`workers/` BullMQ background workers

`queues/` Queue definitions and Redis connections

`validators/` Request validation schemas

`utils/` Shared helper functions

---

---

# 2. Server Startup

The backend starts from **`backend/src/server.ts`**.

Startup sequence:

1.  Load environment variables.
2.  Initialize application configuration.
3.  Connect to MongoDB.
4.  Create the Express application from `app.ts`.
5.  Register global middleware.
6.  Register API routes.
7.  Initialize BullMQ queues and workers.
8.  Start the HTTP server.
9.  Register graceful shutdown handlers.

---

# 3. Routes

Routes are organized inside **`backend/src/routes`**.

Each route:

- Defines API endpoints.
- Applies middleware.
- Invokes the appropriate controller.
- Returns standardized JSON responses.

Request flow:

    Client
       ↓
    Express Route
       ↓
    Middleware
       ↓
    Controller
       ↓
    Service
       ↓
    Repository / Model
       ↓
    MongoDB

---

# 4. Controllers

Controllers are responsible for:

- Processing HTTP requests
- Reading request parameters and body
- Calling service methods
- Returning API responses
- Forwarding exceptions to the error middleware

Controllers remain lightweight by delegating business logic to services.

---

# 5. Middleware

The middleware layer includes:

- Authentication
- Authorization
- Request validation
- Error handling
- 404 handler

Middleware is registered globally in **`app.ts`** and applied to
protected routes.

---

# 6. Services

Services implement the application's business rules.

Responsibilities include:

- Delegate management
- Committee management
- Event management
- Payment processing
- Email operations
- Certificate generation
- QR code generation

Services coordinate repositories, external APIs and workers.

---

# 7. Workers

Background jobs are implemented using **BullMQ**.

Workers handle:

- Email delivery
- Certificate generation
- QR code generation

Running these tasks asynchronously keeps the API responsive.

---

# 8. Authentication

Authentication is implemented inside:

    backend/src/features/auth/

Authentication flow:

1.  User submits credentials.
2.  Credentials are validated.
3.  JWT access token is generated.
4.  Protected routes verify the JWT using authentication middleware.

---

# 9. Authorization

Authorization is role-based.

Authenticated users are granted or denied access depending on their
assigned role before controller execution.

---

# 10. Error Handling

Centralized error handling provides:

- Consistent JSON responses
- Exception logging
- Validation error reporting
- HTTP status mapping
- Safe production error messages

---

# 11. Configuration

Configuration is managed through the **`config/`** directory and
environment variables.

External integrations include:

- MongoDB
- Redis
- Cloudinary
- Razorpay
- Resend
- Sentry

---

# 12. Backend Request Lifecycle

    Client
       │
       ▼
    Express Router
       │
       ▼
    Authentication Middleware
       │
       ▼
    Validation Middleware
       │
       ▼
    Controller
       │
       ▼
    Service
       │
       ▼
    Repository
       │
       ▼
    MongoDB
       │
       ▼
    JSON Response

Background tasks such as emails, QR code generation and certificate
creation are delegated to BullMQ workers.

---

# Backend Design Principles

- Layered architecture
- Feature-based organization
- Separation of concerns
- Reusable business services
- Centralized error handling
- JWT authentication
- Role-based authorization
- Asynchronous background processing
- Type-safe TypeScript implementation
