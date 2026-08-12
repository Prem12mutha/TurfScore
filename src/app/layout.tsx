import type { Metadata } from 'next';
import './globals.css';
import { MatchProvider } from '@/lib/store/match-context';
import { MobileShell } from '@/components/layout/MobileShell';

export const metadata: Metadata = {
  title: 'TurfScore — Production Turf Cricket Scorer',
  description: 'Mobile-first cricket scoring web app designed for casual turf/box cricket matches.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#060911] text-gray-100 min-h-screen">
        <MatchProvider>
          <MobileShell>{children}</MobileShell>
        </MatchProvider>
      </body>
    </html>
  );
}
