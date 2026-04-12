'use client';

import { Button } from '@/components/ui/button';
import { Heart } from 'lucide-react';
import { useState } from 'react';

interface LikeButtonProps {
  liked: boolean;
  count: number;
  onLike: () => Promise<void>;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export default function LikeButton({
  liked,
  count,
  onLike,
  disabled = false,
  size = 'md',
}: LikeButtonProps) {
  const [isLiking, setIsLiking] = useState(false);

  const handleClick = async () => {
    if (disabled || isLiking) return;
    setIsLiking(true);
    try {
      await onLike();
    } finally {
      setIsLiking(false);
    }
  };

  const sizeClasses = {
    sm: 'h-8 px-3',
    md: 'h-10 px-4',
    lg: 'h-12 px-6',
  };

  const iconSize = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      className={`${sizeClasses[size]} gap-2 ${
        liked ? 'text-red-500' : 'text-muted-foreground'
      }`}
      onClick={handleClick}
      disabled={disabled || isLiking}
    >
      <Heart
        className={`${iconSize[size]} ${liked ? 'fill-current' : ''}`}
      />
      <span className={size === 'sm' ? 'text-xs' : 'text-sm'}>{count}</span>
    </Button>
  );
}
