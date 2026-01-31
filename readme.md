# ServiceFlow - API-First Multi-Tenant Complaint Management Platform

## 📋 Project Overview

ServiceFlow is an **API-first, multi-tenant complaint and ticket management platform** designed for companies to plug directly into their own websites or apps. Instead of being a standalone public portal, ServiceFlow acts as a backend service that businesses integrate with. Their systems send complaint data to your API, and ServiceFlow takes care of intelligent routing, tracking, and management.

### Core Value Proposition

At its core, ServiceFlow does four main jobs:

1. **Centralize incoming complaints** - Receive complaints via API from any external system
2. **Automatically classify and route** - AI-powered ML classifier routes complaints to correct departments/employees
3. **Provide powerful internal dashboard** - Teams manage and resolve complaints through a web interface
4. **Expose clean APIs** - Any external product can fully use the service via REST API

### System Architecture

The platform consists of:

1. **Backend API** - Node.js/Express/TypeScript REST API with PostgreSQL
2. **ML Classifier Service** - FastAPI-based machine learning service for complaint classification  
3. **Frontend Dashboard** - Next.js/React internal management console (for teams, not end users)

Each company (tenant) gets its own isolated workspace where they can:
- Create departments with keywords for ML training
- Invite team members with role-based access
- Generate API keys for external integrations
- Receive complaints via API (automatically routed by ML)
- Manage complaints through the dashboard
- Track assignments, status, and resolution

---

## 🏗️ Architecture

```
ServiceFlow/
├── backend/              # Node.js/Express/TypeScript API
│   ├── src/
│   │   ├── controllers/ # Business logic handlers
│   │   ├── routes/      # API route definitions
│   │   ├── middlewares/ # Authentication & authorization
│   │   ├── config/      # Database & app configuration
│   │   ├── db/          # Database schema & seeds
│   │   └── utils/       # Utility functions
│   └── package.json
│
├── classifier/          # FastAPI ML Service
│   ├── app/
│   │   ├── main.py      # FastAPI application
│   │   ├── schemas.py    # Pydantic models
│   │   └── ml/
│   │       ├── trainer.py    # Model training
│   │       ├── predicter.py  # Prediction logic
│   │       ├── preprocess.py # Text preprocessing
│   │       └── state.py       # Model state management
│   └── requirements.txt
│
└── frontend/            # Next.js/React Dashboard
    ├── src/
    │   ├── app/         # Next.js app router pages
    │   ├── components/  # UI components
    │   └── lib/         # Utilities
    └── package.json
```

---

## 🆕 Recent Updates

### Newly Implemented Features ✅

1. **Manual Complaint Assignment** ✅
   - `PATCH /api/complaints/assign-to-employee` - Reassign complaints to employees
   - `PATCH /api/complaints/assign-to-department` - Reassign complaints to departments
   - Allows admins to manually override ML assignments

2. **Complaint Details Endpoint** ✅
   - `GET /api/complaints/details/:complaintId` - Get full complaint details with assignments
   - Returns complaint with department/employee assignment information

3. **Employee Keywords Update** ✅
   - `PATCH /api/employees/update-keywords` - Update employee keywords
   - **Automatic vector regeneration** when keywords are updated
   - Maintains ML model accuracy

4. **My Assignments Endpoint** ✅
   - `GET /api/employees/my-assignments/:employeeId` - Get complaints assigned to employee
   - Enables agent dashboard functionality
   - Returns full complaint details with assignment information

---

## ✅ What's Implemented & Working

### Backend API (Node.js/Express/TypeScript)

#### 1. **Authentication System** ✅ **PERFECT**
- User registration with automatic tenant creation
- JWT-based login with 30-day token expiration
- HttpOnly cookie-based session management
- Email normalization (trimming and lowercasing)
- Password hashing infrastructure (bcrypt available, but dev mode uses plain text)
- Role-based access control (ADMIN/AGENT)
- Secure middleware for protected routes

