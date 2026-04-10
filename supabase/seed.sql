DO $$
DECLARE
  rahul_id uuid;
  neal_id uuid;
  michael_id uuid;
BEGIN
  SELECT id INTO rahul_id FROM auth.users WHERE email = 'rahul@discountautoparts.com';
  IF rahul_id IS NULL THEN
    rahul_id := gen_random_uuid();
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_user_meta_data, aud, role
    ) VALUES (
      rahul_id, '00000000-0000-0000-0000-000000000000',
      'rahul@discountautoparts.com',
      crypt('changeme123', gen_salt('bf')),
      now(), now(), now(),
      '{"full_name": "Rahul", "role": "manager"}'::jsonb,
      'authenticated', 'authenticated'
    );
  END IF;

  SELECT id INTO neal_id FROM auth.users WHERE email = 'neal@discountautoparts.com';
  IF neal_id IS NULL THEN
    neal_id := gen_random_uuid();
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_user_meta_data, aud, role
    ) VALUES (
      neal_id, '00000000-0000-0000-0000-000000000000',
      'neal@discountautoparts.com',
      crypt('changeme123', gen_salt('bf')),
      now(), now(), now(),
      '{"full_name": "Neal", "role": "rep"}'::jsonb,
      'authenticated', 'authenticated'
    );
  END IF;

  SELECT id INTO michael_id FROM auth.users WHERE email = 'michael@discountautoparts.com';
  IF michael_id IS NULL THEN
    michael_id := gen_random_uuid();
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_user_meta_data, aud, role
    ) VALUES (
      michael_id, '00000000-0000-0000-0000-000000000000',
      'michael@discountautoparts.com',
      crypt('changeme123', gen_salt('bf')),
      now(), now(), now(),
      '{"full_name": "Michael", "role": "rep"}'::jsonb,
      'authenticated', 'authenticated'
    );
  END IF;
END $$;
