# Frontend Documentation

## Overview

The frontend of **MUN Gridixia** is built using **React 18**,
**TypeScript**, **Vite**, **Tailwind CSS**, **React Router**, **TanStack
Query**, and **React Hook Form**. The application follows a
feature-oriented architecture where business logic is grouped by domain
while shared UI components are kept reusable.

---

# Folder Structure

```text
frontend/src/
├── components/
├── features/
├── hooks/
├── layouts/
├── lib/
├── pages/
├── routes/
├── services/
├── types/
├── App.tsx
├── main.tsx
└── index.css
```

---

Folder Purpose

---

components Shared UI widgets, charts and
reusable components

features Feature-specific UI and logic (auth,
apply, dashboard, delegates, events,
payments)

hooks Custom React hooks for API data
fetching

layouts Shared application layouts

lib API client and utility libraries

pages Route-level screens

routes React Router configuration

services API service layer

types Shared TypeScript definitions

---

---

# Pages

The application contains the following route pages:

## Apply

Located in `frontend/src/pages/Apply.tsx`. This page represents a
top-level application screen and is rendered through the React Router
configuration.

## CertificateVault

Located in `frontend/src/pages/CertificateVault.tsx`. This page
represents a top-level application screen and is rendered through the
React Router configuration.

## CheckInScanner

Located in `frontend/src/pages/CheckInScanner.tsx`. This page represents
a top-level application screen and is rendered through the React Router
configuration.

## CommandCenter

Located in `frontend/src/pages/CommandCenter.tsx`. This page represents
a top-level application screen and is rendered through the React Router
configuration.

## CommitteeDetail

Located in `frontend/src/pages/CommitteeDetail.tsx`. This page
represents a top-level application screen and is rendered through the
React Router configuration.

## Committees

Located in `frontend/src/pages/Committees.tsx`. This page represents a
top-level application screen and is rendered through the React Router
configuration.

## CountryAllocation

Located in `frontend/src/pages/CountryAllocation.tsx`. This page
represents a top-level application screen and is rendered through the
React Router configuration.

## Dashboard

Located in `frontend/src/pages/Dashboard.tsx`. This page represents a
top-level application screen and is rendered through the React Router
configuration.

## DelegatePass

Located in `frontend/src/pages/DelegatePass.tsx`. This page represents a
top-level application screen and is rendered through the React Router
configuration.

## Delegates

Located in `frontend/src/pages/Delegates.tsx`. This page represents a
top-level application screen and is rendered through the React Router
configuration.

## Events

Located in `frontend/src/pages/Events.tsx`. This page represents a
top-level application screen and is rendered through the React Router
configuration.

## Home

Located in `frontend/src/pages/Home.tsx`. This page represents a
top-level application screen and is rendered through the React Router
configuration.

## Landing

Located in `frontend/src/pages/Landing.tsx`. This page represents a
top-level application screen and is rendered through the React Router
configuration.

## Login

Located in `frontend/src/pages/Login.tsx`. This page represents a
top-level application screen and is rendered through the React Router
configuration.

## Monitoring

Located in `frontend/src/pages/Monitoring.tsx`. This page represents a
top-level application screen and is rendered through the React Router
configuration.

## NotFound

Located in `frontend/src/pages/NotFound.tsx`. This page represents a
top-level application screen and is rendered through the React Router
configuration.

## Payments

Located in `frontend/src/pages/Payments.tsx`. This page represents a
top-level application screen and is rendered through the React Router
configuration.

## Register

Located in `frontend/src/pages/Register.tsx`. This page represents a
top-level application screen and is rendered through the React Router
configuration.

## Reports

Located in `frontend/src/pages/Reports.tsx`. This page represents a
top-level application screen and is rendered through the React Router
configuration.

## Settings

Located in `frontend/src/pages/Settings.tsx`. This page represents a
top-level application screen and is rendered through the React Router
configuration.

---

# Components

## Shared Components

- `components/shared/` contains reusable components such as loading
  indicators, data tables, dialogs, empty states and error boundaries.
- `components/ui/` contains generic UI primitives including buttons,
  cards, badges, inputs and labels.
- `components/charts/` contains dashboard visualization components.

---

# Routing

Application routing is configured in:

    frontend/src/routes/AppRoutes.tsx

Routes are rendered through React Router and integrated with layout
components. Protected application areas use the authentication feature
before rendering secured pages.

---

# Contexts

Authentication state is managed through:

    frontend/src/features/auth/AuthContext.tsx

The authentication context provides the current user session,
authentication state and helper methods to the rest of the application.

Protected routes are implemented using:

    frontend/src/features/auth/ProtectedRoute.tsx

---

# Hooks

Custom hooks available in the project include:

- `useCommittees` -- encapsulates reusable frontend logic and API
  interaction.
- `useDashboardStats` -- encapsulates reusable frontend logic and API
  interaction.
- `useDelegates` -- encapsulates reusable frontend logic and API
  interaction.
- `useEvents` -- encapsulates reusable frontend logic and API
  interaction.

These hooks simplify data fetching, caching and state synchronization
across pages.

---

# API Calls

API communication is centralized through:

    frontend/src/lib/api.ts

Feature-specific services are located in:

- `services/delegates.service.ts`
- `services/events.service.ts`
- `features/apply/apply.service.ts`

TanStack Query is used for server-state management, caching and request
synchronization.

---

# State Management

The application uses multiple state management approaches:

- React Context for authentication.
- TanStack Query for server state.
- React Hook Form for form state.
- Local React state for component-specific interactions.

---

# Styling

Styling is implemented using:

- Tailwind CSS
- Global styles in `index.css`
- Reusable UI components in `components/ui`

This approach promotes consistency and responsive layouts across the
application.

---

# Build Process

The frontend uses **Vite** as the build tool.

Development:

```bash
npm install
npm run dev
```

Production:

```bash
npm run build
```

Build flow:

1.  Install dependencies.
2.  Compile TypeScript.
3.  Bundle assets with Vite.
4.  Optimize static assets.
5.  Generate the production-ready `dist/` directory.

---

# Architecture Summary

The frontend follows a layered architecture:

    Pages
       │
       ▼
    Components
       │
       ▼
    Hooks / Context
       │
       ▼
    API Services
       │
       ▼
    Backend REST API

Business logic is organized into feature modules while shared components
remain reusable throughout the application.
