# Architecture Documentation

## Architecture Overview

MUN Gridixia follows a layered full-stack architecture consisting of a
React frontend, an Express.js backend, MongoDB for persistence,
Redis/BullMQ for background processing, and several external
integrations including Razorpay, Cloudinary, Resend, and Sentry.

---

# Technology Stack

Layer Technology

---

Frontend React, TypeScript, Vite, Tailwind CSS
Backend Node.js, Express.js, TypeScript
Database MongoDB + Mongoose
Queue BullMQ + Redis
Authentication JWT
Payments Razorpay
Storage Cloudinary
Email Resend
Monitoring Sentry

---

# Backend Architecture

    backend/src/
    ├── app.ts
    ├── server.ts
    ├── config/
    ├── controllers/
    ├── features/
    ├── middleware/
    ├── repositories/
    ├── routes/
    ├── services/
    ├── workers/
    ├── queues/
    ├── models/
    └── validators/

---

# System Architecture

```mermaid
flowchart LR

U[User Browser]

subgraph Frontend
A[React Pages]
B[Components]
C[React Router]
D[TanStack Query]
end

subgraph Backend
E[Express Server]
F[Routes]
G[Middleware]
H[Controllers]
I[Services]
J[Repositories]
K[Mongoose Models]
end

DB[(MongoDB)]
R[(Redis)]
W[BullMQ Workers]

P[Razorpay]
CL[Cloudinary]
RS[Resend]
SE[Sentry]

U-->A
A-->C
A-->D
D-->E
E-->F
F-->G
G-->H
H-->I
I-->J
J-->K
K-->DB

I-->R
R-->W

I-->P
I-->CL
W-->RS

E-->SE
```

---

# Authentication Flow

```mermaid
sequenceDiagram

participant User
participant Frontend
participant Backend
participant Auth
participant MongoDB

User->>Frontend: Login
Frontend->>Backend: POST /auth/login
Backend->>Auth: Validate credentials
Auth->>MongoDB: Find user
MongoDB-->>Auth: User
Auth-->>Backend: JWT Token
Backend-->>Frontend: Access Token
Frontend->>Backend: Authenticated Requests
Backend->>Backend: JWT Middleware
Backend-->>Frontend: Protected Resource
```

---

# Request Flow

```mermaid
flowchart TD

Client

Client-->Express

Express-->Authentication

Authentication-->Validation

Validation-->Controller

Controller-->Service

Service-->Repository

Repository-->MongoDB

MongoDB-->Repository

Repository-->Service

Service-->Controller

Controller-->JSONResponse
```

---

# Component Diagram

```mermaid
graph LR

Frontend

Frontend-->Pages

Pages-->Layouts

Pages-->Components

Components-->Hooks

Hooks-->API

API-->Express

Express-->Controllers

Controllers-->Services

Services-->Repositories

Repositories-->Models

Models-->MongoDB
```

---

# Deployment Diagram

```mermaid
graph LR

User

User-->Nginx

Nginx-->React

React-->Express

Express-->MongoDB

Express-->Redis

Redis-->BullMQ

Express-->Razorpay

Express-->Cloudinary

BullMQ-->Resend

Express-->Sentry
```

---

# Sequence Diagram

```mermaid
sequenceDiagram

participant User
participant React
participant Express
participant Controller
participant Service
participant Repository
participant MongoDB

User->>React: Submit Registration

React->>Express: POST /registration

Express->>Controller: Route

Controller->>Service: Validate

Service->>Repository: Save

Repository->>MongoDB: Insert

MongoDB-->>Repository: Success

Repository-->>Service: Result

Service-->>Controller: Response

Controller-->>Express: JSON

Express-->>React: Success

React-->>User: Registration Complete
```

---

# Architectural Layers

1.  Presentation Layer (React UI)
2.  Routing Layer (React Router & Express Routes)
3.  Middleware Layer (Authentication, Validation, Error Handling)
4.  Controller Layer (HTTP request processing)
5.  Service Layer (Business Logic)
6.  Repository Layer (Database access)
7.  Persistence Layer (MongoDB Models)
8.  Background Processing Layer (BullMQ Workers)
9.  External Integration Layer (Razorpay, Cloudinary, Resend, Sentry)

---

# Project Request Lifecycle

    Browser
       │
       ▼
    React UI
       │
       ▼
    TanStack Query
       │
       ▼
    Express Route
       │
       ▼
    Middleware
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

    Async Tasks
       │
       ▼
    Redis Queue
       │
       ▼
    BullMQ Workers
