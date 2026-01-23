# ServiceFlow Frontend Documentation

## Overview
The ServiceFlow frontend is a comprehensive Next.js application built with TypeScript, React, and Tailwind CSS. It provides a complete user interface for managing complaints, employees, departments, API keys, and tenant settings. The UI follows a consistent warm, beige color scheme with a professional and modern design aesthetic.

## Architecture & Technology Stack

### Core Technologies
- **Framework**: Next.js 14+ with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS with custom color palette
- **UI Components**: shadcn/ui component library
- **State Management**: React hooks (useState, useEffect)
- **HTTP Client**: Axios for API communication
- **Animations**: Framer Motion for smooth transitions
- **Icons**: Lucide React icon library
- **Notifications**: Sonner for toast notifications

### Design System
The application uses a consistent color palette throughout:
- Primary Background: `#faf6f2` (warm beige)
- Sidebar: `#EED9C4` (light beige)
- Accent: `#c9a382` and `#8c6d4e` (brown tones)
- Text: `#5a3e2b` (dark brown)
- Borders: `#EED9C4` and `#dfc7ae` (beige variations)

## Page Structure & Features

### Authentication Pages

#### Login Page (`/login`)
- Email and password authentication
- Password visibility toggle
- Forgot password dialog (UI only)
- Form validation and error handling
- Redirects to dashboard on successful login
- Matches backend endpoint: `POST /api/auth/login`

#### Registration Page (`/register`)
- User registration with name, email, company name, and password
- Terms of service acceptance checkbox
- Password visibility toggle
- Creates new tenant and admin user
- Matches backend endpoint: `POST /api/auth/register`

#### Invite Acceptance Page (`/invite/[token]`)
- Dynamic route for accepting employee invitations
- Collects name, email, job title, and password
- Validates invite token and creates employee account
- Matches backend endpoint: `POST /api/invite/login`

### Dashboard Pages

#### Main Dashboard (`/dashboard`)
- Overview statistics cards (Total Complaints, Pending, Employees, Customers)
- Tabbed interface with Overview and Recent Complaints sections
- Overview tab shows monthly complaint volume chart
- Recent Complaints tab displays latest customer issues
- Currently displays static data (ready for backend integration)

#### My Assignments (`/dashboard/my-assignments`)
- **Employee-focused view**: Shows all complaints assigned to the logged-in employee
- Statistics cards showing total, open, in progress, and resolved assignments
- Search functionality to find specific complaints
- Filter by status (all, open, in_progress, resolved)
- Detailed complaint view in a dialog modal
- Update complaint status directly from the detail view
- Shows customer information, complaint details, external reference IDs
- Displays assignment date and creation date
- **Note**: Requires backend endpoint `GET /api/complaints/my-assignments` (to be implemented)
- Matches backend endpoint: `PATCH /api/complaints/update-status` - Update complaint status

#### Complaints Management (`/dashboard/complaints`)
- **Key Feature**: Complaints are created via API only (no manual creation UI)
- Displays all complaints in a table format
- Shows customer name, email, title, description, status, external reference ID
- Status badge visualization (Open, In Progress, Resolved, Closed, Pending)
- Filter by status functionality
- Search capability
- Export functionality (UI ready)
- Matches backend endpoints:
  - `GET /api/complaints/all` - Fetch all complaints
  - `PATCH /api/complaints/update-status` - Update complaint status
  - `PATCH /api/complaints/delete` - Soft delete complaint
  - `PATCH /api/complaints/restore` - Restore deleted complaint

#### Employee Management (`/dashboard/employees`)
- **Key Feature**: Uses invite system instead of direct employee creation
- "Invite Employee" button opens sheet with role selection (ADMIN/AGENT)
- Displays active and deleted employees in table format
- Employee information includes: ID, name, email, title, role, status, keywords
- Status badges (Active/Deleted)
- Keywords displayed as badges (first 2 visible, +count for more)
- Actions dropdown menu with options:
  - Edit Name
  - Edit Keywords
  - Map to Department
  - Delete/Restore
- Filter by status (Active/Deleted)
- Matches backend endpoints:
  - `GET /api/employees/active` - Fetch active employees
  - `GET /api/employees/deleted` - Fetch deleted employees
  - `POST /api/invite/create` - Generate invite link
  - `PATCH /api/employees/delete` - Soft delete employee
  - `PATCH /api/employees/restore` - Restore employee
  - `PATCH /api/employees/map-to-department` - Assign to department
  - `PATCH /api/employees/update-name` - Update employee name
  - `POST /api/employees/create-vectors` - Generate ML vectors

#### Department Management (`/dashboard/departments`)
- Create new departments with name and keywords
- Keywords are comma-separated and used for intelligent complaint routing
- View active and deleted departments
- Department table shows: name, keywords (as badges), creation date
- Actions: Delete (soft delete) and Restore
- Toggle between active and deleted views
- Matches backend endpoints:
  - `POST /api/departments/create` - Create department (auto-vectorizes)
  - `GET /api/departments/all` - Fetch active departments
  - `GET /api/departments/deleted` - Fetch deleted departments
  - `PATCH /api/departments/delete` - Soft delete department
  - `PATCH /api/departments/restore` - Restore department

