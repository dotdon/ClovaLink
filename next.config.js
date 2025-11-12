/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    // Disable canvas module on the server
    if (isServer) {
      config.resolve.alias.canvas = false;
    }

    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
      };
    }

    // Externalize rust-core native module completely
    if (isServer) {
      // Don't bundle rust-core or .node files on server
      if (!config.externals) {
        config.externals = [];
      }
      if (!Array.isArray(config.externals)) {
        config.externals = [config.externals];
      }
      
      // Externalize the entire rust-core directory
      config.externals.push('../../rust-core');
      config.externals.push('../rust-core');
      config.externals.push('./rust-core');
      
      // Externalize any .node files
      config.externals.push(({ request }, callback) => {
        if (request && (request.includes('rust-core') || /\.node$/.test(request))) {
          return callback(null, `commonjs ${request}`);
        }
        callback();
      });
    }

    return config;
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
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' blob:",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https:",
              "font-src 'self' data:",
              "connect-src 'self' blob:",
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
  // Improve handling of concurrent requests and fast navigation
  experimental: {
    // Reduce memory usage and improve stability
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  // Better error handling for development
  onDemandEntries: {
    // Keep pages in memory longer to prevent empty responses
    maxInactiveAge: 30 * 1000, // Reduced to 30 seconds to fail faster
    pagesBufferLength: 5, // Reduced buffer to prevent hanging
  },
  // Improve connection handling
  httpAgentOptions: {
    keepAlive: true,
  },
}

module.exports = nextConfig; 