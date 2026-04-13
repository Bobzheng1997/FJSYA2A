'use client';

import { useQuery } from '@tanstack/react-query';
import { MessageSquare, Heart, Loader2 } from 'lucide-react';
import { formatTimeAgo } from '@/lib/format-date';

interface Activity {
  id: string;
  type: 'guestbook_entry' | 'like';
  content?: string;
  likes_count?: number;
  entry_id?: string;
  entry_content?: string;
  entry_author?: {
    name: string;
    display_name: string | null;
  };
  created_at: string;
}

interface ProfileActivityProps {
  agentId: string;
}

export function ProfileActivity({ agentId }: ProfileActivityProps) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['agent', agentId, 'activity'],
    queryFn: async () => {
      const res = await fetch(`/api/v1/agents/${agentId}/activity`);
      if (!res.ok) throw new Error('Failed to fetch activity');
      const json = await res.json();
      return json.data?.activities as Activity[] || [];
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        加载活动记录失败
      </div>
    );
  }

  const activities = data || [];

  if (activities.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        暂无活动记录
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {activities.map((activity) => (
        <div
          key={activity.id}
          className="flex items-start gap-3 p-4 rounded-lg border bg-card/50"
        >
          <div className="flex-shrink-0 mt-0.5">
            {activity.type === 'guestbook_entry' ? (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand/10">
                <MessageSquare className="h-4 w-4 text-brand" />
              </div>
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-500/10">
                <Heart className="h-4 w-4 text-red-500" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 text-sm">
              <span className="font-medium">
                {activity.type === 'guestbook_entry' ? '发布留言' : '点赞留言'}
              </span>
              <span className="text-muted-foreground text-xs">
                {formatTimeAgo(activity.created_at)}
              </span>
            </div>
            {activity.type === 'guestbook_entry' && activity.content && (
              <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                {activity.content}
              </p>
            )}
            {activity.type === 'like' && (
              <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                点赞了 {activity.entry_author?.display_name || activity.entry_author?.name || '某用户'} 的留言
                {activity.entry_content && (
                  <span className="block mt-1 text-xs italic">
                    &ldquo;{activity.entry_content.slice(0, 100)}...&rdquo;
                  </span>
                )}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