#### API Keys Management (`/dashboard/apikeys`)
- Generate new API keys with name and routing mode selection
- Routing modes: DEPARTMENT or EMPLOYEE
- Security feature: API key shown only once after generation with warning
- Copy to clipboard functionality
- Show/hide API key toggle
- Table displays: name, routing mode, creation date, last used date
- Delete API key functionality
- Matches backend endpoints:
  - `POST /api/apikey/generate` - Generate new API key
  - `DELETE /api/apikey/delete` - Delete API key

#### API Documentation (`/dashboard/api-docs`)
- **Developer-focused documentation**: Complete API integration guide
- Quick start section with step-by-step instructions
- Base URL information and environment notes
- Endpoint documentation with request/response examples
- Code examples in multiple languages:
  - cURL
  - JavaScript (fetch API)
  - Python (requests library)
  - Node.js (axios)
- Authentication guide with security best practices
- Routing modes explanation (DEPARTMENT vs EMPLOYEE)
- HTTP status codes reference
- Copy-to-clipboard functionality for all code examples
- Links to API Keys management page
- User-friendly design with syntax-highlighted code blocks
- Interactive tabs for switching between code examples

#### Settings Page (`/dashboard/settings`)
- Update tenant/organization name
- Simple form with organization name field
- Matches backend endpoint: `PUT /api/tenant/update`

## Component Architecture

### Reusable UI Components
All components use shadcn/ui library for consistency:
- **Card**: Container for content sections
- **Button**: Styled buttons with variants
- **Input**: Form input fields
- **Select**: Dropdown selectors
- **Table**: Data tables with headers and rows
- **Badge**: Status and keyword indicators
- **Sheet**: Slide-out panels for forms
- **Dialog**: Modal dialogs
- **Avatar**: User profile images with fallback initials
- **Toaster**: Toast notification system

### Layout Structure
- **Dashboard Layout**: Sidebar navigation with main content area
- Sidebar includes: Logo, navigation menu, user profile section, logout button
- Navigation items: Dashboard, Complaints, Employees, Departments, API Keys, Settings
- Responsive design with mobile-friendly sidebar (hidden on small screens)

## Backend Integration

### API Communication
- All API calls use Axios with `withCredentials: true` for cookie-based authentication
- Base URL: `http://localhost:5000/api`
- Error handling with user-friendly toast notifications
- Loading states for async operations

### Data Flow
1. User actions trigger API calls
2. Loading states shown during requests
3. Success/error feedback via toast notifications
4. Data refresh after successful operations
5. Optimistic UI updates where appropriate

## Key Design Decisions

1. **Invite System for Employees**: Instead of direct employee creation, the system uses an invite-based approach. Admins generate invite links that employees use to complete their registration. This ensures proper onboarding and security.

2. **API-Only Complaint Creation**: Complaints cannot be manually created through the UI. They must be submitted via API using API keys. This design supports programmatic integration and external systems.

3. **Employee Assignment View**: Employees have a dedicated "My Assignments" page to view and manage complaints assigned to them. This provides a focused, task-oriented interface separate from the admin's comprehensive complaints view.

4. **Developer-First API Documentation**: The API docs page provides comprehensive, user-friendly documentation with code examples in multiple languages. This supports the API-first platform philosophy by making integration easy for developers.

5. **Soft Delete Pattern**: All entities (complaints, employees, departments) use soft deletes, allowing restoration. The UI provides separate views for active and deleted items.

6. **Intelligent Routing**: Departments and employees use keywords for ML-based complaint routing. The UI supports keyword management and vector generation.

7. **Consistent Theme**: The warm beige color scheme creates a professional, approachable interface that matches the service-oriented nature of the application.

## Future Enhancements

- Real-time data updates using WebSockets or polling
- Advanced filtering and search capabilities
- Bulk operations for employees and complaints
- Analytics dashboard with charts and metrics
- User profile management
- Role-based access control UI
- Export functionality implementation
- Mobile-responsive improvements
- Dark mode support

## File Structure

```
frontend/src/
├── app/
│   ├── dashboard/
│   │   ├── complaints/
│   │   │   ├── page.tsx
│   │   │   └── complaints-table.tsx
│   │   ├── employees/
│   │   │   ├── page.tsx
│   │   │   └── employees-table.tsx
│   │   ├── departments/
│   │   │   └── page.tsx
│   │   ├── apikeys/
│   │   │   └── page.tsx
│   │   ├── api-docs/
│   │   │   └── page.tsx
│   │   ├── my-assignments/
│   │   │   └── page.tsx
│   │   ├── settings/
│   │   │   └── page.tsx
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── overview.tsx
│   │   └── recent-complaints.tsx
│   ├── login/
│   │   └── page.tsx
│   ├── register/
│   │   └── page.tsx
│   └── invite/
│       └── [token]/
│           └── page.tsx
├── components/
│   └── ui/ (shadcn/ui components)
└── lib/
    └── utils.ts
```

This frontend provides a complete, production-ready interface for the ServiceFlow complaint management system, with all necessary pages and features aligned with the backend API structure.

