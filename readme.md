# ServiceFlow Backend - Implementation Documentation

## Project Overview
ServiceFlow is a multi-tenant complaint management system built with Node.js, Express, TypeScript, and PostgreSQL. The system supports tenant isolation, role-based access control, API key authentication, and comprehensive complaint management features.

## Tech Stack
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js 5.2.1
- **Database**: PostgreSQL with connection pooling
- **Authentication**: JWT (JSON Web Tokens) with cookie-based sessions
- **Security**: bcrypt for password hashing, SHA-256 for API key hashing
- **Development**: Nodemon for hot reloading, ts-node-dev for TypeScript execution

## Database Schema
- **tenants**: Multi-tenant isolation with UUID primary keys
- **users**: User accounts with tenant association, email uniqueness, role-based access (ADMIN/AGENT)
- **api_keys**: API key management with hashed storage and tenant association
- **complaints**: Complaint tracking with status workflow (open, in_progress, resolved), soft delete support
- **invites**: Invitation system with token-based authentication, expiration, and usage tracking
- **departments**: Department management with tenant-scoped uniqueness
- **employees**: Employee profiles linked to users and departments, with soft delete capability
- **assignments**: Flexible assignment system supporting both employee and department-level assignments

## Features Implemented

### 1. Authentication System
- User registration creates tenant and admin user in a single transaction
- JWT-based login with 30-day token expiration
- HttpOnly cookie-based sessions for secure token storage
- Email normalization (trimming and lowercasing)
- Password hashing (development mode with bcrypt ready for production)

### 2. Multi-Tenant Architecture
- Tenant isolation at database level with all queries scoped by tenant_id
- Tenant context attached to requests via middleware
- Tenant update functionality for admins
- ML endpoint to retrieve tenant details with departments and employees

### 3. API Key Management
- Generate secure hex-based API keys with "sf_live_" prefix
- SHA-256 hashing for secure key storage
- Admin-only API key deletion
- API key authentication middleware for external API access

### 4. Invitation System
- Create invites with role assignment (ADMIN/AGENT)
- UUID token-based invites with 24-hour expiration
- Invite acceptance creates user account and employee record
- Validation for expiration, usage status, and email matching

### 5. Employee Management
- List active and deleted employees (tenant-scoped)
- Soft delete and restore functionality
- Department association support
- Employee-to-department mapping function (controller ready)

### 6. Complaint Management
- Create complaints via API key (external) or admin interface
- List all complaints (tenant-scoped)
- Update complaint status (open → in_progress → resolved)
- Soft delete and restore functionality
- Track customer name, email, and external reference IDs
- Assign complaints to employees or departments (including ML-based assignment)

### 7. Department Management
- Create departments with tenant-scoped uniqueness
- List active and deleted departments
- Soft delete and restore functionality
- Support for employee-department associations

### 8. Assignment System
- Assign complaints to individual employees
- Assign complaints to entire departments
- ML-supported assignment endpoint for automated routing
- Flexible assignee_type system (EMPLOYEE/DEPARTMENT)

## API Endpoints

### Authentication (`/api/auth`)
- `POST /register` - Register new tenant and admin user
- `POST /login` - User login with email/password

### API Keys (`/api/apikey`) - Admin Only
- `POST /generate` - Generate new API key
- `DELETE /delete` - Delete API key

### Invites (`/api/invite`)
- `POST /create` - Create invitation (requires auth)
- `POST /login` - Accept invite and create account

### Employees (`/api/employees`) - Admin Only
- `GET /active` - Get all active employees
- `GET /deleted` - Get all deleted employees
- `PATCH /delete` - Soft delete employee
- `PATCH /restore` - Restore deleted employee

### Complaints (`/api/complaints`)
- `GET /all` - Get all complaints (Admin only)
- `POST /create` - Create complaint (API key auth)
- `PATCH /update-status` - Update complaint status (Admin only)
- `PATCH /delete` - Soft delete complaint (Admin only)
- `PATCH /restore` - Restore complaint (Admin only)
- `PATCH /assign-to-employee` - Assign complaint to employee
- `PATCH /assign-to-assignee-through-ml` - ML-based assignment (Admin only)

### Departments (`/api/departments`) - Admin Only
- `POST /create` - Create department
- `GET /all` - Get all active departments
- `GET /deleted` - Get all deleted departments
- `PATCH /delete` - Soft delete department
- `PATCH /restore` - Restore department

### Tenant (`/api/tenant`) - Admin Only
- `PUT /update` - Update tenant information
- `POST /details-for-ml` - Get tenant details for ML service

## Middleware System
- **authmiddleware**: JWT verification, extracts userId and tenantId
- **adminmiddleware**: Role-based access control (ADMIN only)
- **apiKeyAuth**: API key validation for external API access
- Request context with user information attached to Express Request object

## Configuration
Environment variables: `PORT`, `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `JWT_SECRET`, `FRONTEND_URL`

## Security Features
- Password hashing (bcrypt ready, dev mode active)
- API key hashing with SHA-256
- JWT token-based authentication
- HttpOnly cookies for token storage
- Role-based access control (ADMIN/AGENT)
- Tenant isolation at all levels
- SQL injection prevention (parameterized queries)
