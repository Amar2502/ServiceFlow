# ServiceFlow — project checklist

Multi-tenant complaint routing: **Node/Express + PostgreSQL** backend, **FastAPI + scikit-learn** classifier, and a separate **Next.js** app (not detailed here).

---

## Done (backend & classifier)

- [x] **Express app** — Auth, API keys, invites, employees, departments, complaints, tenant routes; JSON body + cookies; CORS for local dev.
- [x] **Multi-tenant Postgres schema** — `tenants`, `users`, `api_keys`, `departments`, `employees`, `complaints`, `assignments`, `invites`; soft deletes where used; `employees.load` for workload balancing.
- [x] **JWT sessions** — Register/login, HttpOnly cookie, admin middleware, API-key middleware for public complaint creation.
- [x] **API keys** — Generate (prefixed keys), hash storage, list/delete (admin).
- [x] **Invites** — Token-based invite flow for joining a tenant.
- [x] **Departments / employees** — CRUD-style flows, department ↔ employee mapping; vectorize stores **`vectorData.vectors`** from the classifier as JSON (full trainer output for that call).
- [x] **Complaints** — Create via API key with ML routing (`/profile/predict`, `profile_id`); `EMPLOYEE` mode validates `selected_employee` and resolved `employee` before assign; list/details; status updates; soft delete/restore; manual assign.
- [x] **Tenant-level routing mode** — `tenants.routing_mode` (`DEPARTMENT` | `EMPLOYEE`) drives how new complaints are routed; API key middleware reads it from `tenants`. Registration inserts only `tenants(name)`; `schema.sql` defaults `routing_mode` to `DEPARTMENT`. Admins can change it via `PUT /api/tenant/update/routing-mode` (`updateTenantRoutingMode`).
- [x] **Assignment + load** — On assignment, `employees.load` increments; department mode picks lowest-load employee in the predicted department.
- [x] **Classifier service** — FastAPI with `/health`, `/profile/vectorize` (`profile_keywords` body), `/profile/predict`, `/model/info`, `/model/load`; TF-IDF + cosine similarity; model state and persistence (`app/ml/state.py`).

---

## Remaining / gaps (why it matters)

### Correctness & integration (do these before shipping)

- [ ] **Vectorize: one profile vs matrix + prediction shape** — `fit_tfidf_on_profiles` fits **one TF‑IDF row per keyword** and returns a **2D matrix** in `vectors`. `department` / `employee` persist **`vectorData.vectors`** as JSON. **`predict_profiles`** builds `np.array([vectors[id] ...])` and expects **each value to be a single 1D embedding** matching the live vectorizer’s dimension. If the DB holds a **nested 2D list** (whole matrix) per row, shapes may not match cosine similarity vs the complaint vector. *Reason: align training (e.g. one document from joined keywords → one row), storage (one 1D vector per department/employee), and predict payloads.*

### Product / platform features (from original scope; not in repo outside UI)

- [ ] **Ticket messaging / threads** — No messages table or reply APIs. *Reason: real support workflows need conversation history.*
- [ ] **Attachments** — No upload/storage. *Reason: many tickets need screenshots or documents.*
- [ ] **Priority, richer statuses, SLA** — Schema limits statuses; no priority or SLA tables. *Reason: needed for triage and operational SLAs.*
- [ ] **Notifications (email / in-app)** — No queue or notification store. *Reason: agents and customers need alerts on assignment and updates.*
- [ ] **Audit trail / assignment history** — Only current assignment row exists. *Reason: compliance and debugging who changed what.*
- [ ] **Server-side search & analytics APIs** — Listing exists; no dedicated search/filter/analytics endpoints. *Reason: scale and reporting need indexed queries, not only client-side filtering.*

### Production readiness

- [ ] **Password hashing** — Dev-style hashing/compare paths; switch to bcrypt (or similar) for production. *Reason: protects accounts if the DB leaks.*
- [ ] **Validation & errors** — Structured validation (e.g. Zod), consistent error bodies, ML timeouts/retries. *Reason: predictable APIs and resilience when the classifier is down.*
- [ ] **Tests & CI** — `backend` test script is a stub; no automated tests found. *Reason: catches regressions in routing and tenancy.*
- [ ] **Ops** — No Docker Compose or deploy docs in-repo. *Reason: repeatable local/prod environments for DB + API + classifier.*

---

## What to do more (recommended order)

1. **Finish vectorize + DB vector shape** — Emit **one 1D embedding per profile**, store that in `departments.vector` / `employees.vector`, and confirm **`/profile/predict`** receives the same layout as post-training inference; then E2E create dept/employee → complaint.
2. **Migrate DB** — Keep deployed databases aligned with `schema.sql` (defaults + constraints) when you evolve the schema.
3. **Run manual E2E** — Register → create departments/employees → train vectors → create complaint with API key → verify assignment and `load` updates.
4. **Add minimal tests** — Integration tests for auth, tenancy isolation, and one happy-path complaint create.
5. **Hardening** — Rate limits, production CORS, structured logging, health checks wired from the backend to the classifier URL from config.
6. **Product backlog** — Prioritize messaging + notifications first if the goal is a usable helpdesk; prioritize SLA/priority if the goal is enterprise ops.

---

*This checklist was built from the **backend** and **classifier** trees only; the **frontend/** folder was excluded from the audit.*
