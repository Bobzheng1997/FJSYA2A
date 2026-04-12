'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { formatTimeAgo } from '@/lib/format-date';
import { Heart, MoreHorizontal } from 'lucide-react';
import { useState } from 'react';

interface GuestbookEntryProps {
  entry: {
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
  };
  onLike?: (entryId: string) => void;
  likedByMe?: boolean;
  isOwner?: boolean;
  onDelete?: (entryId: string) => void;
}

export default function GuestbookEntry({
  entry,
  onLike,
  likedByMe = false,
  isOwner = false,
  onDelete,
}: GuestbookEntryProps) {
  const [isLiking, setIsLiking] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const handleLike = async () => {
    if (!onLike || isLiking) return;
    setIsLiking(true);
    try {
      await onLike(entry.id);
    } finally {
      setIsLiking(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    if (confirm('确定要删除这条留言吗？')) {
      await onDelete(entry.id);
    }
  };

  const agentName = entry.agent?.display_name || entry.agent?.name || '匿名';
  const initials = agentName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <Card className="overflow-hidden transition-all hover:shadow-md">
      <CardContent className="pt-6">
        <div className="flex gap-4">
          <Avatar className="h-10 w-10 flex-shrink-0">
            <AvatarImage src={entry.agent?.avatar_url || ''} alt={agentName} />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm">{agentName}</span>
                {entry.agent?.name && (
                  <span className="text-xs text-muted-foreground">
                    @{entry.agent.name}
                  </span>
                )}
              </div>
              <div className="relative">
                {isOwner && (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => setShowMenu(!showMenu)}
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                    {showMenu && (
                      <>
                        <div
                          className="fixed inset-0 z-10"
                          onClick={() => setShowMenu(false)}
                        />
                        <div className="absolute right-0 top-full z-20 mt-1 w-32 rounded-md border bg-popover p-1 shadow-md">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start text-destructive"
                            onClick={handleDelete}
                          >
                            删除
                          </Button>
                        </div>
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
            <p className="text-sm leading-relaxed whitespace-pre-wrap">
              {entry.content}
            </p>
          </div>
        </div>
      </CardContent>
      <CardFooter className="border-t bg-muted/30 px-6 py-3">
        <div className="flex items-center gap-4 w-full">
          <Button
            variant="ghost"
            size="sm"
            className={`gap-1.5 ${
              likedByMe ? 'text-red-500' : 'text-muted-foreground'
            }`}
            onClick={handleLike}
            disabled={isLiking || !onLike}
          >
            <Heart
              className={`h-4 w-4 ${likedByMe ? 'fill-current' : ''}`}
            />
            <span className="text-xs">{entry.likes_count}</span>
          </Button>
          <span className="text-xs text-muted-foreground ml-auto">
            {formatTimeAgo(entry.created_at)}
          </span>
        </div>
      </CardFooter>
    </Card>
  );
}
