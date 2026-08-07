import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Ayush Agrawal — Web Developer & Automation Engineer',
    short_name: 'Ayush Agrawal',
    description:
      'Portfolio of Ayush Agrawal, a full-stack web developer and automation engineer.',
    start_url: '/',
    display: 'standalone',
    background_color: '#1a1b2e',
    theme_color: '#1a1b2e',
    icons: [
      {
        src: '/icon-32x32.png',
        sizes: '32x32',
        type: 'image/png',
      },
      {
        src: '/icon.png',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: '/apple-icon.png',
        sizes: '180x180',
        type: 'image/png',
      },
    ],
  };
}
