# MUN Gridixia

> A modern full-stack Model United Nations (MUN) Conference Management Platform built with React, Express.js, MongoDB, and TypeScript.

---

## Motivation

Many Model United Nations conferences still rely on spreadsheets, manual registrations, emails, and paper-based workflows to manage delegates, committees, payments, and certificates. These processes are time-consuming, error-prone, and difficult to scale.

**MUN Gridixia** was developed to digitize the complete MUN conference lifecycle by providing a centralized platform for organizers, executive board members, and delegates. The system automates registrations, committee allocation, payments, certificate generation, email notifications, and administrative operations while maintaining security, scalability, and maintainability.

---

# Project Overview

MUN Gridixia is a production-oriented full-stack conference management platform designed specifically for Model United Nations events.

The platform enables organizers to manage delegates, committees, conferences, applications, certificates, and payments through a single dashboard while providing delegates with a seamless registration and participation experience.

The application follows a modular client-server architecture consisting of a React frontend, Express.js backend, MongoDB database, Redis-powered background workers, and several cloud integrations.

---

# Key Features

## Authentication & Authorization

- JWT Authentication
- Refresh Tokens
- Role-Based Access Control (RBAC)
- Secure Password Hashing
- Protected Routes

## Delegate Management

- Delegate Registration
- Profile Management
- Attendance Tracking
- QR Code Generation
- Delegate Dashboard

## Committee Management

- Committee Creation
- Country Allocation
- Delegate Assignment
- Committee Management

## Event Management

- Conference Creation
- Event Scheduling
- Registration Management
- Attendance Tracking

## Application Workflow

- Multi-step Application Process
- Committee Preferences
- Country Preferences
- Application Review

## Payments

- Razorpay Integration
- Payment Verification
- Webhook Handling
- Transaction Tracking

## Certificate Management

- Automated Certificate Generation
- QR Verification
- Certificate Distribution

## Email System

- Queue-based Email Processing
- Registration Emails
- Payment Confirmation
- Certificate Delivery

## Dashboard & Analytics

- Registration Statistics
- Revenue Analytics
- Attendance Reports
- Committee Distribution
- Operational Monitoring

---

# Technology Stack

## Frontend

| Technology      | Purpose          |
| --------------- | ---------------- |
| React           | User Interface   |
| TypeScript      | Static Typing    |
| Vite            | Build Tool       |
| Tailwind CSS    | Styling          |
| Shadcn UI       | UI Components    |
| React Router    | Routing          |
| TanStack Query  | Server State     |
| React Hook Form | Forms            |
| Zod             | Validation       |
| Recharts        | Analytics Charts |
| jsPDF           | PDF Generation   |
| qrcode.react    | QR Codes         |

---

## Backend

| Technology | Purpose          |
| ---------- | ---------------- |
| Node.js    | Runtime          |
| Express.js | REST API         |
| TypeScript | Static Typing    |
| MongoDB    | Database         |
| Mongoose   | ODM              |
| BullMQ     | Background Jobs  |
| Redis      | Queue Storage    |
| JWT        | Authentication   |
| bcryptjs   | Password Hashing |
| Zod        | Validation       |

---

## Third-Party Services

- Razorpay
- Cloudinary
- Redis
- Resend
- Sentry

---

# Project Architecture

```text
                   React Frontend
                          │
                          │
                     REST API
                    Express.js
                          │
      ┌─────────────┬──────────────┬───────────────┐
      │             │              │               │
   MongoDB       BullMQ         Razorpay      Cloudinary
                     │
                  Redis
                     │
      Email Worker • Certificate Worker • QR Worker
```

---

# Project Statistics

| Category        | Details              |
| --------------- | -------------------- |
| Architecture    | Client-Server        |
| Frontend        | React + TypeScript   |
| Backend         | Express + TypeScript |
| Database        | MongoDB              |
| Background Jobs | BullMQ + Redis       |
| Authentication  | JWT                  |
| Payment Gateway | Razorpay             |
| Cloud Storage   | Cloudinary           |
| Email Service   | Resend               |

---

# Folder Structure

```text
.
├── backend
│   ├── config
│   ├── controllers
│   ├── features
│   ├── middleware
│   ├── models
│   ├── queues
│   ├── repositories
│   ├── routes
│   ├── services
│   ├── utils
│   ├── validators
│   └── workers
│
├── frontend
│   ├── assets
│   ├── components
│   ├── features
│   ├── hooks
│   ├── layouts
│   ├── pages
│   ├── routes
│   ├── services
│   └── types
│
├── docker-compose.yml
├── package.json
└── README.md
```

---

# Design Patterns

The project follows modern backend architecture and software engineering principles.

- Repository Pattern
- Service Layer Pattern
- Middleware Pattern
- Modular Architecture
- Separation of Concerns
- Feature-Based Frontend Structure

---

# Installation

## Prerequisites

- Node.js 18+
- npm 9+
- MongoDB
- Redis

Clone repository

```bash
git clone https://github.com/your-username/mun-gridixia.git

cd mun-gridixia
```

Install dependencies

```bash
npm install
```

Run Redis

```bash
docker compose up -d redis
```

---

# Environment Variables

Create

```
backend/.env
```

and

```
frontend/.env
```

Refer to the configuration examples below.

_(Keep your existing environment variable section here.)_

---

# Running Locally

Run the complete application

```bash
npm run dev
```

Run frontend

```bash
npm run dev --workspace=frontend
```

Run backend

```bash
npm run dev --workspace=backend
```

---

# API Overview

The backend exposes RESTful APIs organized into modules.

Major API Groups

- Authentication
- Users
- Delegates
- Committees
- Events
- Applications
- Payments
- Certificates
- Dashboard
- Admin

> Detailed API documentation is available in **docs/API.md**.

---

# Security

The application implements multiple security layers.

- JWT Authentication
- Refresh Tokens
- Role-Based Authorization
- Password Hashing (bcrypt)
- Zod Validation
- Helmet Security Headers
- CORS Protection
- Rate Limiting
- CSRF Header Support
- Secure Environment Variable Validation

---

# Deployment Architecture

The application is designed to be deployed using the following architecture.

```text
React Frontend
      │
      ▼
 Vercel / Nginx

      │

Express Backend

      │

MongoDB Atlas

      │

Redis Cloud

      │

Cloudinary

      │

Resend

      │

Razorpay
```

---

# Future Improvements

- Real-time Notifications using WebSockets
- AI-assisted Committee Allocation
- Mobile Application
- Multi-language Support
- Advanced Analytics Dashboard
- Dockerized Full Stack Deployment
- CI/CD Pipeline using GitHub Actions
- Multi-conference Support
- Audit Logs
- Redis API Caching

---

# Screenshots

> Add screenshots of the following pages.

- Login
- Dashboard
- Delegate Management
- Committee Management
- Event Management
- Payment Flow
- Certificate Generation

---

# Documentation

Additional documentation can be found in the `docs/` directory.

- API Documentation
- Architecture Documentation
- Database Design
- Deployment Guide
- Developer Guide
- Security Documentation

---

# License

This project is developed for educational and professional portfolio purposes.

---

# Author

Developed by **Jatin Kumar**
