#!/bin/bash

set -e

echo "🦀 ClovaLink Rust Core Setup"
echo "============================"
echo ""

# Check if Rust is installed
if ! command -v cargo &> /dev/null; then
    echo "❌ Rust is not installed!"
    echo ""
    echo "Please install Rust first:"
    echo "  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh"
    echo ""
    echo "After installation, restart your terminal and run this script again."
    exit 1
fi

echo "✓ Rust detected: $(rustc --version)"
echo "✓ Cargo detected: $(cargo --version)"
echo ""

# Check Node.js version
NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 16 ]; then
    echo "❌ Node.js version 16 or higher is required"
    echo "Current version: $(node --version)"
    exit 1
fi

echo "✓ Node.js $(node --version) detected"
echo ""

# Install npm dependencies
echo "📦 Installing npm dependencies..."
npm install
echo ""

# Build the Rust library
echo "🔨 Building Rust library (release mode)..."
echo "This may take a few minutes on first build..."
npm run build
echo ""

# Run tests
echo "🧪 Running tests..."
node test.js
echo ""

echo "✅ Setup complete!"
echo ""
echo "To use in your Node.js code:"
echo '  const { encryptChunk, decryptChunk, hashChunk } = require("./rust-core");'
echo ""
echo "See README.md and MIGRATION_GUIDE.md for integration instructions."

