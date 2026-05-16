import { Inter } from 'next/font/google';
import { PortfolioThemeWrapper } from '@/components/portfolio/portfolio-theme-wrapper';
import './portfolio-theme.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-portfolio-sans',
});

export const metadata = {
  title: 'Ayush Agrawal | Portfolio',
  description: 'Full-stack developer & creative coder',
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
