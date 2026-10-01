import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono, IBM_Plex_Mono, IBM_Plex_Sans, Inter, Pixelify_Sans, Shippori_Mincho } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

const geist = Geist({ subsets: ['latin'], variable: '--font-geist' });
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono' });
const plexSans = IBM_Plex_Sans({ subsets: ['latin'], variable: '--font-plex-sans', weight: ['400', '500', '600'] });
const plexMono = IBM_Plex_Mono({ subsets: ['latin'], variable: '--font-plex-mono', weight: ['400', '500', '600'] });
const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const pixel = Pixelify_Sans({ subsets: ['latin'], variable: '--font-pixel' });
const mincho = Shippori_Mincho({ subsets: ['latin'], variable: '--font-mincho', weight: ['400', '500', '700'] });

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#1f1f28',
};

const siteUrl = 'https://ayush-agrawal.in';
const siteTitle = 'Ayush Agrawal | Web & Backend Developer';
const siteDescription =
  'Portfolio of Ayush Agrawal, a backend and full-stack web developer based in India, building Web3 apps, automation tooling, and scalable products with Next.js, Node.js, React, and Solidity.';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: siteTitle,
    template: '%s | Ayush Agrawal',
  },
  description: siteDescription,
  keywords: [
    'Ayush Agrawal',
    'Ayush Agrawal web developer',
    'Ayush Agrawal backend developer',
    'Ayush Agrawal portfolio',
    'web developer',
    'backend developer',
    'automation engineer',
    'full-stack developer',
    'Web3 developer',
    'blockchain developer',
    'Next.js developer',
    'React developer',
    'Solana developer',
    'freelance web developer India',
  ],
  authors: [{ name: 'Ayush Agrawal', url: siteUrl }],
  creator: 'Ayush Agrawal',
  publisher: 'Ayush Agrawal',
  generator: 'Next.js',
  alternates: {
    canonical: siteUrl,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    url: siteUrl,
    siteName: 'Ayush Agrawal',
    title: siteTitle,
    description: siteDescription,
    locale: 'en_IN',
  },
  twitter: {
    card: 'summary_large_image',
    title: siteTitle,
    description: siteDescription,
    creator: '@bunnyTheRobo001',
  },
  icons: {
    icon: [
      {
        url: '/icon-32x32.png',
        sizes: '32x32',
        type: 'image/png',
      },
      {
        url: '/icon.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
    apple: '/apple-icon.png',
  },
}

const personJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Person',
  name: 'Ayush Agrawal',
  url: siteUrl,
  image: `${siteUrl}/profile_5.png`,
  jobTitle: ['Backend Developer', 'Web Developer', 'Automation Engineer', 'Web3 Developer'],
  description: siteDescription,
  email: 'mailto:ayushagrawal4376@gmail.com',
  worksFor: {
    '@type': 'Organization',
    name: 'Botivate',
  },
  address: {
    '@type': 'PostalAddress',
    addressCountry: 'IN',
  },
  alumniOf: {
    '@type': 'CollegeOrUniversity',
    name: 'Birla Institute of Technology and Science, Pilani',
    url: 'https://www.bits-pilani.ac.in/',
  },
  knowsAbout: [
    'Backend Development',
    'Web Development',
    'Automation Engineering',
    'Full-Stack Development',
    'Web3 Development',
    'REST APIs',
    'Authentication & Role-Based Access Control',
    'Next.js',
    'React',
    'Node.js',
    'Solidity',
    'CI/CD',
    'DevOps',
  ],
  sameAs: [
    'https://github.com/ayush-agrawal001',
    'https://www.linkedin.com/in/ayush-agrawal-8813ab270/',
    'https://x.com/bunnyTheRobo001',
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${geist.variable} ${geistMono.variable} ${plexSans.variable} ${plexMono.variable} ${mincho.variable} ${inter.variable} ${pixel.variable} bg-background`}>
      <body suppressHydrationWarning className="antialiased bg-background text-foreground min-h-dvh overflow-x-hidden overscroll-none">
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(personJsonLd).replace(/</g, '\\u003c'),
          }}
        />
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
