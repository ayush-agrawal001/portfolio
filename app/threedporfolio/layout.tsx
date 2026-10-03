import type { Metadata, Viewport } from 'next';
import './threed.css';

const title = 'One Thread';
const description =
  'A scroll-driven 3D walk through the work of Ayush Agrawal, a one-man army across frontend, backend, Web3 and DevOps: education, stack, projects and experience, on one thread.';

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: 'https://ayush-agrawal.in/threedportfolio',
  },
  openGraph: {
    type: 'profile',
    url: 'https://ayush-agrawal.in/threedportfolio',
    title: `${title} | Ayush Agrawal`,
    description,
  },
  twitter: {
    card: 'summary_large_image',
    title: `${title} | Ayush Agrawal`,
    description,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
  themeColor: '#07070b',
};

export default function ThreedLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
