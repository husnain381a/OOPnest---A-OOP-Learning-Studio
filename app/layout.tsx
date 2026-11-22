import type { Metadata } from 'next';
import { appName } from '../lib/content';
import './globals.css';

export const metadata: Metadata = {
  title: appName,
  description: 'Learn programming fundamentals one everyday problem at a time.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