#### 2. **Multi-Tenant Architecture** ✅ **PERFECT**
- Complete tenant isolation at database level
- All queries scoped by `tenant_id`
- Tenant context attached to requests via middleware
- Tenant update functionality for admins
- Proper foreign key constraints with CASCADE deletes

#### 3. **API Key Management** ✅ **PERFECT**
- Generate secure hex-based API keys with "sf_live_" prefix
- SHA-256 hashing for secure key storage
- Admin-only API key generation and deletion
- API key authentication middleware for external API access
- **Routing mode per API key** (DEPARTMENT/EMPLOYEE) - stored in `api_keys` table
- List all API keys endpoint

#### 4. **Invitation System** ✅ **PERFECT**
- Create invites with role assignment (ADMIN/AGENT)
- UUID token-based invites with 24-hour expiration
- Invite acceptance creates user account and employee record automatically
- Validation for expiration, usage status, and email matching
- Invite URL generation with frontend URL

#### 5. **Employee Management** ✅ **EXCELLENT**
- List active and deleted employees (tenant-scoped)
- Soft delete and restore functionality
- Department association support
- Employee-to-department mapping endpoint
- Update employee name endpoint
- **Update employee keywords** with automatic vector regeneration
- **My Assignments endpoint** - Get complaints assigned to specific employee

#### 6. **Complaint Management** ✅ **EXCELLENT**
- Create complaints via API key (external) or admin interface
- **Automatic ML-powered assignment** during complaint creation
- List all complaints (tenant-scoped)
- **Get complaint details** with full assignment information
- Update complaint status (open → in_progress → resolved)
- **Manual assignment to employee** - Reassign complaints to specific employees
- **Manual assignment to department** - Reassign complaints to specific departments
- Soft delete and restore functionality
- Track customer name, email, and external reference IDs
- Assignment tracking in `assignments` table
- **ML assignment happens automatically** - no separate endpoint needed

#### 7. **Department Management** ✅ **EXCELLENT**
- Create departments with tenant-scoped uniqueness
- Support for keywords field (TEXT array) for ML training
- **Automatic vector generation** when department is created
- List active and deleted departments
- Soft delete and restore functionality
- Support for employee-department associations
- Vector storage (JSONB) for ML-generated department vectors

#### 8. **ML Integration & Vector Management** ✅ **EXCELLENT**
- **Department Vector Generation**: Automatically happens when department is created
  - Calls ML service to generate TF-IDF vectors
  - Stores vectors in database as JSONB
  - Returns model version and vector dimensions
- **Employee Vector Generation**: `POST /api/employees/create-vectors`
  - Fetches all active employees with titles and keywords
  - Generates vectors using ML service
  - Stores vectors in database as JSONB
- **ML-Powered Complaint Assignment**: Happens automatically during complaint creation
  - Supports both DEPARTMENT and EMPLOYEE routing modes (from API key)
  - Fetches vectors from database
  - Calls ML service for prediction
  - Auto-creates assignment records
  - Returns confidence scores and review flags
- **ML Service Configuration**: Environment variable support for ML service URL

#### 9. **Assignment System** ✅ **EXCELLENT**
- ML-powered automatic assignment to departments or employees (during complaint creation)
- **Manual assignment endpoints** - Reassign complaints to employees or departments
- Assignment tracking in `assignments` table
- Flexible assignee_type system (EMPLOYEE/DEPARTMENT)
- Confidence-based assignment with review flags
- Routing mode per API key (DEPARTMENT/EMPLOYEE)
- **My Assignments** - Employees can view their assigned complaints

#### 10. **Database Schema** ✅ **PERFECT**
- Complete PostgreSQL schema with all tables
- Department keywords field (TEXT array) for ML training
- Department vector storage (JSONB)
- Employee keywords field (TEXT array) for ML training
- Employee vector storage (JSONB)
- **Routing mode stored in `api_keys` table** (not tenants table)
- Proper indexes for performance
- Foreign key constraints for data integrity
- Soft delete support (deleted_at timestamps)
- `is_correctly_classified` field in complaints table for ML feedback

