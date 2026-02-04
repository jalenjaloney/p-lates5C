-- Enable public read access to menu-related tables
-- These tables should be publicly readable since they contain dining hall menu data

-- Ensure RLS is enabled on menu_items
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read menu_items
CREATE POLICY "Anyone can view menu items"
  ON menu_items
  FOR SELECT
  USING (true);

-- Ensure RLS is enabled on dishes
ALTER TABLE dishes ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read dishes
CREATE POLICY "Anyone can view dishes"
  ON dishes
  FOR SELECT
  USING (true);

-- Ensure RLS is enabled on halls
ALTER TABLE halls ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read halls
CREATE POLICY "Anyone can view halls"
  ON halls
  FOR SELECT
  USING (true);
