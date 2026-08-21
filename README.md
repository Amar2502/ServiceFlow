# 🌊 ServiceFlow

### *AI-Powered Enterprise Complaint Management & Automated Service Platform*

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Next.js 16](https://img.shields.io/badge/Next.js_16-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![React 19](https://img.shields.io/badge/React_19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![Express 5](https://img.shields.io/badge/Express_5-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Prisma 7](https://img.shields.io/badge/Prisma_7-2D3748?style=for-the-badge&logo=prisma&logoColor=white)](https://www.prisma.io/)
[![Groq AI](https://img.shields.io/badge/Groq_AI-FF6C37?style=for-the-badge&logo=openai&logoColor=white)](https://groq.com/)
[![Socket.io](https://img.shields.io/badge/Socket.io-010101?style=for-the-badge&logo=socketdotio&logoColor=white)](https://socket.io/)
[![Tailwind CSS v4](https://img.shields.io/badge/Tailwind_CSS_v4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)

---

## 🎯 What is ServiceFlow?

**ServiceFlow** is a modern, enterprise-ready, **multi-tenant complaint management system** designed to transform how organizations handle customer support tickets. 

Instead of relying on manual ticket triage and static assignment rules, ServiceFlow leverages **Large Language Models (LLMs)** to instantly analyze incoming customer complaints, classify sentiment and urgency, calculate SLA deadlines, and dynamically route tickets to the least-burdened support agent in real time.

Built with a production-grade stack (**Next.js 16**, **Express 5**, **PostgreSQL**, **Prisma**, **Groq AI**, **Socket.io**, and **Zustand**), ServiceFlow demonstrates how AI, event-driven web sockets, and background job queues come together to create a reliable, high-throughput service platform.

---

## 💡 The Problem & The ServiceFlow Solution

| Problem in Traditional Support Systems | How ServiceFlow Solves It |
| :--- | :--- |
| ⏳ **Manual Triage Delay**: Tickets sit in queues waiting for human dispatchers to route them. | 🤖 **Instant AI Routing**: Zero-shot Groq LLM classification routes complaints in milliseconds based on context. |
| ⚖️ **Uneven Workload**: Some agents are overwhelmed while others have low ticket counts. | 📊 **Dynamic Load Balancing**: Real-time assignment algorithm routes new tickets to agents with the lowest active load. |
| ⚠️ **Missed SLAs**: Support deadlines expire without warning or automatic escalation. | ⏱️ **Background SLA Scanner**: Cron worker checks breached SLAs every 5 minutes, upgrades priority, and escalates to admins. |
| 💬 **Fragmented Communication**: Internal notes mixed up with customer emails cause confusion. | 🔒 **Dual Thread Messaging**: Dedicated ticket threads with isolated staff-only internal notes (`isInternal: true`). |
| 📉 **Lack of AI Monitoring**: Blindly trusting AI models without verification or feedback loops. | 📈 **AI Accuracy Analytics**: Agents can submit human feedback on AI routing decisions to track model accuracy over time. |

---

## 🏗️ System Architecture & Data Flow

ServiceFlow uses a **decoupled micro-architecture** consisting of a React 19 single-page frontend, a Node.js Express REST API, a Socket.io WebSocket server, a background cron daemon, a PostgreSQL transactional database, and external integrations (Groq AI, Resend Email, ImageKit).

```
                            +-------------------------------------------+
                            |           Next.js 16 Frontend             |
                            |    (React 19, Tailwind v4, Zustand)       |
                            +---------------------+---------------------+
                                                  |
                                HTTP REST API /   |   Socket.io WebSockets
                              Bearer JWT / Cookies|   (Tenant & Ticket Rooms)
                                                  v
                            +---------------------+---------------------+
                            |       Node.js / Express 5 Backend         |
                            +----+----------------+----------------+----+
                                 |                |                |
             +-------------------+                |                +--------------------+
             |                                    v                                     |
             v                           +------------------+                           v
   +-------------------+                 |   Groq LLM SDK   |                 +-------------------+
   |  PostgreSQL DB    |                 | (Zero-Shot JSON) |                 |   Resend Email    |
   |   (Prisma ORM)    |                 +------------------+                 |  (Ingestion/SLA)  |
   +-------------------+                          ^                           +-------------------+
             ^                                    |                                     ^
             |                                    |                                     |
             +------------------------------------+-------------------------------------+
                                                  |
                                        +---------+----------+
                                        |   SLA Cron Worker  |
                                        | (5-Min Audit Cycle)|
                                        +--------------------+
```

---

## 🔥 Key Technical Highlights (How It's Built)

### 1. 🏢 Multi-Tenant Data Isolation & Dynamic Routing
* **Tenant Isolation**: Every database model (`User`, `Department`, `Employee`, `Complaint`, `ApiKey`) is strictly scoped by `tenantId`.
* **Flexible Routing Modes**: Organizations can toggle between two operational routing strategies:
  * `DEPARTMENT` Mode: Routes tickets to designated team queues (e.g., *Billing*, *Technical Support*, *Sales*).
  * `EMPLOYEE` Mode: Directly routes tickets to individual agents matching specific job titles.

### 2. 🤖 AI Classification & Resilient Routing Engine (`Groq AI`)
* **Zero-Shot JSON Extraction**: Passes raw customer text into Groq (`qwen/qwen3.6-27b`) with strict `json_schema` response constraints.
* **Extracted Intelligence**:
  * **Selected Target**: Best department or employee match.
  * **Priority**: `LOW`, `MEDIUM`, `HIGH`, or `URGENT`.
  * **Sentiment Analysis**: `HAPPY`, `NEUTRAL`, `FRUSTRATED`, or `ANGRY`.
  * **AI Confidence Score**: Floating-point rating `[0.0 - 1.0]`.
  * **Suggested AI Reply**: Auto-generated response pre-filled for 1-click agent resolution emails.
* **Resilience & Retry Pipeline**: Features exponential backoff handling for rate limits (HTTP 429) and server errors.

### 3. ⚖️ Dynamic Workload Balancing Algorithm
* **Live Agent Load Calculation**: Active workload is calculated dynamically:
  $$\text{Active Load} = \text{COUNT}(\text{assignments where status } \in [\text{'open'}, \text{'in\_progress'}])$$
* **Least-Burdened Routing**: When AI identifies a target department or role, ServiceFlow queries matching agents, sorts them by active workload, and assigns the ticket to the employee with the lowest count.
* **Automated Counter Sync**: Employee workload counters auto-update whenever a ticket is created, assigned, re-assigned, resolved, or deleted.

### 4. ⏱️ Automated SLA Engine & Background Cron Worker
* **Priority-Based SLA Deadlines**:
  * `URGENT` $\rightarrow$ **2 Hours**
  * `HIGH` $\rightarrow$ **6 Hours**
  * `MEDIUM` $\rightarrow$ **24 Hours**
  * `LOW` $\rightarrow$ **48 Hours**
* **Background Cron Worker (`node-cron`)**: Runs every 5 minutes to audit open tickets where `slaDueAt <= NOW()`. Breached tickets are automatically:
  1. Flagged as `isSlaBreached = true`.
  2. Escalated to `URGENT` priority.
  3. Reassigned to the Tenant Administrator.
  4. Broadcasted live via WebSockets and alerted via Resend email.

### 5. ⚡ Event-Driven WebSockets & Secure Ticket Threads
* **Socket.io Integration**: Provides instant, zero-refresh updates across the dashboard for:
  * `complaint:created`: Instant notification of new inbound tickets.
  * `employee:load_updated`: Live visual indicators of agent workloads.
  * `ticket:message_received`: Real-time conversation thread updates.
  * `sla:breached`: High-priority alert popups for breached tickets.
* **Dual-Thread Privacy**: Ticket threads support both customer-facing messages and internal staff-only notes (`isInternal: true`), automatically redacted for non-staff API calls.
* **Media Uploads**: Powered by **ImageKit** for secure attachment uploads directly in conversation threads.

### 6. 🔐 Developer API Key Management & Ingestion
* **External Integration**: Allows third-party apps or websites to programmatically create complaints.
* **Security First**: API keys use the prefix format `sf_live_...`. Raw keys are displayed only once upon generation; only their **SHA-256 hashes** are stored in PostgreSQL.

---

## 🛠️ Tech Stack Breakdown

### **Backend Stack**
* **Runtime & Framework**: Node.js, Express 5 (TypeScript)
* **Database & ORM**: PostgreSQL, Prisma 7 ORM (`@prisma/client`, `@prisma/adapter-pg`)
* **AI Engine**: Groq SDK (`groq-sdk`) with structured JSON schema output
* **Real-time Engine**: Socket.io 4 (`socket.io`)
* **Background Worker**: Node-Cron (`node-cron`)
* **Email Dispatch**: Resend SDK (`resend`)
* **File Storage**: ImageKit SDK (`imagekit`)
* **Security & Auth**: Bcrypt, JSON Web Tokens (JWT), Cookie-Parser, Zod validation
* **Error Specification**: Standardized RFC 7807 Problem Details (`application/problem+json`)

### **Frontend Stack**
* **Framework**: Next.js 16 (App Router), React 19 (TypeScript)
* **State Management**: Zustand v5 (Persisted Session & Notification state), TanStack React Query v5
* **Styling & UI**: Tailwind CSS v4, Framer Motion, Radix UI Primitives, Lucide Icons, Sonner Toasts
* **Data Visualization**: Recharts v3 (Analytics charts for MTTR & AI accuracy)
* **HTTP Client**: Custom Fetch client with standard RFC 7807 error processing

---

## 🗄️ Database Schema (Entity Relationship Diagram)

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

### Key Models Overview
* `Tenant`: Multi-tenant organization container holding global settings (`routingMode`).
* `User`: Staff or Admin account credentials and system roles (`ADMIN` vs `AGENT`).
* `Employee`: Staff profile linked to a `User` and `Department`, maintaining real-time active `load` counters.
* `Department`: Organizational units with custom keywords used for fallback matching.
* `Complaint`: Support ticket entity tracking title, status, priority, sentiment, AI reasoning, SLA deadlines (`slaDueAt`), and AI feedback.
* `Assignment`: Linking mechanism mapping complaints to either specific `Employee` IDs or unassigned `Department` queues.
* `TicketMessage`: Thread logs supporting customer replies, agent answers, internal staff notes, and attachments.
* `ApiKey`: Hashed SHA-256 API credentials for external developer integrations.

---

## 🔌 API Endpoint Reference

All API endpoints are mounted under `/api` and return standardized responses.

| Domain | Method | Endpoint | Access Level | Description |
| :--- | :--- | :--- | :--- | :--- |
| **Auth** | `POST` | `/api/auth/register` | Public | Register new Tenant organization & Admin account |
| **Auth** | `POST` | `/api/auth/login` | Public | Authenticate user & issue JWT cookie / token |
| **Auth** | `GET` | `/api/auth/me` | Authenticated | Fetch current logged-in user profile |
| **Complaints** | `POST` | `/api/complaints/create` | API Key / Auth | Ingest complaint, trigger AI routing, set SLA & assign load |
| **Complaints** | `GET` | `/api/complaints/all` | Staff | Retrieve tenant complaints with filters & pagination |
| **Complaints** | `GET` | `/api/complaints/details/:id` | Staff | Get complete ticket details, assignment & thread history |
| **Complaints** | `PATCH` | `/api/complaints/update-status` | Staff | Update status (`open`, `in_progress`, `resolved`) & sync load |
| **Complaints** | `POST` | `/api/complaints/send-resolution-email` | Staff | Send official customer resolution email (with optional AI draft) |
| **Complaints** | `PATCH` | `/api/complaints/assign-to-employee` | Admin | Manually reassign ticket to specific employee |
| **Messages** | `POST` | `/api/ticket-messages/create` | Authenticated | Post thread message or internal note (`isInternal: true`) |
| **Messages** | `GET` | `/api/ticket-messages/complaint/:id` | Authenticated | Fetch message thread (redacts internal notes for non-staff) |
| **Analytics** | `GET` | `/api/analytics/overview` | Staff | Compute MTTR, SLA Compliance Rate & Groq AI Accuracy |
| **Analytics** | `POST` | `/api/analytics/feedback` | Staff | Submit agent feedback on AI accuracy to refine model stats |
| **API Keys** | `POST` | `/api/apikey/generate` | Admin | Generate new SHA-256 API Key (`sf_live_...`) |
| **Departments** | `POST` | `/api/departments/create` | Admin | Create new department with keywords |
| **Employees** | `GET` | `/api/employees/all` | Staff | List employees with live active workload counters |

---

## 💻 Visual Workflow Walkthrough

```
[Inbound Complaint] ──> [API Key / Public Portal]
                               │
                               ▼
                   [Groq AI Zero-Shot Engine]
             ┌─────────────────┴─────────────────┐
             │ Extracted Metadata:               │
             │  • Department / Employee Target   │
             │  • Sentiment (FRUSTRATED/ANGRY)   │
             │  • Priority (URGENT -> 2h SLA)    │
             │  • AI Confidence Rating           │
             │  • Pre-filled Suggested Draft     │
             └─────────────────┬─────────────────┘
                               │
                               ▼
                   [Dynamic Load Balancer]
       Finds eligible staff & assigns to lowest load counter
                               │
                               ▼
                 [Real-Time Socket.io Broadcast]
       Pushes live alert to staff dashboard & updates UI counters
                               │
                               ▼
             [Staff Agent Workspace & AI Resolution]
       Agent reviews thread, uses 1-click AI reply, resolves ticket
```

---

## ⚙️ Environment Variables & Quick Setup

### 1. Prerequisites
* **Node.js**: v18.x or higher
* **PostgreSQL**: v14.x or higher
* **Redis** *(Optional for session/caching layer)*

---

### 2. Environment Configuration

#### Backend Environment File (`backend/.env`)
```env
PORT=5000
DATABASE_URL="postgresql://postgres:password@localhost:5432/serviceflow?schema=public"
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
FRONTEND_URL="http://localhost:3000"

# AI Integration (Groq)
GROQ_API_KEY="gsk_your_groq_api_key"
GROQ_MODEL="qwen/qwen3.6-27b"

# Email Service (Resend)
RESEND_API_KEY="re_your_resend_api_key"
RESEND_FROM_EMAIL="ServiceFlow Support <notifications@yourdomain.com>"

# Media Storage (ImageKit)
IMAGEKIT_PUBLIC_KEY="public_your_key"
IMAGEKIT_PRIVATE_KEY="private_your_key"
IMAGEKIT_URL_ENDPOINT="https://ik.imagekit.io/your_id"
```

#### Frontend Environment File (`frontend/.env.local`)
```env
NEXT_PUBLIC_API_URL="http://localhost:5000"
NEXT_PUBLIC_BACKEND_URL="http://localhost:5000"
```

---

### 3. Local Installation & Execution

#### Step 1: Clone Repository & Install Dependencies
```bash
# Clone the repository
git clone https://github.com/your-username/ServiceFlow.git
cd ServiceFlow

# Install Backend Dependencies
cd backend
npm install

# Install Frontend Dependencies
cd ../frontend
npm install
```

#### Step 2: Database Migration & Prisma Client Generation
```bash
cd ../backend

# Generate Prisma Client types
npx prisma generate

# Push DB schema to your PostgreSQL instance
npx prisma db push
```

#### Step 3: Start the Backend Server
```bash
cd ../backend
npm run dev
# Starts Express API server & SLA Background Worker on http://localhost:5000
```

#### Step 4: Start the Frontend Application
```bash
cd ../frontend
npm run dev
# Starts Next.js frontend application on http://localhost:3000
```

---

## 📂 Directory Structure

```
ServiceFlow/
├── backend/
│   ├── prisma/
│   │   └── schema.prisma             # PostgreSQL Prisma DB schema & model definitions
│   ├── src/
│   │   ├── config/                   # Database, Groq AI, ImageKit & Redis configurations
│   │   ├── middlewares/              # Express middlewares (Auth, Roles, API Keys, RFC 7807)
│   │   ├── modules/                  # Domain-Driven Feature Modules
│   │   │   ├── analytics/            # MTTR & AI accuracy calculation logic
│   │   │   ├── api-keys/             # SHA-256 API key generation & validation
│   │   │   ├── auth/                 # Authentication, JWT sessions & registration
│   │   │   ├── complaints/           # Groq AI routing, load balancing & complaints CRUD
│   │   │   ├── departments/          # Department CRUD & keyword management
│   │   │   ├── employees/            # Employee roster & load counter sync
│   │   │   ├── invites/              # Tokenized staff invitations
│   │   │   ├── notifications/        # Resend email notification service
│   │   │   ├── sla/                  # SLA breach scanner & node-cron background worker
│   │   │   ├── tenants/              # Multi-tenant settings & routing strategies
│   │   │   └── ticket-messages/      # Ticket thread messaging & ImageKit uploads
│   │   ├── socket/                   # Socket.io connection handlers & room emitters
│   │   ├── utils/                    # Hashing & RFC 7807 Problem Details helpers
│   │   ├── app.ts                    # Express application entrypoint
│   │   ├── routes.ts                 # Master router mounting all API modules
│   │   └── server.ts                 # HTTP server, socket initialization & cron worker
│   ├── package.json
│   └── tsconfig.json
│
└── frontend/
    ├── src/
    │   ├── app/                      # Next.js 16 App Router pages
    │   │   ├── (auth)/               # Login & Registration pages
    │   │   ├── complaints/[id]/      # Customer ticket tracking portal
    │   │   ├── dashboard/            # Admin & Agent Dashboard views
    │   │   ├── invite/[token]/       # Staff invite onboarding flow
    │   │   └── layout.tsx            # Global app layout & theme context
    │   ├── components/               # UI components & Radix primitives
    │   │   ├── ui/                   # Reusable components (Buttons, Dialogs, Cards, Tables)
    │   │   ├── notification-bell.tsx # Real-time socket notification popover
    │   │   ├── rbac-guard.tsx        # Role-based access control route wrapper
    │   │   └── theme-toggle.tsx      # Dark/Light mode theme toggle
    │   ├── hooks/                    # Custom React hooks (React Query & Socket listeners)
    │   ├── lib/                      # Custom Fetch wrapper & Socket client
    │   └── store/                    # Zustand global stores (Auth & Notifications)
    ├── package.json
    └── tsconfig.json
```

---

## 🤝 Contributing & License

Contributions, issues, and feature requests are welcome! Feel free to check the issues page or submit a pull request.

This project is licensed under the **ISC License**.

---

<p align="center">
  Made with ❤️ for automated, intelligent customer service operations.
</p>
