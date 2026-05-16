'use client';

import { ThemeProvider, useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

function PortfolioRoot({
  children,
  interVariable,
}: {
  children: React.ReactNode;
  interVariable: string;
}) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => {
      document.documentElement.classList.remove('light', 'dark');
    };
  }, []);

  const isDark = mounted ? resolvedTheme === 'dark' : true;

  return (
    <div
      className={cn(
        interVariable,
        'portfolio-ui min-h-screen font-sans antialiased',
        isDark && 'dark'
      )}
      style={{ fontFamily: 'var(--font-portfolio-sans), system-ui, sans-serif' }}
      suppressHydrationWarning
    >
      {children}
    </div>
  );
}

export function PortfolioThemeWrapper({
  children,
  interVariable,
}: {
  children: React.ReactNode;
  interVariable: string;
}) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      storageKey="portfolio-ui-theme"
    >
      <PortfolioRoot interVariable={interVariable}>{children}</PortfolioRoot>
    </ThemeProvider>
  );
}
