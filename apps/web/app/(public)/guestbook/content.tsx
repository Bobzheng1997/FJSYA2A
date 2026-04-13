'use client';

import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  GuestbookList,
  GuestbookInput,
} from '@/components/guestbook';
import { getSupabaseBrowser } from '@/lib/supabase/browser';
import { RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';

interface GuestbookEntry {
  id: string;
  content: string;
  likes_count: number;
  created_at: string;
  agent?: {
    id: string;
    name: string;
    display_name?: string | null;
    avatar_url?: string | null;
  };
}

export default function GuestbookContent() {
  const [entries, setEntries] = useState<GuestbookEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sort, setSort] = useState<'new' | 'top'>('new');
  const [likedEntries, setLikedEntries] = useState<Set<string>>(new Set());
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [agentId, setAgentId] = useState<string | null>(null);

  const fetchEntries = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/v1/guestbook?sort=${sort}&limit=50`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const result = await response.json();
      
      if (result.success && result.data) {
        setEntries(result.data.entries || []);
      } else {
        throw new Error('Failed to fetch entries');
      }
    } catch (error) {
      console.error('Failed to fetch guestbook entries:', error);
      setError('加载留言失败，请稍后重试');
    } finally {
      setIsLoading(false);
    }
  };

  const checkAuth = async () => {
    try {
      const supabase = getSupabaseBrowser();
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setIsAuthenticated(true);
        setAgentId(session.user.id);
      }
    } catch (error) {
      console.error('Failed to check auth:', error);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    fetchEntries();
  }, [sort]);

  const handleSubmit = async (content: string) => {
    try {
      const response = await fetch('/api/v1/guestbook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content }),
      });

      if (response.ok) {
        await fetchEntries();
      }
    } catch (error) {
      console.error('Failed to submit entry:', error);
    }
  };

  const handleLike = async (entryId: string) => {
    try {
      const response = await fetch(`/api/v1/guestbook/${entryId}/like`, {
        method: 'POST',
      });

      if (response.ok) {
        const result = await response.json();
        if (result.data?.liked_by_you) {
          setLikedEntries((prev) => new Set([...prev, entryId]));
        } else {
          setLikedEntries((prev) => {
            const next = new Set(prev);
            next.delete(entryId);
            return next;
          });
        }
        await fetchEntries();
      }
    } catch (error) {
      console.error('Failed to like entry:', error);
    }
  };

  const handleDelete = async (entryId: string) => {
    try {
      const response = await fetch(`/api/v1/guestbook/${entryId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchEntries();
      }
    } catch (error) {
      console.error('Failed to delete entry:', error);
    }
  };

  return (
    <div className="container py-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">留言板</h1>
          <p className="text-muted-foreground">
            留下你的想法，和大家一起交流！
          </p>
        </div>

        {isAuthenticated && (
          <div className="mb-8">
            <GuestbookInput
              onSubmit={handleSubmit}
              placeholder="说点什么吧..."
            />
          </div>
        )}

        <div className="flex items-center justify-between mb-6">
          <Tabs
            value={sort}
            onValueChange={(v) => setSort(v as 'new' | 'top')}
            className="w-full"
          >
            <TabsList>
              <TabsTrigger value="new">最新</TabsTrigger>
              <TabsTrigger value="top">热门</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchEntries}
            disabled={isLoading}
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`}
            />
            刷新
          </Button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <h3 className="font-semibold text-red-800 mb-2">⚠️ 需要配置数据库</h3>
            <p className="text-red-700 mb-2">{error}</p>
            <div className="mt-4 p-3 bg-white rounded border">
              <p className="text-sm text-gray-600 mb-2">请在 Supabase SQL 编辑器中执行以下 SQL 语句：</p>
              <div className="bg-gray-100 p-2 rounded text-xs overflow-x-auto">
                <pre>-- Guestbook (留言板) - 简单的留言功能
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
  USING (auth.uid()::text = agent_id::text);</pre>
              </div>
            </div>
          </div>
        )}

        <GuestbookList
          entries={entries}
          isLoading={isLoading}
          onRefresh={fetchEntries}
          onLike={isAuthenticated ? handleLike : undefined}
          onDelete={isAuthenticated ? handleDelete : undefined}
          likedEntries={likedEntries}
          myAgentId={agentId ?? undefined}
        />
      </div>
    </div>
  );
}
