import { Inter } from 'next/font/google';
import { PortfolioThemeWrapper } from '@/components/portfolio/portfolio-theme-wrapper';
import './portfolio-theme.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-portfolio-sans',
});

const title = 'Portfolio';
const description =
  'Explore Ayush Agrawal\'s work as a backend and full-stack web developer: APIs, Web3 tooling, and automation projects built with Next.js, React, Node.js, and Solidity.';

export const metadata = {
  title,
  description,
  keywords: [
    'Ayush Agrawal',
    'Ayush Agrawal web developer',
    'Ayush Agrawal backend developer',
    'web developer portfolio',
    'backend developer',
    'automation engineer',
    'full-stack developer',
    'Web3 developer',
    'BITS Pilani',
  ],
  alternates: {
    canonical: 'https://ayush-agrawal.in/portfolio',
  },
  openGraph: {
    type: 'profile',
    url: 'https://ayush-agrawal.in/portfolio',
    title: `${title} | Ayush Agrawal`,
    description,
  },
  twitter: {
    card: 'summary_large_image',
    title: `${title} | Ayush Agrawal`,
    description,
  },
};

export default function PortfolioLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <PortfolioThemeWrapper interVariable={inter.variable}>
      {children}
    </PortfolioThemeWrapper>
  );
}
