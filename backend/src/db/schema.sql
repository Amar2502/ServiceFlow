CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);


CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,

  created_at TIMESTAMP NOT NULL DEFAULT now()
);


CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  key_hash TEXT NOT NULL UNIQUE,
  name TEXT,
  last_used_at TIMESTAMP,

  created_at TIMESTAMP NOT NULL DEFAULT now()
);


CREATE TABLE complaints (
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

  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);


CREATE INDEX idx_users_tenant_id ON users(tenant_id);
CREATE INDEX idx_api_keys_tenant_id ON api_keys(tenant_id);
CREATE INDEX idx_complaints_tenant_id ON complaints(tenant_id);
CREATE INDEX idx_complaints_status ON complaints(status);
