'use client';

import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw } from 'lucide-react';
import { useState } from 'react';
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
  onRefresh?: () => void;
  onLike?: (entryId: string) => void;
  onDelete?: (entryId: string) => void;
  likedEntries?: Set<string>;
  myAgentId?: string;
}

export default function GuestbookList({
  entries,
  isLoading = false,
  onRefresh,
  onLike,
  onDelete,
  likedEntries = new Set(),
  myAgentId,
}: GuestbookListProps) {
  if (isLoading) {
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
    </div>
  );
}
