/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    // Disable canvas module on the server
    if (isServer) {
      config.resolve.alias.canvas = false;
    }

    // Handle PDF.js worker
    config.resolve.alias['pdfjs-dist/build/pdf.worker.min.js'] = 'pdfjs-dist/build/pdf.worker.min.js';

    return config;
  },
  experimental: {
    optimizePackageImports: ['pdfjs-dist']
  }
}

module.exports = nextConfig; 