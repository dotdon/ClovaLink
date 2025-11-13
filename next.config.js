/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer, webpack }) => {
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
      // Use webpack.IgnorePlugin to prevent Turbopack from trying to resolve rust-core
      config.plugins.push(
        new webpack.IgnorePlugin({
          resourceRegExp: /^(\.\/)?ROOT\/rust-core$/,
        }),
        new webpack.IgnorePlugin({
          resourceRegExp: /rust-core.*\.node$/,
        })
      );
      
      // Add resolve alias to prevent resolution attempts
      config.resolve.alias = {
        ...config.resolve.alias,
        'rust-core': false,
        './rust-core': false,
        '../rust-core': false,
        '../../rust-core': false,
      };
      
      if (!config.externals) {
        config.externals = [];
      }
      if (!Array.isArray(config.externals)) {
        config.externals = [config.externals];
      }
      
      // Externalize any .node files and rust-core paths
      config.externals.push(({ request }, callback) => {
        if (request) {
          // Handle rust-core imports - externalize them so they're not bundled
          if (request.includes('rust-core') || /\.node$/.test(request) || request.includes('ROOT/rust-core')) {
            // Externalize by returning false - tells webpack to not bundle this
            // The module will be resolved at runtime via require() in cryptoAdapter.ts
            return callback(null, false);
          }
        }
        // Continue with normal resolution for other modules
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
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    remotePatterns: [],
    unoptimized: false,
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