-- updated_at helper
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- PROFILES
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY,
  full_name TEXT,
  email TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_own" ON public.profiles FOR ALL TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- SETTINGS
CREATE TABLE public.settings (
  user_id UUID PRIMARY KEY,
  shop_name TEXT NOT NULL DEFAULT 'My Shop',
  currency TEXT NOT NULL DEFAULT 'INR',
  low_stock_threshold INTEGER NOT NULL DEFAULT 10 CHECK (low_stock_threshold >= 0),
  theme TEXT NOT NULL DEFAULT 'light',
  notify_low_stock BOOLEAN NOT NULL DEFAULT true,
  notify_out_of_stock BOOLEAN NOT NULL DEFAULT true,
  notify_new_product BOOLEAN NOT NULL DEFAULT true,
  notify_sales BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.settings TO authenticated;
GRANT ALL ON public.settings TO service_role;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "settings_own" ON public.settings FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER settings_updated_at BEFORE UPDATE ON public.settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- PRODUCTS
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL CHECK (length(trim(name)) > 0),
  sku TEXT NOT NULL CHECK (length(trim(sku)) > 0),
  category TEXT NOT NULL DEFAULT 'General',
  supplier TEXT,
  quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  min_stock INTEGER NOT NULL DEFAULT 10 CHECK (min_stock >= 0),
  purchase_price NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (purchase_price >= 0),
  selling_price NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (selling_price >= 0),
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, sku)
);
CREATE INDEX products_user_idx ON public.products(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "products_own" ON public.products FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- SALES
CREATE TABLE public.sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  category TEXT,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(12,2) NOT NULL CHECK (unit_price >= 0),
  total_amount NUMERIC(14,2) NOT NULL CHECK (total_amount >= 0),
  sold_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX sales_user_sold_idx ON public.sales(user_id, sold_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales TO authenticated;
GRANT ALL ON public.sales TO service_role;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sales_own" ON public.sales FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- NOTIFICATIONS
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX notifications_user_idx ON public.notifications(user_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notifications_own" ON public.notifications FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Stock notifications trigger on products
CREATE OR REPLACE FUNCTION public.products_notify()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s public.settings%ROWTYPE;
BEGIN
  IF current_setting('app.seeding', true) = '1' THEN RETURN NEW; END IF;
  SELECT * INTO s FROM public.settings WHERE user_id = NEW.user_id;
  IF TG_OP = 'INSERT' THEN
    IF COALESCE(s.notify_new_product, true) THEN
      INSERT INTO public.notifications(user_id, type, title, message)
      VALUES (NEW.user_id, 'product', 'New product added', NEW.name || ' (' || NEW.sku || ') was added with ' || NEW.quantity || ' units.');
    END IF;
  END IF;
  IF NEW.quantity = 0 AND (TG_OP = 'INSERT' OR OLD.quantity > 0) THEN
    IF COALESCE(s.notify_out_of_stock, true) THEN
      INSERT INTO public.notifications(user_id, type, title, message)
      VALUES (NEW.user_id, 'out_of_stock', 'Out of stock', NEW.name || ' is now out of stock. Please reorder.');
    END IF;
  ELSIF NEW.quantity > 0 AND NEW.quantity <= NEW.min_stock AND (TG_OP = 'INSERT' OR OLD.quantity > OLD.min_stock OR OLD.quantity = 0) THEN
    IF COALESCE(s.notify_low_stock, true) THEN
      INSERT INTO public.notifications(user_id, type, title, message)
      VALUES (NEW.user_id, 'low_stock', 'Low stock warning', NEW.name || ' has only ' || NEW.quantity || ' units left (minimum ' || NEW.min_stock || ').');
    END IF;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER products_notify_trg AFTER INSERT OR UPDATE OF quantity, min_stock ON public.products FOR EACH ROW EXECUTE FUNCTION public.products_notify();

-- Atomic sale recording
CREATE OR REPLACE FUNCTION public.record_sale(_product_id UUID, _quantity INTEGER, _unit_price NUMERIC, _sold_at TIMESTAMPTZ DEFAULT now())
RETURNS public.sales LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE p public.products%ROWTYPE; s public.sales%ROWTYPE; st public.settings%ROWTYPE;
BEGIN
  IF _quantity IS NULL OR _quantity <= 0 THEN RAISE EXCEPTION 'Quantity must be greater than zero'; END IF;
  IF _unit_price IS NULL OR _unit_price < 0 THEN RAISE EXCEPTION 'Selling price cannot be negative'; END IF;
  SELECT * INTO p FROM public.products WHERE id = _product_id AND user_id = auth.uid() FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Product not found'; END IF;
  IF p.quantity < _quantity THEN RAISE EXCEPTION 'Only % units of % are in stock', p.quantity, p.name; END IF;
  UPDATE public.products SET quantity = quantity - _quantity WHERE id = p.id;
  INSERT INTO public.sales(user_id, product_id, product_name, category, quantity, unit_price, total_amount, sold_at)
  VALUES (auth.uid(), p.id, p.name, p.category, _quantity, _unit_price, _quantity * _unit_price, COALESCE(_sold_at, now()))
  RETURNING * INTO s;
  SELECT * INTO st FROM public.settings WHERE user_id = auth.uid();
  IF COALESCE(st.notify_sales, true) THEN
    INSERT INTO public.notifications(user_id, type, title, message)
    VALUES (auth.uid(), 'sale', 'Sale completed', _quantity || ' x ' || p.name || ' sold for ₹' || to_char(s.total_amount, 'FM999,999,999.00'));
  END IF;
  RETURN s;
END; $$;
GRANT EXECUTE ON FUNCTION public.record_sale(UUID, INTEGER, NUMERIC, TIMESTAMPTZ) TO authenticated;

-- New user setup with sample data
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE i INTEGER; pr RECORD; q INTEGER;
BEGIN
  PERFORM set_config('app.seeding', '1', true);
  INSERT INTO public.profiles(id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)), NEW.email);
  INSERT INTO public.settings(user_id, shop_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'shop_name', 'Sri Lakshmi Kirana Store'));

  INSERT INTO public.products(user_id, name, sku, category, supplier, quantity, min_stock, purchase_price, selling_price) VALUES
  (NEW.id, 'Sona Masoori Biyyam (25kg)', 'BIY-001', 'Biyyam', 'Venkateswara Traders', 40, 10, 1150, 1350),
  (NEW.id, 'Kandi Pappu (1kg)', 'PAP-001', 'Pappulu', 'Lakshmi Agencies', 8, 15, 140, 165),
  (NEW.id, 'Pesara Pappu (1kg)', 'PAP-002', 'Pappulu', 'Lakshmi Agencies', 22, 10, 120, 145),
  (NEW.id, 'Minapappu (1kg)', 'PAP-003', 'Pappulu', 'Lakshmi Agencies', 0, 10, 130, 160),
  (NEW.id, 'Senaga Pappu (1kg)', 'PAP-004', 'Pappulu', 'Srinivasa Stores', 30, 10, 85, 105),
  (NEW.id, 'Nuvvula Nune (1L)', 'NUN-001', 'Nunelu', 'Padmavathi Enterprises', 12, 8, 320, 380),
  (NEW.id, 'Kobbari Nune (500ml)', 'NUN-002', 'Nunelu', 'Padmavathi Enterprises', 5, 10, 110, 135),
  (NEW.id, 'Veru Senaga Nune (1L)', 'NUN-003', 'Nunelu', 'Padmavathi Enterprises', 18, 8, 190, 225),
  (NEW.id, 'Karam Podi (250g)', 'MAS-001', 'Masalalu', 'Guntur Mirchi Mart', 35, 12, 60, 85),
  (NEW.id, 'Pasupu (200g)', 'MAS-002', 'Masalalu', 'Guntur Mirchi Mart', 50, 15, 30, 45),
  (NEW.id, 'Dhaniyala Podi (200g)', 'MAS-003', 'Masalalu', 'Guntur Mirchi Mart', 9, 10, 40, 60),
  (NEW.id, 'Aavakaya Pachadi (500g)', 'PCH-001', 'Pachallu', 'Amma Pickles Vijayawada', 14, 6, 180, 240),
  (NEW.id, 'Gongura Pachadi (500g)', 'PCH-002', 'Pachallu', 'Amma Pickles Vijayawada', 0, 6, 160, 220),
  (NEW.id, 'Bellam (1kg)', 'KIR-001', 'Kirana', 'Srinivasa Stores', 26, 10, 55, 70),
  (NEW.id, 'Chintapandu (500g)', 'KIR-002', 'Kirana', 'Srinivasa Stores', 17, 8, 70, 95),
  (NEW.id, 'Ragi Pindi (1kg)', 'KIR-003', 'Kirana', 'Venkateswara Traders', 3, 8, 60, 80),
  (NEW.id, 'Uppu (1kg)', 'KIR-004', 'Kirana', 'Venkateswara Traders', 60, 20, 15, 22),
  (NEW.id, 'Attu Pindi (1kg)', 'KIR-005', 'Kirana', 'Venkateswara Traders', 11, 10, 50, 68);

  FOR i IN 1..45 LOOP
    SELECT * INTO pr FROM public.products WHERE user_id = NEW.id AND sku <> 'PAP-003' ORDER BY random() LIMIT 1;
    q := 1 + floor(random() * 4)::int;
    INSERT INTO public.sales(user_id, product_id, product_name, category, quantity, unit_price, total_amount, sold_at)
    VALUES (NEW.id, pr.id, pr.name, pr.category, q, pr.selling_price, q * pr.selling_price, now() - (random() * interval '60 days'));
  END LOOP;

  INSERT INTO public.notifications(user_id, type, title, message)
  VALUES (NEW.id, 'info', 'Welcome!', 'Your shop is ready. Sample products and sales were added so you can explore.');
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();