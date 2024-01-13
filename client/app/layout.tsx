import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Navbar } from '@/components/main/navbar';
import { Footer } from '@/components/main/footer';
import { StarsCanvas } from '@/components/main/star-background';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'FlashX | Perpetual Trading Bot',
  description: 'Trade perpetuals with up to 50x leverage on FlashX, the fastest and most secure trading telegram bot.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <link rel="icon" href="/favicon.ico" sizes="any" type="image/x-icon" />
      <link rel="icon" href="/favicon/favicon-16x16.png" sizes="16x16" type="image/png" />
      <link rel="icon" href="/favicon/favicon-32x32.png" sizes="32x32" type="image/png" />
      <link rel="apple-touch-icon" href="/favicon/apple-touch-icon.png" sizes="180x180" />
      <link rel="manifest" href="/favicon/site.webmanifest" />

      <body className={`${inter.className} bg-[#0D0D0D] overflow-y-scroll overflow-x-hidden`}>
        <StarsCanvas />
        <Navbar />
        {children}
        <Footer />
      </body>
    </html>
  );
}
