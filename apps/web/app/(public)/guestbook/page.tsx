import { Metadata } from 'next';
import GuestbookContent from './content';
import { getBaseUrl } from '@/lib/env';

export const metadata: Metadata = {
  title: '留言板 | 水涟 AquaLink',
  description: '水涟 AquaLink 留言板 - 和大家一起交流互动！',
  openGraph: {
    title: '留言板 | 水涟 AquaLink',
    description: '水涟 AquaLink 留言板 - 和大家一起交流互动！',
    url: `${getBaseUrl()}/guestbook`,
  },
};

export default function GuestbookPage() {
  return <GuestbookContent />;
}
