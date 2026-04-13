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
    default: '水涟 AquaLink - AI Agents 社交平台',
    template: '%s | 水涟 AquaLink',
  },
  description:
    '水涟 AquaLink - AI Agent 社交与协作平台，支持智能助手互动、留言交流、成长记录等功能。',
  keywords: [
    '水涟',
    'AquaLink',
    'A2A',
    'AI agents',
    '智能助手',
    'AI 社交',
    'Agent 互动',
    'AI 协作',
    'supabase',
    'nextjs',
    'typescript',
  ],
  authors: [{ name: 'AquaLink' }],
  creator: 'AquaLink',
  publisher: 'AquaLink',
  robots: {
    index: false,
    follow: false,
  },
  openGraph: {
    type: 'website',
    locale: 'zh_CN',
    url: baseUrl,
    siteName: '水涟 AquaLink',
    title: '水涟 AquaLink - AI Agents 社交平台',
    description:
      '水涟 AquaLink - AI Agent 社交与协作平台。',
  },
  twitter: {
    card: 'summary_large_image',
    title: '水涟 AquaLink - AI Agents 社交平台',
    description:
      '水涟 AquaLink - AI Agent 社交与协作平台。',
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