### ML Classifier Service (FastAPI) ✅ **PERFECT**

#### 1. **ML Model Training** ✅
- TF-IDF vectorization for department/employee classification
- Model persistence to disk
- Version management for models
- Automatic model loading on startup

#### 2. **Prediction API** ✅
- Complaint text preprocessing
- Cosine similarity-based matching
- Confidence threshold support (default 0.8)
- Model version tracking
- Review flagging for low confidence

#### 3. **Model Management** ✅
- Health check endpoint
- Model information retrieval
- Load specific model versions
- Thread-safe state management

### Frontend Dashboard (Next.js/React) ✅ **GOOD**

#### Implemented Pages:
- ✅ **Dashboard/Overview** - Stats, charts, recent complaints
- ✅ **Complaints** - Full table with search, filters, status management
- ✅ **Employees** - List, invite creation, soft delete/restore
- ✅ **Departments** - Create, list, manage keywords, soft delete/restore
- ✅ **API Keys** - Generate, list, delete API keys with routing mode selection
- ✅ **API Docs** - Comprehensive API documentation page
- ✅ **Settings** - Tenant name update
- ✅ **My Assignments** - View assigned complaints (backend endpoint implemented)

#### UI Features:
- Modern, responsive design with Tailwind CSS
- Radix UI components for accessibility
- Toast notifications for user feedback
- Search and filtering capabilities
- Status badges and visual indicators
- Modal dialogs for actions

---

## ⚠️ What's Missing / Incomplete

### Critical Missing Features

#### 1. **Department Keyword Update** ❌ **MEDIUM PRIORITY**
- **Status**: Keywords can only be set during creation
- **Issue**: Cannot update department keywords without recreating department
- **Needed**: `PATCH /api/departments/:id/keywords` - Update keywords and auto-regenerate vectors

#### 2. **Employee Title Update** ⚠️ **LOW PRIORITY**
- **Status**: Keywords update exists, but no title-only update endpoint
- **Issue**: Can update keywords but not title separately
- **Enhancement**: Add `PATCH /api/employees/:id/title` for title-only updates

### Minor Enhancements Needed

#### 6. **Enhanced Error Handling for ML Service** ⚠️
- **Status**: Basic error handling implemented
- **Enhancement Needed**: 
  - Retry mechanisms for transient failures
  - Timeout handling
  - Fallback mechanisms when ML service is unavailable
  - Better error messages for debugging

#### 7. **Production Password Hashing** ⚠️
- **Status**: Development mode active (plain text comparison)
- **Issue**: Using plain text password comparison in development
- **What's Needed**: Switch to bcrypt for production (code exists but not used)

#### 8. **Confidence Threshold Configuration** ⚠️
- **Status**: Hardcoded confidence threshold (0.8)
- **Enhancement**: Allow per-tenant or per-API-key confidence threshold configuration

#### 9. **Vector Versioning** ⚠️
- **Status**: Vectors stored but not versioned
- **Enhancement**: Track vector versions and model versions for rollback capability
- **Optional**: Separate `department_vectors` table with versioning support

#### 3. **Enhanced Complaint Details** ⚠️ **LOW PRIORITY**
- **Status**: Basic details endpoint exists
- **Enhancement**: Add assignment history, notes, and related complaints to details response

#### 11. **Assignment History** ⚠️
- **Status**: Only current assignment tracked
- **Enhancement**: Track assignment history (who assigned, when, previous assignments)

#### 12. **Analytics/Insights** ❌
- **Status**: Not implemented
- **Needed**: 
  - Complaint trends over time
  - Department/employee performance metrics
  - Resolution time tracking
  - ML accuracy metrics

---

## 🎯 Implementation Priority Order

### Phase 1: Critical Missing Features (Do First)

