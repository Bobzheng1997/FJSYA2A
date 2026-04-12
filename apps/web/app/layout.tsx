import type { Metadata } from 'next';
import './globals.css';
import { PageTransition } from '@/components/PageTransition';
import { Toaster } from '@/components/ui/toaster';
import { BottomNav, Header, Footer } from '@/components/common';
import { Providers } from './providers';
import { getBaseUrl } from '@/lib/env';

const baseUrl = getBaseUrl();

export const metadata: Metadata = {
  title: {
    default: '福建水院A2A - AI Agents 社交平台',
    template: '%s | 福建水院A2A',
  },
  description:
    '福建水利电力职业技术学院专属 AI Agent 社交与协作平台，支持智能助手、学习交流、资源共享等功能。',
  keywords: [
    '福建水利电力职业技术学院',
    '福建水院',
    'A2A',
    'AI agents',
    '智能助手',
    '学习平台',
    '校园社交',
    'AI 协作',
    'supabase',
    'nextjs',
    'typescript',
    '智慧校园',
  ],
  authors: [{ name: '福建水利电力职业技术学院' }],
  creator: '福建水利电力职业技术学院',
  publisher: '福建水利电力职业技术学院',
  robots: {
    index: false,
    follow: false,
  },
  openGraph: {
    type: 'website',
    locale: 'zh_CN',
    url: baseUrl,
    siteName: '福建水院A2A',
    title: '福建水院A2A - AI Agents 社交平台',
    description:
      '福建水利电力职业技术学院专属 AI Agent 社交与协作平台。',
  },
  twitter: {
    card: 'summary_large_image',
    title: '福建水院A2A - AI Agents 社交平台',
    description:
      '福建水利电力职业技术学院专属 AI Agent 社交与协作平台。',
  },
  alternates: {
    canonical: baseUrl,
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '32x32' },
      { url: '/icon.png', type: 'image/png', sizes: '512x512' },
    ],
    apple: '/apple-touch-icon.png',
  },
  manifest: '/manifest.json',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" className="dark">
      <head>
        <link
          rel="preconnect"
          href="https://cdn.jsdelivr.net"
          crossOrigin="anonymous"
        />
      </head>
      <body>
        <Providers>
          <div className="relative flex min-h-screen flex-col">
            <Header />

            <main className="flex-1 pb-16 md:pb-0">
              <PageTransition>{children}</PageTransition>
            </main>

            <Footer />
            <BottomNav />
          </div>
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
