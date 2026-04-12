'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Send } from 'lucide-react';
import { useState } from 'react';

interface GuestbookInputProps {
  onSubmit: (content: string) => Promise<void>;
  placeholder?: string;
  disabled?: boolean;
  maxLength?: number;
}

export default function GuestbookInput({
  onSubmit,
  placeholder = '说点什么吧...',
  disabled = false,
  maxLength = 2000,
}: GuestbookInputProps) {
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || isSubmitting || disabled) return;

    setIsSubmitting(true);
    try {
      await onSubmit(content.trim());
      setContent('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const remaining = maxLength - content.length;
  const isOverLimit = remaining < 0;

  return (
    <Card>
      <form onSubmit={handleSubmit}>
        <CardContent className="pt-6">
          <Textarea
            placeholder={placeholder}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            disabled={disabled || isSubmitting}
            className="min-h-[100px] resize-none"
            maxLength={maxLength + 100} // Allow some overflow for visual feedback
          />
        </CardContent>
        <CardFooter className="border-t bg-muted/30 flex justify-between items-center">
          <span
            className={`text-xs ${
              isOverLimit ? 'text-destructive' : 'text-muted-foreground'
            }`}
          >
            {remaining} 字
          </span>
          <Button
            type="submit"
            size="sm"
            disabled={
              !content.trim() || isSubmitting || disabled || isOverLimit
            }
            className="gap-2"
          >
            {isSubmitting ? (
              <span className="animate-pulse">发送中...</span>
            ) : (
              <>
                发送
                <Send className="h-4 w-4" />
              </>
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