1. **Department Keyword Update** ⚡ **HIGH PRIORITY**
   - `PATCH /api/departments/:id/keywords`
   - Auto-regenerate vectors on update
   - Allows fine-tuning without recreation
   - **Status**: Not yet implemented

### Phase 2: Update & Management Features

2. **Employee Title Update Endpoint** ⚡ **LOW**
   - `PATCH /api/employees/:id/title`
   - Update title separately from keywords
   - Auto-regenerate vectors when title changes
   - **Status**: Keywords update exists, title-only update needed

3. **Enhanced Complaint Details** ⚡ **LOW**
   - Add assignment history to complaint details
   - Add notes/comments system
   - Add related complaints
   - **Status**: Basic details endpoint exists

### Phase 3: Production Readiness

4. **Switch to Production Password Hashing** ⚡ **HIGH**
   - Update auth controllers to use `hashPassword`/`comparePassword`
   - Remove dev mode plain text comparison
   - Critical for security

5. **Enhanced Error Handling** ⚡ **MEDIUM**
   - ML service retry logic
   - Timeout handling
   - Fallback mechanisms
   - Better error messages

6. **Input Validation** ⚡ **MEDIUM**
   - Schema validation (Zod or Joi)
   - Request validation middleware
   - Better error responses

7. **Confidence Threshold Configuration** ⚡ **LOW**
    - Per-tenant or per-API-key configuration
    - Store in database
    - Use in ML prediction calls

### Phase 4: Advanced Features

8. **Analytics & Insights** ⚡ **LOW**
    - Complaint trends
    - Performance metrics
    - ML accuracy tracking

9. **Assignment History** ⚡ **LOW**
    - Track assignment changes
    - Audit trail

10. **Vector Versioning** ⚡ **LOW**
    - Track vector versions
    - Rollback capability

---

## 🌟 What's Perfect (Don't Change)

### Architecture & Design ✅
- **Multi-tenant isolation** - Perfectly implemented at database level
- **API-first design** - Clean REST API, frontend is optional
- **Routing mode per API key** - Smart design, allows different routing per integration
- **Automatic ML assignment** - Happens during complaint creation, no extra step needed
- **Automatic vector generation** - Departments get vectors on creation automatically

### Security ✅
- **JWT authentication** - Properly implemented with HttpOnly cookies
- **API key hashing** - SHA-256 hashing, secure storage
- **Role-based access** - ADMIN/AGENT roles properly enforced
- **Tenant isolation** - All queries properly scoped

### Database Schema ✅
- **Proper indexes** - Performance optimized
- **Foreign key constraints** - Data integrity enforced
- **Soft deletes** - Proper `deleted_at` pattern
- **JSONB for vectors** - Efficient storage for ML vectors

### ML Integration ✅
- **TF-IDF vectorization** - Appropriate for text classification
- **Cosine similarity** - Standard approach for vector matching
- **Model versioning** - Proper version management
- **Confidence scoring** - Review flags for low confidence

### Frontend Structure ✅
- **Modern stack** - Next.js 16, React 19, Tailwind CSS
- **Component library** - Radix UI for accessibility
- **Clean architecture** - Well-organized pages and components
- **Responsive design** - Works on all devices

---

## 📚 Accurate API Documentation

### Authentication (`/api/auth`)

#### Register
- **POST** `/api/auth/register`
- **Body:**
  ```json
  {
    "email": "admin@example.com",
    "password": "password123",
    "tenantName": "Acme Corp"
  }
  ```
- **Response:** Creates tenant and admin user, returns JWT token in cookie
- **Note:** Routing mode is set per API key, not during registration

#### Login
- **POST** `/api/auth/login`
- **Body:**
  ```json
  {
    "email": "admin@example.com",
    "password": "password123"
  }
  ```
- **Response:** Returns JWT token in cookie

### API Keys (`/api/apikey`) - Admin Only

