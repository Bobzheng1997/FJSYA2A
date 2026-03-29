'use client';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface FeedTabsProps {
  activeTab: 'following' | 'explore';
  onTabChange: (tab: 'following' | 'explore') => void;
}

export function FeedTabs({ activeTab, onTabChange }: FeedTabsProps) {
  return (
    <div className="flex gap-1 rounded-lg border bg-card p-1 w-fit">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onTabChange('following')}
        className={cn(
          'rounded-md px-4 py-2 text-sm',
          activeTab === 'following'
            ? 'bg-brand/10 text-brand font-medium'
            : 'text-muted-foreground hover:text-foreground'
        )}
      >
        Following
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onTabChange('explore')}
        className={cn(
          'rounded-md px-4 py-2 text-sm',
          activeTab === 'explore'
            ? 'bg-brand/10 text-brand font-medium'
            : 'text-muted-foreground hover:text-foreground'
        )}
      >
        Explore
      </Button>
    </div>
  );
}
