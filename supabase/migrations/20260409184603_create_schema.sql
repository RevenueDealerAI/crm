-- Enums
CREATE TYPE lead_status AS ENUM (
  'new', 'contacted', 'quoted', 'negotiating', 'won', 'lost', 'dead'
);

CREATE TYPE user_role AS ENUM ('manager', 'rep');

CREATE TYPE notification_type AS ENUM (
  'lead_assigned', 'follow_up_reminder', 'status_change', 'daily_summary'
);

-- Tables
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'rep',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  customer_name TEXT,
  phone TEXT,
  phone_secondary TEXT,
  vehicle_year INTEGER,
  vehicle_make TEXT,
  vehicle_model TEXT,
  part_needed TEXT,
  part_detail TEXT,
  status lead_status NOT NULL DEFAULT 'new',
  notes TEXT,
  follow_up_notes TEXT,
  follow_up_date DATE,
  price_quoted DECIMAL(10,2),
  mileage TEXT,
  warranty_info TEXT,
  tags TEXT[],
  assigned_to UUID REFERENCES profiles(id),
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_leads_assigned_to ON leads(assigned_to);
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_follow_up_date ON leads(follow_up_date) WHERE follow_up_date IS NOT NULL;
CREATE INDEX idx_leads_created_at ON leads(created_at DESC);
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX idx_activity_log_lead_id ON activity_log(lead_id);

-- Functions
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION on_lead_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    IF NEW.assigned_to IS NOT NULL THEN
      INSERT INTO notifications (user_id, type, title, message, lead_id)
      VALUES (
        NEW.assigned_to,
        'status_change',
        'Lead status updated',
        'Lead for ' || COALESCE(NEW.customer_name, 'Unknown') || ' changed from ' || OLD.status || ' to ' || NEW.status,
        NEW.id
      );
    END IF;

    INSERT INTO activity_log (lead_id, user_id, action, old_value, new_value)
    VALUES (
      NEW.id,
      auth.uid(),
      'status_changed',
      OLD.status::TEXT,
      NEW.status::TEXT
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION on_lead_assigned()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.assigned_to IS DISTINCT FROM NEW.assigned_to AND NEW.assigned_to IS NOT NULL THEN
    INSERT INTO notifications (user_id, type, title, message, lead_id)
    VALUES (
      NEW.assigned_to,
      'lead_assigned',
      'New lead assigned',
      'You have been assigned a lead for ' || COALESCE(NEW.customer_name, 'Unknown'),
      NEW.id
    );

    INSERT INTO activity_log (lead_id, user_id, action, old_value, new_value)
    VALUES (
      NEW.id,
      auth.uid(),
      'assigned',
      OLD.assigned_to::TEXT,
      NEW.assigned_to::TEXT
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION on_auth_user_created()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'rep')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Triggers
CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER set_leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER on_lead_status_change_trigger
  AFTER UPDATE ON leads
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION on_lead_status_change();

CREATE TRIGGER on_lead_assigned_trigger
  AFTER UPDATE ON leads
  FOR EACH ROW
  WHEN (OLD.assigned_to IS DISTINCT FROM NEW.assigned_to)
  EXECUTE FUNCTION on_lead_assigned();

CREATE TRIGGER on_auth_user_created_trigger
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION on_auth_user_created();

-- Enable Realtime for notifications and leads
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE leads;
