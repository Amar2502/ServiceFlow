# ServiceFlow - Multi-Tenant Complaint Management System

## 📋 Project Overview

ServiceFlow is a comprehensive multi-tenant complaint management system with integrated machine learning capabilities for automated department classification. The system consists of:

1. **Backend API** - Node.js/Express/TypeScript REST API with PostgreSQL
2. **ML Classifier Service** - FastAPI-based machine learning service for complaint classification

The system supports tenant isolation, role-based access control, API key authentication, and ML-powered complaint routing.

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
└── classifier/          # FastAPI ML Service
    ├── app/
    │   ├── main.py      # FastAPI application
    │   ├── schemas.py    # Pydantic models
    │   └── ml/
    │       ├── trainer.py    # Model training
    │       ├── predicter.py  # Prediction logic
    │       ├── preprocess.py # Text preprocessing
    │       └── state.py       # Model state management
    └── requirements.txt
```

---

## ✅ What's Implemented

### Backend API (Node.js/Express/TypeScript)

#### 1. **Authentication System** ✅
- User registration with automatic tenant creation
- JWT-based login with 30-day token expiration
- HttpOnly cookie-based session management
- Email normalization (trimming and lowercasing)
- Password hashing (development mode - plain text, production-ready bcrypt available)
- Role-based access control (ADMIN/AGENT)

#### 2. **Multi-Tenant Architecture** ✅
- Complete tenant isolation at database level
- All queries scoped by `tenant_id`
- Tenant context attached to requests via middleware
- Tenant update functionality for admins
- ML endpoint to retrieve tenant details with departments and employees

#### 3. **API Key Management** ✅
- Generate secure hex-based API keys with "sf_live_" prefix
- SHA-256 hashing for secure key storage
- Admin-only API key generation and deletion
- API key authentication middleware for external API access

#### 4. **Invitation System** ✅
- Create invites with role assignment (ADMIN/AGENT)
- UUID token-based invites with 24-hour expiration
- Invite acceptance creates user account and employee record automatically
- Validation for expiration, usage status, and email matching
- Invite URL generation with frontend URL

#### 5. **Employee Management** ✅
- List active and deleted employees (tenant-scoped)
- Soft delete and restore functionality
- Department association support
- Employee-to-department mapping endpoint

#### 6. **Complaint Management** ✅
- Create complaints via API key (external) or admin interface
- List all complaints (tenant-scoped)
- Update complaint status (open → in_progress → resolved)
- Soft delete and restore functionality
- Track customer name, email, and external reference IDs
- Assign complaints to employees

#### 7. **Department Management** ✅
- Create departments with tenant-scoped uniqueness
- Support for keywords field for ML training
- List active and deleted departments
- Soft delete and restore functionality
- Support for employee-department associations
- Vector storage (JSONB) for ML-generated department vectors

#### 8. **ML Integration & Vector Management** ✅
- **Department Vector Generation**: `POST /api/departments/create-vectors`
  - Fetches all active departments with keywords
  - Calls ML service to generate TF-IDF vectors
  - Stores vectors in database as JSONB
  - Returns model version and vector dimensions
- **Employee Vector Generation**: `POST /api/employees/create-vectors`
  - Fetches all active employees with titles and keywords
  - Generates vectors using ML service
  - Stores vectors in database as JSONB
- **ML-Powered Complaint Assignment**: `POST /api/complaints/assign-to-assignee-through-ml`
  - Supports both DEPARTMENT and EMPLOYEE routing modes
  - Fetches vectors from database
  - Calls ML service for prediction
  - Auto-creates assignment records
  - Returns confidence scores and review flags
- **ML Service Configuration**: Environment variable support for ML service URL

#### 9. **Assignment System** ✅
- Assign complaints to individual employees
- ML-powered automatic assignment to departments or employees
- Assignment tracking in `assignments` table
- Flexible assignee_type system (EMPLOYEE/DEPARTMENT)
- Confidence-based assignment with review flags
- Tenant routing mode support (DEPARTMENT/EMPLOYEE)

#### 10. **Database Schema** ✅
- Complete PostgreSQL schema with all tables
- Department keywords field for ML training
- Department vector storage (JSONB)
- Employee vector storage (JSONB)
- Proper indexes for performance
- Foreign key constraints for data integrity
- Soft delete support (deleted_at timestamps)

### ML Classifier Service (FastAPI)

#### 1. **ML Model Training** ✅
- TF-IDF vectorization for department classification
- Model persistence to disk
- Version management for models
- Automatic model loading on startup

#### 2. **Prediction API** ✅
- Complaint text preprocessing
- Cosine similarity-based department matching
- Confidence threshold support
- Model version tracking

#### 3. **Model Management** ✅
- Health check endpoint
- Model information retrieval
- Load specific model versions
- Thread-safe state management

---

## ⚠️ What's Missing/Incomplete

### Minor Enhancements Needed

#### 1. **Department Keyword Update Endpoint** ⚠️
- **Status**: Keywords can be set during creation, but no dedicated update endpoint
- **Current**: Keywords are included in department creation
- **Enhancement**: Add `PATCH /api/departments/:id/keywords` for updating keywords without recreating department

#### 2. **Employee Title/Keywords Update Endpoint** ⚠️
- **Status**: No direct API endpoint to update employee `title` and `keywords`
- **Current**: Can be updated via direct SQL
- **Enhancement**: Add `PATCH /api/employees/:id` endpoint to update title and keywords

#### 3. **Enhanced Error Handling for ML Service** ⚠️
- **Status**: Basic error handling implemented
- **Enhancement**: 
  - Retry mechanisms for transient failures
  - Timeout handling
  - Fallback mechanisms when ML service is unavailable
  - Better error messages for debugging

#### 4. **Production Password Hashing** ⚠️
- **Status**: Development mode active
- **Issue**: Using plain text password comparison in development
- **What's Needed**: Switch to bcrypt for production (code exists but not used)

#### 5. **Vector Versioning** ⚠️
- **Status**: Vectors stored but not versioned
- **Enhancement**: Track vector versions and model versions for rollback capability
- **Optional**: Separate `department_vectors` table with versioning support

#### 6. **Confidence Threshold Configuration** ⚠️
- **Status**: Hardcoded confidence threshold (0.8)
- **Enhancement**: Allow per-tenant confidence threshold configuration

---

## 🎯 Future Enhancements

### Priority 1: API Improvements

1. **Department Keyword Update Endpoint**
   ```typescript
   PATCH /api/departments/:id/keywords
   Body: { keywords: "new, keywords, here" }
   ```

2. **Employee Details Update Endpoint**
   ```typescript
   PATCH /api/employees/:id
   Body: { title: "New Title", keywords: "new keywords" }
   ```

3. **Automatic Vector Regeneration**
   - Trigger vector regeneration when department/employee keywords are updated
   - Background job to refresh vectors periodically

### Priority 2: Enhanced ML Features

4. **Vector Versioning System**
   - Track vector versions and model versions
   - Support for rollback to previous vector versions
   - Separate `department_vectors` table with versioning

5. **Per-Tenant Confidence Thresholds**
   - Allow tenants to configure their own confidence thresholds
   - Store in `tenants` table or tenant settings

6. **ML Service Retry & Fallback**
   - Implement retry logic for transient ML service failures
   - Fallback to manual assignment when ML service is unavailable
   - Circuit breaker pattern for ML service calls

### Priority 3: Production Readiness

9. **Switch to Production Password Hashing**
   - Update auth controllers to use `hashPassword` and `comparePassword`
   - Remove dev mode functions

10. **Add Comprehensive Error Handling**
    - ML service connection errors
    - Timeout handling
    - Fallback mechanisms

11. **Add Request Validation**
    - Input validation middleware
    - Schema validation (e.g., using Zod or Joi)

12. **Add Logging**
    - Structured logging
    - Request/response logging
    - Error logging

13. **Add Testing**
    - Unit tests for controllers
    - Integration tests for API endpoints
    - ML service integration tests

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

---

## 🔄 Complete Workflow

For a complete step-by-step workflow guide using Postman, see **[postman.md](./postman.md)**.

### Quick Workflow Overview:

1. **Register/Login** - Create tenant and admin user
2. **Create Departments** - Add departments with keywords
3. **Generate Department Vectors** - Call `/api/departments/create-vectors` to train ML model
4. **Create Employees** - Invite employees and accept invites
5. **Update Employee Details** - Set employee titles and keywords (via SQL or future endpoint)
6. **Generate Employee Vectors** - Call `/api/employees/create-vectors` to train ML model
7. **Create API Key** - Generate API key for external complaint creation
8. **Create Complaints** - Use API key to create complaints
9. **Assign via ML** - Call `/api/complaints/assign-to-assignee-through-ml` for automatic assignment

The system supports two routing modes:
- **DEPARTMENT**: Complaints are assigned to departments based on ML prediction
- **EMPLOYEE**: Complaints are assigned to individual employees based on ML prediction

---

## 📚 API Documentation

### Authentication (`/api/auth`)

#### Register
- **POST** `/api/auth/register`
- **Body:**
  ```json
  {
    "email": "admin@example.com",
    "password": "password123",
    "tenantName": "Acme Corp",
    "routingMode": "DEPARTMENT"
  }
  ```
- **Response:** Creates tenant and admin user, returns JWT token in cookie
- **Note:** `routingMode` can be "DEPARTMENT" or "EMPLOYEE"

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
    "name": "Production API Key"
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

#### Create Complaint
- **POST** `/api/complaints/create`
- **Headers:** `Authorization: Bearer <api_key>` (API key auth)
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

#### Assign to Employee - Admin Only
- **PATCH** `/api/complaints/assign-to-employee`
- **Body:**
```json
{
    "complaintId": "uuid",
    "employeeId": "uuid"
  }
  ```

#### Assign Through ML - Admin Only ✅
- **POST** `/api/complaints/assign-to-assignee-through-ml`
- **Headers:** `Authorization: Bearer <token>` or Cookie with token
- **Body:**
  ```json
  {
    "complaintId": "uuid",
    "complaintText": "I need help with my order that hasn't arrived"
  }
  ```
- **Response (DEPARTMENT mode):**
  ```json
  {
    "message": "Complaint assigned successfully",
    "assignment": {
      "assignee_type": "DEPARTMENT",
      "assignee_id": "uuid",
      "department_name": "Customer Support",
      "confidence": 0.85,
      "needs_review": false
    }
  }
  ```
- **Response (EMPLOYEE mode):**
  ```json
  {
    "message": "Complaint assigned successfully",
    "assignment": {
      "assignee_type": "EMPLOYEE",
      "assignee_id": "uuid",
      "employee_email": "agent1@example.com",
      "employee_title": "Customer Support Specialist",
      "confidence": 0.82,
      "needs_review": false
    }
  }
  ```
- **Note:** 
  - Automatically detects tenant routing mode (DEPARTMENT or EMPLOYEE)
  - Fetches vectors from database
  - Calls ML service for prediction
  - Creates assignment record automatically
  - Returns confidence score and review flag

### Departments (`/api/departments`) - Admin Only

#### Create Department
- **POST** `/api/departments/create`
- **Body:**
  ```json
  {
    "name": "IT Support",
    "keywords": "computer, laptop, software, network, email, technical support"
  }
  ```
- **Response:** Returns created department with ID

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

#### Create Department Vectors
- **POST** `/api/departments/create-vectors`
- **Headers:** `Authorization: Bearer <token>` or Cookie with token
- **Body:** (empty or `{}`)
- **Response:**
  ```json
  {
    "message": "Department vectors created successfully",
    "departments_updated": 3,
    "model_version": "20240101_120000",
    "vector_dimension": 150
  }
  ```
- **Note:** Generates and stores ML vectors for all active departments

### Tenant (`/api/tenant`) - Admin Only

#### Update Tenant
- **PUT** `/api/tenant/update`
- **Body:**
  ```json
  {
    "tenantId": "uuid",
    "name": "New Tenant Name",
    "routingMode": "EMPLOYEE"
  }
  ```
- **Note:** Can update both name and routing mode

#### Get Tenant Details for ML
- **POST** `/api/tenant/details-for-ml`
- **Body:**
  ```json
  {
    "tenantId": "uuid"
  }
  ```
- **Response:** Returns tenant with departments and employees

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

#### Train Model
- **POST** `/departments/vectorize`
- **Body:**
  ```json
  {
    "departments": [
      {
        "id": 1,
        "name": "IT Support",
        "keyword": "computer, laptop, software, network, email"
      }
    ]
  }
  ```
- **Response:** Returns trained vectors (should be stored in database)

#### Predict Department
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

## 🔒 Security Features

### Implemented ✅
- JWT token-based authentication
- HttpOnly cookies for token storage
- API key hashing with SHA-256
- Role-based access control (ADMIN/AGENT)
- Tenant isolation at all levels
- SQL injection prevention (parameterized queries)
- Password hashing infrastructure (bcrypt available)

### Needs Attention ⚠️
- **Development Mode Active**: Currently using plain text password comparison
- **Production Switch**: Update auth controllers to use `hashPassword`/`comparePassword`
- **CORS Configuration**: Currently allows all origins - should be configured for production
- **Rate Limiting**: Not implemented
- **Input Validation**: Basic validation exists, but should use schema validation library

---

## 🗄️ Database Schema

### Tables

- **tenants** - Multi-tenant isolation
- **users** - User accounts with tenant association
- **api_keys** - API key management
- **complaints** - Complaint tracking
- **invites** - Invitation system
- **departments** - Department management
- **employees** - Employee profiles
- **assignments** - Complaint assignments

### Schema Fields

- **departments.keywords** - TEXT field for ML training keywords ✅
- **departments.vector** - JSONB field for storing ML vectors ✅
- **employees.keywords** - TEXT field for ML training keywords ✅
- **employees.vector** - JSONB field for storing ML vectors ✅
- **tenants.routing_mode** - TEXT field (DEPARTMENT/EMPLOYEE) for routing strategy ✅

---

## 🧪 Testing Status

- **Unit Tests**: Not implemented
- **Integration Tests**: Not implemented
- **ML Service Tests**: Not implemented

---

## 📝 Development Notes

### Current Development Mode Features
- Plain text password comparison (for development only)
- All CORS origins allowed
- Basic error messages

### Production Checklist
- [ ] Switch to bcrypt password hashing
- [ ] Configure CORS for specific origins
- [ ] Add comprehensive error handling
- [ ] Implement rate limiting
- [ ] Add request validation
- [ ] Add structured logging
- [ ] Set up monitoring
- [ ] Add database connection pooling optimization
- [ ] Implement caching where appropriate

---

## 🤝 Contributing

This project is open source. Contributions are welcome!

---

## 📄 License

This project is open source and available for use.

---

## 📞 Support

For issues or questions, please refer to the project documentation or create an issue in the repository.
