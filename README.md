# CPSC3720-TigerTix-TeamTeam

## Event Ticket Booking System — Microservices Architecture

A lightweight microservices-based ticket-booking system featuring a React 19 frontend, modular Node.js backend services, shared SQLite storage, JWT authentication, and LLM-powered natural-language booking with the Gemini API.

Live Deployment: **https://3720-sprint4.vercel.app/**

---

## Project Overview

This project delivers a complete event ticket-booking web application using a decoupled microservices architecture. The backend consists of three independently running Node.js + Express services for:

- **Client operations** (public event browsing & booking)
- **Admin event management**
- **User authentication**

All services share a single SQLite database file, simplifying deployment while maintaining clear service boundaries.

The frontend is a **React 19 CRA** project that communicates with the client-service through a configured proxy.

The system includes an LLM integration using **Gemini**, enabling natural-language ticket-booking commands.

---

## Tech Stack

### **Frontend**
- React 19 (Create React App)
- Located at: `frontend/`
- CRA proxy routes API calls to the client-service on **port 6001**
- Handles:
  - Event browsing
  - Ticket booking
  - Chat interface powered by the LLM service

### **Backend Services (Node.js + Express)**

#### **1. Client Service**
Handles all user-facing booking and event operations.

- Path: `backend/client-service/`
- Routes: `routes/clientRoutes.js`
- Logic: `controllers/clientController.js`, `models/clientModel.js`
- LLM integration: `services/llmService.js`

#### **2. Admin Service**
Provides full CRUD for event management.

- Path: `backend/admin-service/`
- Code paths: `server.js`, `routes/adminRoutes.js`, `models/adminModel.js`

#### **3. User Authentication Service**
Manages:
- Registration  
- Login  
- JWT issuance  
- `/me` session lookups  

Uses:
- JWT (cookies + headers)
- bcrypt

Paths:
- `routes/authRoutes.js`
- `middleware/authMiddleware.js`
- `models/userModel.js`

### **Database**
A single SQLite database shared by all services:




