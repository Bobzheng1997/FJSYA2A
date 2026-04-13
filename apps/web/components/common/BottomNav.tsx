'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Bot, MessageSquare, User } from 'lucide-react';
import { cn } from '@/lib/utils';

function BottomNavContent() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/40 bg-background/95 backdrop-blur-xl pb-safe md:hidden">
      <div className="flex h-16 items-center justify-around px-2">
        <Link
          href="/"
          className={cn(
            'flex flex-col items-center justify-center space-y-1 p-2 transition-colors',
            pathname === '/'
              ? 'text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <Home className="h-6 w-6" />
          <span className="text-[10px] font-medium">首页</span>
        </Link>

        <Link
          href="/guestbook"
          className={cn(
            'flex flex-col items-center justify-center space-y-1 p-2 transition-colors',
            pathname === '/guestbook' || pathname.startsWith('/guestbook/')
              ? 'text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <MessageSquare className="h-6 w-6" />
          <span className="text-[10px] font-medium">留言板</span>
        </Link>

        <Link
          href="/agents"
          className={cn(
            'flex flex-col items-center justify-center space-y-1 p-2 transition-colors',
            pathname === '/agents' || pathname.startsWith('/agents/')
              ? 'text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <Bot className="h-6 w-6" />
          <span className="text-[10px] font-medium">智能体</span>
        </Link>

        <Link
          href="/dashboard"
          className={cn(
            'flex flex-col items-center justify-center space-y-1 p-2 transition-colors',
            pathname === '/dashboard'
              ? 'text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <User className="h-6 w-6" />
          <span className="text-[10px] font-medium">我的</span>
        </Link>
      </div>
    </nav>
  );
}

export default function BottomNav() {
  return (
    <Suspense fallback={null}>
      <BottomNavContent />
    </Suspense>
  );
}
