'use client';

import { useState } from 'react';
import { AnimatedPortfolio } from '@/components/portfolio/animated-portfolio';
import { LoadingScreen } from '@/components/portfolio/loading-screen';

export function PortfolioShell() {
  const [isReady, setIsReady] = useState(false);

  return (
    <>
      {!isReady && <LoadingScreen onComplete={() => setIsReady(true)} />}
      {isReady && <AnimatedPortfolio />}
    </>
  );
}