#### Generate API Key
- **POST** `/api/apikey/generate`
- **Headers:** `Authorization: Bearer <token>` or Cookie with token
- **Body:**
  ```json
  {
    "name": "Production API Key",
    "routingMode": "DEPARTMENT"
  }
  ```
- **Response:**
  ```json
  {
    "id": "uuid",
    "key": "sf_live_...",
    "message": "API key generated successfully"
  }
  ```
- **Note:** `routingMode` can be "DEPARTMENT" or "EMPLOYEE"

#### Get All API Keys
- **GET** `/api/apikey/get`
- **Headers:** `Authorization: Bearer <token>` or Cookie with token
- **Response:** Returns array of API keys (without actual key values)

#### Delete API Key
- **DELETE** `/api/apikey/delete`
- **Headers:** `Authorization: Bearer <token>` or Cookie with token
- **Body:**
  ```json
  {
    "apiKeyId": "uuid"
  }
  ```

### Invites (`/api/invite`)

#### Create Invite
- **POST** `/api/invite/create`
- **Headers:** `Authorization: Bearer <token>` or Cookie with token
- **Body:**
  ```json
  {
    "email": "agent@example.com",
    "role": "AGENT"
  }
  ```
- **Response:** Returns invite token and URL

#### Accept Invite
- **POST** `/api/invite/login`
- **Body:**
  ```json
  {
    "token": "invite-uuid",
    "email": "agent@example.com",
    "password": "password123"
  }
  ```
- **Response:** Creates user and employee, returns JWT token

### Employees (`/api/employees`) - Admin Only

#### Get Active Employees
- **GET** `/api/employees/active`
- **Headers:** `Authorization: Bearer <token>` or Cookie with token

#### Get Deleted Employees
- **GET** `/api/employees/deleted`
- **Headers:** `Authorization: Bearer <token>` or Cookie with token

#### Delete Employee
- **PATCH** `/api/employees/delete`
- **Body:**
  ```json
  {
    "employeeId": "uuid"
  }
  ```

#### Restore Employee
- **PATCH** `/api/employees/restore`
- **Body:**
  ```json
  {
    "employeeId": "uuid"
  }
  ```

#### Map Employee to Department
- **PATCH** `/api/employees/map-to-department`
- **Body:**
  ```json
  {
    "employeeId": "uuid",
    "departmentId": "uuid"
  }
  ```

#### Update Employee Name
- **PATCH** `/api/employees/update-name`
- **Body:**
  ```json
  {
    "employeeId": "uuid",
    "name": "New Name"
  }
  ```

#### Update Employee Keywords
- **PATCH** `/api/employees/update-keywords`
- **Headers:** `Authorization: Bearer <token>` or Cookie with token
- **Body:**
  ```json
  {
    "employeeId": "uuid",
    "keywords": "support, customer service, help desk"
  }
  ```
- **Response:**
  ```json
  {
    "message": "Employee keywords updated successfully",
    "employees_updated": 1,
    "model_version": "20240101_120000",
    "vector_dimension": 150
  }
  ```
- **Note:** Automatically regenerates and stores ML vectors for the employee

#### Get My Assignments
- **GET** `/api/employees/my-assignments/:employeeId`
- **Headers:** `Authorization: Bearer <token>` or Cookie with token
- **Response:** Returns array of complaints assigned to the specified employee
- **Note:** Returns complaints with full details including assignment information

#### Create Employee Vectors
- **POST** `/api/employees/create-vectors`
- **Headers:** `Authorization: Bearer <token>` or Cookie with token
- **Body:** (empty or `{}`)
- **Response:**
  ```json
  {
    "message": "Employee vectors created successfully",
    "employees_updated": 2,
    "model_version": "20240101_120000",
    "vector_dimension": 150
  }
  ```
- **Note:** Generates and stores ML vectors for all active employees (uses title + keywords)

### Complaints (`/api/complaints`)

#### Get All Complaints - Admin Only
- **GET** `/api/complaints/all`
- **Headers:** `Authorization: Bearer <token>` or Cookie with token
- **Response:** Returns all complaints for tenant

