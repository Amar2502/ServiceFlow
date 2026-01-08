INSERT INTO tenants (id, name)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'Acme Corp'),
  ('22222222-2222-2222-2222-222222222222', 'Globex Inc')
ON CONFLICT DO NOTHING;


INSERT INTO users (id, tenant_id, email, password_hash, role)
VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
   '11111111-1111-1111-1111-111111111111',
   'admin@acme.com',
   'hashed_password_admin',
   'ADMIN'),

  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
   '11111111-1111-1111-1111-111111111111',
   'agent1@acme.com',
   'hashed_password_agent1',
   'AGENT'),

  ('cccccccc-cccc-cccc-cccc-cccccccccccc',
   '11111111-1111-1111-1111-111111111111',
   'agent2@acme.com',
   'hashed_password_agent2',
   'AGENT'),

  ('dddddddd-dddd-dddd-dddd-dddddddddddd',
   '22222222-2222-2222-2222-222222222222',
   'admin@globex.com',
   'hashed_password_admin',
   'ADMIN')
ON CONFLICT DO NOTHING;


INSERT INTO api_keys (id, tenant_id, key_hash, name)
VALUES
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
   '11111111-1111-1111-1111-111111111111',
   'hash_live_acme_key',
   'Acme Production Key'),

  ('ffffffff-ffff-ffff-ffff-ffffffffffff',
   '11111111-1111-1111-1111-111111111111',
   'hash_test_acme_key',
   'Acme Test Key')
ON CONFLICT DO NOTHING;


INSERT INTO departments (id, tenant_id, name)
VALUES
  ('10101010-1010-1010-1010-101010101010',
   '11111111-1111-1111-1111-111111111111',
   'Support'),

  ('20202020-2020-2020-2020-202020202020',
   '11111111-1111-1111-1111-111111111111',
   'Technical'),

  ('30303030-3030-3030-3030-303030303030',
   '22222222-2222-2222-2222-222222222222',
   'Customer Success')
ON CONFLICT DO NOTHING;


INSERT INTO employees (id, tenant_id, user_id, department_id, title)
VALUES
  ('e1e1e1e1-e1e1-e1e1-e1e1-e1e1e1e1e1e1',
   '11111111-1111-1111-1111-111111111111',
   'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
   '10101010-1010-1010-1010-101010101010',
   'Support Engineer'),

  ('e2e2e2e2-e2e2-e2e2-e2e2-e2e2e2e2e2e2',
   '11111111-1111-1111-1111-111111111111',
   'cccccccc-cccc-cccc-cccc-cccccccccccc',
   '20202020-2020-2020-2020-202020202020',
   'Backend Engineer')
ON CONFLICT DO NOTHING;


INSERT INTO complaints (
  id,
  tenant_id,
  title,
  description,
  customer_name,
  customer_email,
  external_reference_id,
  status
)
VALUES
  ('c1c1c1c1-c1c1-c1c1-c1c1-c1c1c1c1c1c1',
   '11111111-1111-1111-1111-111111111111',
   'Login not working',
   'Customer cannot log in after password reset',
   'Rohit Sharma',
   'rohit@example.com',
   'EXT-1001',
   'open'),

  ('c2c2c2c2-c2c2-c2c2-c2c2-c2c2c2c2c2c2',
   '11111111-1111-1111-1111-111111111111',
   'Payment failed',
   'UPI payment failed but amount debited',
   'Ananya Verma',
   'ananya@example.com',
   'EXT-1002',
   'in_progress')
ON CONFLICT DO NOTHING;


INSERT INTO assignments (
  id,
  tenant_id,
  complaint_id,
  assignee_type,
  assignee_id
)
VALUES
  ('a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1',
   '11111111-1111-1111-1111-111111111111',
   'c1c1c1c1-c1c1-c1c1-c1c1-c1c1c1c1c1c1',
   'EMPLOYEE',
   'e1e1e1e1-e1e1-e1e1-e1e1-e1e1e1e1e1e1'),

  ('a2a2a2a2-a2a2-a2a2-a2a2-a2a2a2a2a2a2',
   '11111111-1111-1111-1111-111111111111',
   'c2c2c2c2-c2c2-c2c2-c2c2-c2c2c2c2c2c2',
   'DEPARTMENT',
   '20202020-2020-2020-2020-202020202020')
ON CONFLICT DO NOTHING;


INSERT INTO invites (
  id,
  tenant_id,
  email,
  role,
  token,
  expires_at
)
VALUES
  ('99999999-aaaa-4444-bbbb-999999999999',
   '11111111-1111-1111-1111-111111111111',
   'newagent@acme.com',
   'AGENT',
   uuid_generate_v4(),
   now() + interval '7 days')
ON CONFLICT DO NOTHING;