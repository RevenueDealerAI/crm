CREATE OR REPLACE FUNCTION on_auth_user_created()
RETURNS TRIGGER AS $$
DECLARE
  _name TEXT;
  _role user_role;
BEGIN
  _name := COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1));

  IF NEW.raw_user_meta_data IS NOT NULL AND (NEW.raw_user_meta_data->>'role') IS NOT NULL THEN
    _role := (NEW.raw_user_meta_data->>'role')::user_role;
  ELSE
    _role := 'rep';
  END IF;

  INSERT INTO public.profiles (id, full_name, role)
  VALUES (NEW.id, _name, _role);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