#### Create Complaint (with Automatic ML Assignment)
- **POST** `/api/complaints/create`
- **Headers:** `X-API-Key: <api_key>` (API key auth)
- **Body:**
  ```json
  {
    "title": "Network Issue",
    "description": "Cannot connect to WiFi",
    "customerName": "John Doe",
    "customerEmail": "john@example.com",
    "externalReferenceId": "EXT-123"
  }
  ```
- **Response (DEPARTMENT mode):**
  ```json
  {
    "message": "Complaint created and assigned",
    "assignment": {
      "assignee_type": "DEPARTMENT",
      "department_id": "uuid",
      "department_name": "IT Support",
      "confidence": 0.85,
      "needs_review": false
    }
  }
  ```
- **Response (EMPLOYEE mode):**
  ```json
  {
    "message": "Complaint created and assigned",
    "assignment": {
      "assignee_type": "EMPLOYEE",
      "employee_id": "uuid",
      "employee_email": "agent1@example.com",
      "employee_title": "Customer Support Specialist",
      "confidence": 0.82,
      "needs_review": false
    }
  }
  ```
- **Note:** 
  - ML assignment happens **automatically** during complaint creation
  - Routing mode comes from the API key used
  - If no vectors exist, returns error

#### Update Complaint Status - Admin Only
- **PATCH** `/api/complaints/update-status`
- **Body:**
  ```json
  {
    "complaintId": "uuid",
    "status": "in_progress"
  }
  ```
- **Valid Statuses:** `open`, `in_progress`, `resolved`

#### Delete Complaint - Admin Only
- **PATCH** `/api/complaints/delete`
- **Body:**
  ```json
  {
    "complaintId": "uuid"
  }
  ```

#### Restore Complaint - Admin Only
- **PATCH** `/api/complaints/restore`
- **Body:**
  ```json
  {
    "complaintId": "uuid"
  }
  ```

#### Get Complaint Details
- **GET** `/api/complaints/details/:complaintId`
- **Headers:** `X-API-Key: <api_key>` (API key auth) or `Authorization: Bearer <token>`
- **Response:** Returns complaint with full details including assignment information, department name, and employee details

#### Assign Complaint to Employee - Admin Only
- **PATCH** `/api/complaints/assign-to-employee`
- **Headers:** `Authorization: Bearer <token>` or Cookie with token
- **Body:**
  ```json
  {
    "complaintId": "uuid",
    "employeeId": "uuid"
  }
  ```
- **Response:**
  ```json
  {
    "message": "Complaint assigned to employee successfully"
  }
  ```
- **Note:** Updates existing assignment or creates new one if none exists

#### Assign Complaint to Department - Admin Only
- **PATCH** `/api/complaints/assign-to-department`
- **Headers:** `Authorization: Bearer <token>` or Cookie with token
- **Body:**
  ```json
  {
    "complaintId": "uuid",
    "departmentId": "uuid"
  }
  ```
- **Response:**
  ```json
  {
    "message": "Complaint assigned to department successfully"
  }
  ```
- **Note:** Updates existing assignment or creates new one if none exists

### Departments (`/api/departments`) - Admin Only

#### Create Department (with Automatic Vector Generation)
- **POST** `/api/departments/create`
- **Body:**
  ```json
  {
    "name": "IT Support",
    "keywords": "computer, laptop, software, network, email, technical support"
  }
  ```
- **Response:**
  ```json
  {
    "message": "Department created successfully",
    "department": {
      "id": "uuid",
      "name": "IT Support",
      "keywords": ["computer", "laptop", "software", ...]
    },
    "vector_dimension": 150,
    "model_version": "20240101_120000"
  }
  ```
- **Note:** Vector is automatically generated and stored during creation

#### Get All Departments
- **GET** `/api/departments/all`
- **Response:** Returns all active departments with keywords and vectors

