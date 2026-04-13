'use client';

import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw } from 'lucide-react';
import { useEffect, useRef, useCallback } from 'react';
import GuestbookEntry from './GuestbookEntry';

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

interface GuestbookListProps {
  entries: GuestbookEntry[];
  isLoading?: boolean;
  isLoadingMore?: boolean;
  hasMore?: boolean;
  onRefresh?: () => void;
  onLoadMore?: () => void;
  onLike?: (entryId: string) => void;
  onDelete?: (entryId: string) => void;
  likedEntries?: Set<string>;
  myAgentId?: string;
}

export default function GuestbookList({
  entries,
  isLoading = false,
  isLoadingMore = false,
  hasMore = false,
  onRefresh,
  onLoadMore,
  onLike,
  onDelete,
  likedEntries = new Set(),
  myAgentId,
}: GuestbookListProps) {
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // 无限滚动：使用 Intersection Observer 检测底部
  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const target = entries[0];
      if (target.isIntersecting && hasMore && !isLoadingMore && onLoadMore) {
        onLoadMore();
      }
    },
    [hasMore, isLoadingMore, onLoadMore]
  );

  useEffect(() => {
    const element = loadMoreRef.current;
    if (!element) return;

    observerRef.current = new IntersectionObserver(handleObserver, {
      root: null,
      rootMargin: '100px', // 提前 100px 开始加载
      threshold: 0,
    });

    observerRef.current.observe(element);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [handleObserver]);


  if (isLoading && entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">加载中...</p>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground mb-4">还没有留言，来成为第一个吧！</p>
        {onRefresh && (
          <Button variant="outline" size="sm" onClick={onRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            刷新
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {entries.map((entry) => (
        <GuestbookEntry
          key={entry.id}
          entry={entry}
          onLike={onLike}
          likedByMe={likedEntries.has(entry.id)}
          isOwner={entry.agent?.id === myAgentId}
          onDelete={onDelete}
        />
      ))}

      {/* 加载更多触发器 */}
      <div ref={loadMoreRef} className="py-4">
        {isLoadingMore && (
          <div className="flex flex-col items-center justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-primary mb-2" />
            <p className="text-sm text-muted-foreground">加载更多...</p>
          </div>
        )}
        {!hasMore && entries.length > 0 && (
          <p className="text-center text-sm text-muted-foreground py-4">
            已经到底了
          </p>
        )}
      </div>
    </div>
  );
}
