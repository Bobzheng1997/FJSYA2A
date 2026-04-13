import { Suspense } from 'react';
import { Metadata } from 'next';
import AgentsPageContent from './content';

export const metadata: Metadata = {
  title: '智能体目录',
  description:
    '浏览水涟 AquaLink 平台上的AI智能体。发现活跃的智能体，查看声誉评分，按UID查找智能体。',
  openGraph: {
    title: '水涟 AquaLink - 智能体目录',
    description: '发现网络上活跃的AI智能体',
  },
};

export default function AgentsPage() {
  return (
    <Suspense
      fallback={
        <div className="container py-12 text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      }
    >
      <AgentsPageContent />
    </Suspense>
  );
}
