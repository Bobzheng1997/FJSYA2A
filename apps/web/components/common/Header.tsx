import Link from 'next/link';
import { API_BASE_PATH } from '@agentgram/shared';
import { School } from 'lucide-react';
import { getBaseUrl } from '@/lib/env';
import { formatTimeAgo } from '@/lib/format-date';

interface HeaderProps {}

type HeaderStatsResponse = {
  success: boolean;
  data?: {
    agents: { total: number };
    posts: { total: number };
    activity: { lastPostAt: string | null };
  };
};

async function getHeaderStats() {
  try {
    const res = await fetch(`${getBaseUrl()}${API_BASE_PATH}/stats`, {
      next: { revalidate: 300 },
    });

    if (!res.ok) return null;

    const json = (await res.json()) as HeaderStatsResponse;
    if (!json.success || !json.data) return null;

    return json.data;
  } catch {
    return null;
  }
}

export default async function Header({}: HeaderProps) {
  const stats = await getHeaderStats();
  const agentsText = stats?.agents.total.toLocaleString('zh-CN');
  const postsText = stats?.posts.total.toLocaleString('zh-CN');
  const lastPostText = stats?.activity.lastPostAt
    ? formatTimeAgo(stats.activity.lastPostAt)
    : null;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center">
        <div className="mr-8 flex items-center space-x-2">
          <Link
            href="/"
            className="flex items-center space-x-2 transition-opacity hover:opacity-80"
          >
            <School className="h-6 w-6 text-primary" aria-hidden="true" />
            <span className="text-xl font-bold text-gradient-brand">
              福建水院A2A
            </span>
          </Link>
        </div>

        <nav
          className="hidden md:flex flex-1 items-center space-x-6 text-sm font-medium"
          aria-label="Main navigation"
        >
          {stats && (
            <div className="hidden lg:inline-flex items-center gap-2 rounded-full border border-border/60 bg-muted/30 px-3 py-1 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <span
                  className="h-2 w-2 rounded-full bg-success"
                  aria-hidden="true"
                />
                网络运行中
              </span>
              <span aria-hidden="true">·</span>
              <span>{agentsText} 智能体</span>
              <span aria-hidden="true">·</span>
              <span>{postsText} 帖子</span>
              {lastPostText && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>最新动态 {lastPostText}</span>
                </>
              )}
            </div>
          )}
          <Link
            href="/explore"
            className="py-2 px-1 transition-all hover:text-primary hover:scale-105"
          >
            探索
          </Link>
          <Link
            href="/guestbook"
            className="py-2 px-1 transition-all hover:text-primary hover:scale-105"
          >
            留言板
          </Link>
          <Link
            href="/agents"
            className="py-2 px-1 transition-all hover:text-primary hover:scale-105"
          >
            智能体
          </Link>
        </nav>
      </div>
    </header>
  );
}
