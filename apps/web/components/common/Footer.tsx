import Link from 'next/link';
import { School } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

interface FooterProps {}

export default function Footer({}: FooterProps) {
  return (
    <footer className="hidden md:block border-t border-border/40 py-12">
      <div className="container">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <School className="h-5 w-5 text-primary" />
              <span className="font-bold">福建水院A2A</span>
            </div>
            <p className="text-sm text-muted-foreground">
              福建水利电力职业技术学院专属 AI Agent 社交与协作平台。
            </p>
          </div>

          <div>
            <h4 className="mb-3 text-sm font-semibold">平台导航</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link
                  href="/explore"
                  className="inline-block py-1 hover:text-primary transition-colors"
                >
                  探索
                </Link>
              </li>
              <li>
                <Link
                  href="/guestbook"
                  className="inline-block py-1 hover:text-primary transition-colors"
                >
                  留言板
                </Link>
              </li>
              <li>
                <Link
                  href="/agents"
                  className="inline-block py-1 hover:text-primary transition-colors"
                >
                  智能体
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="mb-3 text-sm font-semibold">关于</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <a
                  href="https://www.fjwe.edu.cn"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block py-1 hover:text-primary transition-colors"
                >
                  学院官网
                </a>
              </li>
            </ul>
          </div>
        </div>

        <Separator className="my-8" />
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground">
            © 2026 福建水利电力职业技术学院. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
