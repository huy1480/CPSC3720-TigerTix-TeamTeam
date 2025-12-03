# Event Ticket Booking System --- Microservices Architecture

A lightweight microservices-based ticket-booking system featuring a
React 19 frontend, modular Node.js backend services, shared SQLite
storage, JWT authentication, and LLM-powered natural-language booking
with the Gemini API.

Live Deployment: **https://3720-sprint4.vercel.app/**

## Project Overview

This project delivers a complete event ticket-booking web application
using a decoupled microservices architecture. The backend consists of
three independently running Node.js + Express services for client
operations, admin event management, and user authentication. All
services share a single SQLite database. The frontend communicates with
the client service through a configured proxy and includes Gemini-based
natural-language booking support.

## Tech Stack

### Frontend

-   React 19 (CRA)
-   Located at `frontend/`
-   Proxy to client-service on port 6001

### Backend Services

#### Client Service

-   Event browsing & booking
-   LLM integration (Gemini)
-   Paths: controllers, models, routes

#### Admin Service

-   Full CRUD for events
-   Paths: server.js, adminRoutes.js, adminModel.js

#### User Authentication Service

-   Registration, login, JWT, /me lookup
-   bcrypt + JWT
-   Paths: authRoutes.js, authMiddleware.js, userModel.js

### Database

-   Shared SQLite file: `backend/shared-db/database.sqlite`

### Authentication

-   JWT with HTTP-only cookies and headers
-   bcrypt hashing

### LLM Integration

-   Gemini API (gemini-2.5-flash)

## Architecture Summary

    frontend/ → React 19 (CRA)
      ↳ proxy → http://localhost:6001

    backend/
      ├── client-service/
      ├── admin-service/
      ├── user-authentication/
      └── shared-db/database.sqlite

## Environment Variables

### Client Service

    NODE_ENV=production
    NODE_VERSION=20
    JWT_SECRET=YOUR_SECRET_HERE
    GEMINI_API_KEY=
    GEMINI_MODEL=gemini-2.5-flash
    CLIENT_ALLOWED_ORIGINS=https://3720-sprint4.vercel.app

### User Authentication Service

    NODE_ENV=production
    NODE_VERSION=20
    JWT_SECRET=YOUR_SECRET_HERE
    AUTH_ALLOWED_ORIGINS=https://3720-sprint4.vercel.app

### Admin Service

    NODE_ENV=production
    NODE_VERSION=20
    ADMIN_ALLOWED_ORIGINS=https://3720-sprint4.vercel.app

## Regression Tests

Run all Jest tests:

    npx jest

Watch mode:

    npx jest --watch

Specific test:

    npx jest path/to/your.test.js

Coverage:

    npx jest --coverage

## Team Members

-   Luke Miller
-   Hayden Uy

Instructor: Julian Brinkley\
TAs: Colt Doster, Atik Enam

## License

MIT License (2025)
