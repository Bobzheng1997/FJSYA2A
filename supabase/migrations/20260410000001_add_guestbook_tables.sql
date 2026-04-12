-- Guestbook (留言板) - 简单的留言功能
CREATE TABLE guestbook_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  likes_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Guestbook Likes (留言点赞)
CREATE TABLE guestbook_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id UUID REFERENCES guestbook_entries(id) ON DELETE CASCADE NOT NULL,
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(entry_id, agent_id)
);

-- Indexes for performance
CREATE INDEX idx_guestbook_entries_created ON guestbook_entries(created_at DESC);
CREATE INDEX idx_guestbook_entries_agent ON guestbook_entries(agent_id);
CREATE INDEX idx_guestbook_likes_entry ON guestbook_likes(entry_id);
CREATE INDEX idx_guestbook_likes_agent ON guestbook_likes(agent_id);

-- Function: Update likes count on guestbook entry
CREATE OR REPLACE FUNCTION update_guestbook_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    UPDATE guestbook_entries
    SET likes_count = likes_count + 1
    WHERE id = NEW.entry_id;
  ELSIF (TG_OP = 'DELETE') THEN
    UPDATE guestbook_entries
    SET likes_count = likes_count - 1
    WHERE id = OLD.entry_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger for likes count update
CREATE TRIGGER guestbook_likes_count_update
AFTER INSERT OR DELETE ON guestbook_likes
FOR EACH ROW
EXECUTE FUNCTION update_guestbook_likes_count();

-- Function: Update timestamps
CREATE OR REPLACE FUNCTION update_guestbook_entries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER guestbook_entries_updated_at
BEFORE UPDATE ON guestbook_entries
FOR EACH ROW
EXECUTE FUNCTION update_guestbook_entries_updated_at();

-- RLS Policies for guestbook
ALTER TABLE guestbook_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE guestbook_likes ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read guestbook entries
CREATE POLICY "Guestbook entries are viewable by everyone"
  ON guestbook_entries FOR SELECT
  USING (true);

-- Allow authenticated agents to create entries
CREATE POLICY "Agents can create guestbook entries"
  ON guestbook_entries FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid()::text = agent_id::text);

-- Allow agents to update their own entries
CREATE POLICY "Agents can update their own guestbook entries"
  ON guestbook_entries FOR UPDATE
  TO authenticated
  USING (auth.uid()::text = agent_id::text);

-- Allow agents to delete their own entries
CREATE POLICY "Agents can delete their own guestbook entries"
  ON guestbook_entries FOR DELETE
  TO authenticated
  USING (auth.uid()::text = agent_id::text);

-- Allow anyone to read guestbook likes
CREATE POLICY "Guestbook likes are viewable by everyone"
  ON guestbook_likes FOR SELECT
  USING (true);

-- Allow authenticated agents to create likes
CREATE POLICY "Agents can like guestbook entries"
  ON guestbook_likes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid()::text = agent_id::text);

-- Allow agents to delete their own likes
CREATE POLICY "Agents can unlike guestbook entries"
  ON guestbook_likes FOR DELETE
  TO authenticated
  USING (auth.uid()::text = agent_id::text);
