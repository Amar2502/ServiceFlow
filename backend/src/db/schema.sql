CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,

  created_at TIMESTAMP NOT NULL DEFAULT now()
);


CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  name TEXT,

  email TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('ADMIN','AGENT')) DEFAULT 'ADMIN',

  created_at TIMESTAMP NOT NULL DEFAULT now(),  

  UNIQUE (tenant_id, email)
);

CREATE INDEX idx_users_tenant_id ON users(tenant_id);


CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  key_hash TEXT NOT NULL,
  name TEXT,
  last_used_at TIMESTAMP,

  routing_mode TEXT NOT NULL
    CHECK (routing_mode IN ('DEPARTMENT', 'EMPLOYEE'))
    DEFAULT 'DEPARTMENT',

  created_at TIMESTAMP NOT NULL DEFAULT now(),

  UNIQUE (tenant_id, key_hash)
);

CREATE INDEX idx_api_keys_tenant_id ON api_keys(tenant_id);


CREATE TABLE IF NOT EXISTS departments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  keywords TEXT[],

  vector JSONB,

  created_at TIMESTAMP NOT NULL DEFAULT now(),
  deleted_at TIMESTAMP,

  UNIQUE (tenant_id, name)
);

CREATE INDEX idx_departments_tenant_id ON departments(tenant_id);
CREATE INDEX idx_departments_deleted_at ON departments(deleted_at);


CREATE TABLE IF NOT EXISTS employees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,

  name TEXT,

  title TEXT,
  keywords TEXT[],

  vector JSONB,

  created_at TIMESTAMP NOT NULL DEFAULT now(),
  deleted_at TIMESTAMP,

  UNIQUE (tenant_id, user_id)
);

CREATE INDEX idx_employees_tenant_id ON employees(tenant_id);
CREATE INDEX idx_employees_user_id ON employees(user_id);
CREATE INDEX idx_employees_department_id ON employees(department_id);
CREATE INDEX idx_employees_deleted_at ON employees(deleted_at);


CREATE TABLE IF NOT EXISTS complaints (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  title TEXT NOT NULL,
  description TEXT,

  customer_name TEXT,
  customer_email TEXT,
  external_reference_id TEXT,

  status TEXT NOT NULL CHECK (
    status IN ('open', 'in_progress', 'resolved')
  ) DEFAULT 'open',


  is_correctly_classified BOOLEAN NOT NULL DEFAULT FALSE,

  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now(),
  deleted_at TIMESTAMP
);

CREATE INDEX idx_complaints_tenant_id ON complaints(tenant_id);
CREATE INDEX idx_complaints_status ON complaints(status);
CREATE INDEX idx_complaints_deleted_at ON complaints(deleted_at);


CREATE TABLE IF NOT EXISTS assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  complaint_id UUID NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,

  assignee_type TEXT NOT NULL CHECK (assignee_type IN ('EMPLOYEE', 'DEPARTMENT')),
  
  employee_id UUID REFERENCES employees(id),
  department_id UUID REFERENCES departments(id),

  CHECK (
    (assignee_type = 'EMPLOYEE' AND employee_id IS NOT NULL AND department_id IS NULL)
    OR
    (assignee_type = 'DEPARTMENT' AND department_id IS NOT NULL AND employee_id IS NULL)
  ),

  assigned_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_assignments_tenant_id ON assignments(tenant_id);
CREATE INDEX idx_assignments_complaint_id ON assignments(complaint_id);
CREATE INDEX idx_assignments_employee
ON assignments(employee_id)
WHERE employee_id IS NOT NULL;

CREATE INDEX idx_assignments_department
ON assignments(department_id)
WHERE department_id IS NOT NULL;



CREATE TABLE IF NOT EXISTS invites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  role TEXT NOT NULL CHECK (role IN ('AGENT','ADMIN')) DEFAULT 'AGENT',

  token UUID NOT NULL DEFAULT uuid_generate_v4(),
  expires_at TIMESTAMP NOT NULL,
  used BOOLEAN NOT NULL DEFAULT FALSE,

  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_invites_tenant_id ON invites(tenant_id);
CREATE INDEX idx_invites_token ON invites(token);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_complaints_updated
BEFORE UPDATE ON complaints
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();