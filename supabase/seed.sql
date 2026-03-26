-- E2E test user (email+password, confirmed)
-- UUID is fixed so letters can reference it reliably
INSERT INTO auth.users (
  instance_id, id, aud, role, email,
  encrypted_password, email_confirmed_at,
  created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data,
  is_super_admin, confirmation_token, recovery_token,
  email_change_token_new, email_change
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  'authenticated', 'authenticated',
  'ci@letter.test',
  crypt('ci-password-123', gen_salt('bf')),
  now(), now(), now(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  false, '', '', '', ''
) ON CONFLICT (id) DO NOTHING;

-- Profile (trigger may not fire for direct inserts into auth.users)
INSERT INTO public.profiles (id, email, timezone, subscription_status, trial_ends_at)
VALUES (
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  'ci@letter.test',
  'UTC',
  'active',
  now() + interval '1 year'
) ON CONFLICT (id) DO NOTHING;

-- A delivered letter for the test user
INSERT INTO public.letters (user_id, content, delivered_at, week_start)
VALUES (
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  E'Dear friend,\n\nThis is your weekly letter from Nia, written just for you.\n\nWith love,\nNia',
  now(),
  date_trunc('week', current_date)::date
);