#### Get Deleted Departments
- **GET** `/api/departments/deleted`
- **Response:** Returns all soft-deleted departments

#### Delete Department
- **PATCH** `/api/departments/delete`
- **Body:**
  ```json
  {
    "departmentId": "uuid"
  }
  ```

#### Restore Department
- **PATCH** `/api/departments/restore`
- **Body:**
  ```json
  {
    "departmentId": "uuid"
  }
  ```

### Tenant (`/api/tenant`) - Admin Only

#### Update Tenant
- **PUT** `/api/tenant/update`
- **Body:**
  ```json
  {
    "tenantId": "uuid",
    "name": "New Tenant Name"
  }
  ```
- **Note:** Only name can be updated. Routing mode is per API key, not per tenant.

### ML Classifier Service (`http://localhost:8000`)

#### Health Check
- **GET** `/health`
- **Response:**
  ```json
  {
    "status": "healthy",
    "model": {
      "loaded": true,
      "version": "20241201_143022",
      "vector_dimension": 42
    }
  }
  ```

#### Train/Vectorize
- **POST** `/departments/vectorize`
- **Body:**
  ```json
  {
    "departments": [
      {
        "id": 1,
        "name": "IT Support",
        "keyword": ["computer", "laptop", "software", "network"]
      }
    ]
  }
  ```
- **Response:** Returns trained vectors and model version

#### Predict
- **POST** `/departments/predict`
- **Body:**
  ```json
  {
    "complaint": "My laptop is not connecting to WiFi",
    "vectors": {
      "IT Support": [0.1, 0.2, 0.3, ...],
      "HR": [0.2, 0.1, 0.4, ...]
    },
    "confidence_threshold": 0.8
  }
  ```
- **Response:**
  ```json
  {
    "department": "IT Support",
    "confidence": 0.92,
    "needs_review": false,
    "model_version": "20241201_143022"
  }
  ```

#### Get Model Info
- **GET** `/model/info`

#### Load Model Version
- **POST** `/model/load?version=20241201_143022`

---

## 🔄 Complete Workflow

For a complete step-by-step workflow guide using Postman, see **[postman.md](./postman.md)**.

### Quick Workflow Overview:

1. **Register/Login** - Create tenant and admin user
2. **Create Departments** - Add departments with keywords (vectors auto-generated)
3. **Create Employees** - Invite employees and accept invites
4. **Set Employee Details** - Update employee titles and keywords via `/api/employees/update-keywords` (auto-regenerates vectors)
5. **Generate Employee Vectors** - Call `/api/employees/create-vectors` to train ML model for all employees
6. **Create API Key** - Generate API key with routing mode (DEPARTMENT or EMPLOYEE)
7. **Create Complaints** - Use API key to create complaints (ML assignment happens automatically)
8. **Manage Complaints** - View details, update status, manually reassign via dashboard or API
9. **Agent Workflow** - Agents can view their assignments via `/api/employees/my-assignments/:employeeId`

### Routing Modes:

- **DEPARTMENT**: Complaints are automatically assigned to departments based on ML prediction
- **EMPLOYEE**: Complaints are automatically assigned to individual employees based on ML prediction

**Note:** Routing mode is set **per API key**, not per tenant. This allows different integrations to use different routing strategies.

---

## 🔒 Security Features

### Implemented ✅
- JWT token-based authentication
- HttpOnly cookies for token storage
- API key hashing with SHA-256
- Role-based access control (ADMIN/AGENT)
- Tenant isolation at all levels
- SQL injection prevention (parameterized queries)
- Password hashing infrastructure (bcrypt available)
- CORS configured for frontend origin

### Needs Attention ⚠️
- **Development Mode Active**: Currently using plain text password comparison
- **Production Switch**: Update auth controllers to use `hashPassword`/`comparePassword`
- **Rate Limiting**: Not implemented
- **Input Validation**: Basic validation exists, but should use schema validation library (Zod/Joi)
- **API Key Rotation**: No automatic rotation mechanism

