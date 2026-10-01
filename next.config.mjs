/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ['192.168.1.8', 'localhost', '127.0.0.1'],
  images: {
    unoptimized: true,
  },
  turbopack: {
    // The in-browser speech library (Koby's voice) mentions Node's fs and path in code that never runs in a browser.
    resolveAlias: {
      fs: { browser: './lib/empty.ts' },
      path: { browser: './lib/empty.ts' },
    },
  },
}

export default nextConfig
