-- Create user_favorites table
CREATE TABLE IF NOT EXISTS user_favorites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  dish_id INTEGER REFERENCES dishes(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, dish_id)
);

-- Create index for faster lookups
CREATE INDEX idx_user_favorites_user_id ON user_favorites(user_id);
CREATE INDEX idx_user_favorites_dish_id ON user_favorites(dish_id);

-- Enable RLS
ALTER TABLE user_favorites ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own favorites
CREATE POLICY "Users can view their own favorites"
  ON user_favorites
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own favorites
CREATE POLICY "Users can insert their own favorites"
  ON user_favorites
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own favorites
CREATE POLICY "Users can delete their own favorites"
  ON user_favorites
  FOR DELETE
  USING (auth.uid() = user_id);