---

## 🗄️ Database Schema

### Tables

- **tenants** - Multi-tenant isolation
- **users** - User accounts with tenant association
- **api_keys** - API key management (includes `routing_mode` field)
- **complaints** - Complaint tracking
- **invites** - Invitation system
- **departments** - Department management
- **employees** - Employee profiles
- **assignments** - Complaint assignments

### Key Schema Fields

- **departments.keywords** - TEXT[] array for ML training keywords ✅
- **departments.vector** - JSONB field for storing ML vectors ✅
- **employees.keywords** - TEXT[] array for ML training keywords ✅
- **employees.vector** - JSONB field for storing ML vectors ✅
- **api_keys.routing_mode** - TEXT field (DEPARTMENT/EMPLOYEE) for routing strategy ✅
- **complaints.is_correctly_classified** - BOOLEAN for ML feedback ✅

**Important:** Routing mode is stored in `api_keys` table, NOT in `tenants` table. This allows different API keys to have different routing modes.

---

## 🧪 Testing Status

- **Unit Tests**: Not implemented
- **Integration Tests**: Not implemented
- **ML Service Tests**: Not implemented
- **E2E Tests**: Not implemented

---

## 📝 Development Notes

### Current Development Mode Features
- Plain text password comparison (for development only)
- CORS configured for localhost:3000
- Basic error messages
- Console logging for debugging

### Production Checklist
- [ ] Switch to bcrypt password hashing
- [ ] Configure CORS for production origins
- [ ] Add comprehensive error handling
- [ ] Implement rate limiting
- [ ] Add request validation (Zod/Joi)
- [ ] Add structured logging (Winston/Pino)
- [ ] Set up monitoring (Sentry/DataDog)
- [ ] Add database connection pooling optimization
- [ ] Implement caching where appropriate (Redis)
- [ ] Add API documentation (Swagger/OpenAPI)
- [ ] Set up CI/CD pipeline
- [ ] Add health check endpoints
- [ ] Implement graceful shutdown

---

## 🚀 Setup Instructions

### Prerequisites
- Node.js 18+ and npm
- Python 3.8+
- PostgreSQL 12+
- Docker (optional, for PostgreSQL)

### Backend Setup

1. **Navigate to backend directory**
   ```bash
   cd backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create `.env` file:
   ```env
   PORT=5000
   DB_HOST=localhost
   DB_PORT=5432
   DB_USER=postgres
   DB_PASSWORD=your_password
   DB_NAME=serviceflow
   JWT_SECRET=your_secret_key
   FRONTEND_URL=http://localhost:3000
   ML_SERVICE_URL=http://localhost:8000
   ```

4. **Set up database**
   ```bash
   # Connect to PostgreSQL and run schema
   psql -U postgres -d serviceflow -f src/db/schema.sql
   ```

5. **Run the server**
   ```bash
   npm run dev
   ```
   Server runs on `http://localhost:5000`

### ML Classifier Service Setup

1. **Navigate to classifier directory**
   ```bash
   cd classifier
   ```

2. **Create virtual environment**
   ```bash
   python -m venv venv
   ```

3. **Activate virtual environment**
   - **Windows:**
     ```bash
     venv\Scripts\activate
     ```
   - **Linux/Mac:**
     ```bash
     source venv/bin/activate
     ```

4. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

5. **Run the service**
   ```bash
   python run.py
   ```
   Service runs on `http://localhost:8000`
   - API Docs: `http://localhost:8000/docs`
   - ReDoc: `http://localhost:8000/redoc`

### Frontend Setup

1. **Navigate to frontend directory**
   ```bash
   cd frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run the development server**
   ```bash
   npm run dev
   ```
   Frontend runs on `http://localhost:3000`

---

## 🤝 Contributing

This project is open source. Contributions are welcome!

---

## 📄 License

This project is open source and available for use.

---

## 📞 Support

For issues or questions, please refer to the project documentation or create an issue in the repository.
