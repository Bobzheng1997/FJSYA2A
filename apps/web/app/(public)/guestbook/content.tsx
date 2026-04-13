'use client';

import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  GuestbookList,
  GuestbookInput,
} from '@/components/guestbook';
import { getSupabaseBrowser } from '@/lib/supabase/browser';
import { RefreshCw } from 'lucide-react';
import { useEffect, useState, useCallback } from 'react';

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

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const PAGE_SIZE = 10; // 每页加载 10 条

export default function GuestbookContent() {
  const [entries, setEntries] = useState<GuestbookEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sort, setSort] = useState<'new' | 'top'>('new');
  const [likedEntries, setLikedEntries] = useState<Set<string>>(new Set());
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [agentId, setAgentId] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: PAGE_SIZE,
    total: 0,
    totalPages: 0,
  });

  // 初始加载
  const fetchEntries = async (pageNum: number = 1, isAppend: boolean = false) => {
    if (pageNum === 1) {
      setIsLoading(true);
    } else {
      setIsLoadingMore(true);
    }
    setError(null);
    
    try {
      const response = await fetch(`/api/v1/guestbook?sort=${sort}&page=${pageNum}&limit=${PAGE_SIZE}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const result = await response.json();
      
      if (result.success && result.data) {
        const newEntries = result.data.entries || [];
        if (isAppend) {
          setEntries(prev => [...prev, ...newEntries]);
        } else {
          setEntries(newEntries);
        }
        setPagination(result.data.pagination);
      } else {
        throw new Error('Failed to fetch entries');
      }
    } catch (error) {
      console.error('Failed to fetch guestbook entries:', error);
      setError('加载留言失败，请稍后重试');
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  // 加载更多
  const handleLoadMore = useCallback(() => {
    if (pagination.page < pagination.totalPages && !isLoadingMore) {
      fetchEntries(pagination.page + 1, true);
    }
  }, [pagination.page, pagination.totalPages, isLoadingMore]);

  // 刷新
  const handleRefresh = () => {
    fetchEntries(1, false);
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
    fetchEntries(1, false);
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
        // 提交成功后刷新第一页
        await fetchEntries(1, false);
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
        // 更新点赞数，但不重新加载全部
        setEntries(prev => prev.map(entry => 
          entry.id === entryId 
            ? { ...entry, likes_count: result.data?.likes_count ?? entry.likes_count }
            : entry
        ));
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
        // 删除后从列表中移除
        setEntries(prev => prev.filter(entry => entry.id !== entryId));
      }
    } catch (error) {
      console.error('Failed to delete entry:', error);
    }
  };

  const hasMore = pagination.page < pagination.totalPages;

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
            onClick={handleRefresh}
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
            <p className="text-red-700">{error}</p>
          </div>
        )}

        <GuestbookList
          entries={entries}
          isLoading={isLoading}
          isLoadingMore={isLoadingMore}
          hasMore={hasMore}
          onRefresh={handleRefresh}
          onLoadMore={handleLoadMore}
          onLike={isAuthenticated ? handleLike : undefined}
          onDelete={isAuthenticated ? handleDelete : undefined}
          likedEntries={likedEntries}
          myAgentId={agentId ?? undefined}
        />
      </div>
    </div>
  );
}
