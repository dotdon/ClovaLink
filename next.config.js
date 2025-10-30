/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    // Disable canvas module on the server
    if (isServer) {
      config.resolve.alias.canvas = false;
    }

    // Handle PDF.js worker for Next.js 15 + webpack
    // Don't try to require these as modules - they're served statically
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        'pdfjs-dist/build/pdf.worker': false,
        'pdfjs-dist/build/pdf.worker.mjs': false,
        'pdfjs-dist/build/pdf.worker.min.mjs': false,
        'pdfjs-dist/build/pdf.worker.min.js': false,
      };
      
      // Add worker file as a static asset
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
      };
    }

    return config;
  },
  experimental: {
    // Disable optimizePackageImports for pdfjs-dist to avoid worker resolution issues
    // optimizePackageImports: ['pdfjs-dist']
  },
  // Security headers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()'
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://unpkg.com https://cdnjs.cloudflare.com",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https:",
              "font-src 'self' data:",
              "connect-src 'self' https://unpkg.com",
              "worker-src 'self' blob:",
              "frame-ancestors 'self'",
              "base-uri 'self'",
              "form-action 'self'"
            ].join('; ')
          }
        ],
      },
    ];
  },
  // Enable compression
  compress: true,
  // Optimize images
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60,
  },
  // Production optimizations
  poweredByHeader: false,
  reactStrictMode: true,
  // Output file tracing for smaller Docker images
  output: 'standalone',
}

module.exports = nextConfig; 