# 🌊 ServiceFlow — AI-Powered Enterprise Complaint Management & Automated Service Platform

ServiceFlow is a modern, high-performance, multi-tenant enterprise complaint management platform designed to automate ticket ingestion, intelligent routing using Large Language Models (LLMs), real-time SLA tracking and auto-escalation, dynamic employee workload balancing, and real-time customer support collaboration.

---

## 📑 Table of Contents
1. [Key Features](#-key-features)
2. [System Architecture & Core Services](#-system-architecture--core-services)
3. [Technology Stack](#-technology-stack)
4. [Database Schema & Models](#-database-schema--models)
5. [Backend Architecture & API Reference](#-backend-architecture--api-reference)
6. [AI Classification & Resilient Routing Engine](#-ai-classification--resilient-routing-engine)
7. [Real-Time Socket Events & SLA Worker](#-real-time-socket-events--sla-worker)
8. [Frontend Features & Dashboard](#-frontend-features--dashboard)
9. [Environment Variables & Setup Guide](#-environment-variables--setup-guide)
10. [Directory Structure](#-directory-structure)

---

## 🚀 Key Features

* 🏢 **Multi-Tenant Isolation**: Secure data partitioning per organization (Tenant) supporting custom routing modes (`DEPARTMENT` vs `EMPLOYEE`).
* 🤖 **AI-Driven Routing & Analysis**: Instant zero-shot classification using Groq LLMs (`qwen/qwen3.6-27b`, `openai/gpt-oss-20b`) for department assignment, priority resolution, sentiment analysis (`HAPPY`, `NEUTRAL`, `FRUSTRATED`, `ANGRY`), executive summary generation, and draft replies.
* 🛡️ **Resilient Fallback System**: Multi-stage resilience featuring exponential backoff retries for rate limits (HTTP 429) and a secondary **TF-IDF Vector Cosine Similarity** fallback engine when LLM services are offline.
* ⚡ **Dynamic Workload Balancer**: Real-time load calculation per agent (`COUNT(active_assignments)`), automatically assigning newly classified tickets to the available employee with the lowest active workload.
* ⏱️ **SLA Deadline Tracking & Auto-Escalation Engine**: Automated priority-based SLA calculation (`URGENT`: 2h, `HIGH`: 6h, `MEDIUM`: 24h, `LOW`: 48h). A background cron worker scans breached tickets, elevates priority to `URGENT`, notifies admins, and auto-escalates assignments to Tenant Administrators.
* 💬 **Real-Time Ticket Threads & Image Attachments**: Live WebSockets (`Socket.io`) enabling instant messaging, internal staff-only notes (`isInternal: true`), and attachment hosting powered by **ImageKit**.
* 📧 **Automated Email Notifications**: Integrated **Resend** service for instant customer receipt emails, 1-click AI resolution emails, and SLA breach warning alerts.
* 🔑 **Developer API Key Management**: Key hashing (`SHA-256`), prefix tracking, and REST endpoints for external software integrations.
* 📊 **Comprehensive Analytics & KPIs**: Interactive analytics dashboard computing Mean Time to Resolution (**MTTR**), SLA Compliance Rate, Groq AI Routing Accuracy, and MTTR breakdown by priority & department.
* 👥 **Role-Based Access Control (RBAC)**: Enforced authorization levels (`ADMIN` vs `AGENT`), invitation links with secure tokens, and protected routes.

---

## 🏗️ System Architecture & Core Services

ServiceFlow follows a decoupled micro-architecture combining a Next.js single-page frontend application, a Node.js/Express API server, an asynchronous background worker process, a PostgreSQL database, a Redis cache/queue layer, and Socket.io WebSocket connections.

```
                      +---------------------------------------+
                      |           Next.js Frontend            |
                      |   (React 19, Tailwind, TanStack Query)|
                      +-------------------+-------------------+
                                          |
                        HTTP REST API /   |   Socket.io WebSockets
                       Bearer JWT / Cookies |   (Tenant / Ticket Rooms)
                                          v
                      +-------------------+-------------------+
                      |         Node.js / Express Backend     |
                      +---------+-----------------+-----------+
                                |                 |
          +---------------------+                 +--------------------+
          |                     |                                      |
          v                     v                                      v
  +---------------+   +-------------------+                  +------------------+
  | PostgreSQL DB |   |    Groq LLM SDK   |                  |   Resend Email   |
  |  (Prisma ORM) |   | (Qwen / GPT Fallback)                | (Ingestion/SLA)  |
  +---------------+   +-------------------+                  +------------------+
          ^                     ^                                      ^
          |                     |                                      |
          +---------------------+--------------------------------------+
                                |
                      +---------+-------------------+
                      |   SLA Cron Worker Engine    |
                      |  (Node-Cron / 5-min cycle)|
                      +-----------------------------+
```

---

## 🛠️ Technology Stack

### Backend (`/backend`)
* **Runtime**: Node.js & Express 5 (TypeScript)
* **Database & ORM**: PostgreSQL, Prisma 7 (`@prisma/client`, `@prisma/adapter-pg`)
* **AI Integration**: Groq SDK (`groq-sdk`)
* **Real-time WebSockets**: Socket.io 4 (`socket.io`)
* **Background Scheduling**: Node-Cron (`node-cron`)
* **Media & File Storage**: ImageKit SDK (`imagekit`)
* **Email Service**: Resend SDK (`resend`)
* **Caching & State**: Redis (`ioredis`)
* **Validation & Security**: Zod (`zod`), Bcrypt (`bcrypt`), JSON Web Tokens (`jsonwebtoken`), Cookie-Parser
* **Error Standards**: RFC 7807 Problem Details

### Frontend (`/frontend`)
* **Framework**: Next.js 16 (App Router), React 19 (TypeScript)
* **State Management**: Zustand v5 (Persisted Auth & Notification Stores), TanStack React Query v5
* **Styling & UI**: Tailwind CSS v4, Framer Motion, Radix UI Primitives, Lucide Icons, Sonner Toasts
* **Charts & Analytics**: Recharts v3
* **Real-time WebSockets**: Socket.io Client (`socket.io-client`)
* **HTTP Client**: Custom Fetch API wrapper with RFC 7807 Error Handling

---

## 🗄️ Database Schema & Models

Defined in [`backend/prisma/schema.prisma`](file:///home/amar/Projects/ServiceFlow/backend/prisma/schema.prisma):

```mermaid
erDiagram
    Tenant ||--o{ User : contains
    Tenant ||--o{ ApiKey : owns
    Tenant ||--o{ Department : manages
    Tenant ||--o{ Employee : employs
    Tenant ||--o{ Complaint : receives
    Tenant ||--o{ Assignment : tracks
    Tenant ||--o{ Invite : issues

    User ||--o{ Employee : links
    Department ||--o{ Employee : member
    Department ||--o{ Assignment : target
    Employee ||--o{ Assignment : assigned

    Complaint ||--o{ Assignment : has
    Complaint ||--o{ TicketMessage : contains
```

### Primary Database Models
1. **`Tenant`**: Root multi-tenant entity holding global configuration such as `routingMode` (`DEPARTMENT` or `EMPLOYEE`).
2. **`User`**: Admin or Agent credentials (email, hashed password, role: `ADMIN` | `AGENT`).
3. **`ApiKey`**: External API integration keys (stored as SHA-256 hashes with key prefixes and `lastUsedAt` tracking).
4. **`Department`**: Organizational units with keyword arrays and JSON vector embeddings for fallback matching.
5. **`Employee`**: Staff profiles linked to a `User` and `Department`, maintaining real-time active `load` counters.
6. **`Complaint`**: Central ticket record containing title, description, customer contact, priority, sentiment, AI reasoning, AI confidence score, SLA deadline (`slaDueAt`), SLA breach state (`isSlaBreached`), and feedback correctness (`isCorrectlyClassified`).
7. **`Assignment`**: Connects a ticket to either a specific `Employee` or an unassigned `Department` queue.
8. **`TicketMessage`**: Thread message log supporting customer replies, agent responses, and internal notes with attachments.
9. **`Invite`**: Tokenized registration invites bound to specific roles and departments.

---

## 🔌 Backend Architecture & API Reference

All API routes are mounted under `/api` in [`backend/src/routes.ts`](file:///home/amar/Projects/ServiceFlow/backend/src/routes.ts).

### 🔑 Authentication (`/api/auth`)
* `POST /api/auth/register` — Registers a new Tenant & Admin account.
* `POST /api/auth/login` — Authenticates user, issuing HTTP-only JWT cookies or bearer token response.
* `GET /api/auth/me` — Returns current authenticated user session details.

### 📩 Complaints Ingestion & Management (`/api/complaints`)
* `POST /api/complaints/create` — **(API Key Protected)** Ingests new customer complaints, triggers AI zero-shot routing, sets SLA target, updates employee workload, and dispatches confirmation email.
* `GET /api/complaints/all` — *(Staff)* Retrieves all tenant complaints with search, filter, and pagination support.
* `GET /api/complaints/details/:complaintId` — *(Staff)* Fetches complete ticket details including assignment and messages.
* `PATCH /api/complaints/update-status` — *(Staff)* Updates complaint status (`open`, `in_progress`, `resolved`) and recalculates active workload counters.
* `POST /api/complaints/send-resolution-email` — *(Staff)* Sends an official resolution email with custom or AI-suggested content to the customer.
* `PATCH /api/complaints/assign-to-employee` — *(Admin Only)* Manually reassigns ticket to a specific employee.
* `PATCH /api/complaints/assign-to-department` — *(Admin Only)* Reassigns ticket to a department queue.
* `PATCH /api/complaints/delete` — *(Admin Only)* Soft-deletes a complaint.
* `PATCH /api/complaints/restore` — *(Admin Only)* Restores a soft-deleted complaint.

### 💬 Ticket Messaging (`/api/ticket-messages`)
* `POST /api/ticket-messages/create` — Appends a new response or internal note to a ticket thread. Broadcasts via WebSockets.
* `GET /api/ticket-messages/complaint/:complaintId` — Fetches ticket message thread. Automatically redacts internal notes (`isInternal: true`) for non-staff callers.
* `GET /api/ticket-messages/imagekit-auth` — Generates ImageKit client signatures for secure file uploads.

### 🏛️ Department Management (`/api/departments`)
* `POST /api/departments/create` — *(Admin Only)* Creates a department with keywords.
* `GET /api/departments/all` — Lists tenant departments with active member counts.
* `PATCH /api/departments/update` — *(Admin Only)* Updates department name or keywords.
* `DELETE /api/departments/delete/:id` — *(Admin Only)* Soft-deletes a department.

### 👥 Staff & Employees (`/api/employees`)
* `GET /api/employees/all` — Fetches all staff members with real-time active load counts.
* `PATCH /api/employees/update-role` — *(Admin Only)* Modifies employee role or department assignment.
* `DELETE /api/employees/delete/:id` — *(Admin Only)* Soft-deletes an employee record.

### 📈 Analytics & Feedback (`/api/analytics`)
* `GET /api/analytics/overview` — Computes overall MTTR (hours), SLA Compliance Rate (%), Groq AI Accuracy Rate (%), and MTTR breakdown by priority and department.
* `POST /api/analytics/feedback` — Submits agent accuracy feedback on Groq AI classification and optionally re-routes misclassified tickets.

### 🔐 API Keys (`/api/apikey`)
* `POST /api/apikey/generate` — *(Admin Only)* Generates a new API key (`sf_live_...`), storing only its SHA-256 hash.
* `GET /api/apikey/all` — *(Admin Only)* Lists active API key prefixes and last-used timestamps.
* `DELETE /api/apikey/revoke/:id` — *(Admin Only)* Revokes an API key.

### ✉️ Staff Invites (`/api/invite`)
* `POST /api/invite/create` — *(Admin Only)* Generates invite links for agents/admins.
* `GET /api/invite/validate/:token` — Validates invitation token validity.
* `POST /api/invite/accept` — Completes registration via invite token.

### 🏢 Tenant Settings (`/api/tenant`)
* `GET /api/tenant/me` — Fetches tenant profile.
* `PATCH /api/tenant/routing-mode` — *(Admin Only)* Toggles routing strategy between `DEPARTMENT` and `EMPLOYEE`.

---

## 🤖 AI Classification & Resilient Routing Engine

Implemented in [`backend/src/modules/complaints/groq.service.ts`](file:///home/amar/Projects/ServiceFlow/backend/src/modules/complaints/groq.service.ts):

1. **Multi-Task Prompting**: Sends customer complaint text along with dynamic department descriptions to Groq API using structured `json_schema` response format.
2. **Extracted Metadata**:
   - `department_code`: Best matching department slug.
   - `confidence`: Floating point score `[0.0 - 1.0]`.
   - `priority`: `LOW`, `MEDIUM`, `HIGH`, or `URGENT`.
   - `sentiment`: `HAPPY`, `NEUTRAL`, `FRUSTRATED`, or `ANGRY`.
   - `summary`: Concise problem statement summary.
   - `suggested_reply`: Draft response tailored to customer complaint.
   - `reasoning`: LLM justification for the chosen department and priority.
3. **Exponential Backoff & Secondary LLM Model**: Retries failed calls with exponential backoff on HTTP 429 rate limits, switching seamlessly from `qwen/qwen3.6-27b` to `openai/gpt-oss-20b`.
4. **TF-IDF Vector Cosine Similarity Fallback**: If LLM endpoints are unreachable, ServiceFlow calculates token frequency distributions and vector cosine similarities between complaint text and department descriptions to select the best match autonomously.

---

## ⚡ Real-Time Socket Events & SLA Worker

### Socket.io Real-Time Layer (`backend/src/socket/index.ts`)
Authenticated via JWT socket middleware. Supports the following rooms & events:

| Room Pattern | Event Name | Payload / Action |
| :--- | :--- | :--- |
| `tenant:<tenantId>` | `complaint:created` | Emitted when a new complaint is ingested. |
| `tenant:<tenantId>` | `employee:load_updated` | Emitted whenever an employee's active load counter changes. |
| `tenant:<tenantId>` | `sla:breached` | Emitted when SLA breach scanner escalates tickets. |
| `ticket:<complaintId>` | `ticket:message_received` | Live updates for chat threads & internal notes. |
| `admin:<tenantId>` | `admin:alert` | Escalation alerts for unassigned or SLA-breached tickets. |

### SLA Escalation Worker (`backend/src/modules/sla/sla.worker.ts`)
A background `node-cron` daemon executing every 5 minutes:
1. Queries all non-resolved complaints where `slaDueAt <= NOW()` and `isSlaBreached == false`.
2. Marks tickets as `isSlaBreached = true` and upgrades priority to `URGENT`.
3. Auto-escalates assignment to the Tenant Administrator.
4. Sends automated email notifications via Resend.
5. Emits real-time WebSocket alerts to tenant admin dashboards.

---

## 🖥️ Frontend Features & Dashboard

Built with Next.js App Router and Tailwind CSS, featuring dark/light mode and responsive layouts:

* 📊 **Executive Overview**: Quick stats on open tickets, breached SLAs, MTTR, AI accuracy, and recent complaint activity feeds.
* 🎟️ **Complaints Workspace**: Interactive filterable data table with priority badges, sentiment pills, SLA countdown timers, and quick action dialogs.
* 💬 **Live Ticket Thread Dialog**: Slide-over panel featuring real-time messaging, ImageKit file attachments, and internal staff note toggles.
* 📧 **1-Click AI Draft Resolution Modal**: Pre-fills resolution emails using Groq AI suggested replies, allowing agents to edit before dispatching to customers.
* 🏢 **Department Management**: Create, edit keywords, and inspect department member distributions.
* 👥 **Employee Roster & Load Balancer**: Monitor agent active workloads with visual indicators.
* 📈 **Analytics Portal**: Interactive Recharts visualizations of resolution performance and AI model feedback metrics.
* 🔑 **API Keys & Documentation**: Interactive API key generator with code snippets for CURL, Node.js, and Python.

---

## ⚙️ Environment Variables & Setup Guide

### 1. Environment Configuration

#### Backend Environment File (`backend/.env`)
```env
PORT=5000
DATABASE_URL="postgresql://user:password@localhost:5432/serviceflow?schema=public"
JWT_SECRET="your-super-secret-jwt-key"
FRONTEND_URL="http://localhost:3000"
REDIS_URL="redis://localhost:6379"

# AI & LLM Service
GROQ_API_KEY="gsk_..."
GROQ_MODEL="qwen/qwen3.6-27b"

# Email Dispatch
RESEND_API_KEY="re_..."
RESEND_FROM_EMAIL="ServiceFlow Support <notifications@yourdomain.com>"

# ImageKit Storage
IMAGEKIT_PUBLIC_KEY="public_..."
IMAGEKIT_PRIVATE_KEY="private_..."
IMAGEKIT_URL_ENDPOINT="https://ik.imagekit.io/your_endpoint"
```

#### Frontend Environment File (`frontend/.env.local`)
```env
NEXT_PUBLIC_API_URL="http://localhost:5000"
NEXT_PUBLIC_BACKEND_URL="http://localhost:5000"
```

---

### 2. Local Installation & Setup

#### Prerequisites
* Node.js (v18+)
* PostgreSQL Database
* Redis (Optional for production caching/queues)

#### Step 1: Clone Repository & Install Dependencies
```bash
# Clone the repository
git clone https://github.com/your-org/serviceflow.git
cd serviceflow

# Install Backend Dependencies
cd backend
npm install

# Install Frontend Dependencies
cd ../frontend
npm install
```

#### Step 2: Database Migration & Prisma Generation
```bash
cd ../backend

# Generate Prisma Client
npx prisma generate

# Apply Database Schema Migrations
npx prisma db push
```

#### Step 3: Run Backend Development Server
```bash
cd ../backend
npm run dev
# Starts Express server & SLA Cron Worker on http://localhost:5000
```

#### Step 4: Run Frontend Development Server
```bash
cd ../frontend
npm run dev
# Starts Next.js frontend application on http://localhost:3000
```

---

## 📁 Directory Structure

```
ServiceFlow/
├── backend/
│   ├── prisma/
│   │   └── schema.prisma             # PostgreSQL Prisma DB schema
│   ├── src/
│   │   ├── config/                   # Configs (db, groq, redis, imagekit, env)
│   │   ├── middlewares/              # Express middlewares (auth, role, apikey, rfc7807 error)
│   │   ├── modules/                  # Feature domain modules
│   │   │   ├── analytics/            # MTTR & AI accuracy calculation logic
│   │   │   ├── api-keys/             # API key generation & validation
│   │   │   ├── auth/                 # Login, register, JWT session management
│   │   │   ├── complaints/           # Groq AI routing, workload balancing, complaints CRUD
│   │   │   ├── departments/          # Department CRUD & keyword management
│   │   │   ├── employees/            # Employee roster & load sync
│   │   │   ├── invites/              # Team invite creation & validation
│   │   │   ├── notifications/        # Resend email notification service
│   │   │   ├── sla/                  # SLA breach scanner & node-cron worker
│   │   │   ├── tenants/              # Tenant configuration & routing modes
│   │   │   └── ticket-messages/      # Real-time ticket messages & ImageKit auth
│   │   ├── socket/                   # Socket.io authentication & room emitters
│   │   ├── utils/                    # Hash & RFC 7807 Problem Details utilities
│   │   ├── app.ts                    # Express app configuration
│   │   ├── routes.ts                 # Master router mounting all endpoints
│   │   └── server.ts                 # HTTP server, socket init & cron worker startup
│   ├── package.json
│   └── tsconfig.json
│
└── frontend/
    ├── public/                       # Static public assets
    ├── src/
    │   ├── app/                      # Next.js App Router pages
    │   │   ├── (auth)/               # Login & Register pages
    │   │   ├── complaints/[id]/      # Public ticket tracking portal
    │   │   ├── dashboard/            # Staff dashboard (Overview, Complaints, Analytics, etc.)
    │   │   ├── invite/[token]/       # Invite onboarding page
    │   │   ├── globals.css           # Tailwind CSS imports
    │   │   └── layout.tsx            # Global layout & theme providers
    │   ├── components/               # React UI components & Radix primitives
    │   │   ├── ui/                   # Reusable UI elements (Button, Dialog, Card, Table)
    │   │   ├── notification-bell.tsx # Real-time notification popover
    │   │   ├── onboarding-modal.tsx  # Setup wizard
    │   │   ├── rbac-guard.tsx        # Role protection wrapper
    │   │   └── theme-toggle.tsx      # Dark/Light mode switch
    │   ├── hooks/                    # Custom React hooks (Query & Socket listeners)
    │   ├── lib/                      # Axios API client, Socket.io client, Session storage
    │   └── store/                    # Zustand state stores (Auth, Notification, App state)
    ├── package.json
    └── tsconfig.json
```

---

## 📄 License

This project is licensed under the ISC License.
